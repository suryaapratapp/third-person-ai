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
  return getQueue().add(
    'parse_export',
    { sessionId },
    {
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  )
}

export async function enqueueRunAnalysisJob(analysisRunId: string, sessionId: string) {
  return getAnalysisQueue().add(
    'run_analysis',
    { analysisRunId, sessionId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  )
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
