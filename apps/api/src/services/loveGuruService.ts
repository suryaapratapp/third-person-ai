import OpenAI from 'openai'
import { prisma } from '../utils/prisma'
import { env } from '../utils/env'
import { logAIUsage } from './aiUsageService'

type Persona = 'coach' | 'bestie'
type Tone = 'gentle' | 'balanced' | 'direct'

type LoveGuruThreadDto = {
  id: string
  analysisId: string
  persona: Persona
  tone: Tone
  createdAt: string
}

type LoveGuruMessageDto = {
  id: string
  threadId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

const openai = new OpenAI({ apiKey: env.openAiApiKey })

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  // Placeholder estimate; replace with model-specific pricing table.
  return Number(((inputTokens + outputTokens) * 0.0000005).toFixed(6))
}

function toThreadDto(value: {
  id: string
  analysisRunId: string
  persona: string
  tone: string
  createdAt: Date
}): LoveGuruThreadDto {
  return {
    id: value.id,
    analysisId: value.analysisRunId,
    persona: value.persona as Persona,
    tone: value.tone as Tone,
    createdAt: value.createdAt.toISOString(),
  }
}

function toMessageDto(value: {
  id: string
  threadId: string
  role: string
  content: string
  createdAt: Date
}): LoveGuruMessageDto {
  return {
    id: value.id,
    threadId: value.threadId,
    role: value.role as LoveGuruMessageDto['role'],
    content: value.content,
    createdAt: value.createdAt.toISOString(),
  }
}

function personaTemplate(persona: Persona): string {
  if (persona === 'coach') {
    return (
      'You are Love Guru in Coach mode. Be calm, practical, and structured. ' +
      'Focus on concrete communication steps and reflection prompts.'
    )
  }

  return (
    'You are Love Guru in Bestie mode. Be warm, supportive, and clear. ' +
    'Validate emotions while still being honest and actionable.'
  )
}

function toneTemplate(tone: Tone): string {
  if (tone === 'gentle') {
    return 'Use soft, careful wording with low intensity. Keep guidance compassionate.'
  }

  if (tone === 'direct') {
    return 'Be concise and direct. Do not be harsh, but prioritize clarity over cushioning.'
  }

  return 'Use balanced tone: empathetic and practical with moderate directness.'
}

function buildAnalysisContext(insights: Array<{ type: string; payload: unknown }>): string {
  if (!insights.length) {
    return 'No prior analysis insights are available yet.'
  }

  const top = insights.slice(0, 8).map((insight) => {
    const payload = JSON.stringify(insight.payload)
    const compact = payload.length > 320 ? `${payload.slice(0, 320)}...` : payload
    return `- ${insight.type}: ${compact}`
  })

  return `Available analysis insights:\n${top.join('\n')}`
}

function buildMockLoveGuruReply(params: {
  text: string
  persona: Persona
  tone: Tone
  insightCount: number
}): string {
  const cleanText = params.text.replace(/\s+/g, ' ').trim()
  const promptSeed = cleanText.toLowerCase()
  const focus =
    promptSeed.includes('next') || promptSeed.includes('do')
      ? 'next steps'
      : promptSeed.includes('message')
        ? 'message drafting'
        : 'clarity'

  const intro =
    params.persona === 'coach'
      ? 'Here is a structured read based on your current signals.'
      : 'I hear you. Here is a grounded read based on your current signals.'

  const toneLine =
    params.tone === 'gentle'
      ? 'I will keep this soft and steady.'
      : params.tone === 'direct'
        ? 'I will keep this concise and direct.'
        : 'I will balance empathy with practical direction.'

  return [
    intro,
    toneLine,
    `Primary focus: ${focus}.`,
    `I used ${params.insightCount} available insight blocks from your latest analysis context.`,
    'Suggested action: name one concrete conversation goal, one boundary, and one follow-up step for this week.',
    'Reminder: these are pattern-based suggestions, not guarantees.',
  ].join(' ')
}

export async function createLoveGuruThreadForUser(params: {
  userId: string
  analysisId: string
  persona: Persona
  tone: Tone
}): Promise<LoveGuruThreadDto | null> {
  const analysis = await prisma.analysisRun.findFirst({
    where: {
      id: params.analysisId,
      uploadSession: {
        userId: params.userId,
      },
    },
    select: { id: true },
  })

  if (!analysis) return null

  const thread = await prisma.loveGuruThread.create({
    data: {
      analysisRunId: params.analysisId,
      persona: params.persona,
      tone: params.tone,
    },
    select: {
      id: true,
      analysisRunId: true,
      persona: true,
      tone: true,
      createdAt: true,
    },
  })

  return toThreadDto(thread)
}

export async function listLoveGuruThreadsForUser(
  userId: string,
  analysisId: string,
): Promise<LoveGuruThreadDto[] | null> {
  const analysis = await prisma.analysisRun.findFirst({
    where: {
      id: analysisId,
      uploadSession: {
        userId,
      },
    },
    select: { id: true },
  })

  if (!analysis) return null

  const threads = await prisma.loveGuruThread.findMany({
    where: { analysisRunId: analysisId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      analysisRunId: true,
      persona: true,
      tone: true,
      createdAt: true,
    },
  })

  return threads.map(toThreadDto)
}

export async function listThreadMessagesForUser(
  userId: string,
  threadId: string,
): Promise<LoveGuruMessageDto[] | null> {
  const thread = await prisma.loveGuruThread.findFirst({
    where: {
      id: threadId,
      analysisRun: {
        uploadSession: {
          userId,
        },
      },
    },
    select: { id: true },
  })

  if (!thread) return null

  const messages = await prisma.loveGuruMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      threadId: true,
      role: true,
      content: true,
      createdAt: true,
    },
  })

  return messages.map(toMessageDto)
}

export async function createLoveGuruMessageForUser(params: {
  userId: string
  threadId: string
  text: string
}): Promise<{ userMessage: LoveGuruMessageDto; assistantMessage: LoveGuruMessageDto } | null> {
  const thread = await prisma.loveGuruThread.findFirst({
    where: {
      id: params.threadId,
      analysisRun: {
        uploadSession: {
          userId: params.userId,
        },
      },
    },
    select: {
      id: true,
      analysisRunId: true,
      persona: true,
      tone: true,
      analysisRun: {
        select: {
          insights: {
            orderBy: { createdAt: 'desc' },
            take: 12,
            select: {
              type: true,
              payload: true,
            },
          },
        },
      },
    },
  })

  if (!thread) return null

  const userMessage = await prisma.loveGuruMessage.create({
    data: {
      threadId: params.threadId,
      role: 'user',
      content: params.text,
    },
    select: {
      id: true,
      threadId: true,
      role: true,
      content: true,
      createdAt: true,
    },
  })

  const recentMessages = await prisma.loveGuruMessage.findMany({
    where: { threadId: params.threadId },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: {
      role: true,
      content: true,
    },
  })

  let assistantText = ''

  if (env.analysisMode === 'mock') {
    assistantText = buildMockLoveGuruReply({
      text: params.text,
      persona: thread.persona as Persona,
      tone: thread.tone as Tone,
      insightCount: thread.analysisRun.insights.length,
    })

    try {
      await logAIUsage({
        userId: params.userId,
        endpoint: '/love-guru/threads/:id/messages',
        operation: 'love_guru_reply_mock',
        provider: 'mock',
        model: 'deterministic-mock-v1',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        metadata: {
          threadId: params.threadId,
          persona: thread.persona,
          tone: thread.tone,
          mode: 'mock',
        },
      })
    } catch {
      // Usage logging should not fail user-facing response.
    }
  } else {
    if (!env.openAiApiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    const conversation = [...recentMessages].reverse().map((message) => ({
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content,
    }))

    const systemPrompt = [
      'You are Love Guru, an AI relationship reflection assistant.',
      personaTemplate(thread.persona as Persona),
      toneTemplate(thread.tone as Tone),
      'Use signals and patterns language. Do not make guarantees.',
      'Do not provide legal, medical, or crisis intervention advice. If needed, recommend professional help.',
      buildAnalysisContext(thread.analysisRun.insights),
    ].join('\n\n')

    const completion = await openai.chat.completions.create({
      model: env.openAiModel,
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversation,
      ],
    })

    assistantText =
      completion.choices[0]?.message?.content?.trim() ||
      'I could not generate a response right now. Please try again.'

    const promptTokens = completion.usage?.prompt_tokens ?? 0
    const completionTokens = completion.usage?.completion_tokens ?? 0
    const totalTokens = completion.usage?.total_tokens ?? promptTokens + completionTokens

    try {
      await logAIUsage({
        userId: params.userId,
        endpoint: '/love-guru/threads/:id/messages',
        operation: 'love_guru_reply',
        provider: 'openai',
        model: env.openAiModel,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        totalTokens,
        estimatedCostUsd: estimateCostUsd(promptTokens, completionTokens),
        metadata: {
          threadId: params.threadId,
          persona: thread.persona,
          tone: thread.tone,
        },
      })
    } catch {
      // Usage logging should not fail user-facing response.
    }
  }

  const assistantMessage = await prisma.loveGuruMessage.create({
    data: {
      threadId: params.threadId,
      role: 'assistant',
      content: assistantText,
    },
    select: {
      id: true,
      threadId: true,
      role: true,
      content: true,
      createdAt: true,
    },
  })

  return {
    userMessage: toMessageDto(userMessage),
    assistantMessage: toMessageDto(assistantMessage),
  }
}
