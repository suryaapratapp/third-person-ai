import { useEffect, useMemo, useState } from 'react'
import { Check, Circle } from 'lucide-react'

const STEPS = [
  'Reading patterns',
  'Mapping emotions',
  'Identifying dynamics',
  'Generating insights',
  'Preparing dashboard',
]

const REASSURANCE_LINES = [
  'Looking for shifts in tone over time...',
  'Summarizing communication dynamics...',
  'Highlighting recurring emotional signals...',
  'Organizing insights into clear sections...',
  'Preparing your dashboard...',
]

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const onChange = (event) => setPrefersReducedMotion(event.matches)
    mediaQuery.addEventListener('change', onChange)

    return () => {
      mediaQuery.removeEventListener('change', onChange)
    }
  }, [])

  return prefersReducedMotion
}

export default function AnalysisProgress({ currentStep }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [lineIndex, setLineIndex] = useState(0)

  const activeIndex = useMemo(() => {
    const idx = STEPS.findIndex((step) => step === currentStep)
    return idx >= 0 ? idx : 0
  }, [currentStep])

  useEffect(() => {
    if (prefersReducedMotion) {
      setLineIndex(activeIndex)
      return undefined
    }

    const interval = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % REASSURANCE_LINES.length)
    }, 2100)

    return () => {
      window.clearInterval(interval)
    }
  }, [activeIndex, prefersReducedMotion])

  return (
    <div className="mt-5 rounded-2xl border border-cyan-200/20 bg-gradient-to-br from-slate-900/85 via-slate-900/70 to-slate-950/90 p-4 sm:p-5" role="status" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Analysis In Progress</p>
      <div className="mt-4 space-y-3">
        {STEPS.map((step, index) => {
          const isComplete = index < activeIndex
          const isCurrent = index === activeIndex

          return (
            <div key={step} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                  isComplete
                    ? 'border-cyan-200/60 bg-cyan-300/20 text-cyan-100'
                    : isCurrent
                      ? 'border-indigo-200/50 bg-indigo-300/15 text-indigo-100 motion-safe:animate-pulse motion-reduce:animate-none'
                      : 'border-white/20 bg-white/5 text-slate-300'
                }`}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              </span>
              <p className={`text-sm ${isCurrent ? 'text-white' : isComplete ? 'text-slate-100/90' : 'text-slate-300/80'}`}>{step}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl border border-white/15 bg-slate-950/65 px-3 py-2.5">
        <p className="text-sm text-cyan-100/90">{REASSURANCE_LINES[lineIndex]}</p>
      </div>
    </div>
  )
}

export { STEPS as ANALYSIS_STEPS }
