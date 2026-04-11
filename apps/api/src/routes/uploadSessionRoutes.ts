import type { FastifyInstance } from 'fastify'
import {
  createUploadSessionController,
  getUploadSessionController,
  listUploadSessionsController,
  pasteUploadSessionController,
  uploadSessionFileController,
} from '../controllers/uploadSessionController'
import {
  createAnalysisRunController,
  deleteAnalysisController,
  getAnalysisDetailsController,
  getAnalysisInsightsController,
  getAnalysisRunStatusController,
  listAnalysesController,
} from '../controllers/analysisController'
import { requireProtectedAuth } from '../utils/protectionMiddleware'
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware'

export async function uploadSessionRoutes(app: FastifyInstance) {
  app.post('/upload-sessions', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: createUploadSessionController,
  })

  app.get('/upload-sessions', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: listUploadSessionsController,
  })

  app.get('/upload-sessions/:id', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: getUploadSessionController,
  })

  app.post('/upload-sessions/:id/files', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: uploadSessionFileController,
  })

  app.post('/upload-sessions/:id/paste', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: pasteUploadSessionController,
  })

  app.post('/upload-sessions/:id/analyze', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: createAnalysisRunController,
  })

  app.get('/analyses/:id/status', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: getAnalysisRunStatusController,
  })

  app.get('/analyses/:id/insights', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: getAnalysisInsightsController,
  })

  app.get('/analyses/:id', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: getAnalysisDetailsController,
  })

  app.get('/analyses', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: listAnalysesController,
  })

  app.delete('/analyses/:id', {
    preHandler: [requireProtectedAuth, rateLimitMiddleware],
    handler: deleteAnalysisController,
  })
}
