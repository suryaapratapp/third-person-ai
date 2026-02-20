import { z } from 'zod'

export const analysisRunParamsSchema = z.object({
  id: z.string().trim().min(1),
})

export const createAnalysisRunBodySchema = z.object({
  personEntityId: z.string().trim().min(1).optional(),
})

export const analysisInsightItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  payload: z.unknown(),
  createdAt: z.string(),
})

export const analysisInsightsResponseSchema = z.object({
  analysisRunId: z.string(),
  status: z.string(),
  insights: z.array(analysisInsightItemSchema),
})

export const analysisDetailResponseSchema = z.object({
  analysis: z.object({
    id: z.string(),
    uploadSessionId: z.string(),
    status: z.string(),
    model: z.string().nullable(),
    createdAt: z.string(),
  }),
  metadata: z.object({
    sourceApp: z.string(),
    uploadSessionStatus: z.string(),
    uploadSessionCreatedAt: z.string(),
    messageCount: z.number().int().min(0),
    insightCount: z.number().int().min(0),
    latestInsightAt: z.string().nullable(),
  }),
  summary: z.object({
    compatibilityScore: z.number().int().min(0).max(100).nullable(),
    confidence: z.string().nullable(),
    insightTypes: z.array(z.string()),
  }),
})

export type AnalysisRunParams = z.infer<typeof analysisRunParamsSchema>
export type CreateAnalysisRunBody = z.infer<typeof createAnalysisRunBodySchema>
export type AnalysisInsightsResponse = z.infer<typeof analysisInsightsResponseSchema>
export type AnalysisDetailResponse = z.infer<typeof analysisDetailResponseSchema>
