import IORedis from 'ioredis'
import { Job, Worker } from 'bullmq'
import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { pool } from '../utils/db'
import { env } from '../utils/env'
import { runAnalysisPipeline } from './analysisPipeline'
import { enqueueAggregatePersonalityJob } from './aggregatePersonalityWorker'
import { estimateCostUsd, logAIUsage } from './aiUsageLogger'

type RunAnalysisJobData = {
  analysisRunId: string
  sessionId: string
}

const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
})

async function setAnalysisStatus(analysisRunId: string, status: string) {
  await pool.query('UPDATE analysis_runs SET status = $1 WHERE id = $2', [status, analysisRunId])
}

async function saveInsight(
  client: PoolClient,
  analysisRunId: string,
  type: string,
  payload: Record<string, unknown>,
) {
  await client.query(
    `INSERT INTO insights (id, analysis_run_id, type, payload, created_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())`,
    [randomUUID(), analysisRunId, type, JSON.stringify(payload)],
  )
}

async function processRunAnalysisJob(job: Job<RunAnalysisJobData>) {
  const { analysisRunId, sessionId } = job.data

  await setAnalysisStatus(analysisRunId, 'RUNNING')
  const analysisResult = await runAnalysisPipeline(sessionId)
  const insights = analysisResult.insights

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM insights WHERE analysis_run_id = $1', [analysisRunId])

    await saveInsight(client, analysisRunId, 'compatibility_score', insights.compatibility)
    await saveInsight(client, analysisRunId, 'mbti_analysis', insights.mbti)
    await saveInsight(client, analysisRunId, 'sentiment_timeline', insights.sentimentTimeline)
    await saveInsight(client, analysisRunId, 'response_patterns', insights.responsePatterns)
    await saveInsight(client, analysisRunId, 'activity_heatmap', insights.activityHeatmap)
    await saveInsight(client, analysisRunId, 'viral_moments', insights.viralMoments)
    await saveInsight(client, analysisRunId, 'analysis_meta', insights.meta)

    await client.query('UPDATE analysis_runs SET status = $1 WHERE id = $2', [
      'COMPLETED',
      analysisRunId,
    ])
    await client.query('COMMIT')

    const aggregateTarget = await pool.query<{ userId: string; personEntityId: string | null }>(
      `SELECT us.user_id AS "userId", ar.person_entity_id AS "personEntityId"
       FROM analysis_runs ar
       INNER JOIN upload_sessions us ON us.id = ar.upload_session_id
       WHERE ar.id = $1`,
      [analysisRunId],
    )

    if (aggregateTarget.rowCount) {
      const userId = aggregateTarget.rows[0].userId
      const personEntityId = aggregateTarget.rows[0].personEntityId

      await logAIUsage({
        userId,
        endpoint: '/upload-sessions/:id/analyze',
        operation: 'analysis_generation',
        provider: env.analysisMode === 'mock' ? 'mock' : 'openai',
        model: env.analysisMode === 'mock' ? 'deterministic-mock-v1' : env.openAiModel,
        inputTokens: analysisResult.usage.inputTokens,
        outputTokens: analysisResult.usage.outputTokens,
        totalTokens: analysisResult.usage.totalTokens,
        estimatedCostUsd:
          env.analysisMode === 'mock'
            ? 0
            : estimateCostUsd(
                analysisResult.usage.inputTokens,
                analysisResult.usage.outputTokens,
              ),
        metadata: {
          analysisRunId,
          sessionId,
          stage: 'run_analysis',
          mode: env.analysisMode,
        },
      })

      if (personEntityId) {
        await enqueueAggregatePersonalityJob({
          analysisRunId,
          userId,
          personEntityId,
        })
      }
    }

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export const runAnalysisWorker = new Worker<RunAnalysisJobData>(
  env.analysisQueueName,
  async (job) => {
    try {
      await processRunAnalysisJob(job)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown analysis worker error'
      await setAnalysisStatus(job.data.analysisRunId, 'FAILED')
      console.error(`[worker] analysis ${job.data.analysisRunId} failed: ${message}`)
      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  },
)

runAnalysisWorker.on('completed', (job) => {
  console.log(`[worker] completed run_analysis for analysisRun ${job.data.analysisRunId}`)
})

runAnalysisWorker.on('failed', (job, error) => {
  if (!job) return
  console.error(`[worker] failed run_analysis for analysisRun ${job.data.analysisRunId}: ${error.message}`)
})

export async function closeRunAnalysisWorker() {
  await runAnalysisWorker.close()
  await redisConnection.quit()
}
