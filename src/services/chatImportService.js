import {
  APP_IDS,
  IMPORT_MODE_CONFIG,
  MAX_IMPORT_FILE_SIZE_BYTES,
  PREVIEW_SAMPLE_SIZE,
  createEmptyImportResult,
} from '../contracts/chatImportContract'

const MEDIA_PLACEHOLDER_PATTERN = /(media omitted|<media omitted>|omitted|attached|image omitted|video omitted)/i

function createImportError(message, code = 'IMPORT_ERROR') {
  const error = new Error(message)
  error.code = code
  return error
}

function safeTrim(value) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function toISOFromParts(datePart, timePart) {
  const dateMatch = safeTrim(datePart).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
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

  const timeMatch = safeTrim(timePart).match(/^(\d{1,2}):(\d{2})(?:\s*([APMapm]{2}))?$/)
  if (!timeMatch) return null

  let hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])
  const suffix = timeMatch[3]?.toLowerCase()

  if (suffix === 'pm' && hours < 12) hours += 12
  if (suffix === 'am' && hours === 12) hours = 0

  const date = new Date(year, month - 1, day, hours, minutes)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function looksLikeEnglish(text) {
  const sample = safeTrim(text).slice(0, 500)
  if (!sample) return null

  const asciiLetters = (sample.match(/[A-Za-z]/g) || []).length
  const totalLetters = (sample.match(/[A-Za-z\u00C0-\u024F]/g) || []).length
  if (!totalLetters) return null

  const ratio = asciiLetters / totalLetters
  if (ratio > 0.75) return 'likely-english'
  return 'mixed'
}

function buildStats(messages, participants, fullText = '') {
  const timestamps = messages
    .map((message) => message.timestampISO)
    .filter(Boolean)
    .map((item) => new Date(item).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)

  const startDateISO = timestamps.length ? new Date(timestamps[0]).toISOString() : null
  const endDateISO = timestamps.length ? new Date(timestamps[timestamps.length - 1]).toISOString() : null

  const estimatedDays =
    timestamps.length > 1 ? Math.max(1, Math.ceil((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24))) : 0

  return {
    messageCount: messages.length,
    participantCount: participants.length,
    startDateISO,
    endDateISO,
    estimatedDays,
    languageHint: looksLikeEnglish(fullText),
  }
}

function buildResult(messages, warnings = [], fullText = '') {
  const participants = [...new Set(messages.map((item) => item.sender).filter(Boolean))]

  const base = createEmptyImportResult()
  base.messages = messages
  base.participants = participants
  base.stats = buildStats(messages, participants, fullText)
  base.warnings = warnings
  base.sample = messages.slice(0, PREVIEW_SAMPLE_SIZE)
  return base
}

function parseSimpleText(text) {
  const lines = text.split(/\r?\n/)
  const messages = []
  let unknownCounter = 0

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return

    const match = trimmed.match(/^([^:]{1,30}):\s+(.+)$/)
    if (match) {
      messages.push({
        id: `m_${index}`,
        timestampISO: null,
        sender: safeTrim(match[1]) || 'Unknown',
        text: safeTrim(match[2]),
      })
      return
    }

    unknownCounter += 1
    messages.push({
      id: `m_${index}`,
      timestampISO: null,
      sender: 'Unknown',
      text: trimmed,
    })
  })

  const warnings = []
  if (unknownCounter > 0) warnings.push('Some lines did not include sender names and were labeled as Unknown.')

  return buildResult(messages, warnings, text)
}

function parseWhatsAppText(text) {
  const lines = text.split(/\r?\n/)
  const messages = []
  const warnings = []
  let current = null
  let unparsedLineCount = 0

  const patterns = [
    /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s?[APMapm]{2})?)\s*-\s*([^:]+):\s*(.*)$/,
    /^\[(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}),\s*(\d{1,2}:\d{2}(?:\s?[APMapm]{2})?)\]\s*([^:]+):\s*(.*)$/,
  ]

  lines.forEach((line, index) => {
    const value = line.trim()
    if (!value) return

    let matched = null
    for (const pattern of patterns) {
      const result = value.match(pattern)
      if (result) {
        matched = result
        break
      }
    }

    if (matched) {
      const timestampISO = toISOFromParts(matched[1], matched[2])
      const sender = safeTrim(matched[3]) || 'Unknown'
      const textValue = safeTrim(matched[4])

      if (textValue && !MEDIA_PLACEHOLDER_PATTERN.test(textValue)) {
        const next = {
          id: `m_${index}`,
          timestampISO,
          sender,
          text: textValue,
        }
        messages.push(next)
        current = next
      } else {
        current = null
      }
      return
    }

    if (current && !MEDIA_PLACEHOLDER_PATTERN.test(value)) {
      current.text = `${current.text}\n${value}`
      return
    }

    unparsedLineCount += 1
  })

  if (unparsedLineCount > 0) warnings.push('Some lines could not be parsed and were skipped.')

  return buildResult(messages, warnings, text)
}

function parseJsonMessages(items) {
  const messages = []

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return

    const sender = safeTrim(item.sender_name || item.sender || item.author || item.from || item.user || 'Unknown')

    let text = item.content ?? item.text ?? item.message ?? item.body ?? ''
    if (Array.isArray(text)) text = text.filter((value) => typeof value === 'string').join(' ')
    text = safeTrim(String(text || ''))

    if (!text || MEDIA_PLACEHOLDER_PATTERN.test(text)) return

    let timestampISO = null
    const timestampValue = item.timestamp_ms ?? item.timestamp ?? item.date ?? item.created_at ?? item.time

    if (typeof timestampValue === 'number') {
      const date = new Date(timestampValue > 9_999_999_999 ? timestampValue : timestampValue * 1000)
      if (!Number.isNaN(date.getTime())) timestampISO = date.toISOString()
    } else if (typeof timestampValue === 'string') {
      const date = new Date(timestampValue)
      if (!Number.isNaN(date.getTime())) timestampISO = date.toISOString()
    }

    messages.push({
      id: `m_${index}`,
      timestampISO,
      sender,
      text,
    })
  })

  return messages
}

function parseStructuredJson(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw createImportError("This file isn't valid JSON.", 'INVALID_JSON')
  }

  const warnings = []
  let messages = []

  if (Array.isArray(parsed)) {
    messages = parseJsonMessages(parsed)
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.messages)) {
      messages = parseJsonMessages(parsed.messages)
    } else if (Array.isArray(parsed.data?.messages)) {
      messages = parseJsonMessages(parsed.data.messages)
    } else if (Array.isArray(parsed.chats)) {
      const firstChat = parsed.chats.find((chat) => Array.isArray(chat?.messages))
      if (firstChat) messages = parseJsonMessages(firstChat.messages)
    }
  }

  if (!messages.length) {
    warnings.push("We can't parse this export yet. Try paste mode or a different export format.")
  }

  return buildResult(messages, warnings, text)
}

function parseCsvForIMessage(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return createEmptyImportResult()

  const headers = lines[0].split(',').map((item) => item.trim().toLowerCase())
  const dateIndex = headers.findIndex((item) => ['date', 'datetime', 'timestamp', 'time'].includes(item))
  const senderIndex = headers.findIndex((item) => ['sender', 'from', 'contact', 'author'].includes(item))
  const textIndex = headers.findIndex((item) => ['text', 'message', 'body', 'content'].includes(item))

  if (dateIndex === -1 || senderIndex === -1 || textIndex === -1) {
    throw createImportError('CSV is missing required columns (date, sender, text).', 'CSV_COLUMNS_MISSING')
  }

  const messages = lines
    .slice(1)
    .map((line, index) => {
      const cols = line.split(',')
      const sender = safeTrim(cols[senderIndex] || 'Unknown')
      const textValue = safeTrim(cols[textIndex] || '')
      if (!textValue) return null

      const maybeDate = new Date(cols[dateIndex] || '')
      return {
        id: `m_${index}`,
        timestampISO: Number.isNaN(maybeDate.getTime()) ? null : maybeDate.toISOString(),
        sender: sender || 'Unknown',
        text: textValue,
      }
    })
    .filter(Boolean)

  return buildResult(messages, [], text)
}

export function getSupportedImportModes(appId) {
  if (!APP_IDS.includes(appId)) {
    return { file: false, paste: false, acceptedExtensions: [] }
  }

  const config = IMPORT_MODE_CONFIG[appId]
  return {
    file: Boolean(config?.file),
    paste: Boolean(config?.paste),
    acceptedExtensions: [...(config?.acceptedExtensions ?? [])],
  }
}

export async function parseChatFromText(appId, text) {
  const config = getSupportedImportModes(appId)
  const isUniversalPaste = !APP_IDS.includes(appId)

  if (!isUniversalPaste && !config.paste) {
    throw createImportError('Paste import is not available for this app yet.', 'PASTE_UNSUPPORTED')
  }

  const value = safeTrim(text)
  if (!value) {
    return createEmptyImportResult()
  }

  if (isUniversalPaste) {
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return parseStructuredJson(value)
      } catch {
        // fall through to generic text
      }
    }
    const whatsappParsed = parseWhatsAppText(value)
    if (whatsappParsed.stats.messageCount >= 2) return whatsappParsed
    return parseSimpleText(value)
  }

  if (appId === 'whatsapp') return parseWhatsAppText(value)
  if (appId === 'telegram' || appId === 'instagram' || appId === 'messenger') {
    // Allow either plain text or JSON pasted content.
    if (value.startsWith('{') || value.startsWith('[')) {
      return parseStructuredJson(value)
    }
    return parseSimpleText(value)
  }

  return parseSimpleText(value)
}

export async function parseChatFromFile(appId, file) {
  const config = getSupportedImportModes(appId)
  if (!config.file) {
    throw createImportError('File upload for this app is coming soon.', 'FILE_UNSUPPORTED')
  }

  if (!file) {
    throw createImportError('Select a file to continue.', 'FILE_REQUIRED')
  }

  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw createImportError('File is too large. Please upload a file under 10MB.', 'FILE_TOO_LARGE')
  }

  const name = safeTrim(file.name)
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : ''

  if (!config.acceptedExtensions.includes(extension)) {
    throw createImportError(
      `Please upload a .${config.acceptedExtensions.join(' or .')} file for this app export.`,
      'FILE_TYPE_MISMATCH',
    )
  }

  const text = await file.text()

  if (extension === 'zip') {
    const pending = createEmptyImportResult()
    pending.warnings = ['Server parse pending for ZIP export. Preview will appear after upload preflight.']
    return pending
  }

  if (!safeTrim(text)) {
    return createEmptyImportResult()
  }

  if (appId === 'whatsapp') return parseWhatsAppText(text)
  if (appId === 'telegram' || appId === 'instagram' || appId === 'messenger' || appId === 'snapchat') return parseStructuredJson(text)
  if (appId === 'imessage' && extension === 'csv') return parseCsvForIMessage(text)
  if (appId === 'imessage') return parseSimpleText(text)

  return parseSimpleText(text)
}

export function toParticipantPair(participants = []) {
  const list = Array.isArray(participants) ? participants.filter(Boolean) : []
  return {
    personA: list[0] ?? 'Person A',
    personB: list[1] ?? 'Person B',
  }
}
