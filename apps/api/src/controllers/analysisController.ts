import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import {
  createAnalysisRunBodySchema,
  analysisDetailResponseSchema,
  analysisInsightsResponseSchema,
  analysisRunParamsSchema,
} from '../schemas/analysisSchemas'
import { uploadSessionParamsSchema } from '../schemas/uploadSessionSchemas'
import {
  createAnalysisRunForUser,
  deleteAnalysisRunForUser,
  getAnalysisDetailsForUser,
  getAnalysisInsightsForUser,
  getAnalysisRunStatusForUser,
  listAnalysisRunsForUser,
} from '../services/analysisService'
import { enqueueRunAnalysisJob } from '../services/queueService'

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

function toPublicAnalysisStatus(status: string) {
  return status === 'COMPLETED' ? 'READY' : status
}

export async function createAnalysisRunController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = uploadSessionParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const parsedBody = createAnalysisRunBodySchema.safeParse(request.body ?? {})
  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'Invalid request body',
      details: formatZodError(parsedBody.error),
    })
  }

  const analysisRun = await createAnalysisRunForUser(
    request.authUserId,
    parsedParams.data.id,
    parsedBody.data.personEntityId,
  )

  if (!analysisRun) {
    return reply.status(404).send({ error: 'Upload session or person entity not found' })
  }

  await enqueueRunAnalysisJob(analysisRun.id, analysisRun.uploadSessionId)

  return reply.status(201).send({
    analysisRunId: analysisRun.id,
    status: analysisRun.status,
  })
}

export async function getAnalysisRunStatusController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = analysisRunParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const analysisRun = await getAnalysisRunStatusForUser(
    request.authUserId,
    parsedParams.data.id,
  )

  if (!analysisRun) {
    return reply.status(404).send({ error: 'Analysis run not found' })
  }

  return reply.status(200).send({
    analysisRunId: analysisRun.id,
    status: toPublicAnalysisStatus(analysisRun.status),
    createdAt: analysisRun.createdAt,
  })
}

export async function getAnalysisInsightsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = analysisRunParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const result = await getAnalysisInsightsForUser(request.authUserId, parsedParams.data.id)
  if (!result) {
    return reply.status(404).send({ error: 'Analysis run not found' })
  }

  const validated = analysisInsightsResponseSchema.safeParse(result)
  if (!validated.success) {
    return reply.status(500).send({
      error: 'Invalid analysis insights payload',
      details: formatZodError(validated.error),
    })
  }

  return reply.status(200).send({
    ...validated.data,
    status: toPublicAnalysisStatus(validated.data.status),
  })
}

export async function getAnalysisDetailsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = analysisRunParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const result = await getAnalysisDetailsForUser(request.authUserId, parsedParams.data.id)
  if (!result) {
    return reply.status(404).send({ error: 'Analysis run not found' })
  }

  const validated = analysisDetailResponseSchema.safeParse(result)
  if (!validated.success) {
    return reply.status(500).send({
      error: 'Invalid analysis detail payload',
      details: formatZodError(validated.error),
    })
  }

  return reply.status(200).send(validated.data)
}

export async function listAnalysesController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const analyses = await listAnalysisRunsForUser(request.authUserId)
  return reply.status(200).send({ analyses })
}

export async function deleteAnalysisController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = analysisRunParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const ok = await deleteAnalysisRunForUser(request.authUserId, parsedParams.data.id)
  if (!ok) {
    return reply.status(404).send({ error: 'Analysis run not found' })
  }

  return reply.status(200).send({ success: true })
}
