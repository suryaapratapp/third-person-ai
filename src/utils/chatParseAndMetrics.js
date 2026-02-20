const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIME_BLOCKS = ['Late night', 'Early morning', 'Morning', 'Afternoon', 'Evening', 'Night']

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'have', 'from', 'your', 'what',
  'when', 'were', 'will', 'would', 'there', 'their', 'they', 'them', 'you',
  'are', 'our', 'its', 'was', 'been', 'then', 'than', 'into', 'after', 'just',
  'about', 'like', 'okay', 'yeah', 'haha', 'lol', 'hmm', 'really', 'very',
])

const POSITIVE_WORDS = ['love', 'care', 'thanks', 'appreciate', 'good', 'great', 'happy', 'support']
const NEGATIVE_WORDS = ['upset', 'angry', 'hurt', 'sad', 'confused', 'frustrated', 'fight', 'cold']

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function toDateFromParts(datePart, timePart) {
  const dateMatch = safeTrim(datePart).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)
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

  const timeMatch = safeTrim(timePart).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APMapm]{2}))?$/)
  if (!timeMatch) return null

  let hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  const secondPart = Number(timeMatch[3] || 0)
  const ampm = safeTrim(timeMatch[4]).toLowerCase()

  if (ampm === 'pm' && hour < 12) hour += 12
  if (ampm === 'am' && hour === 12) hour = 0

  const date = new Date(year, month - 1, day, hour, minute, secondPart)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function getWeekKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function getTimeBlockIndex(date) {
  const hour = date.getHours()
  if (hour < 4) return 0
  if (hour < 8) return 1
  if (hour < 12) return 2
  if (hour < 16) return 3
  if (hour < 20) return 4
  return 5
}

function sentimentScore(text) {
  const lower = String(text || '').toLowerCase()
  let score = 0
  POSITIVE_WORDS.forEach((word) => {
    if (lower.includes(word)) score += 1
  })
  NEGATIVE_WORDS.forEach((word) => {
    if (lower.includes(word)) score -= 1
  })
  return score
}

function sanitizeWord(token) {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F]/g, '')
    .trim()
}

function estimateDurationDays(messages, manualDateRange) {
  const timestamps = messages
    .map((message) => message.ts)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  if (timestamps.length > 1) {
    const first = timestamps[0].getTime()
    const last = timestamps[timestamps.length - 1].getTime()
    return Math.max(1, Math.ceil((last - first) / (1000 * 60 * 60 * 24)))
  }

  const preset = manualDateRange?.preset
  if (preset === '1-3 days') return 3
  if (preset === '1-3 weeks') return 21
  if (preset === '1 month') return 30

  if (manualDateRange?.start && manualDateRange?.end) {
    const start = new Date(manualDateRange.start)
    const end = new Date(manualDateRange.end)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    }
  }

  return null
}

function detectLanguages(messages) {
  const text = messages.map((item) => item.text || '').join(' ')
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length
  const latinCount = (text.match(/[A-Za-z]/g) || []).length
  const hindiHints = (text.match(/\b(kya|nahi|hain|hoon|yaar|acha|thik|samajh|kyunki|kaise)\b/gi) || []).length

  const hints = []
  if (latinCount > 40) hints.push('english')
  if (devanagariCount > 20 || hindiHints > 6) hints.push('hindi')
  if (hints.includes('english') && hints.includes('hindi')) hints.unshift('hinglish')
  return hints.length ? hints : ['unknown']
}

export function parseChat(rawText, manualParticipants = []) {
  const lines = String(rawText || '').split(/\r?\n/)
  const participants = manualParticipants
    .map((item) => safeTrim(item))
    .filter(Boolean)

  const parsed = []
  let current = null

  const patterns = [
    /^\[(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\]\s*([^:]{1,48}):\s*(.*)$/,
    /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\s*-\s*([^:]{1,48}):\s*(.*)$/,
    /^([^:]{1,48}):\s*(.+)$/,
  ]

  lines.forEach((line, lineIndex) => {
    const text = line.trim()
    if (!text) return

    let matched = null
    for (const pattern of patterns) {
      const result = text.match(pattern)
      if (result) {
        matched = result
        break
      }
    }

    if (matched) {
      const hasDate = matched.length >= 5
      const date = hasDate ? toDateFromParts(matched[1], matched[2]) : null
      const speaker = safeTrim(hasDate ? matched[3] : matched[1]) || 'Unknown'
      const messageText = safeTrim(hasDate ? matched[4] : matched[2]) || ''

      const item = {
        id: `msg_${lineIndex}_${parsed.length}`,
        ts: date ? date.toISOString() : null,
        speaker,
        text: messageText,
      }
      parsed.push(item)
      current = item
      return
    }

    if (current) {
      current.text = `${current.text}\n${text}`.trim()
      return
    }

    parsed.push({
      id: `msg_${lineIndex}_${parsed.length}`,
      ts: null,
      speaker: participants[0] || 'Unknown',
      text,
    })
  })

  if (participants.length && parsed.some((item) => item.speaker === 'Unknown')) {
    let pointer = 0
    parsed.forEach((item) => {
      if (item.speaker !== 'Unknown') return
      item.speaker = participants[pointer % participants.length]
      pointer += 1
    })
  }

  return {
    messages: parsed,
    participants: [...new Set(parsed.map((item) => item.speaker).filter(Boolean))],
  }
}

export function computeMetrics(messages, manualDateRange = null) {
  const safeMessages = Array.isArray(messages) ? messages : []
  const participants = [...new Set(safeMessages.map((item) => item.speaker).filter(Boolean))]
  const messageCountByParticipant = participants.map((name, index) => ({
    name,
    messageCount: safeMessages.filter((item) => item.speaker === name).length,
    colorHint: ['pink', 'blue', 'purple', 'teal'][index % 4],
  }))

  const weeklyMap = {}
  const weeklySentiment = {}
  const heatmap = DAY_LABELS.map((day) => ({
    day,
    blocks: TIME_BLOCKS.map((block) => ({ block, count: 0 })),
  }))

  const wordFrequencyByParticipant = {}

  safeMessages.forEach((message, index) => {
    const date = message.ts ? new Date(message.ts) : null
    const weekKey = date && !Number.isNaN(date.getTime())
      ? getWeekKey(date)
      : `W-${Math.floor(index / 40) + 1}`

    if (!weeklyMap[weekKey]) {
      weeklyMap[weekKey] = { week: weekKey }
      participants.forEach((name) => {
        weeklyMap[weekKey][name] = 0
      })
      weeklyMap[weekKey].total = 0
    }

    weeklyMap[weekKey][message.speaker] = (weeklyMap[weekKey][message.speaker] || 0) + 1
    weeklyMap[weekKey].total += 1

    if (!weeklySentiment[weekKey]) {
      weeklySentiment[weekKey] = { total: 0, count: 0 }
    }
    const s = sentimentScore(message.text)
    weeklySentiment[weekKey].total += s
    weeklySentiment[weekKey].count += 1

    if (date && !Number.isNaN(date.getTime())) {
      const dayIndex = (date.getDay() + 6) % 7
      const blockIndex = getTimeBlockIndex(date)
      heatmap[dayIndex].blocks[blockIndex].count += 1
    }

    if (!wordFrequencyByParticipant[message.speaker]) {
      wordFrequencyByParticipant[message.speaker] = {}
    }

    String(message.text || '')
      .split(/\s+/)
      .map((token) => sanitizeWord(token))
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
      .forEach((token) => {
        wordFrequencyByParticipant[message.speaker][token] =
          (wordFrequencyByParticipant[message.speaker][token] || 0) + 1
      })
  })

  const engagementOverTime = Object.values(weeklyMap).sort((a, b) => String(a.week).localeCompare(String(b.week)))

  const sentimentOverTimeBuckets = engagementOverTime.map((weekItem) => {
    const sentimentData = weeklySentiment[weekItem.week] || { total: 0, count: 0 }
    return {
      week: weekItem.week,
      sentiment: sentimentData.count ? sentimentData.total / sentimentData.count : 0,
      totalMessages: weekItem.total || 0,
    }
  })

  const topWordsPerParticipant = Object.entries(wordFrequencyByParticipant).map(([name, words]) => ({
    name,
    words: Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([word, count]) => ({ word, count })),
  }))

  const notableSpikesCandidates = sentimentOverTimeBuckets
    .map((item, index) => {
      const previous = sentimentOverTimeBuckets[index - 1]
      const delta = previous ? Math.abs(item.sentiment - previous.sentiment) : 0
      return {
        week: item.week,
        delta,
        totalMessages: item.totalMessages,
      }
    })
    .sort((a, b) => b.delta - a.delta || b.totalMessages - a.totalMessages)
    .slice(0, 5)

  return {
    participants: messageCountByParticipant,
    engagementOverTime,
    weeklyHeatmap: heatmap,
    sentimentOverTimeBuckets,
    topWordsPerParticipant,
    conversationDurationDays: estimateDurationDays(safeMessages, manualDateRange),
    detectedLanguages: detectLanguages(safeMessages),
    notableSpikesCandidates,
    totalMessages: safeMessages.length,
  }
}

export { DAY_LABELS, TIME_BLOCKS }
