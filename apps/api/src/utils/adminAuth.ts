import type { FastifyReply, FastifyRequest } from 'fastify'
import { requireProtectedAuth } from './protectionMiddleware'
import { env } from './env'

export async function requireAdminAuth(request: FastifyRequest, reply: FastifyReply) {
  const authResult = await requireProtectedAuth(request, reply)
  if (authResult) {
    return authResult
  }

  const email = (request.authEmail || '').toLowerCase().trim()
  const userId = request.authUserId || ''

  const allowedByEmail = Boolean(email) && env.adminEmails.map((item) => item.toLowerCase()).includes(email)
  const allowedById = Boolean(userId) && env.adminIds.includes(userId)

  if (!allowedByEmail && !allowedById) {
    return reply.status(403).send({ error: 'Admin access required' })
  }
}
