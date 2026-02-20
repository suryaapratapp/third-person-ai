import { prisma } from '../utils/prisma'

export type AnalysisRunDto = {
  id: string
  uploadSessionId: string
  personEntityId: string | null
  status: string
  model: string | null
  createdAt: string
}

function toAnalysisRunDto(value: {
  id: string
  uploadSessionId: string
  personEntityId: string | null
  status: string
  model: string | null
  createdAt: Date
}): AnalysisRunDto {
  return {
    id: value.id,
    uploadSessionId: value.uploadSessionId,
    personEntityId: value.personEntityId,
    status: value.status,
    model: value.model,
    createdAt: value.createdAt.toISOString(),
  }
}

export async function createAnalysisRunForUser(
  userId: string,
  uploadSessionId: string,
  personEntityId?: string,
): Promise<AnalysisRunDto | null> {
  const session = await prisma.uploadSession.findFirst({
    where: {
      id: uploadSessionId,
      userId,
    },
    select: { id: true },
  })

  if (!session) return null

  if (personEntityId) {
    const personEntity = await prisma.personEntity.findFirst({
      where: {
        id: personEntityId,
        userId,
      },
      select: { id: true },
    })
    if (!personEntity) return null
  }

  const analysisRun = await prisma.analysisRun.create({
    data: {
      uploadSessionId,
      personEntityId,
      status: 'QUEUED',
      model: 'mock-analysis-v1',
    },
    select: {
      id: true,
      uploadSessionId: true,
      personEntityId: true,
      status: true,
      model: true,
      createdAt: true,
    },
  })

  return toAnalysisRunDto(analysisRun)
}

export async function getAnalysisRunStatusForUser(
  userId: string,
  analysisRunId: string,
): Promise<AnalysisRunDto | null> {
  const analysisRun = await prisma.analysisRun.findFirst({
    where: {
      id: analysisRunId,
      uploadSession: {
        userId,
      },
    },
    select: {
      id: true,
      uploadSessionId: true,
      personEntityId: true,
      status: true,
      model: true,
      createdAt: true,
    },
  })

  if (!analysisRun) return null
  return toAnalysisRunDto(analysisRun)
}

export type AnalysisInsightDto = {
  id: string
  type: string
  payload: unknown
  createdAt: string
}

export type AnalysisInsightsResult = {
  analysisRunId: string
  status: string
  insights: AnalysisInsightDto[]
}

export type AnalysisDetailResult = {
  analysis: AnalysisRunDto
  metadata: {
    sourceApp: string
    uploadSessionStatus: string
    uploadSessionCreatedAt: string
    messageCount: number
    insightCount: number
    latestInsightAt: string | null
  }
  summary: {
    compatibilityScore: number | null
    confidence: string | null
    insightTypes: string[]
  }
}

export type AnalysisListItem = {
  id: string
  uploadSessionId: string
  status: string
  model: string | null
  createdAt: string
  sourceApp: string
  messageCount: number
  insightCount: number
  compatibilityScore: number | null
}

function toInsightDto(value: {
  id: string
  type: string
  payload: unknown
  createdAt: Date
}): AnalysisInsightDto {
  return {
    id: value.id,
    type: value.type,
    payload: value.payload,
    createdAt: value.createdAt.toISOString(),
  }
}

function parseCompatibilityScore(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null
  const score = (payload as Record<string, unknown>).score
  if (typeof score !== 'number' || Number.isNaN(score)) return null
  const rounded = Math.round(score)
  if (rounded < 0 || rounded > 100) return null
  return rounded
}

function parseConfidence(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const confidence = (payload as Record<string, unknown>).confidence
  return typeof confidence === 'string' ? confidence : null
}

export async function getAnalysisInsightsForUser(
  userId: string,
  analysisRunId: string,
): Promise<AnalysisInsightsResult | null> {
  const analysisRun = await prisma.analysisRun.findFirst({
    where: {
      id: analysisRunId,
      uploadSession: {
        userId,
      },
    },
    select: {
      id: true,
      status: true,
      insights: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          type: true,
          payload: true,
          createdAt: true,
        },
      },
    },
  })

  if (!analysisRun) return null

  return {
    analysisRunId: analysisRun.id,
    status: analysisRun.status,
    insights: analysisRun.insights.map(toInsightDto),
  }
}

export async function getAnalysisDetailsForUser(
  userId: string,
  analysisRunId: string,
): Promise<AnalysisDetailResult | null> {
  const analysisRun = await prisma.analysisRun.findFirst({
    where: {
      id: analysisRunId,
      uploadSession: {
        userId,
      },
    },
    select: {
      id: true,
      uploadSessionId: true,
      personEntityId: true,
      status: true,
      model: true,
      createdAt: true,
      uploadSession: {
        select: {
          sourceApp: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              messages: true,
            },
          },
        },
      },
      insights: {
        orderBy: { createdAt: 'asc' },
        select: {
          type: true,
          payload: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          insights: true,
        },
      },
    },
  })

  if (!analysisRun) return null

  const compatibilityInsight = analysisRun.insights.find(
    (insight) => insight.type === 'compatibility_score',
  )
  const metaInsight = analysisRun.insights.find((insight) => insight.type === 'analysis_meta')
  const latestInsightAt =
    analysisRun.insights.length > 0
      ? analysisRun.insights[analysisRun.insights.length - 1].createdAt.toISOString()
      : null

  return {
    analysis: toAnalysisRunDto(analysisRun),
    metadata: {
      sourceApp: analysisRun.uploadSession.sourceApp,
      uploadSessionStatus: analysisRun.uploadSession.status,
      uploadSessionCreatedAt: analysisRun.uploadSession.createdAt.toISOString(),
      messageCount: analysisRun.uploadSession._count.messages,
      insightCount: analysisRun._count.insights,
      latestInsightAt,
    },
    summary: {
      compatibilityScore: parseCompatibilityScore(compatibilityInsight?.payload ?? null),
      confidence: parseConfidence(metaInsight?.payload ?? null),
      insightTypes: Array.from(new Set(analysisRun.insights.map((insight) => insight.type))),
    },
  }
}

export async function listAnalysisRunsForUser(userId: string): Promise<AnalysisListItem[]> {
  const rows = await prisma.analysisRun.findMany({
    where: {
      uploadSession: { userId },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      uploadSessionId: true,
      status: true,
      model: true,
      createdAt: true,
      uploadSession: {
        select: {
          sourceApp: true,
          _count: {
            select: { messages: true },
          },
        },
      },
      _count: {
        select: { insights: true },
      },
      insights: {
        where: { type: 'compatibility_score' },
        select: { payload: true },
        take: 1,
      },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    uploadSessionId: row.uploadSessionId,
    status: row.status,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    sourceApp: row.uploadSession.sourceApp,
    messageCount: row.uploadSession._count.messages,
    insightCount: row._count.insights,
    compatibilityScore: parseCompatibilityScore(row.insights[0]?.payload ?? null),
  }))
}

export async function deleteAnalysisRunForUser(userId: string, analysisRunId: string): Promise<boolean> {
  const existing = await prisma.analysisRun.findFirst({
    where: {
      id: analysisRunId,
      uploadSession: { userId },
    },
    select: { id: true },
  })

  if (!existing) return false

  await prisma.analysisRun.delete({
    where: { id: analysisRunId },
  })

  return true
}
