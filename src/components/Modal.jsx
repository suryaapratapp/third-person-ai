import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  labelledBy,
  canClose = true,
  maxWidthClass = 'max-w-2xl',
}) {
  const panelRef = useRef(null)
  const closeBtnRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    previousFocusRef.current = document.activeElement
    if (canClose) closeBtnRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && canClose) {
        event.preventDefault()
        onClose?.()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
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
  }, [canClose, isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onMouseDown={(event) => {
        if (canClose && event.target === event.currentTarget) onClose?.()
      }}
    >
      <div className="absolute inset-0 bg-slate-950/75" aria-hidden="true" />
      <div
        ref={panelRef}
        className={`relative z-10 w-full ${maxWidthClass} max-h-[85vh] overflow-auto rounded-2xl border border-white/20 bg-slate-900/95 p-5 shadow-2xl shadow-black/50 sm:p-6`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={labelledBy} className="text-xl font-semibold text-white">
            {title}
          </h2>
          {canClose ? (
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => onClose?.()}
              className="rounded-lg border border-white/20 bg-white/5 p-2 text-slate-200 transition hover:bg-white/15"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return modalContent
  return createPortal(modalContent, document.body)
}
