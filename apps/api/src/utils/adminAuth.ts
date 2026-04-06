import type { FastifyReply, FastifyRequest } from 'fastify'
import { requireProtectedAuth } from './protectionMiddleware'
import { env } from './env'

const normalizedAdminEmails = new Set(
  env.adminEmails.map((email) => email.trim().toLowerCase())
)

const adminIdsSet = new Set(env.adminIds)

export async function requireAdminAuth(request: FastifyRequest, reply: FastifyReply) {
  const authResult = await requireProtectedAuth(request, reply)
  if (authResult) {
    return 
  }

  const email = (request.authEmail || '').trim().toLowerCase()
  const userId = request.authUserId || ''

  const allowedByEmail = email && normalizedAdminEmails.has(email)
  const allowedById = userId && adminIdsSet.has(userId)

  if (!allowedByEmail && !allowedById) {
    request.log.warn({email, userId}, 'Unauthorized admin access attempt')
    reply.status(403).send({ error: 'Admin access required' })
    return
  }
}
