import { env } from '../utils/env'

type BillingUsageEvent = {
  userId: string
  operation: string
  tokens: number
  estimatedCostUsd: number
  metadata?: Record<string, unknown>
}

export async function recordBillableUsage(_event: BillingUsageEvent): Promise<void> {
  if (env.billingProvider === 'none') {
    return
  }

  // Placeholder for Stripe/Paddle metered usage integration.
  // Example future implementation:
  // - lookup customer subscription item
  // - report usage quantity (tokens or cost units)
  // - handle retries/webhooks
  return
}
