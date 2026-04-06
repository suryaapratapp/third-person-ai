import type { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { createProfileBodySchema, profileParamsSchema } from '../schemas/profileSchemas'
import { createProfileForUser, getProfileForUser, listProfilesForUser } from '../services/profileService'
import { ca } from 'zod/v4/locales'
import { AppError } from '../errors/AppError'

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

//create profile
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

  try{
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
}catch (error) {

  if(error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  request.log.error({
  requestId: request.id,
  error,
  userId: request.authUserId,
  body: {
    personEntityId: parsedBody.data.personEntityId,
    name: parsedBody.data.name,
    type: parsedBody.data.type
    }
  }, 'Failed to create profile')
  return reply.status(500).send({ error: 'Failed to create profile' })
  }
}

//list all profiles for the authenticated user
export async function listProfilesController(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUserId) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }

  try {  //add pagination and filtering in the future if needed
  const profiles = await listProfilesForUser(request.authUserId)
  return reply.status(200).send({ profiles })
  } catch (error) {
    if(error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message })
    } 
    request.log.error({
    requestId: request.id,
    error,
    userId: request.authUserId
  }, 'Failed to list profiles')
    return reply.status(500).send({ error: 'Failed to list profiles' })
  }
}

//get profile by id
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

  try {
  const profile = await getProfileForUser(request.authUserId, parsedParams.data.id)
  if (!profile) {
    return reply.status(404).send({ error: 'Profile not found' })
  }

  return reply.status(200).send({ profile })
}catch (error) {
    if(error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message })
    } 
    request.log.error({
    requestId: request.id,
    error,
    userId: request.authUserId, 
    profileId: parsedParams.data.id
  }, 'Failed to get profile')
    return reply.status(500).send({ error: 'Failed to get profile' })

  }
}
