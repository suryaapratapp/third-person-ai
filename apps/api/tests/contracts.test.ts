import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildServer } from '../src/index'

describe('API contract tests', () => {
  let app: Awaited<ReturnType<typeof buildServer>>

  beforeAll(async () => {
    app = await buildServer()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health matches response contract', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)

    const schema = z.object({
      status: z.string().min(1),
      time: z.string().datetime().or(z.string().min(1)),
    })

    const parsed = schema.safeParse(res.json())
    expect(parsed.success).toBe(true)
  })

  it('Auth flow responses match contract shape', async () => {
    const email = `contract-${Date.now()}@example.com`
    const password = 'Password123!'

    const registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, password },
    })
    expect(registerRes.statusCode).toBe(201)

    const authSchema = z.object({
      user: z.object({
        id: z.string().min(1),
        email: z.string().email(),
        createdAt: z.string().min(1),
      }),
      tokens: z.object({
        accessToken: z.string().min(1),
        refreshToken: z.string().min(1),
      }),
    })

    const parsedRegister = authSchema.safeParse(registerRes.json())
    expect(parsedRegister.success).toBe(true)

    const loginRes = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password },
    })
    expect(loginRes.statusCode).toBe(200)

    const parsedLogin = authSchema.safeParse(loginRes.json())
    expect(parsedLogin.success).toBe(true)

    const accessToken = loginRes.json().tokens.accessToken as string

    const meRes = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })
    expect(meRes.statusCode).toBe(200)

    const meSchema = z.object({
      user: z.object({
        id: z.string().min(1),
        email: z.string().email(),
        createdAt: z.string().min(1),
      }),
    })

    const parsedMe = meSchema.safeParse(meRes.json())
    expect(parsedMe.success).toBe(true)
  })

  it('GET /openapi.json returns OpenAPI document shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/openapi.json' })
    expect(res.statusCode).toBe(200)

    const schema = z.object({
      openapi: z.string().min(1),
      info: z.object({
        title: z.string().min(1),
        version: z.string().min(1),
      }),
      paths: z.record(z.string(), z.unknown()),
    })

    const parsed = schema.safeParse(res.json())
    expect(parsed.success).toBe(true)
  })
})
