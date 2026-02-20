import type { FastifyInstance } from 'fastify'
import { createMatchesController, getMatchController } from '../controllers/matchController'
import { requireProtectedAuth } from '../utils/protectionMiddleware'

export async function matchRoutes(app: FastifyInstance) {
  app.post('/matches', {
    preHandler: requireProtectedAuth,
    handler: createMatchesController,
  })

  app.get('/matches/:id', {
    preHandler: requireProtectedAuth,
    handler: getMatchController,
  })
}
