import type { FastifyReply, FastifyRequest } from 'fastify'
import { requireAuth } from './authMiddleware'
import { enforceRateLimit } from '../services/rateLimitService'
import { enforceDailyQuota } from '../services/quotaService'

function endpointKey(request: FastifyRequest): string {
  return request.routeOptions.url || request.url.split('?')[0] || 'unknown'
}

export async function requireProtectedAuth(request: FastifyRequest, reply: FastifyReply) {
  const authResponse = await requireAuth(request, reply)
  if (authResponse) {
    return authResponse
  }

  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const endpoint = endpointKey(request)
  const rate = enforceRateLimit(request.authUserId, endpoint)
  if (!rate.allowed) {
    reply.header('Retry-After', String(rate.retryAfterSec))
    return reply.status(429).send({
      error: 'Rate limit exceeded',
      endpoint,
      retryAfterSec: rate.retryAfterSec,
    })
  }

  const quota = await enforceDailyQuota(request.authUserId, endpoint)
  reply.header('X-Quota-Limit', String(quota.limit))
  reply.header('X-Quota-Remaining', String(quota.remaining))
  if (!quota.allowed) {
    return reply.status(429).send({
      error: 'Daily quota exceeded',
      endpoint,
      limit: quota.limit,
    })
  }
}
