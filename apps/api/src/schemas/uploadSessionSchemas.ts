import { z } from 'zod'

export const createUploadSessionBodySchema = z.object({
  sourceApp: z.string().trim().toLowerCase().min(1).max(64),
})

export const uploadSessionParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const uploadSessionPasteBodySchema = z.object({
  text: z.string().trim().min(1).max(1_000_000),
})

export type CreateUploadSessionBody = z.infer<typeof createUploadSessionBodySchema>
export type UploadSessionParams = z.infer<typeof uploadSessionParamsSchema>
export type UploadSessionPasteBody = z.infer<typeof uploadSessionPasteBodySchema>
