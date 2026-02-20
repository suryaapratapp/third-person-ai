import type { FastifyInstance } from 'fastify'
import {
  createLoveGuruMessageController,
  createLoveGuruThreadController,
  listLoveGuruMessagesController,
  listLoveGuruThreadsController,
} from '../controllers/loveGuruController'
import { requireProtectedAuth } from '../utils/protectionMiddleware'

export async function loveGuruRoutes(app: FastifyInstance) {
  app.post('/love-guru/threads', {
    preHandler: requireProtectedAuth,
    handler: createLoveGuruThreadController,
  })

  app.get('/love-guru/threads', {
    preHandler: requireProtectedAuth,
    handler: listLoveGuruThreadsController,
  })

  app.get('/love-guru/threads/:id/messages', {
    preHandler: requireProtectedAuth,
    handler: listLoveGuruMessagesController,
  })

  app.post('/love-guru/threads/:id/messages', {
    preHandler: requireProtectedAuth,
    handler: createLoveGuruMessageController,
  })
}
