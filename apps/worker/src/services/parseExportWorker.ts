import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import IORedis from 'ioredis'
import { Job, Worker } from 'bullmq'
import { pool } from '../utils/db'
import { env, getRedisConnectionOptions } from '../utils/env'
import { parseImportFile, ParseFailedError } from './chatParser'


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

const redisConnection = new IORedis(env.redisUrl, getRedisConnectionOptions())

function resolveStoredPath(storagePath: string): string {
  if (path.isAbsolute(storagePath)) return storagePath
  return path.resolve(process.cwd(), storagePath)
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
  await pool.query('UPDATE upload_sessions SET status = $1 WHERE id = $2', [status, sessionId])
}

async function processParseExportJob(job: Job<ParseExportJobData>) {
  const { sessionId } = job.data

  await setSessionStatus(sessionId, 'PARSING')

  const sessionResult = await pool.query<{ id: string; sourceApp: string }>(
    'SELECT id, "sourceApp" FROM upload_sessions WHERE id = $1',
    [sessionId],
  )

  if (!sessionResult.rowCount) {
    throw new Error(`Upload session not found: ${sessionId}`)
  }

  const sourceApp = sessionResult.rows[0].sourceApp

  const fileResult = await pool.query<{ storagePath: string }>(
    'SELECT "storagePath" FROM uploaded_files WHERE "uploadSessionId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
    [sessionId],
  )

  if (!fileResult.rowCount) {
    throw new Error(`No uploaded file found for session: ${sessionId}`)
  }

  const storagePath = resolveStoredPath(fileResult.rows[0].storagePath)
  const fileBuffer = await readFile(storagePath)
  let parsed: ReturnType<typeof parseImportFile>
  try {
    parsed = parseImportFile({
      sourceApp,
      filePath: storagePath,
      fileBuffer,
    })
  } catch (error) {
    if (error instanceof ParseFailedError) {
      await writeParseReport(storagePath, error.payload)
    }
    throw error
  }
  const messages = parsed.dbMessages

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM messages WHERE "uploadSessionId" = $1', [sessionId])

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

    await client.query('UPDATE upload_sessions SET status = $1 WHERE id = $2', ['PARSED', sessionId])
    await client.query('COMMIT')
    await writeParseReport(storagePath, parsed.report)

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
