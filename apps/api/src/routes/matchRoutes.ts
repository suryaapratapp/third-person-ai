import type { FastifyInstance } from 'fastify'
import { createMatchesController, getMatchController } from '../controllers/matchController'
import { requireProtectedAuth } from '../utils/protectionMiddleware'
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware'

export async function matchRoutes(app: FastifyInstance) {
  app.post('/matches', {   
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: createMatchesController,
  })

  app.get('/matches/:id', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: getMatchController,
  })
}
