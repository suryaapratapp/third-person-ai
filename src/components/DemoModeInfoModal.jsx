import { useEffect, useState } from 'react'
import Modal from './Modal'

export default function DemoModeInfoModal({
  isOpen,
  onClose,
  onAcceptConsent,
  consentAlreadyGiven = false,
  requireConsent = false,
}) {
  const [checked, setChecked] = useState(consentAlreadyGiven)

  useEffect(() => {
    if (!isOpen) return
    setChecked(consentAlreadyGiven)
  }, [consentAlreadyGiven, isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enable Demo Mode"
      labelledBy="demo-mode-info-title"
      canClose={!requireConsent || consentAlreadyGiven}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4 text-sm text-slate-100/85">
        <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4">
          <p className="font-semibold text-white">What Demo Mode does</p>
          <p className="mt-1">
            Demo Mode generates experimental insights to preview the experience.
          </p>
        </div>
        <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4">
          <p className="font-semibold text-white">What data is sent</p>
          <p className="mt-1">
            By default, we send an abstracted and sanitized summary. Full raw text is only used when you explicitly turn on highest quality for the current session.
          </p>
        </div>
        <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4">
          <p className="font-semibold text-white">What we recommend</p>
          <p className="mt-1">
            Demo Mode is an early preview of analysis quality. Avoid sharing highly sensitive personal information.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200/25 bg-amber-300/10 p-4">
          <p className="font-semibold text-white">Disclaimer</p>
          <p className="mt-1">
            Demo outputs are experimental and results may vary. Not therapy, not legal advice, and not a guarantee of outcomes.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-white/15 bg-slate-950/45 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-300"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span className="text-sm text-slate-100/90">
            I understand Demo Mode is experimental.
          </span>
        </label>

        <div className="flex justify-end gap-2">
          {!requireConsent || consentAlreadyGiven ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
            >
              Close
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!checked) return
              onAcceptConsent?.()
            }}
            disabled={!checked}
            className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm and Continue
          </button>
        </div>
      </div>
    </Modal>
  )
}
