import { FastifyReply, FastifyRequest } from "fastify"
import { enforceRateLimit } from "../services/rateLimitService"

export async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // console.log('RATE LIMIT MIDDLEWARE HIT')
  const endpoint = request.routerPath || request.url 

  const identifier = request.authUserId
  ? `user:${request.authUserId}`
  : `ip:${request.ip}`

  const { allowed, retryAfterSec } = enforceRateLimit(
    identifier,
    endpoint
  )

  if (!allowed) {
    return reply.status(429).send({
      error: 'Too many requests',
      retryAfter: retryAfterSec,
    })
  }
}