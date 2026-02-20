import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { createProfileBodySchema, profileParamsSchema } from '../schemas/profileSchemas'
import { createProfileForUser, getProfileForUser, listProfilesForUser } from '../services/profileService'

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

export async function createProfileController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedBody = createProfileBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'Invalid request body',
      details: formatZodError(parsedBody.error),
    })
  }

  const profile = await createProfileForUser({
    userId: request.authUserId,
    personEntityId: parsedBody.data.personEntityId,
    name: parsedBody.data.name,
    type: parsedBody.data.type,
    profileJSON: parsedBody.data.profileJSON,
  })

  if (!profile) {
    return reply.status(404).send({ error: 'Person entity not found' })
  }

  return reply.status(201).send({ profile })
}

export async function listProfilesController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const profiles = await listProfilesForUser(request.authUserId)
  return reply.status(200).send({ profiles })
}

export async function getProfileController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  const parsedParams = profileParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid route params',
      details: formatZodError(parsedParams.error),
    })
  }

  const profile = await getProfileForUser(request.authUserId, parsedParams.data.id)
  if (!profile) {
    return reply.status(404).send({ error: 'Profile not found' })
  }

  return reply.status(200).send({ profile })
}
