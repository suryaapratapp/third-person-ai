import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import IORedis from 'ioredis'
import { Job, Queue, Worker } from 'bullmq'
import type { PoolClient } from 'pg'
import { pool } from '../utils/db'
import { env, getRedisConnectionOptions } from '../utils/env'
import { parseImportFile, ParseFailedError } from './chatParser'
import { downloadFileBufferFromGoogleDrive } from './googleDrive'
import { UPLOAD_SESSION_STATUS } from 'third-person-ai/shared/statuses.js'


// [User Upload]
//       ↓
// [DB: upload_sessions + uploaded_files]
//       ↓
// [Queue Job Created]
//       ↓
// [Worker Picks Job]
//       ↓
// [Read File from Disk]
//       ↓
// [Parse File → chatParser]
//       ↓
// [DB Transaction]
//    ├── Delete old messages
//    ├── Insert new messages
//    └── Update status
//       ↓
// [Write parse-report.json]
//       ↓
// [Mark as PARSED / FAILED]

type ParseExportJobData = {
  sessionId: string
}

type UploadedFileRow = {
  storagePath: string
  storageProvider: string | null
  storageFileId: string | null
  originalName: string | null
}

const redisConnection = new IORedis(env.redisUrl, getRedisConnectionOptions())
const parseExportDeadLetterQueue = new Queue(env.parseExportDeadLetterQueueName, {
  connection: redisConnection,
})
const parseJobStartTimes = new Map<string, number>()

function getJobId(job: Job<ParseExportJobData>): string {
  return String(job.id ?? `parse:${job.data.sessionId}`)
}

function logParseJob(
  level: 'info' | 'error',
  event: string,
  job: Job<ParseExportJobData>,
  extra: Record<string, unknown> = {},
) {
  const payload = {
    worker: 'parse_export',
    event,
    jobId: getJobId(job),
    sessionId: job.data.sessionId,
    attempt: job.attemptsMade + 1,
    maxAttempts: Number(job.opts.attempts ?? 1),
    ...extra,
  }

  const line = JSON.stringify(payload)
  if (level === 'error') {
    console.error(line)
    return
  }
  console.log(line)
}

function parseJobLockKey(sessionId: string): string {
  return `job-lock:parse:${sessionId}`
}

function resolveStoredPath(storagePath: string): string {
  if (path.isAbsolute(storagePath)) return storagePath
  return path.resolve(process.cwd(), storagePath)
}

function parseGoogleDriveFileId(storagePath: string): string | null {
  if (!storagePath.startsWith('gdrive://')) return null
  const withoutScheme = storagePath.slice('gdrive://'.length)
  const [fileId] = withoutScheme.split('/')
  return fileId || null
}

function parseGoogleDriveFileName(storagePath: string): string | null {
  if (!storagePath.startsWith('gdrive://')) return null
  const withoutScheme = storagePath.slice('gdrive://'.length)
  const slashIndex = withoutScheme.indexOf('/')
  if (slashIndex < 0 || slashIndex === withoutScheme.length - 1) return null
  const encoded = withoutScheme.slice(slashIndex + 1)
  if (!encoded) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

function isGoogleDriveStorage(row: UploadedFileRow): boolean {
  return (
    row.storageProvider === 'google_drive' ||
    Boolean(row.storageFileId) ||
    row.storagePath.startsWith('gdrive://')
  )
}

function getParserFilePath(row: UploadedFileRow): string {
  if (!isGoogleDriveStorage(row)) {
    return resolveStoredPath(row.storagePath)
  }
  const fallbackName = parseGoogleDriveFileName(row.storagePath) || 'downloaded-upload.txt'
  return row.originalName || fallbackName
}

function parseReportPathFromStorage(storagePath: string): string {
  return path.resolve(path.dirname(storagePath), 'parse-report.json')
}

async function writeParseReport(storagePath: string, report: unknown): Promise<void> {
  const target = parseReportPathFromStorage(storagePath)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, JSON.stringify(report, null, 2), 'utf-8')
}

function buildFallbackParseFailedPayload(reason: string) {
  return {
    error: 'ParseFailed',
    detectedFormat: 'unknown',
    reason,
    expectedExamples: [],
    stats: {
      totalLines: 0,
      matchedLines: 0,
      ignoredLines: 0,
    },
    firstIgnoredLines: [],
    tips: [
      'Verify your export format is supported for the selected app.',
      'Export without media or attachments and retry.',
      'If this keeps failing, try paste mode with plain text.',
    ],
  }
}

async function setSessionStatus(sessionId: string, status: string, parseReport: unknown | null = null) {
  await pool.query('UPDATE "upload_sessions" SET "status" = $1, "parseReportJson" = $2::jsonb WHERE "id" = $3', [
    status,
    parseReport ? JSON.stringify(parseReport) : null,
    sessionId,
  ])
}

type DbMessage = {
  timestamp: Date
  sender: string
  text: string
  meta?: Record<string, unknown>
}

async function insertMessagesBatch(
  client: PoolClient,
  sessionId: string,
  messages: DbMessage[],
): Promise<void> {
  if (!messages.length) return

  const chunkSize = 500
  for (let index = 0; index < messages.length; index += chunkSize) {
    const chunk = messages.slice(index, index + chunkSize)
    const values: Array<string | null> = []
    const placeholders: string[] = []

    chunk.forEach((message, chunkIndex) => {
      const base = chunkIndex * 6
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb, NOW())`,
      )
      values.push(
        randomUUID(),
        sessionId,
        message.timestamp.toISOString(),
        message.sender,
        message.text,
        message.meta ? JSON.stringify(message.meta) : null,
      )
    })

    await client.query(
      `INSERT INTO messages (id, "uploadSessionId", timestamp, sender, text, meta, "createdAt")
       VALUES ${placeholders.join(',')}`,
      values,
    )
  }
}

async function processParseExportJob(job: Job<ParseExportJobData>) {
  const { sessionId } = job.data

  await setSessionStatus(sessionId, UPLOAD_SESSION_STATUS.PARSING, null)

  const sessionResult = await pool.query<{ id: string; sourceApp: string }>(
    'SELECT "id", "sourceApp" FROM "upload_sessions" WHERE "id" = $1',
    [sessionId],
  )

  if (!sessionResult.rowCount) {
    throw new Error(`Upload session not found: ${sessionId}`)
  }

  const sourceApp = sessionResult.rows[0].sourceApp

  const fileResult = await pool.query<UploadedFileRow>(
    `SELECT
      "storagePath" AS "storagePath",
      "storageProvider" AS "storageProvider",
      "storageFileId" AS "storageFileId",
      "originalName" AS "originalName"
     FROM "uploaded_files"
     WHERE "uploadSessionId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 1`,
    [sessionId],
  )

  if (!fileResult.rowCount) {
    throw new Error(`No uploaded file found for session: ${sessionId}`)
  }

  const uploadedFile = fileResult.rows[0]
  const googleDriveMode = isGoogleDriveStorage(uploadedFile)
  const googleDriveFileId = uploadedFile.storageFileId || parseGoogleDriveFileId(uploadedFile.storagePath)
  const parserFilePath = getParserFilePath(uploadedFile)

  console.log(
    `[worker] session ${sessionId} file source detected`,
    JSON.stringify({
      storagePath: uploadedFile.storagePath,
      storageProvider: uploadedFile.storageProvider,
      hasStorageFileId: Boolean(uploadedFile.storageFileId),
      googleDriveMode,
      parserFilePath,
    }),
  )

  let fileBuffer: Buffer
  let localStoragePath: string | null = null

  if (googleDriveMode) {
    if (!googleDriveFileId) {
      throw new Error(
        `Google Drive storage detected but no file id found for session ${sessionId} (storagePath=${uploadedFile.storagePath})`,
      )
    }
    console.log(`[worker] session ${sessionId} downloading from Google Drive fileId=${googleDriveFileId}`)
    fileBuffer = await downloadFileBufferFromGoogleDrive(googleDriveFileId)
    console.log(
      `[worker] session ${sessionId} downloaded ${fileBuffer.length} bytes from Google Drive fileId=${googleDriveFileId}`,
    )
  } else {
    localStoragePath = resolveStoredPath(uploadedFile.storagePath)
    console.log(`[worker] session ${sessionId} reading local file path=${localStoragePath}`)
    fileBuffer = await readFile(localStoragePath)
    console.log(`[worker] session ${sessionId} read ${fileBuffer.length} bytes from local file`)
  }

  let parsed: ReturnType<typeof parseImportFile>
  try {
    parsed = parseImportFile({
      sourceApp,
      filePath: parserFilePath,
      fileBuffer,
    })
  } catch (error) {
    if (error instanceof ParseFailedError) {
      await setSessionStatus(sessionId, UPLOAD_SESSION_STATUS.FAILED, error.payload)
      if (localStoragePath) {
        await writeParseReport(localStoragePath, error.payload)
      }
      throw error
    }
    const message = error instanceof Error ? error.message : 'Unknown parse error'
    const payload = buildFallbackParseFailedPayload(message)
    await setSessionStatus(sessionId, UPLOAD_SESSION_STATUS.FAILED, payload)
    if (localStoragePath) {
      await writeParseReport(localStoragePath, payload)
    }
    throw error
  }
  const messages = parsed.dbMessages

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM "messages" WHERE "uploadSessionId" = $1', [sessionId])

    await insertMessagesBatch(client, sessionId, messages)

    await client.query(
      'UPDATE "upload_sessions" SET "status" = $1, "parseReportJson" = $2::jsonb WHERE "id" = $3',
      [UPLOAD_SESSION_STATUS.PARSED, JSON.stringify(parsed.report), sessionId],
    )
    await client.query('COMMIT')
    if (localStoragePath) {
      await writeParseReport(localStoragePath, parsed.report)
    }

    console.log(
      `[worker] session ${sessionId} parsed successfully with ${messages.length} messages`,
    )
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

//////request is not reaching to this worker
export const parseExportWorker = new Worker<ParseExportJobData>(
  env.parseExportQueueName,
  async (job) => {
    const startedAt = Date.now()
    parseJobStartTimes.set(getJobId(job), startedAt)
    logParseJob('info', 'started', job)

    try {
      await processParseExportJob(job)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown worker error'
      if (error instanceof ParseFailedError) {
        await setSessionStatus(job.data.sessionId, UPLOAD_SESSION_STATUS.FAILED, error.payload)
      } else {
        await setSessionStatus(
          job.data.sessionId,
          UPLOAD_SESSION_STATUS.FAILED,
          buildFallbackParseFailedPayload(message),
        )
      }
      logParseJob('error', 'failed-in-processor', job, { reason: message })
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
)

parseExportWorker.on('completed', (job) => {
  const startedAt = parseJobStartTimes.get(getJobId(job)) ?? Date.now()
  const durationMs = Date.now() - startedAt
  parseJobStartTimes.delete(getJobId(job))
  logParseJob('info', 'completed', job, { durationMs })
  void redisConnection.del(parseJobLockKey(job.data.sessionId))
})

parseExportWorker.on('failed', (job, error) => {
  if (!job) return
  const startedAt = parseJobStartTimes.get(getJobId(job)) ?? Date.now()
  const durationMs = Date.now() - startedAt
  logParseJob('error', 'failed', job, { durationMs, reason: error.message })
  const maxAttempts = Number(job.opts.attempts ?? 1)
  if (job.attemptsMade >= maxAttempts) {
    void parseExportDeadLetterQueue.add(
      'parse_export_dead_letter',
      {
        queue: env.parseExportQueueName,
        sessionId: job.data.sessionId,
        reason: error.message,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
      },
      {
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    )
    void redisConnection.del(parseJobLockKey(job.data.sessionId))
    parseJobStartTimes.delete(getJobId(job))
  }
})

export async function closeWorker() {
  await parseExportWorker.close()
  await parseExportDeadLetterQueue.close()
  await redisConnection.quit()
}
