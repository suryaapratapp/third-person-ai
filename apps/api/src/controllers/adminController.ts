import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  AdminIdParams,
  adminIdParamsSchema,
  adminSessionListQuerySchema,
  AdminSessionUpdateBody,
  adminSessionUpdateBodySchema,
  adminUserCreateBodySchema,
  AdminUsersQuery,
  adminUsersQuerySchema,
  AdminUserUpdateBody,
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
import { NotFoundError } from '../errors/NotFoundError'
import { AppError } from '../errors/AppError'
import { ZodError } from 'zod'

function sendValidationError(reply: FastifyReply, message: string) {
  return reply.status(400).send({ error: message })
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

// admin requesting list of all users
export async function adminListUsersController(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
) {
  const parsed = adminUsersQuerySchema.safeParse(request.query)

  if (!parsed.success) {
    
       return reply.status(400).send({
      error: 'Invalid Request',
      details: formatZodError(parsed.error),
    })
    
  }

  try {
    const result = await listAdminUsers(parsed.data)
    return reply.send(result)
  } catch (error) {
    request.log.error({ err: error }, 'Error listing users in admin panel')

    return reply.status(500).send({
      error: 'Internal server error',
    })
  }
}

export async function adminCreateUserController(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
) {
  const parsed = adminUserCreateBodySchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Invalid params',
      details: formatZodError(parsed.error),
    })
  }

  try {
    const user = await createAdminUser(parsed.data)
    return reply.status(201).send({ user })
  } catch (error) {

     if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
        code: error.code,
      })
    }

    request.log.error(
      { err: error },
      'Unexpected error creating user in admin panel'
    )

    return reply.status(500).send({
      error: 'Internal Server Error',
    })
  }
  
}

export async function adminUpdateUserController(
  request: FastifyRequest<{ Params: AdminIdParams; Body: AdminUserUpdateBody }>,
  reply: FastifyReply,
) {
  //validate
  const parsedParams = adminIdParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
      return reply.status(400).send({
      error: 'Invalid ID',
      details: formatZodError(parsedParams.error),
    })
  }


  const parsedBody = adminUserUpdateBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
  return reply.status(400).send({
      errors: parsedBody.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }
  //update
  try {
    const user = await updateAdminUser(parsedParams.data.id, parsedBody.data)
    return reply.status(200).send({
      success: true,
      data: user
    })
  } catch (error) {
     request.log.error(
     { err: error, userId: parsedParams.data.id },
     'Failed to update admin user'
     )
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: error.safeMessage })
    }

    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}

export async function adminDeleteUserController(
  request: FastifyRequest<{ Params: AdminIdParams }>,
  reply: FastifyReply,
) {
  const parsedParams = adminIdParamsSchema.safeParse(request.params)
  if (!parsedParams.success) {
    return reply.status(400).send({
      error: 'Invalid Id',
      details: formatZodError(parsedParams.error),
    })
  }
  

  if (request.authUserId === parsedParams.data.id) {
    return reply.status(403).send({ error: 'Forbidden.' })
  }

  try {
    await deleteAdminUser(parsedParams.data.id)
    return reply.status(200).send({ success: true })
  } catch (error) {
    request.log.error(
     { err: error, userId: parsedParams.data.id, performedBy: request.authUserId },
     'Failed to delete admin user'
     )
    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: error.safeMessage })
    }

    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}


export async function adminListUploadSessionsController(
  request: FastifyRequest<{ Querystring: unknown }>,
  reply: FastifyReply,
) {
  const parsed = adminSessionListQuerySchema.safeParse(request.query)
  
  if (!parsed.success) {
   return reply.status(400).send({
      error: 'Invalid Request',
      details: formatZodError(parsed.error),
    })
  }
  
  try{
  const result = await listAdminUploadSessions(parsed.data)
  return reply.status(200).send(result)
  }catch (error: unknown) {

    request.log.error({ err: error }, 'Error listing upload sessions in admin panel')

    if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
    })
  }

    return reply.status(500).send({ error: 'Internal Server Error' })

  }
}

export async function adminUpdateUploadSessionController(
  request: FastifyRequest<{ Params: AdminIdParams; Body: AdminSessionUpdateBody }>,
  reply: FastifyReply,
) {
  const parsedParams = adminIdParamsSchema.safeParse(request.params)
   if (!parsedParams.success) {
     return reply.status(400).send({
      error: 'Invalid Session',
      details: formatZodError(parsedParams.error),
    })
  }

  const parsedBody = adminSessionUpdateBodySchema.safeParse(request.body)
  if (!parsedBody.success) {
    return reply.status(400).send({
      error: 'Invalid Request',
      details: formatZodError(parsedBody.error),
    })
  }

  try {
    const session = await updateAdminUploadSession(parsedParams.data.id, parsedBody.data)
    return reply.status(200).send({ session })
  } catch (error: unknown) {

    if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
    error: error.message,
    code: error.code,
    })
  }

    request.log.error(
     { err: error, userId: parsedParams.data.id },
     'Failed to update admin upload session'
     )

    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}

export async function adminDeleteUploadSessionController(
  request: FastifyRequest<{ Params: unknown }>,
  reply: FastifyReply,
) {
  const parsedParams = adminIdParamsSchema.safeParse(request.params)
  
  if (!parsedParams.success) {
     return reply.status(400).send({
      error: 'Invalid Session',
      details: formatZodError(parsedParams.error),
    })
  }

  try {
    await deleteAdminUploadSession(parsedParams.data.id)
    return reply.status(204).send({ success: true })
  } catch (error: unknown) {

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
      error: error.message,
      code: error.code,
      })
    }

    request.log.error(
     { err: error, userId: parsedParams.data.id ,performedBy: request.authUserId},
     'Failed to delete admin upload session'
     )
      

    return reply.status(500).send({ error: 'Internal Server Error' })
  }
}
