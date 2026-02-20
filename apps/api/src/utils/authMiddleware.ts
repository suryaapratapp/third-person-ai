import type { FastifyReply, FastifyRequest } from 'fastify'
import { verifyAccessToken } from './jwt'

function extractBearerToken(header?: string): string | null {
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(request.headers.authorization)

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }

  request.authUserId = payload.sub
  request.authEmail = payload.email
}
