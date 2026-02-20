import { apiFetch } from '../api/client'
import { buildKeyMoments } from './dashboardDrilldownService'
import {
  clearDemoAnalyses,
  deleteDemoAnalysis,
  getDemoAnalysis,
  listDemoAnalyses,
} from './demoAiService'

const LAST_OPENED_ANALYSIS_KEY = 'tpai:analysis:last-opened'
const ANALYSIS_UI_META_KEY = 'tpai:analysis:ui-meta'

function readUiMetaMap() {
  try {
    const raw = localStorage.getItem(ANALYSIS_UI_META_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeUiMetaMap(map) {
  localStorage.setItem(ANALYSIS_UI_META_KEY, JSON.stringify(map))
}

function getUiMeta(analysisId) {
  const map = readUiMetaMap()
  return map[analysisId] || {}
}

function setUiMeta(analysisId, patch) {
  const map = readUiMetaMap()
  map[analysisId] = {
    ...(map[analysisId] || {}),
    ...patch,
  }
  writeUiMetaMap(map)
  return map[analysisId]
}

function removeUiMeta(analysisId) {
  const map = readUiMetaMap()
  delete map[analysisId]
  writeUiMetaMap(map)
}

function toDefaultTitle(createdAt) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'Analysis'
  return `Analysis - ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeStatus(status) {
  const safe = String(status || '').toUpperCase()
  if (safe === 'FAILED') return 'FAILED'
  if (safe === 'QUEUED' || safe === 'RUNNING') return 'ANALYZING'
  if (safe === 'COMPLETED') return 'READY'
  if (safe === 'READY') return 'READY'
  return 'READY'
}

function toTimeline(sentimentPayload) {
  const labels = ['Start', 'Early', 'Middle', 'Late', 'Current']
  const trend = sentimentPayload?.trend || 'mixed'
  const baseByTrend = {
    improving: [35, 44, 56, 68, 79],
    mixed: [52, 45, 58, 49, 61],
    declining: [72, 64, 57, 49, 39],
    stable: [56, 57, 55, 58, 56],
  }

  const values = baseByTrend[trend] || baseByTrend.mixed
  return labels.map((label, index) => ({ label, value: values[index] }))
}

function toResponsePatterns(payload) {
  const lag = payload?.averageLagMinutes
  const observations = safeArray(payload?.observations)

  return [
    { label: 'Avg Reply Speed', value: typeof lag === 'number' ? `${Math.round(lag)} min` : 'N/A' },
    { label: 'Message Balance', value: observations[0] || 'Pattern pending' },
    { label: 'Conflict Recovery', value: observations[1] || 'Pattern pending' },
    { label: 'Tone Volatility', value: observations[2] || 'Pattern pending' },
  ]
}

function toHeatmap(payload) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const slots = ['Morning', 'Afternoon', 'Evening', 'Night']
  const windows = safeArray(payload?.activeWindows).join(' ').toLowerCase()

  return days.flatMap((day, dayIndex) =>
    slots.map((slot, slotIndex) => {
      const key = `${day}-${slot}`.toLowerCase()
      const activeBoost = windows.includes(slot.toLowerCase()) ? 18 : 0
      const dayShift = (dayIndex % 3) * 6
      const slotShift = slotIndex * 4
      const value = Math.max(16, Math.min(92, 32 + activeBoost + dayShift + slotShift))
      return { day, slot, value, key }
    }),
  )
}

function toViralMoments(payload) {
  const highlights = safeArray(payload?.highlights)
  if (!highlights.length) {
    return [
      {
        title: 'Memorable exchange',
        excerpt: 'Strong engagement signal detected in your conversation flow.',
      },
    ]
  }

  return highlights.slice(0, 3).map((text, index) => ({
    title: `Highlight ${index + 1}`,
    excerpt: text,
  }))
}

function pickInsightPayload(insights, type) {
  return insights.find((item) => item.type === type)?.payload || null
}

function mapAnalysisToUi(detail, insightsResponse, analysisId) {
  const insights = safeArray(insightsResponse?.insights)
  const compatibility = pickInsightPayload(insights, 'compatibility_score')
  const mbti = pickInsightPayload(insights, 'mbti_analysis')
  const sentiment = pickInsightPayload(insights, 'sentiment_timeline')
  const responsePatterns = pickInsightPayload(insights, 'response_patterns')
  const heatmap = pickInsightPayload(insights, 'activity_heatmap')
  const viral = pickInsightPayload(insights, 'viral_moments')

  const uiMeta = getUiMeta(analysisId)
  const createdAt = detail?.analysis?.createdAt || new Date().toISOString()

  const participants = Array.isArray(uiMeta.participants) ? uiMeta.participants : []

  return {
    id: analysisId,
    version: 1,
    createdAt,
    title: uiMeta.title || toDefaultTitle(createdAt),
    tags: Array.isArray(uiMeta.tags) ? uiMeta.tags : [],
    status: normalizeStatus(detail?.analysis?.status),
    sourceApp: detail?.metadata?.sourceApp || 'unknown',
    inputMethod: uiMeta.inputMethod || null,
    intent: uiMeta.intent || null,
    privacy: {
      hideNamesUsed: Boolean(uiMeta.privacy?.hideNamesUsed),
      maskSensitiveUsed: uiMeta.privacy?.maskSensitiveUsed !== false,
    },
    inputMeta: uiMeta.inputMeta || null,
    participants: {
      personA: participants[0] || 'Person A',
      personB: participants[1] || 'Person B',
    },
    importSummary: {
      participants,
      stats: {
        messageCount: detail?.metadata?.messageCount || 0,
        participantCount: participants.length,
        startDateISO: uiMeta.dateRange?.startDateISO || null,
        endDateISO: uiMeta.dateRange?.endDateISO || null,
        estimatedDays: uiMeta.dateRange?.estimatedDays || null,
        languageHint: uiMeta.languageHint || null,
      },
      warnings: safeArray(uiMeta.warnings),
    },
    compatibilityScore: compatibility?.score || detail?.summary?.compatibilityScore || 0,
    mbti: {
      personA: safeArray(mbti?.likelyTypes)[0] || 'Unknown',
      personB: safeArray(mbti?.likelyTypes)[1] || 'Unknown',
      summary: mbti?.rationale || 'Inferred communication style from available signals.',
    },
    sentimentTimeline: toTimeline(sentiment),
    responsePatterns: toResponsePatterns(responsePatterns),
    activityHeatmap: toHeatmap(heatmap),
    viralMoments: toViralMoments(viral),
  }
}

function applyFilters(analyses, filters = {}) {
  const query = String(filters.search || '').trim().toLowerCase()
  const app = filters.app && filters.app !== 'ALL' ? String(filters.app).toLowerCase() : null
  const intent = filters.intent && filters.intent !== 'ALL' ? String(filters.intent) : null
  const status = filters.status && filters.status !== 'ALL' ? String(filters.status).toUpperCase() : null

  let next = analyses

  if (query) {
    next = next.filter((analysis) => {
      const participants = Array.isArray(analysis.importSummary?.participants)
        ? analysis.importSummary.participants.join(' ')
        : `${analysis.participants?.personA || ''} ${analysis.participants?.personB || ''}`

      const target = `${analysis.title || ''} ${analysis.sourceApp || ''} ${participants}`.toLowerCase()
      return target.includes(query)
    })
  }

  if (app) {
    next = next.filter((analysis) => String(analysis.sourceApp || '').toLowerCase() === app)
  }

  if (intent) {
    next = next.filter((analysis) => (analysis.intent || 'NONE') === intent)
  }

  if (status) {
    next = next.filter((analysis) => (analysis.status || 'READY').toUpperCase() === status)
  }

  const sort = filters.sort || 'newest'

  next = [...next].sort((a, b) => {
    if (sort === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }

    if (sort === 'mostMessages') {
      const aCount = a.importSummary?.stats?.messageCount ?? 0
      const bCount = b.importSummary?.stats?.messageCount ?? 0
      if (bCount !== aCount) return bCount - aCount
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return next
}

function mapDemoAnalysisForList(analysis) {
  const createdAt = analysis?.createdAt || new Date().toISOString()
  const participants = Array.isArray(analysis?.importSummary?.participants)
    ? analysis.importSummary.participants
    : [analysis?.participants?.personA, analysis?.participants?.personB].filter(Boolean)

  return {
    id: analysis.id,
    createdAt,
    title: analysis.title || toDefaultTitle(createdAt),
    tags: Array.isArray(analysis.tags) ? analysis.tags : [],
    status: normalizeStatus(analysis.status),
    sourceApp: analysis.sourceApp || 'unknown',
    intent: analysis.intent || null,
    privacy: {
      hideNamesUsed: Boolean(analysis?.privacy?.hideNamesUsed),
      maskSensitiveUsed: analysis?.privacy?.maskSensitiveUsed !== false,
    },
    participants: {
      personA: participants[0] || 'Person A',
      personB: participants[1] || 'Person B',
    },
    importSummary: {
      participants,
      stats: {
        messageCount: analysis?.importSummary?.stats?.messageCount || 0,
        participantCount: analysis?.importSummary?.stats?.participantCount || participants.length,
        startDateISO: analysis?.importSummary?.stats?.startDateISO || null,
        endDateISO: analysis?.importSummary?.stats?.endDateISO || null,
        estimatedDays: analysis?.importSummary?.stats?.estimatedDays || null,
      },
      warnings: safeArray(analysis?.importSummary?.warnings),
    },
    compatibilityScore: analysis.compatibilityScore ?? 0,
    isDemo: true,
    demoSource: analysis.demoSource || 'puter',
  }
}

export async function listAnalyses(filters) {
  let mapped = []

  try {
    const payload = await apiFetch('/analyses', { method: 'GET' })
    const items = safeArray(payload?.analyses)

    mapped = items.map((item) => {
      const uiMeta = getUiMeta(item.id)
      const createdAt = item.createdAt || new Date().toISOString()

      return {
        id: item.id,
        createdAt,
        title: uiMeta.title || toDefaultTitle(createdAt),
        tags: Array.isArray(uiMeta.tags) ? uiMeta.tags : [],
        status: normalizeStatus(item.status),
        sourceApp: item.sourceApp,
        intent: uiMeta.intent || null,
        privacy: {
          hideNamesUsed: Boolean(uiMeta.privacy?.hideNamesUsed),
          maskSensitiveUsed: uiMeta.privacy?.maskSensitiveUsed !== false,
        },
        participants: {
          personA: (uiMeta.participants || [])[0] || 'Person A',
          personB: (uiMeta.participants || [])[1] || 'Person B',
        },
        importSummary: {
          participants: Array.isArray(uiMeta.participants) ? uiMeta.participants : [],
          stats: {
            messageCount: item.messageCount || 0,
            participantCount: Array.isArray(uiMeta.participants) ? uiMeta.participants.length : 0,
            startDateISO: uiMeta.dateRange?.startDateISO || null,
            endDateISO: uiMeta.dateRange?.endDateISO || null,
            estimatedDays: uiMeta.dateRange?.estimatedDays || null,
          },
          warnings: safeArray(uiMeta.warnings),
        },
        compatibilityScore: item.compatibilityScore ?? 0,
        isDemo: false,
      }
    })
  } catch (error) {
    const demosOnly = listDemoAnalyses().map(mapDemoAnalysisForList)
    if (!demosOnly.length) throw error
    mapped = []
  }

  const demoMapped = listDemoAnalyses().map(mapDemoAnalysisForList)
  const merged = [...mapped, ...demoMapped]

  return applyFilters(merged, filters)
}

export async function getAnalysis(id) {
  if (!id) return null

  const demo = getDemoAnalysis(id)
  if (demo) return demo

  const [detail, insights] = await Promise.all([
    apiFetch(`/analyses/${id}`, { method: 'GET' }),
    apiFetch(`/analyses/${id}/insights`, { method: 'GET' }),
  ])

  return mapAnalysisToUi(detail, insights, id)
}

export async function getInsights(id) {
  if (!id) return null
  return apiFetch(`/analyses/${id}/insights`, { method: 'GET' })
}

export function setAnalysisClientMeta(analysisId, patch) {
  if (!analysisId || !patch) return null
  return setUiMeta(analysisId, patch)
}

export function updateAnalysis(id, patch) {
  if (!id || !patch || typeof patch !== 'object') return null
  const meta = setUiMeta(id, patch)
  return {
    id,
    ...meta,
  }
}

export async function deleteAnalysis(id) {
  const demo = getDemoAnalysis(id)
  if (demo) {
    deleteDemoAnalysis(id)
    removeUiMeta(id)
    if (getLastOpenedAnalysisId() === id) {
      localStorage.removeItem(LAST_OPENED_ANALYSIS_KEY)
    }
    return
  }

  await apiFetch(`/analyses/${id}`, {
    method: 'DELETE',
  })

  removeUiMeta(id)

  try {
    localStorage.removeItem(`tpai:notes:${id}`)
  } catch {
    // no-op
  }

  if (getLastOpenedAnalysisId() === id) {
    localStorage.removeItem(LAST_OPENED_ANALYSIS_KEY)
  }
}

export async function deleteAllAnalyses() {
  const analyses = await listAnalyses().catch(() => [])
  await Promise.allSettled(analyses.map((item) => deleteAnalysis(item.id)))
  clearDemoAnalyses()
  localStorage.removeItem(LAST_OPENED_ANALYSIS_KEY)
}

export async function exportAnalysisJson(id) {
  const analysis = await getAnalysis(id)
  if (!analysis) return null

  const moments = buildKeyMoments(analysis, {
    hideNames: Boolean(analysis.privacy?.hideNamesUsed),
    maskSensitiveInfo: Boolean(analysis.privacy?.maskSensitiveUsed),
  })

  const payload = {
    id: analysis.id,
    createdAt: analysis.createdAt,
    title: analysis.title,
    status: analysis.status,
    sourceApp: analysis.sourceApp,
    intent: analysis.intent,
    tags: analysis.tags,
    privacy: analysis.privacy,
    metadata: {
      participants:
        analysis.importSummary?.participants ?? [analysis.participants?.personA, analysis.participants?.personB].filter(Boolean),
      participantCount: analysis.importSummary?.stats?.participantCount ?? 0,
      messageCount: analysis.importSummary?.stats?.messageCount ?? 0,
      dateRange: {
        startDateISO: analysis.importSummary?.stats?.startDateISO ?? null,
        endDateISO: analysis.importSummary?.stats?.endDateISO ?? null,
      },
      warnings: analysis.importSummary?.warnings ?? [],
      inputMeta: analysis.inputMeta,
    },
    insights: {
      compatibilityScore: analysis.compatibilityScore,
      mbti: analysis.mbti,
      sentimentTimeline: analysis.sentimentTimeline,
      responsePatterns: analysis.responsePatterns,
      activityHeatmap: analysis.activityHeatmap,
      viralMoments: analysis.viralMoments,
      keyMoments: moments,
    },
  }

  return JSON.stringify(payload, null, 2)
}

export async function exportAnalysis(id) {
  return exportAnalysisJson(id)
}

export function setLastOpenedAnalysisId(analysisId) {
  if (!analysisId) return
  localStorage.setItem(LAST_OPENED_ANALYSIS_KEY, analysisId)
}

export function getLastOpenedAnalysisId() {
  try {
    return localStorage.getItem(LAST_OPENED_ANALYSIS_KEY)
  } catch {
    return null
  }
}
