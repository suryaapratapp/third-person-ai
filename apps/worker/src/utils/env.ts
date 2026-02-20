import dotenv from 'dotenv'

dotenv.config()

function resolveAnalysisMode(rawMode: string | undefined, apiKey: string): 'mock' | 'live' {
  const normalized = (rawMode ?? '').trim().toLowerCase()
  if (!apiKey) return 'mock'
  if (normalized === 'live') return 'live'
  return 'mock'
}

export const env = {
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  parseExportQueueName: process.env.PARSE_EXPORT_QUEUE_NAME ?? 'parse_export',
  analysisQueueName: process.env.ANALYSIS_QUEUE_NAME ?? 'analysis_jobs',
  aggregatePersonalityQueueName:
    process.env.AGGREGATE_PERSONALITY_QUEUE_NAME ?? 'aggregate_personality_jobs',
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
    'postgresql://postgres:postgres@localhost:5432/third_person_ai?schema=public',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
}
