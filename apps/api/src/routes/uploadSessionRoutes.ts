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

export async function uploadSessionRoutes(app: FastifyInstance) {
  app.post('/upload-sessions', {
    preHandler: requireProtectedAuth,
    handler: createUploadSessionController,
  })

  app.get('/upload-sessions', {
    preHandler: requireProtectedAuth,
    handler: listUploadSessionsController,
  })

  app.get('/upload-sessions/:id', {
    preHandler: requireProtectedAuth,
    handler: getUploadSessionController,
  })

  app.post('/upload-sessions/:id/files', {
    preHandler: requireProtectedAuth,
    handler: uploadSessionFileController,
  })

  app.post('/upload-sessions/:id/paste', {
    preHandler: requireProtectedAuth,
    handler: pasteUploadSessionController,
  })

  app.post('/upload-sessions/:id/analyze', {
    preHandler: requireProtectedAuth,
    handler: createAnalysisRunController,
  })

  app.get('/analyses/:id/status', {
    preHandler: requireProtectedAuth,
    handler: getAnalysisRunStatusController,
  })

  app.get('/analyses/:id/insights', {
    preHandler: requireProtectedAuth,
    handler: getAnalysisInsightsController,
  })

  app.get('/analyses/:id', {
    preHandler: requireProtectedAuth,
    handler: getAnalysisDetailsController,
  })

  app.get('/analyses', {
    preHandler: requireProtectedAuth,
    handler: listAnalysesController,
  })

  app.delete('/analyses/:id', {
    preHandler: requireProtectedAuth,
    handler: deleteAnalysisController,
  })
}
