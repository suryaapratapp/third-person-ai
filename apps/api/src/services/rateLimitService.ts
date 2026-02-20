import { env } from '../utils/env'

type EndpointPolicy = {
  maxRequests: number
  windowMs: number
}

const store = new Map<string, number[]>()

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

  return {
    maxRequests: env.rateLimitMaxRequests,
    windowMs: env.rateLimitWindowMs,
  }
}

export function enforceRateLimit(userId: string, endpoint: string): { allowed: boolean; retryAfterSec: number } {
  const policy = getPolicy(endpoint)
  const key = `${userId}:${endpoint}`
  const now = Date.now()
  const windowStart = now - policy.windowMs

  const timestamps = (store.get(key) ?? []).filter((timestamp) => timestamp > windowStart)
  if (timestamps.length >= policy.maxRequests) {
    const earliest = timestamps[0] ?? now
    const retryAfterMs = Math.max(1000, policy.windowMs - (now - earliest))
    store.set(key, timestamps)
    return {
      allowed: false,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
    }
  }

  timestamps.push(now)
  store.set(key, timestamps)
  return {
    allowed: true,
    retryAfterSec: 0,
  }
}
