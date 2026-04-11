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
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware'

export async function adminRoutes(app: FastifyInstance) {
  app.get('/admin/users', {   
    preHandler: [requireAdminAuth, rateLimitMiddleware],
    handler: adminListUsersController,
  })

  app.post('/admin/users', {  
    preHandler: [requireAdminAuth, rateLimitMiddleware],
    handler: adminCreateUserController,
  })

  app.patch('/admin/users/:id', {  
    preHandler: [requireAdminAuth, rateLimitMiddleware],
    handler: adminUpdateUserController,
  })

  app.delete('/admin/users/:id', {  
    preHandler: [requireAdminAuth, rateLimitMiddleware],
    handler: adminDeleteUserController,
  })

  app.get('/admin/upload-sessions', {   
    preHandler: [requireAdminAuth, rateLimitMiddleware],
    handler: adminListUploadSessionsController,
  })

  app.patch('/admin/upload-sessions/:id', { 
    preHandler: [requireAdminAuth, rateLimitMiddleware],
    handler: adminUpdateUploadSessionController,
  })

  app.delete('/admin/upload-sessions/:id', {  
    preHandler: [requireAdminAuth,rateLimitMiddleware],
    handler: adminDeleteUploadSessionController,
  })
}
