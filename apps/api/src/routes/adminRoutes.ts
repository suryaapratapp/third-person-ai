import type { FastifyInstance } from 'fastify'
import {
  adminCreateUserController,
  adminDeleteUploadSessionController,
  adminDeleteUserController,
  adminListUploadSessionsController,
  adminListUsersController,
  adminUpdateUploadSessionController,
  adminUpdateUserController,
} from '../controllers/adminController'
import { requireAdminAuth } from '../utils/adminAuth'

export async function adminRoutes(app: FastifyInstance) {
  app.get('/admin/users', {
    preHandler: requireAdminAuth,
    handler: adminListUsersController,
  })

  app.post('/admin/users', {
    preHandler: requireAdminAuth,
    handler: adminCreateUserController,
  })

  app.patch('/admin/users/:id', {
    preHandler: requireAdminAuth,
    handler: adminUpdateUserController,
  })

  app.delete('/admin/users/:id', {
    preHandler: requireAdminAuth,
    handler: adminDeleteUserController,
  })

  app.get('/admin/upload-sessions', {
    preHandler: requireAdminAuth,
    handler: adminListUploadSessionsController,
  })

  app.patch('/admin/upload-sessions/:id', {
    preHandler: requireAdminAuth,
    handler: adminUpdateUploadSessionController,
  })

  app.delete('/admin/upload-sessions/:id', {
    preHandler: requireAdminAuth,
    handler: adminDeleteUploadSessionController,
  })
}
