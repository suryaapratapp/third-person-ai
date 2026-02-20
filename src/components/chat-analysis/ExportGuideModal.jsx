import { X } from 'lucide-react'

export default function ExportGuideModal({ app, onClose }) {
  if (!app) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <div className="max-h-full w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/20 bg-slate-900/95 p-5 shadow-2xl shadow-black/50 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Export Guide</p>
            <h2 id="guide-title" className="mt-2 text-xl font-semibold text-white">
              How to export from {app.label}
            </h2>
            <p className="mt-1 text-sm text-slate-100/75">Follow these steps before uploading. Keep it text-focused for best parsing.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 p-2 text-slate-200 transition hover:bg-white/15"
            aria-label="Close export guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2.5 py-1 text-xs font-medium text-cyan-100">Export without media</span>
          <span className="rounded-full border border-violet-200/30 bg-violet-300/10 px-2.5 py-1 text-xs font-medium text-violet-100">Do not include attachments</span>
          <span className="rounded-full border border-rose-200/30 bg-rose-300/10 px-2.5 py-1 text-xs font-medium text-rose-100">Group chats supported</span>
        </div>

        <div className="mt-5 space-y-5">
          {app.exportSteps.map((step, index) => (
            <section key={step.title} className="rounded-xl border border-white/15 bg-slate-950/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Step {index + 1}</p>
              <h3 className="mt-1 text-base font-semibold text-white">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-100/80">{step.description}</p>
              {app.guideImages?.[index] ? (
                <img
                  src={app.guideImages[index]}
                  alt={`${app.label} export step ${index + 1} placeholder`}
                  className="mt-3 w-full rounded-lg border border-white/15 bg-slate-900"
                />
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-white/20 bg-slate-900/65 p-6 text-center text-xs text-slate-100/70">
                  Add screenshot
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cyan-200/35 bg-gradient-to-r from-cyan-300/15 via-violet-300/15 to-rose-300/15 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-900/20 transition hover:brightness-110"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
