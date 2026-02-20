import GlassCard from './GlassCard'

export default function PlaceholderPanel({ title, description }) {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <GlassCard className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-rose-50/85">{description}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/20 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-100/70">Next Step</p>
              <p className="mt-2 text-sm text-white/90">This route is scaffolded and ready for real UI + data wiring.</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-100/70">Status</p>
              <p className="mt-2 text-sm text-white/90">Placeholder mode. No backend integration yet.</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
