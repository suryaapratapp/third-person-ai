import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'


import {
  CreateLoveGuruThreadBody,
  CreateLoveGuruMessageBody,
  ListLoveGuruThreadsQuery,
  LoveGuruThreadParams,
  createLoveGuruThreadBodySchema,
  createLoveGuruMessageBodySchema,
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

//create
export async function createLoveGuruThreadController(
  request: FastifyRequest<{ Body: CreateLoveGuruThreadBody }>,
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

  let thread
try{
   thread = await createLoveGuruThreadForUser({
    userId: request.authUserId,
    analysisId: parsedBody.data.analysisId,
    persona: parsedBody.data.persona,
    tone: parsedBody.data.tone,
  })
  return reply.status(201).send({ thread })

} catch (error) {
   request.log.error({ error }, 'Failed to create LoveGuru thread')

  
    return reply.status(500).send({
      error: 'Internal server error',
    })
}

  

}

//get all threads
export async function listLoveGuruThreadsController(
  request: FastifyRequest<{ Querystring: ListLoveGuruThreadsQuery }>,
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

  const analysisId = parsedQuery.data.analysisId
try {
  const threads = await listLoveGuruThreadsForUser(
    request.authUserId,
    analysisId,
  )
    return reply.status(200).send({ threads })


} catch (error) {
   request.log.error({ error }, 'Failed to list LoveGuru threads')
   
    return reply.status(500).send({
      error: 'Internal server error',
    })
}

 

}

//get messages for a thread
export async function listLoveGuruMessagesController(
  request: FastifyRequest<{ Params: LoveGuruThreadParams }>,
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
  
  try {
    const messages = await listThreadMessagesForUser(request.authUserId, parsedParams.data.id)
    return reply.status(200).send({ messages })
} catch (error) {
   request.log.error({ error }, 'Failed to list LoveGuru thread messages')   

  return reply.status(500).send({ error: 'Internal server error' })

  }
}

//create message in thread
export async function createLoveGuruMessageController(
  request: FastifyRequest<{ Params: LoveGuruThreadParams; Body: CreateLoveGuruMessageBody }>,
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

    return reply.status(201).send({message: result})
  } catch (error) {
    request.log.error({ error }, 'Failed to create Love Guru message')   

    return reply.status(500).send({ error: 'Failed to create Love Guru message' })
  }
}
