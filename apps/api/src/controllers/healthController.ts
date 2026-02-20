import type { FastifyReply, FastifyRequest } from 'fastify'
import { getHealthStatus } from '../services/healthService'

export async function getHealth(_request: FastifyRequest, reply: FastifyReply) {
  const payload = getHealthStatus()
  return reply.status(200).send(payload)
}
