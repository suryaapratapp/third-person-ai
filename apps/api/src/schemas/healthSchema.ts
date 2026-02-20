export const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    time: { type: 'string' },
    analysisMode: { type: 'string', enum: ['mock', 'live'] },
  },
  required: ['status', 'time', 'analysisMode'],
} as const

export const readyResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['ready', 'not_ready'] },
    time: { type: 'string' },
    checks: {
      type: 'object',
      properties: {
        database: { type: 'string', enum: ['ok', 'error'] },
      },
      required: ['database'],
    },
  },
  required: ['status', 'time', 'checks'],
} as const
