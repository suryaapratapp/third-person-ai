import { randomUUID } from 'node:crypto'
import IORedis from 'ioredis'
import OpenAI from 'openai'
import { Job, Queue, Worker } from 'bullmq'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { pool } from '../utils/db'
import { env } from '../utils/env'
import { estimateCostUsd, logAIUsage } from './aiUsageLogger'

type AggregatePersonalityJobData = {
  analysisRunId: string
  personEntityId: string
  userId: string
}

type InsightRow = {
  analysisRunId: string
  analysisCreatedAt: string
  insightType: string | null
  payload: unknown
}

const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
})

const enqueueQueue = new Queue<AggregatePersonalityJobData>(env.aggregatePersonalityQueueName, {
  connection: redisConnection,
})

const personalitySchema = z.object({
  summary: z.string().min(1),
  likelyTraits: z.array(z.string()).min(3).max(8),
  communicationStyle: z.object({
    strengths: z.array(z.string()).min(2).max(6),
    frictionPatterns: z.array(z.string()).min(2).max(6),
  }),
  emotionalPatterns: z.object({
    regulationSignals: z.array(z.string()).min(1).max(5),
    stressSignals: z.array(z.string()).min(1).max(5),
  }),
  relationshipNeeds: z.array(z.string()).min(2).max(6),
  growthSuggestions: z.array(z.string()).min(2).max(6),
  confidence: z.enum(['low', 'medium', 'high']),
  limitations: z.array(z.string()).min(1).max(5),
})

const openai = new OpenAI({ apiKey: env.openAiApiKey })

function compactPayload(payload: unknown): string {
  const value = JSON.stringify(payload)
  return value.length > 320 ? `${value.slice(0, 320)}...` : value
}

function buildContext(rows: InsightRow[]): string {
  const grouped = new Map<string, { createdAt: string; insights: string[] }>()

  for (const row of rows) {
    if (!grouped.has(row.analysisRunId)) {
      grouped.set(row.analysisRunId, {
        createdAt: row.analysisCreatedAt,
        insights: [],
      })
    }

    if (row.insightType) {
      grouped.get(row.analysisRunId)?.insights.push(
        `${row.insightType}: ${compactPayload(row.payload)}`,
      )
    }
  }

  return [...grouped.entries()]
    .slice(0, 10)
    .map(([analysisId, data]) => {
      const sample = data.insights.slice(0, 8).map((line) => `  - ${line}`).join('\n')
      return `Analysis ${analysisId} (${data.createdAt})\n${sample || '  - No insights stored'}`
    })
    .join('\n\n')
}

async function loadAggregateInputs(personEntityId: string): Promise<InsightRow[]> {
  const result = await pool.query<{
    analysisRunId: string
    analysisCreatedAt: string
    insightType: string | null
    payload: unknown
  }>(
    `SELECT
      ar.id AS "analysisRunId",
      ar.created_at::text AS "analysisCreatedAt",
      i.type AS "insightType",
      i.payload AS "payload"
    FROM analysis_runs ar
    LEFT JOIN insights i ON i.analysis_run_id = ar.id
    WHERE ar.person_entity_id = $1
      AND ar.status = 'COMPLETED'
    ORDER BY ar.created_at DESC, i.created_at ASC`,
    [personEntityId],
  )

  return result.rows
}

async function generatePersonalityProfile(
  context: string,
): Promise<{
  profile: z.infer<typeof personalitySchema>
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}> {
  const completion = await openai.chat.completions.parse({
    model: env.openAiModel,
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      {
        role: 'system',
        content:
          'You build cumulative personality profiles from repeated relationship analyses. Use patterns/signals language only and avoid guarantees.',
      },
      {
        role: 'user',
        content:
          `Create an aggregate personality profile from these analyses for one person.\n` +
          `Be concise, practical, and uncertainty-aware.\n\n${context}`,
      },
    ],
    response_format: zodResponseFormat(personalitySchema, 'aggregate_personality_profile'),
  })

  const parsed = completion.choices[0]?.message?.parsed
  if (!parsed) {
    throw new Error('OpenAI returned empty personality profile payload')
  }

  const inputTokens = completion.usage?.prompt_tokens ?? 0
  const outputTokens = completion.usage?.completion_tokens ?? 0
  const totalTokens = completion.usage?.total_tokens ?? inputTokens + outputTokens

  return {
    profile: personalitySchema.parse(parsed),
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
    },
  }
}

async function processAggregatePersonalityJob(job: Job<AggregatePersonalityJobData>) {
  if (!env.openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const { userId, personEntityId } = job.data

  const personEntityResult = await pool.query<{ id: string }>(
    'SELECT id FROM person_entities WHERE id = $1 AND user_id = $2',
    [personEntityId, userId],
  )

  if (!personEntityResult.rowCount) {
    throw new Error('Person entity not found for user')
  }

  const inputs = await loadAggregateInputs(personEntityId)
  if (!inputs.length) {
    throw new Error('No completed analyses found for personality aggregation')
  }

  const context = buildContext(inputs)
  const personalityResult = await generatePersonalityProfile(context)
  const profile = personalityResult.profile

  await pool.query(
    `INSERT INTO personality_profiles (id, user_id, person_entity_id, profile_json, created_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())`,
    [randomUUID(), userId, personEntityId, JSON.stringify(profile)],
  )

  await logAIUsage({
    userId,
    endpoint: '/profiles',
    operation: 'aggregate_personality',
    provider: 'openai',
    model: env.openAiModel,
    inputTokens: personalityResult.usage.inputTokens,
    outputTokens: personalityResult.usage.outputTokens,
    totalTokens: personalityResult.usage.totalTokens,
    estimatedCostUsd: estimateCostUsd(
      personalityResult.usage.inputTokens,
      personalityResult.usage.outputTokens,
    ),
    metadata: {
      personEntityId,
      analysisRunId: job.data.analysisRunId,
      source: 'aggregate_personality_worker',
    },
  })
}

export async function enqueueAggregatePersonalityJob(data: AggregatePersonalityJobData) {
  return enqueueQueue.add('aggregate_personality', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  })
}

export const aggregatePersonalityWorker = new Worker<AggregatePersonalityJobData>(
  env.aggregatePersonalityQueueName,
  async (job) => {
    await processAggregatePersonalityJob(job)
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
)

aggregatePersonalityWorker.on('completed', (job) => {
  console.log(`[worker] completed aggregate_personality for personEntity ${job.data.personEntityId}`)
})

aggregatePersonalityWorker.on('failed', (job, error) => {
  if (!job) return
  console.error(
    `[worker] failed aggregate_personality for personEntity ${job.data.personEntityId}: ${error.message}`,
  )
})

export async function closeAggregatePersonalityWorker() {
  await aggregatePersonalityWorker.close()
  await enqueueQueue.close()
  await redisConnection.quit()
}
