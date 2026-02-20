import { randomUUID } from 'node:crypto'
import { pool } from '../utils/db'

type AIUsageLogParams = {
  userId?: string | null
  endpoint: string
  operation: string
  provider: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  estimatedCostUsd?: number
  metadata?: Record<string, unknown>
}

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return Number(((inputTokens + outputTokens) * 0.0000005).toFixed(6))
}

export async function logAIUsage(params: AIUsageLogParams): Promise<void> {
  await pool.query(
    `INSERT INTO ai_usage_logs (
      id, user_id, endpoint, provider, model, operation,
      input_tokens, output_tokens, total_tokens, estimated_cost_usd, metadata, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::numeric, $11::jsonb, NOW())`,
    [
      randomUUID(),
      params.userId ?? null,
      params.endpoint,
      params.provider,
      params.model ?? null,
      params.operation,
      params.inputTokens ?? null,
      params.outputTokens ?? null,
      params.totalTokens ?? null,
      params.estimatedCostUsd ?? 0,
      JSON.stringify(params.metadata ?? {}),
    ],
  )
}
