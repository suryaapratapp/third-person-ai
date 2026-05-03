import { env } from '../utils/env'
import IORedis from 'ioredis'

type EndpointPolicy = {
  maxRequests: number
  windowMs: number
}

let redisClient: IORedis | null = null

function getRedisClient(): IORedis {
  if (!redisClient) {
    redisClient = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
    })
  }
  return redisClient
}

function getPolicy(endpoint: string): EndpointPolicy {
  if (endpoint.includes('/love-guru/threads/') && endpoint.endsWith('/messages')) {
    return {
      maxRequests: Math.max(5, Math.floor(env.rateLimitMaxRequests / 2)),
      windowMs: env.rateLimitWindowMs,
    }
  }

  if (endpoint.includes('/upload-sessions/') && endpoint.endsWith('/analyze')) {
    return {
      maxRequests: Math.max(5, Math.floor(env.rateLimitMaxRequests / 3)),
      windowMs: env.rateLimitWindowMs,
    }
  }

  if (endpoint.startsWith('/admin')) {
  return {
    maxRequests: env.rateLimitMaxRequests * 5, 
    windowMs: env.rateLimitWindowMs,
  }
}

  return {
    maxRequests: env.rateLimitMaxRequests,
    windowMs: env.rateLimitWindowMs,
  }
}

function getRateLimitKey(identifier: string, endpoint: string, windowMs: number, nowMs: number): string {
  const windowBucket = Math.floor(nowMs / windowMs)
  return `rate-limit:${identifier}:${endpoint}:${windowBucket}`
}

export async function enforceRateLimit(
  identifier: string,
  endpoint: string,
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const policy = getPolicy(endpoint)
  const nowMs = Date.now()
  const key = getRateLimitKey(identifier, endpoint, policy.windowMs, nowMs)
  const client = getRedisClient()

  const currentCount = await client.incr(key)
  if (currentCount === 1) {
    await client.pexpire(key, policy.windowMs)
  }

  if (currentCount > policy.maxRequests) {
    const ttlMs = await client.pttl(key)
    const retryAfterMs = ttlMs > 0 ? ttlMs : policy.windowMs
    return {
      allowed: false,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
    }
  }

  return {
    allowed: true,
    retryAfterSec: 0,
  }
}
