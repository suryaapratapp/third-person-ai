import { useEffect, useId, useRef, useState } from 'react'
import { Info } from 'lucide-react'

export default function InfoTooltip({ title, explanation, limitations }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={`What does ${title} mean?`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/5 text-slate-200 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="tooltip"
          className="absolute right-0 top-8 z-20 w-72 rounded-xl border border-white/20 bg-slate-900/95 p-3 text-left shadow-xl shadow-black/40"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">What this means</p>
          <p className="mt-1 text-sm text-slate-100/90">{explanation}</p>
          <p className="mt-2 text-xs text-slate-100/70">
            <span className="font-semibold text-slate-100/85">Limitations:</span> {limitations}
          </p>
        </div>
      ) : null}
    </span>
  )
}
