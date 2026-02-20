import type { FastifyInstance } from 'fastify'
import { getHealth, getReady } from '../controllers/healthController'
import { healthResponseSchema, readyResponseSchema } from '../schemas/healthSchema'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    schema: {
      response: {
        200: healthResponseSchema,
      },
    },
    handler: getHealth,
  })

  app.get('/ready', {
    schema: {
      response: {
        200: readyResponseSchema,
        503: readyResponseSchema,
      },
    },
    handler: getReady,
  })
}
