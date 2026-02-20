import { prisma } from '../utils/prisma'
import { env } from '../utils/env'

function currentDayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDailyLimit(endpoint: string): number {
  if (endpoint.includes('/upload-sessions/') && endpoint.endsWith('/analyze')) {
    return env.quotaDailyAnalyze
  }

  if (endpoint.includes('/love-guru/threads/') && endpoint.endsWith('/messages')) {
    return env.quotaDailyLoveGuruMessages
  }

  return env.quotaDailyDefault
}

export async function enforceDailyQuota(userId: string, endpoint: string): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const day = currentDayKey()
  const limit = getDailyLimit(endpoint)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.apiUsageCounter.findUnique({
      where: {
        userId_endpoint_day: {
          userId,
          endpoint,
          day,
        },
      },
      select: {
        id: true,
        count: true,
      },
    })

    if (!existing) {
      await tx.apiUsageCounter.create({
        data: {
          userId,
          endpoint,
          day,
          count: 1,
        },
      })

      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
      }
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
      }
    }

    const updated = await tx.apiUsageCounter.update({
      where: {
        id: existing.id,
      },
      data: {
        count: { increment: 1 },
      },
      select: {
        count: true,
      },
    })

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - updated.count),
    }
  })
}
