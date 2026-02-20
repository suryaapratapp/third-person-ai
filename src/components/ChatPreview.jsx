import { Lock } from 'lucide-react'
import { maskSensitiveContent } from '../services/privacyUtils'

function shortenName(value) {
  if (!value) return 'Unknown'
  return value.length > 18 ? `${value.slice(0, 17)}...` : value
}

function applyParticipantLabels(messages, hideNames) {
  if (!hideNames) return { messages, displayParticipants: [] }

  const senderOrder = []
  messages.forEach((message) => {
    if (!senderOrder.includes(message.sender)) senderOrder.push(message.sender)
  })

  const aliasMap = new Map()
  senderOrder.forEach((sender, index) => {
    const letter = String.fromCharCode(65 + index)
    aliasMap.set(sender, `Person ${letter}`)
  })

  return {
    displayParticipants: senderOrder.map((sender) => aliasMap.get(sender)),
    messages: messages.map((message) => ({
      ...message,
      sender: aliasMap.get(message.sender) ?? 'Person A',
    })),
  }
}

function formatTime(timestampISO) {
  if (!timestampISO) return 'Time unavailable'
  const date = new Date(timestampISO)
  if (Number.isNaN(date.getTime())) return 'Time unavailable'
  return date.toLocaleString()
}

const SAFETY_PATTERNS = {
  phone: /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/gi,
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  address: /\b\d{1,5}\s+[A-Za-z0-9.\s]{2,30}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr)\b/gi,
  sexual: /\b(sex|nude|explicit|hookup)\b/gi,
  selfHarm: /\b(self harm|suicide|kill myself|hurt myself)\b/gi,
  hate: /\b(racist|slur|hate crime)\b/gi,
}

function redactForSafety(text) {
  if (!text) return { text: '', redacted: false }
  let next = text
  let redacted = false
  Object.values(SAFETY_PATTERNS).forEach((pattern) => {
    next = next.replace(pattern, () => {
      redacted = true
      return 'Encrypted'
    })
  })
  return { text: next, redacted }
}

export default function ChatPreview({ previewLines = [], hideNames, maskSensitiveInfo }) {
  if (!previewLines.length) return null

  const labeled = applyParticipantLabels(previewLines, hideNames)

  return (
    <div className="rounded-2xl border border-cyan-200/20 bg-slate-950/65 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Safety Preview</p>
      <p className="mt-1 text-xs text-slate-100/70">Showing {labeled.messages.length} sample lines with sensitive details redacted.</p>

      <div className="mt-4 space-y-2.5">
        {labeled.messages.map((message, index) => {
          const baseText = maskSensitiveInfo ? maskSensitiveContent(message.text) : message.text
          const redaction = redactForSafety(baseText)
          const sender = shortenName(message.sender)

          return (
            <div key={message.id || `${sender}-${index}`} className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">
                  {sender}
                </p>
                <p className="text-[11px] text-slate-100/55">{formatTime(message.timestampISO)}</p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-100/85">{redaction.text}</p>
              {redaction.redacted ? (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-100/90">
                  <Lock className="h-3 w-3" />
                  Sensitive content hidden
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {hideNames && labeled.displayParticipants.length ? (
        <p className="mt-3 text-xs text-slate-100/70">Names hidden as {labeled.displayParticipants.join(', ')}.</p>
      ) : null}
    </div>
  )
}
