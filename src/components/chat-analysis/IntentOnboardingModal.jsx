import { useEffect } from 'react'
import { Compass, HeartHandshake, MessageCircleWarning, SearchCheck, ShieldQuestion } from 'lucide-react'
import { INTENT_VALUES, getIntentLabel } from '../../services/preferencesService'

const intentIcons = {
  compatibility: HeartHandshake,
  confusing_dynamics: MessageCircleWarning,
  overthinking_anxiety: Compass,
  missed_signs: SearchCheck,
  closure_clarity: ShieldQuestion,
}

export default function IntentOnboardingModal({ open, canDismiss, onDismiss, onSelect }) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && canDismiss) {
        onDismiss()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, canDismiss, onDismiss])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="intent-onboarding-title">
      <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-slate-900/95 p-5 shadow-2xl shadow-black/50 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/85">Intent Onboarding</p>
        <h2 id="intent-onboarding-title" className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          What are you hoping to understand today?
        </h2>
        <p className="mt-2 text-sm text-slate-100/80">This helps tailor your insights and Love Guru guidance.</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTENT_VALUES.map((intent) => {
            const Icon = intentIcons[intent] ?? Compass
            return (
              <button
                key={intent}
                type="button"
                onClick={() => onSelect(intent)}
                className="rounded-xl border border-white/15 bg-slate-950/60 p-3 text-left transition hover:border-cyan-200/40 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <p className="mt-2 text-sm font-semibold text-white">{getIntentLabel(intent)}</p>
              </button>
            )
          })}
        </div>

        {canDismiss ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
            >
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
