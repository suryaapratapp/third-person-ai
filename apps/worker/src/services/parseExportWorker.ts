import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import IORedis from 'ioredis'
import { Job, Worker } from 'bullmq'
import { pool } from '../utils/db'
import { env, getRedisConnectionOptions } from '../utils/env'
import { parseImportFile, ParseFailedError } from './chatParser'
import { downloadFileBufferFromGoogleDrive } from './googleDrive'


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

async function setSessionStatus(sessionId: string, status: string) {
  await pool.query('UPDATE "upload_sessions" SET "status" = $1 WHERE "id" = $2', [status, sessionId])
}

async function processParseExportJob(job: Job<ParseExportJobData>) {
  const { sessionId } = job.data

  await setSessionStatus(sessionId, 'PARSING')

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
    if (error instanceof ParseFailedError && localStoragePath) {
      await writeParseReport(localStoragePath, error.payload)
    }
    throw error
  }
  const messages = parsed.dbMessages

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM "messages" WHERE "uploadSessionId" = $1', [sessionId])

    for (const message of messages) {
      await client.query(
        `INSERT INTO messages (id, "uploadSessionId", timestamp, sender, text, meta, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
        [
          randomUUID(),
          sessionId,
          message.timestamp.toISOString(),
          message.sender,
          message.text,
          message.meta ? JSON.stringify(message.meta) : null,
        ],
      )
    }

    await client.query('UPDATE "upload_sessions" SET "status" = $1 WHERE "id" = $2', ['PARSED', sessionId])
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
    try {
      await processParseExportJob(job)
      console.log(`[worker] completed parse_export for session ${job.data.sessionId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown worker error'
      await setSessionStatus(job.data.sessionId, 'FAILED')
      console.error(`[worker] session ${job.data.sessionId} failed: ${message}`)
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
)

parseExportWorker.on('completed', (job) => {
  console.log(`[worker] completed parse_export for session ${job.data.sessionId}`)
})

parseExportWorker.on('failed', (job, error) => {
  if (!job) return
  console.error(`[worker] failed parse_export for session ${job.data.sessionId}: ${error.message}`)
})

export async function closeWorker() {
  await parseExportWorker.close()
  await redisConnection.quit()
}
