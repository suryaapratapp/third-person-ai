import type { FastifyInstance } from 'fastify'
import {
  createProfileController,
  getProfileController,
  listProfilesController,
} from '../controllers/profileController'
import { requireProtectedAuth } from '../utils/protectionMiddleware'

export async function profileRoutes(app: FastifyInstance) {
  app.post('/profiles', {
    preHandler: requireProtectedAuth,
    handler: createProfileController,
  })

  app.get('/profiles', {
    preHandler: requireProtectedAuth,
    handler: listProfilesController,
  })

  app.get('/profiles/:id', {
    preHandler: requireProtectedAuth,
    handler: getProfileController,
  })
}
