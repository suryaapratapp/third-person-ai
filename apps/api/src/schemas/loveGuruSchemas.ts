import { z } from 'zod'
import { PersonaEnum, ToneEnum } from '../constants/enums'

export const createLoveGuruThreadBodySchema = z.object({
  analysisId: z.string().trim().min(1),
  persona: PersonaEnum,
  tone: ToneEnum,
}).strict()

export const listLoveGuruThreadsQuerySchema = z.object({
  analysisId: z.string().trim().min(1),
}).strict()

export const loveGuruThreadParamsSchema = z.object({
  id: z.string().trim().min(1),
}).strict()

export const createLoveGuruMessageBodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
}).strict()

export type CreateLoveGuruThreadBody = z.infer<typeof createLoveGuruThreadBodySchema>
export type ListLoveGuruThreadsQuery = z.infer<typeof listLoveGuruThreadsQuerySchema>
export type LoveGuruThreadParams = z.infer<typeof loveGuruThreadParamsSchema>
export type CreateLoveGuruMessageBody = z.infer<typeof createLoveGuruMessageBodySchema>
