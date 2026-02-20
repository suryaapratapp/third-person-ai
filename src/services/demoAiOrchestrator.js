import { buildAnalysisPrompt, buildLoveGuruPrompt } from './demoAiPrompts'
import { parseJsonSafely, validateDemoAnalysisPayload } from './demoAiSchema'
import { hasDemoModeConsent, isDemoModeEnabled } from './demoModeService'
import { loadPuter } from '../utils/loadPuter'
import { computeMetrics, parseChat } from '../utils/chatParseAndMetrics'

export const DEMO_MODE_ENABLED_KEY = 'tpai_demo_mode_enabled'
export const DEMO_MODE_CONSENT_KEY = 'tpai_demo_mode_consent'
export const DEMO_ANALYSES_KEY = 'tpai_demo_analyses'
export const DEMO_THREADS_KEY = 'tpai_demo_threads'

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function toError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function sanitizeSnippet(text) {
  return String(text || '')
    .replace(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/g, '[redacted-phone]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.\s]{2,35}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr)\b/gi, '[redacted-address]')
    .slice(0, 240)
}

function chunkText(rawText, maxChars = 6000, maxChunks = 4) {
  const lines = String(rawText || '').split(/\r?\n/)
  const chunks = []
  let current = ''

  for (const line of lines) {
    if (current.length + line.length + 1 > maxChars) {
      chunks.push(current)
      current = line
    } else {
      current = current ? `${current}\n${line}` : line
    }
    if (chunks.length >= maxChunks) break
  }

  if (current && chunks.length < maxChunks) {
    chunks.push(current)
  }

  return chunks.filter(Boolean)
}

async function invokePuter(prompt) {
  const puter = await loadPuter()
  if (puter?.ai?.chat) return puter.ai.chat(prompt)
  if (puter?.chat) return puter.chat(prompt)
  throw toError('DEMO_AI_UNAVAILABLE', 'Demo AI is unavailable in this browser.')
}

function textFromPuterResponse(response) {
  if (typeof response === 'string') return response
  if (!response || typeof response !== 'object') return ''
  if (typeof response.text === 'string') return response.text
  if (typeof response.content === 'string') return response.content
  if (typeof response.message === 'string') return response.message
  if (response.message && typeof response.message.content === 'string') return response.message.content
  if (Array.isArray(response.choices) && response.choices[0]) {
    const choice = response.choices[0]
    if (typeof choice.text === 'string') return choice.text
    if (choice.message && typeof choice.message.content === 'string') return choice.message.content
  }
  return ''
}

function ensureDemoReady() {
  if (!isDemoModeEnabled()) {
    throw toError('DEMO_MODE_DISABLED', 'Demo Mode is disabled.')
  }
  if (!hasDemoModeConsent()) {
    throw toError('DEMO_CONSENT_REQUIRED', 'Consent is required before using Demo Mode.')
  }
}

function listAnalysesStore() {
  const rows = readJson(DEMO_ANALYSES_KEY, [])
  return Array.isArray(rows) ? rows : []
}

function writeAnalysesStore(rows) {
  writeJson(DEMO_ANALYSES_KEY, rows)
}

function readThreadsStore() {
  const raw = readJson(DEMO_THREADS_KEY, {})
  return raw && typeof raw === 'object' ? raw : {}
}

function writeThreadsStore(value) {
  writeJson(DEMO_THREADS_KEY, value)
}

function getThreadContainer(store, analysisId) {
  if (!store[analysisId]) {
    store[analysisId] = { threads: [], messagesByThread: {} }
  }
  if (!Array.isArray(store[analysisId].threads)) store[analysisId].threads = []
  if (!store[analysisId].messagesByThread || typeof store[analysisId].messagesByThread !== 'object') {
    store[analysisId].messagesByThread = {}
  }
  return store[analysisId]
}

function toParticipantPair(participants) {
  const safeParticipants = safeArray(participants)
  return {
    personA: safeParticipants[0]?.name || safeParticipants[0] || 'Person A',
    personB: safeParticipants[1]?.name || safeParticipants[1] || 'Person B',
  }
}

function toSentimentTimeline(metrics) {
  if (!safeArray(metrics.sentimentOverTimeBuckets).length) {
    return [
      { label: 'Start', value: 54 },
      { label: 'Mid', value: 52 },
      { label: 'Current', value: 58 },
    ]
  }

  return metrics.sentimentOverTimeBuckets.map((item) => ({
    label: item.week,
    value: Math.max(0, Math.min(100, Math.round(50 + item.sentiment * 12))),
  }))
}

function toLegacyHeatmap(metrics) {
  const result = []
  safeArray(metrics.weeklyHeatmap).forEach((row) => {
    const blocks = safeArray(row.blocks)
    const mapper = [
      { slot: 'Morning', indexes: [1, 2] },
      { slot: 'Afternoon', indexes: [3] },
      { slot: 'Evening', indexes: [4] },
      { slot: 'Night', indexes: [0, 5] },
    ]
    mapper.forEach((entry) => {
      const value = entry.indexes.reduce((acc, index) => acc + (blocks[index]?.count || 0), 0)
      result.push({
        day: row.day,
        slot: entry.slot,
        value: Math.min(100, Math.max(8, value)),
      })
    })
  })
  return result
}

function toLegacyResponsePatterns(metrics) {
  const participants = safeArray(metrics.participants)
  if (!participants.length) {
    return [
      { label: 'Avg Reply Speed', value: 'Variable' },
      { label: 'Message Balance', value: 'Mixed' },
      { label: 'Conflict Recovery', value: 'Developing' },
      { label: 'Tone Volatility', value: 'Moderate' },
    ]
  }

  const sorted = [...participants].sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0)
  )
  const first = sorted[0]?.messageCount || 0
  const second = sorted[1]?.messageCount || 0
  const total = first + second || 1
  const ratioA = Math.round((first / total) * 100)
  const ratioB = Math.round((second / total) * 100)

  return [
    { label: 'Avg Reply Speed', value: 'Variable (demo)' },
    { label: 'Message Balance', value: `${ratioA} / ${ratioB}` },
    { label: 'Conflict Recovery', value: 'Pattern-based estimate' },
    { label: 'Tone Volatility', value: `${Math.min(80, Math.max(10, Math.round(metrics.notableSpikesCandidates?.[0]?.delta * 20 || 26)))}%` },
  ]
}

function resolveRelatedMessages(messages, selectors) {
  const safeMessages = safeArray(messages)
  const safeSelectors = safeArray(selectors)
  if (!safeSelectors.length) return []

  const matches = []
  safeSelectors.forEach((selector) => {
    const participant = String(selector.participant || '').toLowerCase()
    const contains = String(selector.contains || '').toLowerCase()
    safeMessages.forEach((message) => {
      const speakerOk = !participant || String(message.speaker || '').toLowerCase().includes(participant)
      const textOk = !contains || String(message.text || '').toLowerCase().includes(contains)
      if (speakerOk && textOk) {
        matches.push(message)
      }
    })
  })

  const dedup = []
  const seen = new Set()
  matches.forEach((item) => {
    if (seen.has(item.id)) return
    seen.add(item.id)
    dedup.push(item)
  })
  return dedup.slice(0, 8)
}

function buildDemoAnalysisRecord({
  analysisId,
  parsed,
  metrics,
  aiPayload,
  manualDateRange,
  allowRawSend,
  personaPreference,
}) {
  const createdAt = new Date().toISOString()
  const participants = safeArray(aiPayload.participants).length
    ? aiPayload.participants
    : metrics.participants

  const participantPair = toParticipantPair(participants)
  const sentimentTimeline = toSentimentTimeline(metrics)
  const majorEvents = safeArray(aiPayload.majorEvents).map((event, index) => ({
    ...event,
    id: `event_${index + 1}`,
    relatedMessages: resolveRelatedMessages(parsed.messages, event.relatedMessageSelectors),
  }))

  return {
    id: analysisId,
    version: 2,
    createdAt,
    title: `Demo analysis - ${new Date(createdAt).toLocaleDateString()} ${new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    tags: ['Demo'],
    status: 'READY',
    isDemo: true,
    sourceApp: 'paste',
    inputMethod: 'paste',
    intent: personaPreference || null,
    compatibilityScore: Math.max(0, Math.min(100, Math.round(aiPayload.compatibility?.score || 0))),
    participants: participantPair,
    mbti: {
      personA: safeArray(aiPayload.personality)[0]?.archetypeCode || 'Unknown',
      personB: safeArray(aiPayload.personality)[1]?.archetypeCode || 'Unknown',
      summary: aiPayload.compatibility?.summary || 'Demo personality inference.',
    },
    sentimentTimeline,
    responsePatterns: toLegacyResponsePatterns(metrics),
    activityHeatmap: toLegacyHeatmap(metrics),
    viralMoments: majorEvents.slice(0, 3).map((event) => ({
      title: event.event || 'Notable shift',
      excerpt: event.summary || 'Engagement and tone shift detected.',
    })),
    privacy: {
      hideNamesUsed: false,
      maskSensitiveUsed: true,
    },
    importSummary: {
      participants: participants.map((item) => item.name || item),
      stats: {
        messageCount: metrics.totalMessages || 0,
        participantCount: participants.length,
        startDateISO: parsed.messages.find((item) => item.ts)?.ts || manualDateRange?.start || null,
        endDateISO: [...parsed.messages].reverse().find((item) => item.ts)?.ts || manualDateRange?.end || null,
        estimatedDays: metrics.conversationDurationDays || null,
        languageHint: metrics.detectedLanguages?.join(', ') || null,
      },
      warnings: [
        'Demo Mode result. Experimental insights - results may vary.',
      ],
    },
    demoInsights: {
      engagement: {
        participants,
        weeklyHeatmap: metrics.weeklyHeatmap,
        engagementOverTime: metrics.engagementOverTime,
      },
      compatibility: aiPayload.compatibility,
      majorEvents,
      sentiment: {
        narrative: aiPayload.sentiment?.narrative || '',
        timelineMarkers: safeArray(aiPayload.sentiment?.timelineMarkers),
        buckets: metrics.sentimentOverTimeBuckets,
      },
      personality: safeArray(aiPayload.personality),
      wordClouds: metrics.topWordsPerParticipant,
      parsedMessages: parsed.messages.slice(0, 1200),
      languageHints: metrics.detectedLanguages,
      notableSpikesCandidates: metrics.notableSpikesCandidates,
      copy: aiPayload.copy || {},
      generationMeta: {
        allowRawSend: Boolean(allowRawSend),
      },
    },
  }
}

async function summarizeChunk(chunk, index) {
  const prompt = [
    'Summarize this chat chunk into plain JSON.',
    'Return only JSON shape:',
    '{"index": number, "topics": ["string"], "tone": "string", "keyMoments": ["string"], "participantSignals": ["string"]}',
    `Chunk index: ${index}`,
    `Chunk: ${chunk}`,
  ].join('\n')

  const response = await invokePuter(prompt)
  const text = textFromPuterResponse(response)
  const parsed = parseJsonSafely(text)
  if (parsed) return parsed
  return {
    index,
    topics: [],
    tone: 'mixed',
    keyMoments: [sanitizeSnippet(chunk.slice(0, 180))],
    participantSignals: [],
  }
}

async function generateStructuredAnalysis({
  parsedSummary,
  metricsSummary,
  allowRawSend,
  rawText,
}) {
  const shouldChunk = allowRawSend && rawText.length > 12000
  const chunkSummaries = []

  if (shouldChunk) {
    const chunks = chunkText(rawText, 6000, 4)
    for (let index = 0; index < chunks.length; index += 1) {
      // Sequential to keep demo service load predictable.
      // eslint-disable-next-line no-await-in-loop
      const summary = await summarizeChunk(chunks[index], index + 1)
      chunkSummaries.push(summary)
    }
  }

  const prompt = buildAnalysisPrompt({
    parsedSummary,
    metricsSummary,
    allowRawSend,
    rawTextMaybe: allowRawSend && !shouldChunk ? rawText.slice(0, 12000) : null,
    chunkSummaries,
  })

  const firstResponse = await invokePuter(prompt)
  const firstText = textFromPuterResponse(firstResponse)
  let payload = parseJsonSafely(firstText)
  let validation = validateDemoAnalysisPayload(payload)

  if (!validation.valid) {
    const repairPrompt = [
      'Your previous output did not match the required schema.',
      'Return ONLY valid JSON. No prose.',
      `Error: ${validation.reason}`,
      `Previous output: ${firstText}`,
      'Schema:',
      buildAnalysisPrompt({
        parsedSummary,
        metricsSummary,
        allowRawSend,
        rawTextMaybe: null,
        chunkSummaries,
      }),
    ].join('\n\n')

    const repairResponse = await invokePuter(repairPrompt)
    const repairText = textFromPuterResponse(repairResponse)
    payload = parseJsonSafely(repairText)
    validation = validateDemoAnalysisPayload(payload)
  }

  if (!validation.valid) {
    throw toError('DEMO_SCHEMA_INVALID', "We couldn't format the results. Please retry.")
  }

  return payload
}

export async function runDemoPipeline({
  rawText,
  manualParticipants = [],
  manualDateRange = null,
  allowRawSend = false,
  personaPreference = null,
}) {
  ensureDemoReady()
  const text = String(rawText || '').trim()
  if (!text) throw toError('DEMO_INPUT_EMPTY', 'No chat text provided.')

  const parsed = parseChat(text, manualParticipants)
  const metrics = computeMetrics(parsed.messages, manualDateRange)

  const parsedSummary = {
    messageCount: metrics.totalMessages,
    participants: metrics.participants.map((item) => ({ name: item.name, count: item.messageCount })),
    sampleSnippets: parsed.messages.slice(0, 10).map((item) => ({
      speaker: item.speaker,
      ts: item.ts,
      text: sanitizeSnippet(item.text),
    })),
    languageHints: metrics.detectedLanguages,
  }

  const metricsSummary = {
    engagementOverTime: metrics.engagementOverTime,
    weeklyHeatmap: metrics.weeklyHeatmap,
    sentimentOverTimeBuckets: metrics.sentimentOverTimeBuckets,
    notableSpikesCandidates: metrics.notableSpikesCandidates,
    topWordsPerParticipant: metrics.topWordsPerParticipant.map((row) => ({
      name: row.name,
      words: row.words.slice(0, 15),
    })),
    conversationDurationDays: metrics.conversationDurationDays,
  }

  const aiPayload = await generateStructuredAnalysis({
    parsedSummary,
    metricsSummary,
    allowRawSend: Boolean(allowRawSend),
    rawText: text,
  })

  const analysisId = hasDemoModeConsent() && aiPayload.analysisId ? aiPayload.analysisId : createId('demo')
  const analysis = buildDemoAnalysisRecord({
    analysisId,
    parsed,
    metrics,
    aiPayload,
    manualDateRange,
    allowRawSend,
    personaPreference,
  })

  const all = listAnalysesStore()
  all.unshift(analysis)
  writeAnalysesStore(all)
  return analysis
}

export function listDemoAnalysesStore() {
  return listAnalysesStore()
}

export function getDemoAnalysisStore(id) {
  return listAnalysesStore().find((item) => item.id === id) || null
}

export function deleteDemoAnalysisStore(id) {
  const next = listAnalysesStore().filter((item) => item.id !== id)
  writeAnalysesStore(next)
  const threadStore = readThreadsStore()
  delete threadStore[id]
  writeThreadsStore(threadStore)
}

export function clearDemoAnalysesStore() {
  writeAnalysesStore([])
  writeThreadsStore({})
}

export function listThreadsStoreByAnalysis(analysisId) {
  const store = readThreadsStore()
  const container = getThreadContainer(store, analysisId)
  return [...container.threads].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
}

export function createThreadStore({ analysisId, persona, tone }) {
  const store = readThreadsStore()
  const container = getThreadContainer(store, analysisId)
  const now = new Date().toISOString()
  const thread = {
    id: createId('demo_thread'),
    analysisId,
    persona: persona || 'coach',
    tone: tone || 'balanced',
    createdAt: now,
    updatedAt: now,
  }
  container.threads.unshift(thread)
  container.messagesByThread[thread.id] = []
  writeThreadsStore(store)
  return thread
}

function locateThread(threadId) {
  const store = readThreadsStore()
  const analysisIds = Object.keys(store)
  for (const analysisId of analysisIds) {
    const container = getThreadContainer(store, analysisId)
    if (container.messagesByThread[threadId]) {
      return { store, analysisId, container }
    }
  }
  return null
}

export function getThreadMessagesStore(threadId) {
  const located = locateThread(threadId)
  if (!located) return []
  return safeArray(located.container.messagesByThread[threadId])
}

export function deleteThreadStore(threadId) {
  const located = locateThread(threadId)
  if (!located) return
  delete located.container.messagesByThread[threadId]
  located.container.threads = located.container.threads.filter((item) => item.id !== threadId)
  writeThreadsStore(located.store)
}

export async function sendLoveGuru({ analysisId, threadId, persona, tone, userMessage }) {
  ensureDemoReady()
  const analysis = getDemoAnalysisStore(analysisId)
  if (!analysis) {
    throw toError('DEMO_ANALYSIS_NOT_FOUND', 'Analysis not found for Love Guru context.')
  }

  const existing = getThreadMessagesStore(threadId)
  const analysisSummary = {
    compatibility: analysis.demoInsights?.compatibility,
    strengths: safeArray(analysis.demoInsights?.compatibility?.strengths).slice(0, 4),
    challenges: safeArray(analysis.demoInsights?.compatibility?.challenges).slice(0, 4),
    growth: safeArray(analysis.demoInsights?.compatibility?.growth).slice(0, 4),
    majorEvents: safeArray(analysis.demoInsights?.majorEvents).map((item) => item.event).slice(0, 6),
    personality: safeArray(analysis.demoInsights?.personality).map((item) => ({
      participant: item.participant,
      archetypeCode: item.archetypeCode,
      strengths: item.strengthTags,
      weaknesses: item.weaknessTags,
    })),
  }

  const prompt = buildLoveGuruPrompt({
    persona,
    tone,
    languageHints: analysis.demoInsights?.languageHints || analysis.importSummary?.stats?.languageHint,
    analysisSummary,
    threadMessages: existing,
    userMessage,
  })

  const response = await invokePuter(prompt)
  const assistantText = textFromPuterResponse(response).trim()
  if (!assistantText) {
    throw toError('DEMO_AI_UNAVAILABLE', 'Demo AI unavailable right now.')
  }

  return assistantText
}

export async function appendLoveGuruThreadMessage({
  analysisId,
  threadId,
  persona,
  tone,
  userMessage,
}) {
  const userRow = {
    id: createId('demo_msg'),
    role: 'user',
    content: userMessage,
    createdAt: new Date().toISOString(),
  }

  const assistantText = await sendLoveGuru({
    analysisId,
    threadId,
    persona,
    tone,
    userMessage,
  })

  const assistantRow = {
    id: createId('demo_msg'),
    role: 'assistant',
    content: assistantText,
    createdAt: new Date().toISOString(),
  }

  const located = locateThread(threadId)
  if (!located) {
    throw toError('DEMO_THREAD_NOT_FOUND', 'Love Guru thread not found.')
  }

  const existing = safeArray(located.container.messagesByThread[threadId])
  located.container.messagesByThread[threadId] = [...existing, userRow, assistantRow]
  located.container.threads = located.container.threads.map((thread) =>
    thread.id === threadId
      ? { ...thread, updatedAt: new Date().toISOString(), persona: persona || thread.persona, tone: tone || thread.tone }
      : thread,
  )
  writeThreadsStore(located.store)

  return {
    userMessage: userRow,
    assistantMessage: assistantRow,
  }
}
