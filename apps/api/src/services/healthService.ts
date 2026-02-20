import { env } from '../utils/env'

export function getHealthStatus() {
  return {
    status: 'ok',
    time: new Date().toISOString(),
    analysisMode: env.analysisMode,
  }
}
