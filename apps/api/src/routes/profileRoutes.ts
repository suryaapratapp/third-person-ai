import type { FastifyInstance } from 'fastify'
import {
  createProfileController,
  getProfileController,
  listProfilesController,
} from '../controllers/profileController'
import { requireProtectedAuth } from '../utils/protectionMiddleware'
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware'

export async function profileRoutes(app: FastifyInstance) {
  app.post('/profiles', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: createProfileController,
  })

  app.get('/profiles', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: listProfilesController,
  })

  app.get('/profiles/:id', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: getProfileController,
  })
}
