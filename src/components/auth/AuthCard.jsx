import GlassCard from '../GlassCard'

export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <main className="px-4 pb-14 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <GlassCard className="border-white/15 bg-slate-950/45 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-100/80">{subtitle}</p>
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-6 text-sm text-slate-100/80">{footer}</div> : null}
        </GlassCard>
      </div>
    </main>
  )
}
