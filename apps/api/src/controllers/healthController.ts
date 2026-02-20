import type { FastifyReply, FastifyRequest } from 'fastify'
import { getHealthStatus, getReadinessStatus } from '../services/healthService'

export async function getHealth(_request: FastifyRequest, reply: FastifyReply) {
  const payload = getHealthStatus()
  return reply.status(200).send(payload)
}

export async function getReady(_request: FastifyRequest, reply: FastifyReply) {
  const payload = await getReadinessStatus()
  const statusCode = payload.status === 'ready' ? 200 : 503
  return reply.status(statusCode).send(payload)
}
