import { env } from '../utils/env'
import { prisma } from '../utils/prisma'

export function getHealthStatus() {
  return {
    status: 'ok',
    time: new Date().toISOString(),
    analysisMode: env.analysisMode,
  }
}

export async function getReadinessStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      status: 'ready',
      time: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    }
  } catch {
    return {
      status: 'not_ready',
      time: new Date().toISOString(),
      checks: {
        database: 'error',
      },
    }
  }
}
