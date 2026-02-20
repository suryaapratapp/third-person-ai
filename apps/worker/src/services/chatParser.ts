import path from 'node:path'
import AdmZip from 'adm-zip'

export type SupportedSourceApp =
  | 'whatsapp'
  | 'telegram'
  | 'instagram'
  | 'messenger'
  | 'imessage'
  | 'snapchat'
  | 'unknown'

export type DetectedFormat =
  | 'whatsapp_txt'
  | 'telegram_json'
  | 'telegram_html'
  | 'meta_messages_json'
  | 'snapchat_json'
  | 'imessage_csv'
  | 'generic_paste'

export type CanonicalMessage = {
  id: string
  sourceApp: SupportedSourceApp
  conversationId: string
  senderDisplay: string
  senderId?: string
  direction: 'in' | 'out' | 'unknown'
  timestamp: string | null
  text: string
  messageType: 'text' | 'system' | 'media_stub' | 'reaction' | 'call' | 'unknown'
  metadata: Record<string, unknown>
  raw?: Record<string, unknown>
}

export type ParsedMessage = {
  timestamp: Date
  sender: string
  text: string
  meta?: Record<string, unknown>
}

type ParseIgnoredLine = {
  line: number
  text: string
  reason: string
}

export type DetectImportResult = {
  sourceAppGuess: SupportedSourceApp
  format: DetectedFormat
  confidence: number
  reasons: string[]
}

export type ParseReport = {
  detectedFormat: DetectedFormat
  sourceAppGuess: SupportedSourceApp
  confidence: number
  reasons: string[]
  warnings: string[]
  parsedCount: number
  ignoredCount: number
  totalLines: number
  matchedLines: number
  participants: string[]
  expectedExamples: string[]
  firstIgnoredLines: ParseIgnoredLine[]
  tips: string[]
  selectedThread?: string
}

export class ParseFailedError extends Error {
  readonly payload: {
    error: 'ParseFailed'
    detectedFormat: DetectedFormat
    reason: string
    expectedExamples: string[]
    stats: { totalLines: number; matchedLines: number; ignoredLines: number }
    firstIgnoredLines: ParseIgnoredLine[]
    tips: string[]
  }

  constructor(message: string, report: ParseReport) {
    super(message)
    this.name = 'ParseFailedError'
    this.payload = {
      error: 'ParseFailed',
      detectedFormat: report.detectedFormat,
      reason: message,
      expectedExamples: report.expectedExamples,
      stats: {
        totalLines: report.totalLines,
        matchedLines: report.matchedLines,
        ignoredLines: report.ignoredCount,
      },
      firstIgnoredLines: report.firstIgnoredLines,
      tips: report.tips,
    }
  }
}

type ParseInput = {
  sourceApp: string
  filePath: string
  fileBuffer: Buffer
}

type IntermediateMessage = {
  order: number
  conversationId?: string
  senderDisplay: string
  timestamp: string | null
  text: string
  messageType: CanonicalMessage['messageType']
  metadata?: Record<string, unknown>
  raw?: Record<string, unknown>
}

const DEFAULT_MIN_MESSAGES = 3

const positiveWords = ['love', 'great', 'good', 'thanks', 'appreciate', 'happy']
const negativeWords = ['sad', 'angry', 'upset', 'hurt', 'confused', 'frustrated']

const whatsappStartRegexes = [
  /^\[(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\]\s*([^:]{1,80}):\s*(.*)$/,
  /^(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\s*-\s*([^:]{1,80}):\s*(.*)$/,
]

const whatsappSystemRegexes = [
  /^\[(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\]\s*(.+)$/,
  /^(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\s*-\s*(.+)$/,
]

function normalizeSourceApp(app: string): SupportedSourceApp {
  const normalized = app.trim().toLowerCase()
  if (
    normalized === 'whatsapp' ||
    normalized === 'telegram' ||
    normalized === 'instagram' ||
    normalized === 'messenger' ||
    normalized === 'imessage' ||
    normalized === 'snapchat'
  ) {
    return normalized
  }
  return 'unknown'
}

function decodeTextWithFallback(buffer: Buffer): string {
  const utf8 = buffer.toString('utf-8')
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length
  if (replacementCount <= Math.max(2, Math.floor(utf8.length * 0.005))) {
    return utf8
  }

  const latin1 = buffer.toString('latin1')
  return latin1
}

function parseDateTime(datePart: string, timePart: string): string | null {
  const dateMatch = datePart.trim().match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/)
  if (!dateMatch) return null

  const first = Number(dateMatch[1])
  const second = Number(dateMatch[2])
  const yearRaw = Number(dateMatch[3])
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw

  let month = first
  let day = second

  if (first > 12) {
    day = first
    month = second
  } else if (second > 12) {
    month = first
    day = second
  }

  const timeMatch = timePart
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APMapm]{2}))?$/)
  if (!timeMatch) return null

  let hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])
  const seconds = Number(timeMatch[3] ?? '0')
  const ampm = timeMatch[4]?.toLowerCase()

  if (ampm === 'pm' && hours < 12) hours += 12
  if (ampm === 'am' && hours === 12) hours = 0

  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function flattenText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === 'string') return entry
        if (entry && typeof entry === 'object' && 'text' in entry) {
          const text = (entry as Record<string, unknown>).text
          return typeof text === 'string' ? text : ''
        }
        return ''
      })
      .join('')
  }
  return ''
}

function toCanonicalMessages(
  sourceApp: SupportedSourceApp,
  input: IntermediateMessage[],
): CanonicalMessage[] {
  const normalized = [...input]
    .map((item, index) => ({ ...item, order: Number.isFinite(item.order) ? item.order : index }))
    .sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        if (diff !== 0) return diff
      }
      return a.order - b.order
    })

  let fallbackBase = Date.now()

  return normalized.map((item, index) => {
    const parsedTime = item.timestamp ? new Date(item.timestamp).getTime() : Number.NaN
    const hasValidTimestamp = Number.isFinite(parsedTime)

    const safeTimestamp = hasValidTimestamp
      ? new Date(parsedTime).toISOString()
      : new Date(fallbackBase + index * 1000).toISOString()

    const canonical: CanonicalMessage = {
      id: `msg_${index + 1}`,
      sourceApp,
      conversationId: item.conversationId || 'default',
      senderDisplay: item.senderDisplay || 'Unknown',
      direction: 'unknown',
      timestamp: hasValidTimestamp ? safeTimestamp : null,
      text: item.text,
      messageType: item.messageType,
      metadata: {
        ...(item.metadata ?? {}),
        timestampDerived: !hasValidTimestamp,
      },
      raw: item.raw,
    }

    return canonical
  })
}

function toDbMessages(canonical: CanonicalMessage[]): ParsedMessage[] {
  return canonical.map((message, index) => {
    const timestamp = message.timestamp
      ? new Date(message.timestamp)
      : new Date(Date.now() + index * 1000)

    return {
      timestamp,
      sender: message.senderDisplay || 'Unknown',
      text: message.text,
      meta: {
        sourceApp: message.sourceApp,
        conversationId: message.conversationId,
        senderDisplay: message.senderDisplay,
        senderId: message.senderId,
        direction: message.direction,
        canonicalTimestamp: message.timestamp,
        messageType: message.messageType,
        metadata: message.metadata,
        raw: message.raw,
      },
    }
  })
}

function summarizeSentiment(messages: CanonicalMessage[]): string {
  let positive = 0
  let negative = 0

  for (const message of messages) {
    const text = message.text.toLowerCase()
    positive += positiveWords.filter((word) => text.includes(word)).length
    negative += negativeWords.filter((word) => text.includes(word)).length
  }

  if (positive === negative) return 'mixed'
  return positive > negative ? 'mostly-positive' : 'mostly-strained'
}

function parseWhatsAppText(content: string): {
  messages: IntermediateMessage[]
  ignored: ParseIgnoredLine[]
  totalLines: number
  matchedLines: number
  warnings: string[]
} {
  const lines = content.split(/\r?\n/)
  const messages: IntermediateMessage[] = []
  const ignored: ParseIgnoredLine[] = []
  const warnings: string[] = []
  let matchedLines = 0
  let currentMessage: IntermediateMessage | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]
    const line = raw.trim()
    if (!line) continue

    let matchedStart: RegExpMatchArray | null = null
    for (const regex of whatsappStartRegexes) {
      matchedStart = line.match(regex)
      if (matchedStart) break
    }

    if (matchedStart) {
      matchedLines += 1
      const timestamp = parseDateTime(matchedStart[1], matchedStart[2])
      const sender = matchedStart[3].trim()
      const text = matchedStart[4].trim()
      currentMessage = {
        order: index,
        senderDisplay: sender,
        timestamp,
        text,
        messageType: text ? 'text' : 'unknown',
      }
      messages.push(currentMessage)
      continue
    }

    let matchedSystem: RegExpMatchArray | null = null
    for (const regex of whatsappSystemRegexes) {
      matchedSystem = line.match(regex)
      if (matchedSystem) break
    }

    if (matchedSystem) {
      matchedLines += 1
      const timestamp = parseDateTime(matchedSystem[1], matchedSystem[2])
      const text = matchedSystem[3].trim()
      currentMessage = {
        order: index,
        senderDisplay: 'System',
        timestamp,
        text,
        messageType: 'system',
      }
      messages.push(currentMessage)
      continue
    }

    if (currentMessage) {
      currentMessage.text = `${currentMessage.text}\n${line}`
      continue
    }

    ignored.push({ line: index + 1, text: line.slice(0, 180), reason: 'No message-start pattern match' })
  }

  if (ignored.length) {
    warnings.push('Some lines were ignored because they did not match WhatsApp message patterns.')
  }

  return {
    messages,
    ignored,
    totalLines: lines.length,
    matchedLines,
    warnings,
  }
}

function parseGenericPaste(content: string): {
  messages: IntermediateMessage[]
  ignored: ParseIgnoredLine[]
  totalLines: number
  matchedLines: number
  warnings: string[]
} {
  const lines = content.split(/\r?\n/)
  const messages: IntermediateMessage[] = []
  const ignored: ParseIgnoredLine[] = []
  const warnings: string[] = []
  let matchedLines = 0

  const bracketLineRegex = /^\[(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})[\s,]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\]\s*([^:]{1,80}):\s*(.*)$/
  let currentMessage: IntermediateMessage | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line) continue

    const bracketMatch = line.match(bracketLineRegex)
    if (bracketMatch) {
      matchedLines += 1
      const timestamp = bracketMatch[1].includes('-') && bracketMatch[1].length === 10
        ? new Date(`${bracketMatch[1]}T${bracketMatch[2].replace(/\s*(AM|PM)$/i, '')}Z`).toISOString()
        : parseDateTime(bracketMatch[1], bracketMatch[2])
      currentMessage = {
        order: index,
        senderDisplay: bracketMatch[3].trim(),
        timestamp,
        text: bracketMatch[4].trim(),
        messageType: 'text',
      }
      messages.push(currentMessage)
      continue
    }

    const senderMatch = line.match(/^([^:]{1,80}):\s+(.+)$/)
    if (senderMatch) {
      matchedLines += 1
      currentMessage = {
        order: index,
        senderDisplay: senderMatch[1].trim(),
        timestamp: null,
        text: senderMatch[2].trim(),
        messageType: 'text',
      }
      messages.push(currentMessage)
      continue
    }

    if (currentMessage) {
      currentMessage.text = `${currentMessage.text}\n${line}`
      continue
    }

    ignored.push({ line: index + 1, text: line.slice(0, 180), reason: 'No supported generic paste pattern' })
  }

  if (ignored.length) {
    warnings.push('Some lines were ignored in generic paste mode.')
  }

  return {
    messages,
    ignored,
    totalLines: lines.length,
    matchedLines,
    warnings,
  }
}

function parseTelegramJson(content: string): {
  messages: IntermediateMessage[]
  warnings: string[]
} {
  const warnings: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("This file isn't valid JSON")
  }

  let entries: Array<Record<string, unknown>> = []

  if (parsed && typeof parsed === 'object') {
    const root = parsed as Record<string, unknown>

    if (Array.isArray(root.messages)) {
      entries = root.messages.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    } else if (root.chats && typeof root.chats === 'object' && Array.isArray((root.chats as Record<string, unknown>).list)) {
      const chatList = (root.chats as Record<string, unknown>).list as unknown[]
      const firstWithMessages = chatList.find(
        (chat) => chat && typeof chat === 'object' && Array.isArray((chat as Record<string, unknown>).messages),
      ) as Record<string, unknown> | undefined

      if (firstWithMessages?.messages && Array.isArray(firstWithMessages.messages)) {
        entries = firstWithMessages.messages.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      }
    }
  }

  const messages: IntermediateMessage[] = entries.map((entry, index) => {
    const from = typeof entry.from === 'string' ? entry.from : 'Unknown'
    const isoFromDate =
      typeof entry.date === 'string' && !Number.isNaN(new Date(entry.date).getTime())
        ? new Date(entry.date).toISOString()
        : null
    const unix = typeof entry.date_unixtime === 'string' || typeof entry.date_unixtime === 'number'
      ? Number(entry.date_unixtime)
      : Number.NaN

    const timestamp = isoFromDate && !Number.isNaN(new Date(isoFromDate).getTime())
      ? isoFromDate
      : Number.isFinite(unix)
        ? new Date(unix * 1000).toISOString()
        : null

    const text = flattenText(entry.text)
    const messageType: CanonicalMessage['messageType'] =
      typeof entry.type === 'string' && entry.type !== 'message' ? 'system' : 'text'

    return {
      order: index,
      senderDisplay: from,
      timestamp,
      text: text.trim(),
      messageType,
      metadata: {
        telegramType: entry.type,
      },
      raw: {
        id: entry.id,
      },
    }
  }).filter((item) => item.text)

  if (!messages.length) {
    warnings.push("We couldn't detect usable Telegram messages in this JSON export.")
  }

  return { messages, warnings }
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim()
}

function parseTelegramHtml(content: string): { messages: IntermediateMessage[]; warnings: string[] } {
  const warnings: string[] = []
  const messages: IntermediateMessage[] = []
  const blocks = content.split(/<div class="message[^"]*"/i)

  blocks.forEach((block, index) => {
    if (!block.includes('from_name') && !block.includes('text')) return

    const fromMatch = block.match(/<div class="from_name">([\s\S]*?)<\/div>/i)
    const dateMatch = block.match(/<div class="date"[^>]*title="([^"]+)"/i)
    const textMatch = block.match(/<div class="text">([\s\S]*?)<\/div>/i)

    const sender = fromMatch ? stripHtml(fromMatch[1]) : 'Unknown'
    const text = textMatch ? stripHtml(textMatch[1]) : ''
    if (!text) return

    let timestamp: string | null = null
    if (dateMatch) {
      const parsedDate = new Date(dateMatch[1])
      timestamp = Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString()
    }

    messages.push({
      order: index,
      senderDisplay: sender || 'Unknown',
      timestamp,
      text,
      messageType: 'text',
    })
  })

  if (!messages.length) {
    warnings.push("We couldn't parse Telegram HTML blocks in this export.")
  }

  return { messages, warnings }
}

function parseMetaMessagesJson(content: string, conversationId = 'default'): {
  messages: IntermediateMessage[]
  warnings: string[]
} {
  const warnings: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("This file isn't valid JSON")
  }

  if (!parsed || typeof parsed !== 'object') {
    return { messages: [], warnings: ["We couldn't parse this Meta export structure yet."] }
  }

  const root = parsed as Record<string, unknown>
  const items = Array.isArray(root.messages) ? root.messages : []

  const messages: IntermediateMessage[] = items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((entry, index) => {
      const sender = typeof entry.sender_name === 'string' ? entry.sender_name : 'Unknown'
      const timestampMs = typeof entry.timestamp_ms === 'number' ? entry.timestamp_ms : Number.NaN
      const timestamp = Number.isFinite(timestampMs) ? new Date(timestampMs).toISOString() : null

      const contentText = typeof entry.content === 'string' ? entry.content : ''
      const hasMedia =
        (Array.isArray(entry.photos) && entry.photos.length > 0) ||
        (Array.isArray(entry.videos) && entry.videos.length > 0) ||
        (Array.isArray(entry.audio_files) && entry.audio_files.length > 0) ||
        (Array.isArray(entry.gifs) && entry.gifs.length > 0)

      const type: CanonicalMessage['messageType'] = contentText
        ? 'text'
        : hasMedia
          ? 'media_stub'
          : 'unknown'

      return {
        order: index,
        conversationId,
        senderDisplay: sender,
        timestamp,
        text: contentText || (hasMedia ? '[Media attachment]' : '[No text]'),
        messageType: type,
        metadata: {
          attachmentsCount:
            (Array.isArray(entry.photos) ? entry.photos.length : 0) +
            (Array.isArray(entry.videos) ? entry.videos.length : 0) +
            (Array.isArray(entry.audio_files) ? entry.audio_files.length : 0),
        },
      }
    })

  if (!messages.length) {
    warnings.push("We couldn't parse this Meta export yet.")
  }

  return { messages, warnings }
}

function parseSnapchatJson(content: string): { messages: IntermediateMessage[]; warnings: string[] } {
  const warnings: string[] = []
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error("This file isn't valid JSON")
  }

  const entries: Record<string, unknown>[] = []

  function walk(node: unknown): void {
    if (!node) return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }

    if (typeof node !== 'object') return
    const record = node as Record<string, unknown>

    const hasTextCandidate =
      typeof record.content === 'string' ||
      typeof record.message === 'string' ||
      typeof record.chat_message === 'string'

    const hasTimestampCandidate =
      typeof record.timestamp === 'string' ||
      typeof record.timestamp_ms === 'number' ||
      typeof record.created_at === 'string'

    if (hasTextCandidate || hasTimestampCandidate) {
      entries.push(record)
    }

    Object.values(record).forEach(walk)
  }

  walk(parsed)

  const messages: IntermediateMessage[] = entries.map((entry, index) => {
    const sender =
      (typeof entry.sender === 'string' && entry.sender) ||
      (typeof entry.username === 'string' && entry.username) ||
      (typeof entry.from === 'string' && entry.from) ||
      'Unknown'

    const text =
      (typeof entry.content === 'string' && entry.content) ||
      (typeof entry.message === 'string' && entry.message) ||
      (typeof entry.chat_message === 'string' && entry.chat_message) ||
      '[No text]'

    const timestampValue = entry.timestamp_ms ?? entry.timestamp ?? entry.created_at
    const timestamp =
      typeof timestampValue === 'number'
        ? new Date(timestampValue > 10_000_000_000 ? timestampValue : timestampValue * 1000).toISOString()
        : typeof timestampValue === 'string' && !Number.isNaN(new Date(timestampValue).getTime())
          ? new Date(timestampValue).toISOString()
          : null

    return {
      order: index,
      senderDisplay: sender,
      timestamp,
      text,
      messageType: text === '[No text]' ? 'unknown' : 'text',
      metadata: {
        snapchatRawType: entry.type,
      },
    }
  })

  if (!messages.length) {
    warnings.push("We couldn't find usable Snapchat messages in this export.")
  }

  return { messages, warnings }
}

function parseCsvRow(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

function parseIMessageCsv(content: string): { messages: IntermediateMessage[]; warnings: string[] } {
  const warnings: string[] = []
  const lines = content.split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return { messages: [], warnings: ['CSV file is empty.'] }

  const header = parseCsvRow(lines[0]).map((item) => item.toLowerCase())

  const dateIndex = header.findIndex((item) => ['date', 'datetime', 'timestamp', 'time'].includes(item))
  const senderIndex = header.findIndex((item) => ['sender', 'from', 'contact', 'author'].includes(item))
  const textIndex = header.findIndex((item) => ['text', 'message', 'body', 'content'].includes(item))

  if (dateIndex === -1 || senderIndex === -1 || textIndex === -1) {
    throw new Error('CSV is missing required columns (date, sender, text).')
  }

  const messages: IntermediateMessage[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const row = parseCsvRow(lines[index])
    const text = row[textIndex] ?? ''
    if (!text) continue

    const rawDate = row[dateIndex] ?? ''
    const parsedDate = new Date(rawDate)

    messages.push({
      order: index,
      senderDisplay: row[senderIndex] || 'Unknown',
      timestamp: Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString(),
      text,
      messageType: 'text',
      metadata: {
        rawDate,
      },
    })
  }

  if (!messages.length) {
    warnings.push('No text messages found in CSV rows.')
  }

  return { messages, warnings }
}

function buildParseReport(
  detect: DetectImportResult,
  messages: CanonicalMessage[],
  ignored: ParseIgnoredLine[],
  totalLines: number,
  matchedLines: number,
  warnings: string[],
  selectedThread?: string,
): ParseReport {
  const participants = [...new Set(messages.map((item) => item.senderDisplay))].filter(Boolean)

  const expectedExamples: string[] = [
    '[10/02/2026, 01:21:27] Name: message',
    '10/02/2026, 01:21 - Name: message',
    '{"messages":[{"sender_name":"Name","timestamp_ms":1700000000000,"content":"Hi"}]}',
  ]

  const tips = [
    'Remove non-chat headers at the top of the file if possible.',
    'Export text-only chats when available (without media attachments).',
    'Ensure each message starts with a timestamp and sender where possible.',
  ]

  return {
    detectedFormat: detect.format,
    sourceAppGuess: detect.sourceAppGuess,
    confidence: detect.confidence,
    reasons: detect.reasons,
    warnings,
    parsedCount: messages.length,
    ignoredCount: ignored.length,
    totalLines,
    matchedLines,
    participants,
    expectedExamples,
    firstIgnoredLines: ignored.slice(0, 8),
    tips,
    selectedThread,
  }
}

function detectFromZip(params: {
  sourceApp: SupportedSourceApp
  fileBuffer: Buffer
}): {
  detect: DetectImportResult
  entries: AdmZip.IZipEntry[]
} {
  const zip = new AdmZip(params.fileBuffer)
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory)
  const paths = entries.map((entry) => entry.entryName.toLowerCase())

  if (paths.some((entry) => entry.endsWith('result.json'))) {
    return {
      detect: {
        sourceAppGuess: 'telegram',
        format: 'telegram_json',
        confidence: 0.9,
        reasons: ['ZIP contains Telegram result.json export.'],
      },
      entries,
    }
  }

  if (paths.some((entry) => entry.includes('chat_history.json'))) {
    return {
      detect: {
        sourceAppGuess: 'snapchat',
        format: 'snapchat_json',
        confidence: 0.9,
        reasons: ['ZIP contains Snapchat chat_history.json export.'],
      },
      entries,
    }
  }

  if (paths.some((entry) => entry.includes('messages/inbox/') && /message_\d+\.json$/.test(entry))) {
    const sourceGuess =
      params.sourceApp === 'instagram' || params.sourceApp === 'messenger'
        ? params.sourceApp
        : paths.some((entry) => entry.includes('/instagram/'))
          ? 'instagram'
          : paths.some((entry) => entry.includes('/facebook/'))
            ? 'messenger'
            : 'unknown'

    return {
      detect: {
        sourceAppGuess: sourceGuess,
        format: 'meta_messages_json',
        confidence: 0.82,
        reasons: ['ZIP contains Meta messages/inbox thread JSON files.'],
      },
      entries,
    }
  }

  return {
    detect: {
      sourceAppGuess: params.sourceApp,
      format: 'generic_paste',
      confidence: 0.4,
      reasons: ['ZIP format detected but structure did not match a known export profile.'],
    },
    entries,
  }
}

export function detectImportFormat(input: ParseInput): DetectImportResult {
  const sourceApp = normalizeSourceApp(input.sourceApp)
  const extension = path.extname(input.filePath).toLowerCase()

  if (extension === '.zip') {
    return detectFromZip({ sourceApp, fileBuffer: input.fileBuffer }).detect
  }

  const text = decodeTextWithFallback(input.fileBuffer)
  const trimmed = text.trim()

  if (extension === '.csv') {
    return {
      sourceAppGuess: sourceApp === 'unknown' ? 'imessage' : sourceApp,
      format: 'imessage_csv',
      confidence: 0.75,
      reasons: ['CSV file extension detected.'],
    }
  }

  if (extension === '.html' || extension === '.htm') {
    const hasTelegramHtmlMarkers =
      /<div class="message/i.test(trimmed) &&
      /<div class="from_name/i.test(trimmed) &&
      /<div class="text/i.test(trimmed)

    if (hasTelegramHtmlMarkers || sourceApp === 'telegram') {
      return {
        sourceAppGuess: sourceApp === 'unknown' ? 'telegram' : sourceApp,
        format: 'telegram_html',
        confidence: hasTelegramHtmlMarkers ? 0.86 : 0.66,
        reasons: ['HTML file includes Telegram export markers.'],
      }
    }
  }

  if (extension === '.json' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') {
        const root = parsed as Record<string, unknown>

        if (Array.isArray(root.messages) && root.messages.length > 0) {
          const first = root.messages[0]
          if (first && typeof first === 'object') {
            const firstRecord = first as Record<string, unknown>
            if ('sender_name' in firstRecord && 'timestamp_ms' in firstRecord) {
              return {
                sourceAppGuess: sourceApp === 'unknown' ? 'messenger' : sourceApp,
                format: 'meta_messages_json',
                confidence: 0.9,
                reasons: ['JSON includes sender_name and timestamp_ms fields used by Meta exports.'],
              }
            }

            if ('from' in firstRecord || 'date_unixtime' in firstRecord || 'text' in firstRecord) {
              return {
                sourceAppGuess: sourceApp === 'unknown' ? 'telegram' : sourceApp,
                format: 'telegram_json',
                confidence: 0.85,
                reasons: ['JSON includes Telegram-like message fields.'],
              }
            }
          }
        }

        if ('chat_history' in root || 'chatHistory' in root) {
          return {
            sourceAppGuess: sourceApp === 'unknown' ? 'snapchat' : sourceApp,
            format: 'snapchat_json',
            confidence: 0.82,
            reasons: ['JSON root includes Snapchat chat history key.'],
          }
        }
      }
    } catch {
      // fall through
    }
  }

  const whatsappMatches = text.split(/\r?\n/).filter((line) =>
    whatsappStartRegexes.some((regex) => regex.test(line.trim())),
  ).length

  if (extension === '.txt' || whatsappMatches >= 3) {
    return {
      sourceAppGuess: sourceApp === 'unknown' ? 'whatsapp' : sourceApp,
      format: 'whatsapp_txt',
      confidence: whatsappMatches >= 3 ? 0.84 : 0.65,
      reasons: ['Text includes WhatsApp-like timestamped sender line patterns.'],
    }
  }

  return {
    sourceAppGuess: sourceApp,
    format: 'generic_paste',
    confidence: 0.5,
    reasons: ['Falling back to generic text parser.'],
  }
}

function parseZipImport(input: ParseInput): {
  messages: CanonicalMessage[]
  report: ParseReport
} {
  const sourceApp = normalizeSourceApp(input.sourceApp)
  const zipInfo = detectFromZip({ sourceApp, fileBuffer: input.fileBuffer })
  const zip = new AdmZip(input.fileBuffer)
  const warnings: string[] = []

  const parseFromEntry = (entryName: string): string => {
    const entry = zip.getEntry(entryName)
    if (!entry) throw new Error(`ZIP entry not found: ${entryName}`)
    return decodeTextWithFallback(entry.getData())
  }

  if (zipInfo.detect.format === 'telegram_json') {
    const target = zipInfo.entries.find((entry) => entry.entryName.toLowerCase().endsWith('result.json'))
    if (!target) {
      throw new ParseFailedError('Telegram export ZIP is missing result.json.', {
        detectedFormat: 'telegram_json',
        sourceAppGuess: zipInfo.detect.sourceAppGuess,
        confidence: zipInfo.detect.confidence,
        reasons: zipInfo.detect.reasons,
        warnings: [],
        parsedCount: 0,
        ignoredCount: 0,
        totalLines: 0,
        matchedLines: 0,
        participants: [],
        expectedExamples: ['result.json from Telegram desktop export'],
        firstIgnoredLines: [],
        tips: ['Re-export Telegram data and include message history JSON.'],
      })
    }

    const parsed = parseTelegramJson(parseFromEntry(target.entryName))
    const canonical = toCanonicalMessages('telegram', parsed.messages)
    const report = buildParseReport(zipInfo.detect, canonical, [], 0, 0, parsed.warnings, target.entryName)
    return { messages: canonical, report }
  }

  if (zipInfo.detect.format === 'meta_messages_json') {
    const threadEntries = zipInfo.entries.filter((entry) =>
      /messages\/inbox\/.+\/message_\d+\.json$/i.test(entry.entryName),
    )

    if (!threadEntries.length) {
      throw new ParseFailedError('No thread JSON files found in Meta export ZIP.', {
        detectedFormat: 'meta_messages_json',
        sourceAppGuess: zipInfo.detect.sourceAppGuess,
        confidence: zipInfo.detect.confidence,
        reasons: zipInfo.detect.reasons,
        warnings: [],
        parsedCount: 0,
        ignoredCount: 0,
        totalLines: 0,
        matchedLines: 0,
        participants: [],
        expectedExamples: ['messages/inbox/<thread>/message_1.json'],
        firstIgnoredLines: [],
        tips: ['Export messages in JSON format and include inbox threads.'],
      })
    }

    let best: {
      entryName: string
      parsedCount: number
      messages: IntermediateMessage[]
      warnings: string[]
    } | null = null

    for (const entry of threadEntries) {
      const parsed = parseMetaMessagesJson(parseFromEntry(entry.entryName), entry.entryName)
      if (!best || parsed.messages.length > best.parsedCount) {
        best = {
          entryName: entry.entryName,
          parsedCount: parsed.messages.length,
          messages: parsed.messages,
          warnings: parsed.warnings,
        }
      }
    }

    if (!best || best.parsedCount < 1) {
      throw new ParseFailedError('Meta export was detected but no message content could be parsed.', {
        detectedFormat: 'meta_messages_json',
        sourceAppGuess: zipInfo.detect.sourceAppGuess,
        confidence: zipInfo.detect.confidence,
        reasons: zipInfo.detect.reasons,
        warnings: [],
        parsedCount: 0,
        ignoredCount: 0,
        totalLines: 0,
        matchedLines: 0,
        participants: [],
        expectedExamples: ['message_1.json with sender_name, timestamp_ms, content'],
        firstIgnoredLines: [],
        tips: ['Use full messages export ZIP and avoid media-only thread exports.'],
      })
    }

    warnings.push('Multiple threads detected in ZIP. Auto-selected the largest conversation for this analysis.')
    const chosenSource = sourceApp === 'unknown' ? zipInfo.detect.sourceAppGuess : sourceApp
    const canonical = toCanonicalMessages(chosenSource, best.messages)
    const report = buildParseReport(
      zipInfo.detect,
      canonical,
      [],
      0,
      0,
      [...warnings, ...best.warnings],
      best.entryName,
    )
    return { messages: canonical, report }
  }

  if (zipInfo.detect.format === 'snapchat_json') {
    const target = zipInfo.entries.find((entry) => entry.entryName.toLowerCase().includes('chat_history.json'))
    if (!target) {
      throw new ParseFailedError('Snapchat ZIP is missing chat_history.json.', {
        detectedFormat: 'snapchat_json',
        sourceAppGuess: zipInfo.detect.sourceAppGuess,
        confidence: zipInfo.detect.confidence,
        reasons: zipInfo.detect.reasons,
        warnings: [],
        parsedCount: 0,
        ignoredCount: 0,
        totalLines: 0,
        matchedLines: 0,
        participants: [],
        expectedExamples: ['chat_history.json from Snapchat My Data'],
        firstIgnoredLines: [],
        tips: ['Download Snapchat My Data export with chat history included.'],
      })
    }

    const parsed = parseSnapchatJson(parseFromEntry(target.entryName))
    const canonical = toCanonicalMessages('snapchat', parsed.messages)
    const report = buildParseReport(zipInfo.detect, canonical, [], 0, 0, parsed.warnings, target.entryName)
    return { messages: canonical, report }
  }

  throw new ParseFailedError('Unsupported ZIP structure for this source app.', {
    detectedFormat: zipInfo.detect.format,
    sourceAppGuess: zipInfo.detect.sourceAppGuess,
    confidence: zipInfo.detect.confidence,
    reasons: zipInfo.detect.reasons,
    warnings: [],
    parsedCount: 0,
    ignoredCount: 0,
    totalLines: 0,
    matchedLines: 0,
    participants: [],
    expectedExamples: ['WhatsApp .txt', 'Telegram result.json', 'Meta messages/inbox ZIP', 'Snapchat chat_history.json'],
    firstIgnoredLines: [],
    tips: ['Try exporting a single thread file or paste transcript text.'],
  })
}

export function parseImportFile(input: ParseInput): {
  dbMessages: ParsedMessage[]
  canonicalMessages: CanonicalMessage[]
  report: ParseReport
} {
  const sourceApp = normalizeSourceApp(input.sourceApp)
  const extension = path.extname(input.filePath).toLowerCase()

  if (extension === '.zip') {
    const zipParsed = parseZipImport(input)
    if (zipParsed.messages.length < DEFAULT_MIN_MESSAGES) {
      throw new ParseFailedError('Not enough messages were parsed from ZIP export.', zipParsed.report)
    }

    return {
      dbMessages: toDbMessages(zipParsed.messages),
      canonicalMessages: zipParsed.messages,
      report: zipParsed.report,
    }
  }

  const detect = detectImportFormat(input)
  const text = decodeTextWithFallback(input.fileBuffer)

  let parsedMessages: IntermediateMessage[] = []
  let ignored: ParseIgnoredLine[] = []
  let warnings: string[] = []
  let totalLines = 0
  let matchedLines = 0

  if (detect.format === 'whatsapp_txt') {
    const parsed = parseWhatsAppText(text)
    parsedMessages = parsed.messages
    ignored = parsed.ignored
    warnings = parsed.warnings
    totalLines = parsed.totalLines
    matchedLines = parsed.matchedLines
  } else if (detect.format === 'telegram_json') {
    const parsed = parseTelegramJson(text)
    parsedMessages = parsed.messages
    warnings = parsed.warnings
  } else if (detect.format === 'telegram_html') {
    const parsed = parseTelegramHtml(text)
    parsedMessages = parsed.messages
    warnings = parsed.warnings
  } else if (detect.format === 'meta_messages_json') {
    const parsed = parseMetaMessagesJson(text)
    parsedMessages = parsed.messages
    warnings = parsed.warnings
  } else if (detect.format === 'snapchat_json') {
    const parsed = parseSnapchatJson(text)
    parsedMessages = parsed.messages
    warnings = parsed.warnings
  } else if (detect.format === 'imessage_csv') {
    const parsed = parseIMessageCsv(text)
    parsedMessages = parsed.messages
    warnings = parsed.warnings
  } else {
    const parsed = parseGenericPaste(text)
    parsedMessages = parsed.messages
    ignored = parsed.ignored
    warnings = parsed.warnings
    totalLines = parsed.totalLines
    matchedLines = parsed.matchedLines
  }

  const chosenSource = sourceApp === 'unknown' ? detect.sourceAppGuess : sourceApp
  const canonicalMessages = toCanonicalMessages(chosenSource, parsedMessages)

  const report = buildParseReport(
    detect,
    canonicalMessages,
    ignored,
    totalLines,
    matchedLines,
    warnings,
  )

  if (canonicalMessages.length < DEFAULT_MIN_MESSAGES) {
    throw new ParseFailedError('No messages detected. Try a different export or paste format.', report)
  }

  if (report.ignoredCount > 0 && report.matchedLines === 0 && detect.format !== 'telegram_json' && detect.format !== 'meta_messages_json' && detect.format !== 'snapchat_json') {
    throw new ParseFailedError('Could not match enough message lines in this export.', report)
  }

  // Lightweight derived warning for noisy text datasets.
  if (report.parsedCount && report.ignoredCount > report.parsedCount) {
    report.warnings.push('This import contains many non-chat lines. Results may be less reliable.')
  }

  report.warnings.push(`Detected sentiment trend in sample: ${summarizeSentiment(canonicalMessages)}.`)

  return {
    dbMessages: toDbMessages(canonicalMessages),
    canonicalMessages,
    report,
  }
}

// Backwards-compatible export for any legacy callsites.
export function parseBySourceApp(sourceApp: string, filePath: string, content: string): ParsedMessage[] {
  const parsed = parseImportFile({
    sourceApp,
    filePath,
    fileBuffer: Buffer.from(content, 'utf-8'),
  })

  return parsed.dbMessages
}
