import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { pool } from '../utils/db'
import { env } from '../utils/env'

type NormalizedMessage = {
  timestamp: Date
  sender: string
  text: string
}

const POSITIVE_WORDS = [
  'love',
  'great',
  'good',
  'thanks',
  'appreciate',
  'happy',
  'excited',
  'support',
  'care',
  'glad',
]

const NEGATIVE_WORDS = [
  'sad',
  'angry',
  'upset',
  'hurt',
  'sorry',
  'confused',
  'frustrated',
  'annoyed',
  'tired',
  'stress',
]

const insightOutputSchema = z.object({
  compatibility: z.object({
    score: z.number().int().min(0).max(100),
    summary: z.string().min(1),
    signals: z.array(z.string()).min(2).max(6),
  }),
  mbti: z.object({
    likelyTypes: z.array(z.string()).min(1).max(2),
    rationale: z.string().min(1),
  }),
  sentimentTimeline: z.object({
    trend: z.enum(['improving', 'mixed', 'declining', 'stable']),
    keyShifts: z.array(z.string()).min(1).max(6),
  }),
  responsePatterns: z.object({
    averageLagMinutes: z.number().min(0),
    observations: z.array(z.string()).min(2).max(6),
  }),
  activityHeatmap: z.object({
    activeWindows: z.array(z.string()).min(2).max(6),
    summary: z.string().min(1),
  }),
  viralMoments: z.object({
    highlights: z.array(z.string()).min(1).max(5),
  }),
  meta: z.object({
    confidence: z.enum(['low', 'medium', 'high']),
    limitations: z.array(z.string()).min(1).max(5),
  }),
})

export type InsightOutput = z.infer<typeof insightOutputSchema>
export type AnalysisUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}
export type AnalysisPipelineResult = {
  insights: InsightOutput
  usage: AnalysisUsage
}

const client = new OpenAI({
  apiKey: env.openAiApiKey,
})

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function deterministicHash(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 2147483647
  }
  return Math.abs(hash)
}

function estimateTokens(input: string): number {
  return Math.ceil(input.length / 4)
}

function formatMessages(messages: NormalizedMessage[]): string {
  return messages
    .map((message) => {
      const date = message.timestamp.toISOString()
      const sanitizedText = message.text.replace(/\s+/g, ' ').trim()
      return `[${date}] ${message.sender}: ${sanitizedText}`
    })
    .join('\n')
}

function chunkMessages(messages: NormalizedMessage[], chunkTokenBudget: number): NormalizedMessage[][] {
  const chunks: NormalizedMessage[][] = []
  let currentChunk: NormalizedMessage[] = []
  let currentTokens = 0

  for (const message of messages) {
    const messageTokenEstimate = estimateTokens(
      `${message.timestamp.toISOString()} ${message.sender}: ${message.text}`,
    )

    if (currentChunk.length > 0 && currentTokens + messageTokenEstimate > chunkTokenBudget) {
      chunks.push(currentChunk)
      currentChunk = []
      currentTokens = 0
    }

    currentChunk.push(message)
    currentTokens += messageTokenEstimate
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  return chunks
}

async function withRetry<T>(operation: () => Promise<T>, maxAttempts: number): Promise<T> {
  let attempt = 0
  let lastError: unknown

  while (attempt < maxAttempts) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      attempt += 1
      if (attempt >= maxAttempts) break
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI operation failed')
}

async function summarizeChunk(
  chunkText: string,
): Promise<{ summary: string; usage: AnalysisUsage }> {
  const completion = await withRetry(
    () =>
      client.chat.completions.create({
        model: env.openAiModel,
        temperature: 0.2,
        max_tokens: 280,
        messages: [
          {
            role: 'system',
            content:
              'You summarize relationship chat segments. Be concise, neutral, and avoid guarantees.',
          },
          {
            role: 'user',
            content: `Summarize this chat chunk in 5-8 bullet points with key emotional and communication shifts:\n\n${chunkText}`,
          },
        ],
      }),
    env.openAiMaxRetries,
  )

  const inputTokens = completion.usage?.prompt_tokens ?? 0
  const outputTokens = completion.usage?.completion_tokens ?? 0
  const totalTokens = completion.usage?.total_tokens ?? inputTokens + outputTokens
  return {
    summary: completion.choices[0]?.message?.content?.trim() ?? 'No summary generated.',
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
    },
  }
}

function buildFinalContext(chunkSummaries: string[]): string {
  const joined = chunkSummaries
    .map((summary, index) => `Chunk ${index + 1} summary:\n${summary}`)
    .join('\n\n')

  const tokenBudget = Math.max(500, env.analysisFinalTokenBudget)
  const maxChars = tokenBudget * 4
  if (joined.length <= maxChars) return joined
  return joined.slice(0, maxChars)
}

async function generateStructuredInsights(
  context: string,
): Promise<{ insights: InsightOutput; usage: AnalysisUsage }> {
  const completion = await withRetry(
    () =>
      client.chat.completions.parse({
        model: env.openAiModel,
        temperature: 0.2,
        max_tokens: 1200,
        messages: [
          {
            role: 'system',
            content:
              'You are a careful relationship analysis assistant. Use only signals/patterns language, no guarantees.',
          },
          {
            role: 'user',
            content:
              `Generate structured analysis outputs from these summaries.\n` +
              `Use neutral language and include limitations.\n\n${context}`,
          },
        ],
        response_format: zodResponseFormat(insightOutputSchema, 'insight_output'),
      }),
    env.openAiMaxRetries,
  )

  const parsed = completion.choices[0]?.message?.parsed
  if (!parsed) {
    throw new Error('OpenAI returned no structured analysis payload')
  }

  const inputTokens = completion.usage?.prompt_tokens ?? 0
  const outputTokens = completion.usage?.completion_tokens ?? 0
  const totalTokens = completion.usage?.total_tokens ?? inputTokens + outputTokens

  return {
    insights: insightOutputSchema.parse(parsed),
    usage: {
      inputTokens,
      outputTokens,
      totalTokens,
    },
  }
}

async function loadMessagesForSession(sessionId: string): Promise<NormalizedMessage[]> {
  const result = await pool.query<{
    timestamp: string
    sender: string
    text: string
  }>(
    `SELECT timestamp, sender, text
     FROM messages
     WHERE upload_session_id = $1
     ORDER BY timestamp ASC
     LIMIT $2`,
    [sessionId, env.analysisMaxInputMessages],
  )

  return result.rows.map((row) => ({
    timestamp: new Date(row.timestamp),
    sender: row.sender,
    text: row.text,
  }))
}

function classifyTrend(score: number): 'improving' | 'mixed' | 'declining' | 'stable' {
  if (score >= 0.6) return 'improving'
  if (score <= -0.6) return 'declining'
  if (Math.abs(score) < 0.2) return 'stable'
  return 'mixed'
}

function buildMockInsights(messages: NormalizedMessage[], sessionId: string): InsightOutput {
  const bySender = new Map<string, number>()
  let positiveHits = 0
  let negativeHits = 0

  for (const message of messages) {
    bySender.set(message.sender, (bySender.get(message.sender) ?? 0) + 1)
    const text = message.text.toLowerCase()
    positiveHits += POSITIVE_WORDS.filter((word) => text.includes(word)).length
    negativeHits += NEGATIVE_WORDS.filter((word) => text.includes(word)).length
  }

  const participants = [...bySender.entries()].sort((a, b) => b[1] - a[1])
  const totalMessages = messages.length
  const topParticipantShare = participants[0]?.[1] ? participants[0][1] / totalMessages : 0.5
  const balanceScore = 1 - Math.abs(0.5 - topParticipantShare) * 2
  const sentimentDelta = positiveHits - negativeHits
  const normalizedSentiment = totalMessages ? sentimentDelta / Math.max(totalMessages / 3, 1) : 0
  const trend = classifyTrend(normalizedSentiment)

  let lagMinutesTotal = 0
  let lagSamples = 0
  for (let index = 1; index < messages.length; index += 1) {
    const previous = messages[index - 1]
    const current = messages[index]
    if (previous.sender === current.sender) continue
    const diffMs = current.timestamp.getTime() - previous.timestamp.getTime()
    if (diffMs <= 0) continue
    lagMinutesTotal += diffMs / 60000
    lagSamples += 1
  }
  const averageLagMinutes = lagSamples ? Math.round((lagMinutesTotal / lagSamples) * 10) / 10 : 12

  const hours = new Array<number>(24).fill(0)
  for (const message of messages) {
    const hour = message.timestamp.getHours()
    hours[hour] += 1
  }
  const peakHourIndexes = hours
    .map((count, hour) => ({ count, hour }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((item) => item.hour)

  const windowFromHour = (hour: number) => {
    if (hour < 6) return 'Night'
    if (hour < 12) return 'Morning'
    if (hour < 18) return 'Afternoon'
    return 'Evening'
  }
  const activeWindows = [...new Set(peakHourIndexes.map(windowFromHour))]
  if (!activeWindows.length) activeWindows.push('Evening', 'Night')

  const dayBins = new Map<string, number>()
  for (const message of messages) {
    const day = message.timestamp.toISOString().slice(0, 10)
    dayBins.set(day, (dayBins.get(day) ?? 0) + 1)
  }
  const dayHighlights = [...dayBins.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day, count]) => `${day}: ${count} messages`)

  const longestMessages = [...messages]
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 3)
    .map((message) => `${message.sender}: ${message.text.slice(0, 90)}`)

  const hash = deterministicHash(sessionId)
  const compatibilityBase = 58 + Math.round(balanceScore * 20) + Math.round(normalizedSentiment * 6)
  const compatibilityScore = Math.max(42, Math.min(92, compatibilityBase + (hash % 6)))

  const likelyTypes = ['ENFJ', 'INFP', 'INTJ', 'ESFJ', 'ENTP']
  const firstType = likelyTypes[hash % likelyTypes.length]
  const secondType = likelyTypes[(hash + participants.length + 2) % likelyTypes.length]

  return insightOutputSchema.parse({
    compatibility: {
      score: compatibilityScore,
      summary:
        'Demo insight based on conversation balance, language tone, and response rhythm signals.',
      signals: [
        `Participant balance score: ${(balanceScore * 100).toFixed(0)}%.`,
        `Detected sentiment skew: ${sentimentDelta >= 0 ? 'more positive' : 'more strained'} exchanges.`,
        `Average response lag: ${averageLagMinutes} minutes.`,
      ],
    },
    mbti: {
      likelyTypes: [firstType, secondType],
      rationale:
        'In demo mode, likely types are inferred from writing style and response pacing patterns.',
    },
    sentimentTimeline: {
      trend,
      keyShifts: dayHighlights.length
        ? dayHighlights
        : ['Not enough dated messages for detailed timeline bins.'],
    },
    responsePatterns: {
      averageLagMinutes,
      observations: [
        `${participants[0]?.[0] ?? 'Participant A'} contributed ${participants[0]?.[1] ?? 0} messages.`,
        `${participants[1]?.[0] ?? 'Participant B'} contributed ${participants[1]?.[1] ?? 0} messages.`,
        `Alternating response behavior observed in ${lagSamples} turn pairs.`,
      ],
    },
    activityHeatmap: {
      activeWindows,
      summary: `Peak activity windows: ${activeWindows.join(', ')}.`,
    },
    viralMoments: {
      highlights: longestMessages.length
        ? longestMessages
        : ['No standout moments detected from current sample.'],
    },
    meta: {
      confidence: 'medium',
      limitations: [
        'Demo mode generated these insights without OpenAI.',
        'Signals are heuristic and should be treated as directional.',
        'Text-only analysis cannot capture full relationship context.',
      ],
    },
  })
}

export async function runAnalysisPipeline(sessionId: string): Promise<AnalysisPipelineResult> {
  const messages = await loadMessagesForSession(sessionId)
  if (!messages.length) {
    throw new Error('No normalized messages available for analysis')
  }

  if (env.analysisMode === 'mock') {
    const deterministicDelay = 2000 + (deterministicHash(sessionId) % 3000)
    await sleep(deterministicDelay)
    return {
      insights: buildMockInsights(messages, sessionId),
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    }
  }

  if (!env.openAiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const chunks = chunkMessages(messages, Math.max(400, env.analysisChunkTokenBudget))
  const limitedChunks = chunks.slice(0, 12)

  const summaries: string[] = []
  const usage: AnalysisUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  }
  for (const chunk of limitedChunks) {
    const chunkText = formatMessages(chunk)
    const chunkSummary = await summarizeChunk(chunkText)
    summaries.push(chunkSummary.summary)
    usage.inputTokens += chunkSummary.usage.inputTokens
    usage.outputTokens += chunkSummary.usage.outputTokens
    usage.totalTokens += chunkSummary.usage.totalTokens
  }

  const finalContext = buildFinalContext(summaries)
  const structured = await generateStructuredInsights(finalContext)
  usage.inputTokens += structured.usage.inputTokens
  usage.outputTokens += structured.usage.outputTokens
  usage.totalTokens += structured.usage.totalTokens

  return {
    insights: structured.insights,
    usage,
  }
}
