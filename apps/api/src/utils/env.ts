import dotenv from 'dotenv'

dotenv.config()

function toPort(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function resolveAnalysisMode(rawMode: string | undefined, apiKey: string): 'mock' | 'live' {
  const normalized = (rawMode ?? '').trim().toLowerCase()
  if (!apiKey) return 'mock'
  if (normalized === 'live') return 'live'
  return 'mock'
}

function toCsvList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function firstDefined(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (value && value.trim()) return value.trim()
  }
  return 'unknown'
}

const nodeEnv = process.env.NODE_ENV ?? 'development'
const defaultHost = nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1'

export const env = {
  nodeEnv,
  port: toPort(process.env.PORT, 3002),
  host: process.env.HOST ?? defaultHost,
  corsOrigins: toCsvList(process.env.CORS_ORIGIN, [
    'http://localhost:5173',
    'https://thethirdperson.ai',
    'https://www.thethirdperson.ai',
  ]),
  adminEmails: toCsvList(process.env.ADMIN_EMAILS, []),
  adminIds: toCsvList(process.env.ADMIN_IDS, []),
  commitSha: firstDefined(
    process.env.COMMIT_SHA,
    process.env.GIT_COMMIT,
    process.env.VERCEL_GIT_COMMIT_SHA,
    process.env.RENDER_GIT_COMMIT,
    process.env.RAILWAY_GIT_COMMIT_SHA,
  ),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  parseExportQueueName: process.env.PARSE_EXPORT_QUEUE_NAME ?? 'parse_export',
  analysisQueueName: process.env.ANALYSIS_QUEUE_NAME ?? 'analysis_jobs',
  openAiApiKey: process.env.OPENAI_API_KEY ?? '',
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  analysisMode: resolveAnalysisMode(process.env.ANALYSIS_MODE, process.env.OPENAI_API_KEY ?? ''),
  billingProvider: process.env.BILLING_PROVIDER ?? 'none',
  billingApiKey: process.env.BILLING_API_KEY ?? '',
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMaxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 60),
  quotaDailyDefault: toNumber(process.env.QUOTA_DAILY_DEFAULT, 1000),
  quotaDailyAnalyze: toNumber(process.env.QUOTA_DAILY_ANALYZE, 100),
  quotaDailyLoveGuruMessages: toNumber(process.env.QUOTA_DAILY_LOVE_GURU_MESSAGES, 300),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret',
  accessTokenTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTokenTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  maxUploadFileSizeBytes: toPort(process.env.MAX_UPLOAD_FILE_SIZE_BYTES, 10 * 1024 * 1024),
}
