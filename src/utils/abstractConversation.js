const redactionPatterns = {
  phone: /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/gi,
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  address: /\b\d{1,5}\s+[A-Za-z0-9.\s]{2,35}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr)\b/gi,
}

const positiveWords = ['love', 'thanks', 'appreciate', 'good', 'great', 'happy', 'support']
const negativeWords = ['upset', 'angry', 'hurt', 'sad', 'confused', 'frustrated', 'fight']
const stopWords = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'your', 'about',
  'just', 'what', 'when', 'were', 'will', 'would', 'there', 'their', 'they', 'them',
  'you', 'are', 'our', 'its', 'was', 'been', 'then', 'than', 'into', 'after',
])

function sanitizeSnippet(text) {
  let next = text || ''
  Object.values(redactionPatterns).forEach((pattern) => {
    next = next.replace(pattern, 'Encrypted')
  })
  return next.slice(0, 180)
}

function detectParticipants(lines) {
  const names = new Set()
  lines.forEach((line) => {
    const bracketMatch = line.match(/^\[[^\]]+\]\s*([^:]{1,40}):\s+/)
    const dashedMatch = line.match(/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}.*-\s*([^:]{1,40}):\s+/)
    const simpleMatch = line.match(/^([^:]{1,40}):\s+.+/)
    const name = (bracketMatch?.[1] || dashedMatch?.[1] || simpleMatch?.[1] || '').trim()
    if (name && name.length > 1) names.add(name)
  })
  return [...names]
}

function detectDateRange(text) {
  const matches = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/g) || []
  if (!matches.length) return null

  const normalized = matches
    .map((value) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`)
      const parts = value.split(/[\/.-]/).map((item) => Number(item))
      if (parts.length !== 3) return null
      const year = parts[2] < 100 ? 2000 + parts[2] : parts[2]
      const first = parts[0]
      const second = parts[1]
      const month = first > 12 ? second : first
      const day = first > 12 ? first : second
      return new Date(year, month - 1, day)
    })
    .filter((item) => item instanceof Date && !Number.isNaN(item.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  if (!normalized.length) return null
  return {
    startDateISO: normalized[0].toISOString(),
    endDateISO: normalized[normalized.length - 1].toISOString(),
  }
}

export function abstractConversation({ rawText, manualParticipants = [], manualDateRange = null }) {
  const safeText = String(rawText || '')
  const lines = safeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const participantNames = manualParticipants.filter(Boolean).length
    ? manualParticipants.filter(Boolean)
    : detectParticipants(lines)

  const sampleSnippets = lines
    .filter((line) => line.length > 4)
    .slice(0, 24)
    .map((line) => sanitizeSnippet(line))
    .filter(Boolean)
    .slice(0, 8)

  let positiveCount = 0
  let negativeCount = 0
  lines.forEach((line) => {
    const lower = line.toLowerCase()
    positiveWords.forEach((word) => {
      if (lower.includes(word)) positiveCount += 1
    })
    negativeWords.forEach((word) => {
      if (lower.includes(word)) negativeCount += 1
    })
  })

  const wordFrequency = {}
  safeText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && word.length > 2 && !stopWords.has(word))
    .forEach((word) => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1
    })

  const topTopics = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => word)

  const detectedDateRange = detectDateRange(safeText)
  const dateRange = detectedDateRange || (manualDateRange && {
    startDateISO: manualDateRange.start || null,
    endDateISO: manualDateRange.end || null,
    preset: manualDateRange.preset || null,
  })

  return {
    messageCountApprox: lines.length,
    participantNames,
    sampleSnippets,
    sentimentHeuristic: {
      positiveCount,
      negativeCount,
      tone:
        positiveCount === negativeCount
          ? 'mixed'
          : positiveCount > negativeCount
            ? 'mostly-positive'
            : 'mostly-strained',
    },
    topTopics,
    dateRange,
  }
}

