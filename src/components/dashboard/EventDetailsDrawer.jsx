import { Eye, EyeOff, Lock } from 'lucide-react'

function maskText(text) {
  return String(text || '')
    .replace(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/g, '[redacted-phone]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.\s]{2,35}\s(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr)\b/gi, '[redacted-address]')
}

function anonymizeName(name, map) {
  if (map.has(name)) return map.get(name)
  const label = `Person ${String.fromCharCode(65 + map.size)}`
  map.set(name, label)
  return label
}

export default function EventDetailsDrawer({
  isOpen,
  event,
  onClose,
  revealMessages,
  onToggleRevealMessages,
  hideNames = false,
}) {
  if (!isOpen || !event) return null

  const nameMap = new Map()
  const safeMessages = Array.isArray(event.relatedMessages) ? event.relatedMessages : []

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="event-drawer-title">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-white/15 bg-slate-950/95 p-5 shadow-2xl shadow-black/50 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Major Event</p>
            <h3 id="event-drawer-title" className="mt-1 text-xl font-semibold text-white">
              {event.event || 'Conversation event'}
            </h3>
            <p className="mt-1 text-xs text-slate-100/70">{event.dateApprox || 'Date unavailable'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-slate-900/55 p-4">
          <p className="text-sm text-slate-100/90">{event.summary || 'No summary available.'}</p>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-slate-900/55 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Event Impact</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-100/85">
            <li><span className="font-semibold text-white">Overview:</span> {event.impact?.overview || 'Beta insight'}</li>
            <li><span className="font-semibold text-white">Key interactions:</span> {event.impact?.keyInteractions || 'Beta insight'}</li>
            <li><span className="font-semibold text-white">Emotional impact:</span> {event.impact?.emotionalImpact || 'Beta insight'}</li>
            <li><span className="font-semibold text-white">Relationship impact:</span> {event.impact?.relationshipImpact || 'Beta insight'}</li>
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-slate-900/55 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Related Messages</p>
            <button
              type="button"
              onClick={onToggleRevealMessages}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-100 transition hover:bg-white/10"
            >
              {revealMessages ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {revealMessages ? 'Hide again' : 'Reveal related messages'}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-100/70">
            Hidden by default for privacy. Reveal only if you want message-level context.
          </p>

          {safeMessages.length ? (
            <div className="mt-3 space-y-2">
              {safeMessages.map((message) => {
                const speakerLabel = hideNames
                  ? anonymizeName(message.speaker || 'Unknown', nameMap)
                  : (message.speaker || 'Unknown')

                return (
                  <div key={message.id} className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-cyan-100">{speakerLabel}</p>
                      <p className="text-[11px] text-slate-100/65">
                        {message.ts ? new Date(message.ts).toLocaleString() : 'No timestamp'}
                      </p>
                    </div>
                    {revealMessages ? (
                      <p className="mt-1 text-xs text-slate-100/85">{maskText(message.text)}</p>
                    ) : (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-100/70">
                        <Lock className="h-3.5 w-3.5" />
                        Message hidden
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-100/70">No exact matches found (demo).</p>
          )}
        </div>
      </div>
    </div>
  )
}
