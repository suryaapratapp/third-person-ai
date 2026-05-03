import type { FastifyReply, FastifyRequest } from 'fastify'
import { enforceRateLimit } from '../services/rateLimitService'

export async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const endpoint = request.routeOptions.url || request.url.split('?')[0] || '/unknown'
  const identifier = request.authUserId ? `user:${request.authUserId}` : `ip:${request.ip}`

  try {
    const rate = await enforceRateLimit(identifier, endpoint)
    if (!rate.allowed) {
      reply.header('Retry-After', String(rate.retryAfterSec))
      return reply.status(429).send({
        error: 'Too many requests',
        endpoint,
        retryAfterSec: rate.retryAfterSec,
      })
    }
  } catch (error) {
    request.log.warn(
      { endpoint, error: error instanceof Error ? error.message : String(error) },
      'rate limit check failed, allowing request',
    )
  }
}
