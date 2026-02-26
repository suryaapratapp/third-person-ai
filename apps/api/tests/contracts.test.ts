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
      commit: z.string().min(1),
      env: z.string().min(1),
      db: z.string().min(1),
    })

    const parsed = schema.safeParse(res.json())
    expect(parsed.success).toBe(true)
  })

  it('Auth flow responses match contract shape', async () => {
    const readyRes = await app.inject({ method: 'GET', url: '/ready' })
    if (readyRes.statusCode !== 200) {
      expect(readyRes.statusCode).toBe(503)
      const readinessSchema = z.object({
        status: z.literal('not_ready'),
        checks: z.object({
          database: z.literal('error'),
        }),
      })
      const parsedReadiness = readinessSchema.safeParse(readyRes.json())
      expect(parsedReadiness.success).toBe(true)
      return
    }

    const baseEmail = `contract-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
    let email = `${baseEmail}@example.com`
    const password = 'Password123!'

    let registerRes = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        firstName: 'Contract',
        lastName: 'User',
        email,
        password,
      },
    })

    if (registerRes.statusCode === 400 && /already registered/i.test(registerRes.json().error || '')) {
      email = `${baseEmail}-retry@example.com`
      registerRes = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          firstName: 'Contract',
          lastName: 'User',
          email,
          password,
        },
      })
    }

    expect(registerRes.statusCode, registerRes.body).toBe(201)

    const registerSchema = z.object({
      user: z.object({
        id: z.string().min(1),
        email: z.string().email(),
        firstName: z.string().nullable(),
        lastName: z.string().nullable(),
        phone: z.string().nullable(),
        dob: z.string().nullable(),
        emailVerified: z.boolean(),
        phoneVerified: z.boolean(),
        createdAt: z.string().min(1),
      }),
      verification: z.object({
        emailVerified: z.boolean(),
        phoneVerified: z.boolean(),
        phoneRequired: z.boolean(),
        emailOtpExpiresAt: z.string().nullable(),
        phoneOtpExpiresAt: z.string().nullable(),
      }),
    })

    const parsedRegister = registerSchema.safeParse(registerRes.json())
    expect(parsedRegister.success).toBe(true)

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/auth/verify-otp',
      payload: { email, channel: 'email', otp: '123456' },
    })
    expect(verifyRes.statusCode).toBe(200)

    const completeRes = await app.inject({
      method: 'POST',
      url: '/auth/register/complete',
      payload: { email },
    })
    expect(completeRes.statusCode).toBe(200)

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

    const parsedComplete = authSchema.safeParse(completeRes.json())
    expect(parsedComplete.success).toBe(true)

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
