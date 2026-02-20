import { ShieldCheck } from 'lucide-react'
import { usePrivacy } from '../context/PrivacyContext'
import Modal from './Modal'

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-white/15 bg-slate-950/50 p-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-100/75">{description}</p>
      </div>
      <span className="relative inline-flex h-6 w-11 items-center">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-slate-700 transition peer-checked:bg-cyan-500/70" />
        <span className="absolute left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export default function PrivacySafetyModal({ isOpen, onClose }) {
  const { hideNames, maskSensitiveInfo, setHideNames, setMaskSensitiveInfo } = usePrivacy()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy & Safety" labelledBy="privacy-safety-title">
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">
          <ShieldCheck className="h-4 w-4 text-cyan-100" />
          Trust Layer
        </p>

        <div className="mt-4 space-y-4 text-sm text-slate-100/85">
          <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4">
            <p className="font-semibold text-white">Data handling</p>
            <p className="mt-1">We analyze text-based chat exports and pasted transcripts to generate insights, dashboard summaries, and Love Guru context.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4">
            <p className="font-semibold text-white">What we store</p>
            <p className="mt-1">Analysis metadata, parsed message signals, notes, and settings needed to power your current workspace experience.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4">
            <p className="font-semibold text-white">What we do not store by default</p>
            <p className="mt-1">Media files are not required. Exported JSON excludes raw full chat text unless explicitly supported later.</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4">
            <p className="font-semibold text-white">Delete data</p>
            <p className="mt-1">You can delete individual analyses or clear all analysis data from this device using controls in the analysis library.</p>
          </div>
          <div className="rounded-xl border border-amber-200/25 bg-amber-300/10 p-4">
            <p className="font-semibold text-white">Disclaimer</p>
            <p className="mt-1">
              Insights are signal-based summaries, not guarantees. This product does not replace therapy, crisis support, or legal advice.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <ToggleRow
            label="Hide names (Person A / Person B)"
            description="Replaces participant names across previews and dashboard labels."
            checked={hideNames}
            onChange={setHideNames}
          />
          <ToggleRow
            label="Mask sensitive info"
            description="Masks emails and phone numbers in client-side previews before rendering."
            checked={maskSensitiveInfo}
            onChange={setMaskSensitiveInfo}
          />
        </div>
      </div>
    </Modal>
  )
}
