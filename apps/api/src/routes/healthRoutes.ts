import type { FastifyInstance } from 'fastify'
import { getHealth, getReady } from '../controllers/healthController'
import { healthResponseSchema, readyResponseSchema } from '../schemas/healthSchema'

export async function healthRoutes(app: FastifyInstance) {
  const healthRouteConfig = {
    schema: {
      response: {
        200: healthResponseSchema,
      },
    },
    handler: getHealth,
  } as const

  const readyRouteConfig = {
    schema: {
      response: {
        200: readyResponseSchema,
        503: readyResponseSchema,
      },
    },
    handler: getReady,
  } as const

  app.get('/health', healthRouteConfig)
  app.get('/api/health', healthRouteConfig)

  app.get('/ready', readyRouteConfig)
  app.get('/api/ready', readyRouteConfig)
}
