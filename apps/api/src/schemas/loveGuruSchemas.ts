import { z } from 'zod'

export const createLoveGuruThreadBodySchema = z.object({
  analysisId: z.string().trim().min(1),
  persona: z.enum(['coach', 'bestie']),
  tone: z.enum(['gentle', 'balanced', 'direct']),
})

export const listLoveGuruThreadsQuerySchema = z.object({
  analysisId: z.string().trim().min(1),
})

export const loveGuruThreadParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const createLoveGuruMessageBodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
})

export type CreateLoveGuruThreadBody = z.infer<typeof createLoveGuruThreadBodySchema>
export type ListLoveGuruThreadsQuery = z.infer<typeof listLoveGuruThreadsQuerySchema>
export type LoveGuruThreadParams = z.infer<typeof loveGuruThreadParamsSchema>
export type CreateLoveGuruMessageBody = z.infer<typeof createLoveGuruMessageBodySchema>
