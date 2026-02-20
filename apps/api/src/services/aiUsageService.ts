import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { recordBillableUsage } from './billingService'

type AIUsageParams = {
  userId?: string | null
  endpoint: string
  operation: string
  provider: string
  model?: string | null
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  estimatedCostUsd?: number
  metadata?: Record<string, unknown>
}

export async function logAIUsage(params: AIUsageParams): Promise<void> {
  const estimatedCost =
    typeof params.estimatedCostUsd === 'number' ? params.estimatedCostUsd : 0

  await prisma.aIUsageLog.create({
    data: {
      userId: params.userId ?? null,
      endpoint: params.endpoint,
      operation: params.operation,
      provider: params.provider,
      model: params.model ?? null,
      inputTokens: params.inputTokens ?? null,
      outputTokens: params.outputTokens ?? null,
      totalTokens: params.totalTokens ?? null,
      estimatedCostUsd: new Prisma.Decimal(estimatedCost),
      metadata: JSON.parse(
        JSON.stringify(params.metadata ?? {}),
      ) as Prisma.InputJsonValue,
    },
  })

  if (params.userId && (params.totalTokens ?? 0) > 0) {
    await recordBillableUsage({
      userId: params.userId,
      operation: params.operation,
      tokens: params.totalTokens ?? 0,
      estimatedCostUsd: estimatedCost,
      metadata: params.metadata,
    })
  }
}
