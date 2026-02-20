import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { createMatchesBodySchema, matchParamsSchema } from '../schemas/matchSchemas'
import { createMatchesForUser, getMatchForUser } from '../services/matchService'

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

export async function createMatchesController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedBody = createMatchesBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'Invalid request body',
      details: formatZodError(parsedBody.error),
    })
  }

  if (parsedBody.data.minScore > parsedBody.data.maxScore) {
    return reply.status(400).send({
      error: 'minScore cannot be greater than maxScore',
    })
  }

  try {
    const matches = await createMatchesForUser({
      authUserId: request.authUserId,
      userId: parsedBody.data.userId,
      minScore: parsedBody.data.minScore,
      maxScore: parsedBody.data.maxScore,
      filters: parsedBody.data.filters,
    })
    return reply.status(200).send({ matches })
  } catch (error) {
    if (error instanceof Error && error.message === 'Forbidden') {
      return reply.status(403).send({ error: 'Forbidden' })
    }
    return reply.status(500).send({ error: 'Failed to generate matches' })
  }
}

export async function getMatchController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = matchParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const match = await getMatchForUser(request.authUserId, parsedParams.data.id)
  if (!match) {
    return reply.status(404).send({ error: 'Match not found' })
  }

  return reply.status(200).send({ match })
}
