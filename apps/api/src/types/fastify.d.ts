import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    authUserId?: string
    authEmail?: string
  }
}
