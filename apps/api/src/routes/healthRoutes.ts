import type { FastifyInstance } from 'fastify'
import { getHealth } from '../controllers/healthController'
import { healthResponseSchema } from '../schemas/healthSchema'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      response: {
        200: healthResponseSchema,
      },
    },
    handler: getHealth,
  })
}
