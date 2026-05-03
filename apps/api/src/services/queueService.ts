import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '../utils/env'


export type ParseExportJobData = {
  sessionId: string
}

export type RunAnalysisJobData = {
  analysisRunId: string
  sessionId: string
}

let redisConnection: IORedis | null = null
let parseExportQueue: Queue<ParseExportJobData> | null = null
let analysisQueue: Queue<RunAnalysisJobData> | null = null

function parseJobLockKey(sessionId: string): string {
  return `job-lock:parse:${sessionId}`
}

function analysisRunJobKey(analysisRunId: string): string {
  return `job:analysis-run:${analysisRunId}`
}

function analysisSessionLockKey(sessionId: string): string {
  return `job-lock:analysis-session:${sessionId}`
}

function getQueue() {
  if (!redisConnection) {
    redisConnection = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
    })
  }

  if (!parseExportQueue) {
    parseExportQueue = new Queue<ParseExportJobData>(env.parseExportQueueName, {
      connection: redisConnection,
    })
  }

  return parseExportQueue
}

function getAnalysisQueue() {
  if (!redisConnection) {
    redisConnection = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
    })
  }

  if (!analysisQueue) {
    analysisQueue = new Queue<RunAnalysisJobData>(env.analysisQueueName, {
      connection: redisConnection,
    })
  }

  return analysisQueue
}

export async function enqueueParseExportJob(sessionId: string) {
  const connection = redisConnection ?? new IORedis(env.redisUrl, { maxRetriesPerRequest: null })
  if (!redisConnection) {
    redisConnection = connection
  }

  const lockKey = parseJobLockKey(sessionId)
  const parseLock = await connection.set(lockKey, sessionId, 'EX', env.parseJobLockTtlSec, 'NX')
  if (parseLock !== 'OK') {
    return null
  }

  try {
    return await getQueue().add(
      'parse_export',
      { sessionId },
      {
        jobId: `job:parse:${sessionId}`,
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    )
  } catch (error) {
    await connection.del(lockKey)
    throw error
  }
}

export async function enqueueRunAnalysisJob(analysisRunId: string, sessionId: string) {
  const connection = redisConnection ?? new IORedis(env.redisUrl, { maxRetriesPerRequest: null })
  if (!redisConnection) {
    redisConnection = connection
  }

  const sessionLockKey = analysisSessionLockKey(sessionId)
  const lock = await connection.set(
    sessionLockKey,
    analysisRunId,
    'EX',
    env.analysisSessionLockTtlSec,
    'NX',
  )
  if (lock !== 'OK') {
    return null
  }

  try {
    return await getAnalysisQueue().add(
      'run_analysis',
      { analysisRunId, sessionId },
      {
        jobId: analysisRunJobKey(analysisRunId),
        attempts: 4,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    )
  } catch (error) {
    await connection.del(sessionLockKey)
    throw error
  }
}

export async function closeQueueConnections() {
  if (parseExportQueue) {
    await parseExportQueue.close()
    parseExportQueue = null
  }

  if (analysisQueue) {
    await analysisQueue.close()
    analysisQueue = null
  }

  if (redisConnection) {
    await redisConnection.quit()
    redisConnection = null
  }
}
