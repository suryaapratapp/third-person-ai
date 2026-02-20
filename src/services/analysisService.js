import { normalizeAnalysisResult } from '../contracts/analysisContract'
import { buildKeyMoments } from './dashboardDrilldownService'

const ANALYSES_KEY = 'tpai:analyses'
const LAST_OPENED_ANALYSIS_KEY = 'tpai:analysis:last-opened'
const VALID_STATUSES = ['READY', 'ANALYZING', 'FAILED']

function readAnalyses() {
  try {
    const raw = localStorage.getItem(ANALYSES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map(normalizeAnalysisResult)
      .filter(Boolean)
      .map(enrichAnalysis)
  } catch {
    return []
  }
}

function writeAnalyses(analyses) {
  localStorage.setItem(ANALYSES_KEY, JSON.stringify(analyses))
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function toSizeLabel(bytes) {
  if (!bytes || bytes < 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function createTimeline() {
  const labels = ['Start', 'Early', 'Middle', 'Late', 'Current']
  let value = randomInt(42, 60)
  return labels.map((label) => {
    value += randomInt(-12, 14)
    value = Math.max(10, Math.min(90, value))
    return { label, value }
  })
}

function createHeatmap() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const slots = ['Morning', 'Afternoon', 'Evening', 'Night']
  const cells = []

  days.forEach((day) => {
    slots.forEach((slot) => {
      cells.push({ day, slot, value: randomInt(12, 100) })
    })
  })

  return cells
}

function toDefaultTitle(createdAt) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return 'Analysis'
  return `Analysis - ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

function sanitizeTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map((item) => String(item).trim()).filter(Boolean))].slice(0, 3)
}

function sanitizeStatus(status) {
  if (!status) return 'READY'
  return VALID_STATUSES.includes(status) ? status : 'READY'
}

function enrichAnalysis(analysis) {
  const createdAt = analysis.createdAt || new Date().toISOString()
  return {
    ...analysis,
    createdAt,
    title: analysis.title || toDefaultTitle(createdAt),
    tags: sanitizeTags(analysis.tags),
    status: sanitizeStatus(analysis.status),
    privacy: {
      hideNamesUsed: Boolean(analysis.privacy?.hideNamesUsed),
      maskSensitiveUsed: analysis.privacy?.maskSensitiveUsed !== false,
    },
  }
}

function buildMockResult(input) {
  const compatibilityScore = randomInt(62, 94)
  const personalities = ['ENFJ', 'INFJ', 'INTJ', 'ENTP', 'ISFJ', 'ESFP', 'INFP']
  const mbtiA = personalities[randomInt(0, personalities.length - 1)]
  const mbtiB = personalities[randomInt(0, personalities.length - 1)]
  const id = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const importParticipants = input.importSummary?.participants ?? []
  const participantPair =
    input.participants ??
    {
      personA: importParticipants[0] ?? 'Alex',
      personB: importParticipants[1] ?? 'Jordan',
    }

  const createdAt = new Date().toISOString()

  return {
    id,
    version: 1,
    createdAt,
    title: toDefaultTitle(createdAt),
    tags: [],
    status: 'READY',
    sourceApp: input.sourceApp,
    inputMethod: input.inputMethod,
    intent: input.intent ?? null,
    privacy: {
      hideNamesUsed: Boolean(input.privacy?.hideNamesUsed),
      maskSensitiveUsed: input.privacy?.maskSensitiveUsed !== false,
    },
    inputMeta: {
      fileName: input.file?.name ?? null,
      fileSize: input.file?.size ?? null,
      fileSizeLabel: toSizeLabel(input.file?.size ?? 0),
      textLength: input.text?.length ?? 0,
    },
    participants: participantPair,
    importSummary: input.importSummary
      ? {
          participants: Array.isArray(input.importSummary.participants) ? input.importSummary.participants : [],
          stats: input.importSummary.stats ?? null,
          warnings: Array.isArray(input.importSummary.warnings) ? input.importSummary.warnings : [],
        }
      : null,
    compatibilityScore,
    mbti: {
      personA: mbtiA,
      personB: mbtiB,
      summary: 'Pattern suggests one partner leads with clarity while the other prioritizes emotional pacing.',
    },
    sentimentTimeline: createTimeline(),
    responsePatterns: [
      { label: 'Avg Reply Speed', value: `${randomInt(4, 26)} min` },
      { label: 'Message Balance', value: `${randomInt(42, 58)} / ${randomInt(42, 58)}` },
      { label: 'Conflict Recovery', value: `${randomInt(58, 91)}%` },
      { label: 'Tone Volatility', value: `${randomInt(8, 32)}%` },
    ],
    activityHeatmap: createHeatmap(),
    viralMoments: [
      {
        title: 'High Affection Window',
        excerpt: 'A strong cluster of supportive and validating messages appears after a tense exchange.',
      },
      {
        title: 'Repair Moment',
        excerpt: 'Conflict de-escalates quickly when expectations are made explicit and acknowledged.',
      },
      {
        title: 'Shared Humor Peak',
        excerpt: 'Frequent playful replies align with your highest engagement period.',
      },
    ],
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
    next = next.filter((analysis) => sanitizeStatus(analysis.status) === status)
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

export async function createAnalysis(input, options = {}) {
  const onProgress = options.onProgress ?? (() => {})
  const totalDelay = randomInt(4000, 8000)
  const steps = [
    'Reading patterns',
    'Mapping emotions',
    'Identifying dynamics',
    'Generating insights',
    'Preparing dashboard',
  ]

  const baseSegment = Math.floor(totalDelay / steps.length)
  const finalSegment = totalDelay - baseSegment * (steps.length - 1)

  for (let index = 0; index < steps.length; index += 1) {
    onProgress(steps[index])
    const delay = index === steps.length - 1 ? finalSegment : baseSegment
    await wait(delay)
  }

  const result = enrichAnalysis(buildMockResult(input))
  const analyses = readAnalyses()
  analyses.unshift(result)
  writeAnalyses(analyses)

  return result
}

export function getAnalysis(id) {
  const analyses = readAnalyses()
  return analyses.find((analysis) => analysis.id === id) ?? null
}

export function listAnalyses(filters) {
  const analyses = readAnalyses()
  return applyFilters(analyses, filters)
}

export function updateAnalysis(id, patch) {
  if (!id || !patch || typeof patch !== 'object') return null

  let updated = null
  const analyses = readAnalyses().map((analysis) => {
    if (analysis.id !== id) return analysis
    const merged = enrichAnalysis({ ...analysis, ...patch })
    updated = merged
    return merged
  })

  writeAnalyses(analyses)
  return updated
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

function removeLoveGuruContextForAnalysis(analysisId) {
  try {
    const rawContext = localStorage.getItem('loveGuruContext')
    if (!rawContext) return
    const parsed = JSON.parse(rawContext)
    if (parsed?.analysisId === analysisId) {
      localStorage.removeItem('loveGuruContext')
      localStorage.removeItem('loveGuruDraftMessage')
    }
  } catch {
    // no-op
  }
}

export function deleteAnalysis(id) {
  const analyses = readAnalyses().filter((analysis) => analysis.id !== id)
  writeAnalyses(analyses)

  try {
    localStorage.removeItem(`tpai:notes:${id}`)
  } catch {
    // no-op
  }

  removeLoveGuruContextForAnalysis(id)

  if (getLastOpenedAnalysisId() === id) {
    localStorage.removeItem(LAST_OPENED_ANALYSIS_KEY)
  }
}

export function deleteAllAnalyses() {
  try {
    localStorage.removeItem(ANALYSES_KEY)
    localStorage.removeItem(LAST_OPENED_ANALYSIS_KEY)
    localStorage.removeItem('loveGuruContext')
    localStorage.removeItem('loveGuruDraftMessage')

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.startsWith('tpai:notes:')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // no-op
  }
}

export function exportAnalysisJson(id) {
  const analysis = getAnalysis(id)
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
      participants: analysis.importSummary?.participants ?? [analysis.participants?.personA, analysis.participants?.personB].filter(Boolean),
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

export function exportAnalysis(id) {
  return exportAnalysisJson(id)
}
