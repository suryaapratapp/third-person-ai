import Modal from './Modal'

export default function DemoAiUnavailableModal({
  isOpen,
  message,
  onRetry,
  onUseMockMode,
  onClose,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Demo AI is unavailable"
      labelledBy="demo-ai-unavailable-title"
      canClose
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4 text-sm text-slate-100/85">
        <p>{message || 'Demo AI is unavailable right now.'}</p>
        <p className="text-xs text-slate-100/70">
          You can retry Demo Mode or switch to Mock Mode for this flow.
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onUseMockMode}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
          >
            Use Mock Mode instead
          </button>
        </div>
      </div>
    </Modal>
  )
}
