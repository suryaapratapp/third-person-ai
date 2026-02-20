import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { authRoutes } from './routes/authRoutes'
import { healthRoutes } from './routes/healthRoutes'
import { loveGuruRoutes } from './routes/loveGuruRoutes'
import { matchRoutes } from './routes/matchRoutes'
import { profileRoutes } from './routes/profileRoutes'
import { uploadSessionRoutes } from './routes/uploadSessionRoutes'
import { env } from './utils/env'

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.logLevel,
    },
  })

  await app.register(cors, {
    origin: ['https://www.thethirdperson.ai',
    'https://thethirdperson.ai',
    'http://localhost:5173',],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })

  await app.register(multipart, {
    limits: {
      fileSize: env.maxUploadFileSizeBytes,
      files: 1,
    },
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Third Person AI API',
        version: '1.0.0',
        description: 'Backend API for uploads, analysis, profiles, matches, and Love Guru.',
      },
      servers: [{ url: `http://${env.host}:${env.port}` }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  })

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(uploadSessionRoutes)
  await app.register(loveGuruRoutes)
  await app.register(profileRoutes)
  await app.register(matchRoutes)

  app.get('/openapi.json', async () => app.swagger())
  return app
}

async function startServer() {
  const app = await buildServer()

  try {
    await app.listen({
      host: env.host,
      port: env.port,
    })

    app.log.info(`API server running on http://${env.host}:${env.port}`)
  } catch (error) {
    app.log.error(error, 'Failed to start API server')
    process.exit(1)
  }
}

if (require.main === module) {
  void startServer()
}
