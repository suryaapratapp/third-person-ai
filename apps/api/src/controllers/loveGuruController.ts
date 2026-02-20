import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import {
  createLoveGuruMessageBodySchema,
  createLoveGuruThreadBodySchema,
  listLoveGuruThreadsQuerySchema,
  loveGuruThreadParamsSchema,
} from '../schemas/loveGuruSchemas'
import {
  createLoveGuruMessageForUser,
  createLoveGuruThreadForUser,
  listLoveGuruThreadsForUser,
  listThreadMessagesForUser,
} from '../services/loveGuruService'

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

export async function createLoveGuruThreadController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedBody = createLoveGuruThreadBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'Invalid request body',
      details: formatZodError(parsedBody.error),
    })
  }

  const thread = await createLoveGuruThreadForUser({
    userId: request.authUserId,
    analysisId: parsedBody.data.analysisId,
    persona: parsedBody.data.persona,
    tone: parsedBody.data.tone,
  })

  if (!thread) {
    return reply.status(404).send({ error: 'Analysis run not found' })
  }

  return reply.status(201).send({ thread })
}

export async function listLoveGuruThreadsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedQuery = listLoveGuruThreadsQuerySchema.safeParse(request.query)
  if (!parsedQuery.success) {
    return reply.status(400).send({
      error: 'Invalid query params',
      details: formatZodError(parsedQuery.error),
    })
  }

  const threads = await listLoveGuruThreadsForUser(
    request.authUserId,
    parsedQuery.data.analysisId,
  )

  if (!threads) {
    return reply.status(404).send({ error: 'Analysis run not found' })
  }

  return reply.status(200).send({ threads })
}

export async function listLoveGuruMessagesController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = loveGuruThreadParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const messages = await listThreadMessagesForUser(request.authUserId, parsedParams.data.id)
  if (!messages) {
    return reply.status(404).send({ error: 'Love Guru thread not found' })
  }

  return reply.status(200).send({ messages })
}

export async function createLoveGuruMessageController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = loveGuruThreadParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const parsedBody = createLoveGuruMessageBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'Invalid request body',
      details: formatZodError(parsedBody.error),
    })
  }

  try {
    const result = await createLoveGuruMessageForUser({
      userId: request.authUserId,
      threadId: parsedParams.data.id,
      text: parsedBody.data.text,
    })

    if (!result) {
      return reply.status(404).send({ error: 'Love Guru thread not found' })
    }

    return reply.status(201).send(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Love Guru message'
    return reply.status(503).send({ error: message })
  }
}
