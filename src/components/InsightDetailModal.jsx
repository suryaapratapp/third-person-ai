import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

export default function InsightDetailModal({ detail, isOpen, onClose, onAskLoveGuru }) {
  const panelRef = useRef(null)
  const closeBtnRef = useRef(null)
  const previousFocusRef = useRef(null)
  const [checkedActions, setCheckedActions] = useState({})

  useEffect(() => {
    if (!isOpen) return undefined

    previousFocusRef.current = document.activeElement
    closeBtnRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return

      const focusable = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus()
      }
    }
  }, [isOpen, onClose])

  useEffect(() => {
    setCheckedActions({})
  }, [detail?.title, isOpen])

  if (!isOpen || !detail) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="insight-detail-title">
      <div ref={panelRef} className="w-full max-w-3xl rounded-2xl border border-white/20 bg-slate-900/95 p-5 shadow-2xl shadow-black/50 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/85">{detail.sourceLabel}</p>
            <h2 id="insight-detail-title" className="mt-2 text-2xl font-semibold text-white">
              {detail.title}
            </h2>
            <p className="mt-2 text-sm text-slate-100/80">{detail.description}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 p-2 text-slate-200 transition hover:bg-white/15"
            aria-label="Close insight detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-white/15 bg-slate-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/85">What this means</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-100/85">
            {detail.whatThisMeans?.map((point) => (
              <li key={point} className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2">
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-slate-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/85">Why we think this</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {detail.evidence?.map((item) => (
              <div key={`${item.label}-${item.snippet}`} className="rounded-lg border border-white/10 bg-slate-900/55 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">{item.label}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-100/80">{item.snippet}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/15 bg-slate-950/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/85">Try this next</p>
          <div className="mt-3 space-y-2">
            {detail.nextSteps?.map((step) => (
              <label key={step} className="flex items-start gap-2 rounded-lg border border-white/10 bg-slate-900/55 px-3 py-2 text-sm text-slate-100/85">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-950/80"
                  checked={Boolean(checkedActions[step])}
                  onChange={(event) => setCheckedActions((prev) => ({ ...prev, [step]: event.target.checked }))}
                />
                <span>{step}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onAskLoveGuru}
            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100"
          >
            Ask Love Guru
          </button>
        </div>
      </div>
    </div>
  )
}
