export const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    time: { type: 'string' },
    analysisMode: { type: 'string', enum: ['mock', 'live'] },
  },
  required: ['status', 'time', 'analysisMode'],
} as const
