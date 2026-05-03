import dotenv from 'dotenv'
import type { RedisOptions } from 'ioredis'

dotenv.config()

/** Match API queueService: plain redis:// must not use TLS (local Redis). Use rediss:// or REDIS_TLS=true for TLS. */
export function getRedisConnectionOptions(): RedisOptions {
  const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
  const useTls =
    url.startsWith('rediss://') ||
    (process.env.REDIS_TLS ?? '').trim().toLowerCase() === 'true'
  return {
    maxRetriesPerRequest: null,
    ...(useTls ? { tls: {} } : {}),
  }
}

function resolveAnalysisMode(rawMode: string | undefined, apiKey: string): 'mock' | 'live' {
  const normalized = (rawMode ?? '').trim().toLowerCase()
  if (!apiKey) return 'mock'
  if (normalized === 'live') return 'live'
  return 'mock'
}

export const env = {
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  parseExportQueueName: process.env.PARSE_EXPORT_QUEUE_NAME ?? 'parse_export',
  parseExportDeadLetterQueueName:
    process.env.PARSE_EXPORT_DLQ_NAME ?? 'parse_export_dead_letter',
  analysisQueueName: process.env.ANALYSIS_QUEUE_NAME ?? 'analysis_jobs',
  analysisDeadLetterQueueName:
    process.env.ANALYSIS_DLQ_NAME ?? 'analysis_jobs_dead_letter',
  aggregatePersonalityQueueName:
    process.env.AGGREGATE_PERSONALITY_QUEUE_NAME ?? 'aggregate_personality_jobs',
  parseJobLockTtlSec: Number.parseInt(process.env.PARSE_JOB_LOCK_TTL_SEC ?? '300', 10),
  analysisSessionLockTtlSec: Number.parseInt(process.env.ANALYSIS_SESSION_LOCK_TTL_SEC ?? '1800', 10),
  openAiApiKey: process.env.OPENAI_API_KEY ?? '',
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  analysisMode: resolveAnalysisMode(process.env.ANALYSIS_MODE, process.env.OPENAI_API_KEY ?? ''),
  analysisMaxInputMessages: Number.parseInt(process.env.ANALYSIS_MAX_INPUT_MESSAGES ?? '4000', 10),
  analysisChunkTokenBudget: Number.parseInt(
    process.env.ANALYSIS_CHUNK_TOKEN_BUDGET ?? '1200',
    10,
  ),
  analysisFinalTokenBudget: Number.parseInt(
    process.env.ANALYSIS_FINAL_TOKEN_BUDGET ?? '3000',
    10,
  ),
  openAiMaxRetries: Number.parseInt(process.env.OPENAI_MAX_RETRIES ?? '3', 10),
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@127.0.0.1:5432/third_person_ai?schema=public',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
}
