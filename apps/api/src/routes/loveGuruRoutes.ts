import type { FastifyInstance } from 'fastify'
import {
  createLoveGuruMessageController,
  createLoveGuruThreadController,
  listLoveGuruMessagesController,
  listLoveGuruThreadsController,
} from '../controllers/loveGuruController'
import { requireProtectedAuth } from '../utils/protectionMiddleware'
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware'

export async function loveGuruRoutes(app: FastifyInstance) {
  app.post('/love-guru/threads', {
    preHandler: [requireProtectedAuth,rateLimitMiddleware  ],
    handler: createLoveGuruThreadController,
  })

  app.get('/love-guru/threads', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: listLoveGuruThreadsController,
  })

  app.get('/love-guru/threads/:id/messages', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: listLoveGuruMessagesController,
  })

  app.post('/love-guru/threads/:id/messages', {
    preHandler: [requireProtectedAuth,rateLimitMiddleware],
    handler: createLoveGuruMessageController,
  })
}
