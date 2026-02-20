import { z } from 'zod'

export const createMatchesBodySchema = z.object({
  userId: z.string().trim().min(1),
  minScore: z.number().int().min(0).max(100).default(0),
  maxScore: z.number().int().min(0).max(100).default(100),
  filters: z.record(z.string(), z.unknown()).optional(),
})

export const matchParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export type CreateMatchesBody = z.infer<typeof createMatchesBodySchema>
export type MatchParams = z.infer<typeof matchParamsSchema>
