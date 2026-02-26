import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  adminIdParamsSchema,
  adminSessionListQuerySchema,
  adminSessionUpdateBodySchema,
  adminUserCreateBodySchema,
  adminUsersQuerySchema,
  adminUserUpdateBodySchema,
} from '../schemas/adminSchemas'
import {
  createAdminUser,
  deleteAdminUploadSession,
  deleteAdminUser,
  listAdminUploadSessions,
  listAdminUsers,
  updateAdminUploadSession,
  updateAdminUser,
} from '../services/adminService'

function sendValidationError(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: message })
}

export async function adminListUsersController(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
) {
  const parsed = adminUsersQuerySchema.safeParse(request.query)
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error.issues[0]?.message || 'Invalid query')
  }

  const result = await listAdminUsers(parsed.data)
  return reply.status(200).send(result)
}

export async function adminCreateUserController(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
) {
  const parsed = adminUserCreateBodySchema.safeParse(request.body)
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error.issues[0]?.message || 'Invalid payload')
  }

  try {
    const user = await createAdminUser(parsed.data)
    return reply.status(201).send({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create user'
    return reply.status(400).send({ error: message })
  }
}

export async function adminUpdateUserController(
  request: FastifyRequest<{ Params: unknown; Body: unknown }>,
  reply: FastifyReply,
) {
  const parsedParams = adminIdParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return sendValidationError(reply, parsedParams.error.issues[0]?.message || 'Invalid id')
  }

  const parsedBody = adminUserUpdateBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return sendValidationError(reply, parsedBody.error.issues[0]?.message || 'Invalid payload')
  }

  try {
    const user = await updateAdminUser(parsedParams.data.id, parsedBody.data)
    return reply.status(200).send({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update user'
    return reply.status(400).send({ error: message })
  }
}

export async function adminDeleteUserController(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply,
) {
  const parsedParams = adminIdParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return sendValidationError(reply, parsedParams.error.issues[0]?.message || 'Invalid id')
  }

  if (request.authUserId && request.authUserId === parsedParams.data.id) {
    return reply.status(400).send({ error: 'You cannot delete your own account from admin panel.' })
  }

  try {
    await deleteAdminUser(parsedParams.data.id)
    return reply.status(200).send({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete user'
    return reply.status(400).send({ error: message })
  }
}

export async function adminListUploadSessionsController(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
) {
  const parsed = adminSessionListQuerySchema.safeParse(request.query)
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error.issues[0]?.message || 'Invalid query')
  }

  const result = await listAdminUploadSessions(parsed.data)
  return reply.status(200).send(result)
}

export async function adminUpdateUploadSessionController(
  request: FastifyRequest<{ Params: unknown; Body: unknown }>,
  reply: FastifyReply,
) {
  const parsedParams = adminIdParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return sendValidationError(reply, parsedParams.error.issues[0]?.message || 'Invalid id')
  }

  const parsedBody = adminSessionUpdateBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return sendValidationError(reply, parsedBody.error.issues[0]?.message || 'Invalid payload')
  }

  try {
    const session = await updateAdminUploadSession(parsedParams.data.id, parsedBody.data)
    return reply.status(200).send({ session })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update upload session'
    return reply.status(400).send({ error: message })
  }
}

export async function adminDeleteUploadSessionController(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply,
) {
  const parsedParams = adminIdParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return sendValidationError(reply, parsedParams.error.issues[0]?.message || 'Invalid id')
  }

  try {
    await deleteAdminUploadSession(parsedParams.data.id)
    return reply.status(200).send({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete upload session'
    return reply.status(400).send({ error: message })
  }
}
