import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'

type Filters = Record<string, unknown> | undefined

type MatchListItem = {
  id: string
  targetUserId: string
  score: number
  summary: string
  createdAt: string
}

type MatchDetail = {
  id: string
  requesterUserId: string
  targetUserId: string
  score: number
  breakdown: unknown
  filters: unknown
  createdAt: string
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim())
}

function extractTraits(profileJSON: unknown): string[] {
  if (!profileJSON || typeof profileJSON !== 'object') return []
  const json = profileJSON as Record<string, unknown>

  const likelyTraits = toStringList(json.likelyTraits)
  const relationshipNeeds = toStringList(json.relationshipNeeds)
  const communicationStyle =
    json.communicationStyle && typeof json.communicationStyle === 'object'
      ? (json.communicationStyle as Record<string, unknown>)
      : {}
  const strengths = toStringList(communicationStyle.strengths)

  const combined = [...likelyTraits, ...relationshipNeeds, ...strengths]
  return Array.from(new Set(combined.map((item) => item.toLowerCase()))).slice(0, 20)
}

function calculateScore(baseTraits: string[], targetTraits: string[]): { score: number; overlap: string[] } {
  if (!baseTraits.length || !targetTraits.length) {
    return { score: 55, overlap: [] }
  }

  const targetSet = new Set(targetTraits)
  const overlap = baseTraits.filter((trait) => targetSet.has(trait))
  const overlapRatio = overlap.length / Math.max(baseTraits.length, targetTraits.length)
  const score = Math.round(Math.min(95, Math.max(35, 45 + overlapRatio * 50)))
  return { score, overlap: overlap.slice(0, 8) }
}

function buildSummary(score: number, overlap: string[]): string {
  if (!overlap.length) {
    return score >= 70
      ? 'Strong overall fit based on profile patterns.'
      : 'Limited shared signals; compatibility is moderate.'
  }

  return `Shared patterns: ${overlap.slice(0, 3).join(', ')}.`
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue
}

export async function createMatchesForUser(params: {
  authUserId: string
  userId: string
  minScore: number
  maxScore: number
  filters?: Filters
}): Promise<MatchListItem[]> {
  if (params.authUserId !== params.userId) {
    throw new Error('Forbidden')
  }

  const allProfiles = await prisma.personalityProfile.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      userId: true,
      personEntity: {
        select: {
          type: true,
        },
      },
      profileJSON: true,
    },
  })

  const latestByUser = new Map<
    string,
    { userId: string; profileJSON: unknown; personEntityType: string }
  >()
  for (const profile of allProfiles) {
    if (!latestByUser.has(profile.userId)) {
      latestByUser.set(profile.userId, {
        userId: profile.userId,
        profileJSON: profile.profileJSON,
        personEntityType: profile.personEntity.type,
      })
    }
  }

  const sourceProfile = latestByUser.get(params.userId)
  if (!sourceProfile) {
    return []
  }

  const baseTraits = extractTraits(sourceProfile.profileJSON)
  const limit =
    typeof params.filters?.limit === 'number' && params.filters.limit > 0
      ? Math.min(50, Math.floor(params.filters.limit))
      : 20
  const excludedUserIds = Array.isArray(params.filters?.excludeUserIds)
    ? params.filters?.excludeUserIds.filter((item): item is string => typeof item === 'string')
    : []
  const typeFilters = Array.isArray(params.filters?.types)
    ? params.filters?.types.filter((item): item is string => typeof item === 'string')
    : []

  const candidates = [...latestByUser.values()]
    .filter((candidate) => candidate.userId !== params.userId)
    .filter((candidate) => !excludedUserIds.includes(candidate.userId))
    .filter((candidate) =>
      typeFilters.length ? typeFilters.includes(candidate.personEntityType) : true,
    )
    .map((candidate) => {
      const targetTraits = extractTraits(candidate.profileJSON)
      const { score, overlap } = calculateScore(baseTraits, targetTraits)
      return {
        targetUserId: candidate.userId,
        score,
        overlap,
      }
    })
    .filter((candidate) => candidate.score >= params.minScore && candidate.score <= params.maxScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  if (!candidates.length) {
    return []
  }

  const createdMatches = await Promise.all(
    candidates.map(async (candidate) => {
      const created = await prisma.match.create({
        data: {
          requesterUserId: params.userId,
          targetUserId: candidate.targetUserId,
          score: candidate.score,
          filters: toInputJsonValue(params.filters),
          breakdown: {
            overlapTraits: candidate.overlap,
            scoreReason: buildSummary(candidate.score, candidate.overlap),
          },
        },
        select: {
          id: true,
          targetUserId: true,
          score: true,
          createdAt: true,
          breakdown: true,
        },
      })

      const breakdown = created.breakdown as Record<string, unknown>
      const summary =
        typeof breakdown.scoreReason === 'string'
          ? breakdown.scoreReason
          : 'Compatibility estimated from profile signals.'

      return {
        id: created.id,
        targetUserId: created.targetUserId,
        score: created.score,
        summary,
        createdAt: created.createdAt.toISOString(),
      }
    }),
  )

  return createdMatches
}

export async function getMatchForUser(userId: string, matchId: string): Promise<MatchDetail | null> {
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ requesterUserId: userId }, { targetUserId: userId }],
    },
    select: {
      id: true,
      requesterUserId: true,
      targetUserId: true,
      score: true,
      breakdown: true,
      filters: true,
      createdAt: true,
    },
  })

  if (!match) return null

  return {
    id: match.id,
    requesterUserId: match.requesterUserId,
    targetUserId: match.targetUserId,
    score: match.score,
    breakdown: match.breakdown,
    filters: match.filters,
    createdAt: match.createdAt.toISOString(),
  }
}
