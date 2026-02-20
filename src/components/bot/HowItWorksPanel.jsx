import { AlertTriangle, Compass, MessageCircleHeart, Sparkles } from 'lucide-react'
import GlassCard from '../GlassCard'

const canDo = [
  {
    title: 'Reflect patterns',
    description: 'Spots tone shifts, repair attempts, and repeated communication loops.',
    icon: Compass,
  },
  {
    title: 'Suggest actions',
    description: 'Offers practical next-step ideas for clearer and calmer messaging.',
    icon: Sparkles,
  },
  {
    title: 'Help reframe',
    description: 'Turns reactive thoughts into grounded, constructive responses.',
    icon: MessageCircleHeart,
  },
]

export default function HowItWorksPanel() {
  return (
    <GlassCard className="border-white/15 bg-slate-950/45 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">How This Works</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {canDo.map((item) => (
          <div key={item.title} className="rounded-xl border border-white/15 bg-slate-900/55 p-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100">
              <item.icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 text-xs text-slate-100/75">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-amber-200/20 bg-amber-300/10 p-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/90">
          <AlertTriangle className="h-3.5 w-3.5" />
          Limits
        </p>
        <p className="mt-1 text-xs text-slate-100/80">
          Love Guru cannot guarantee outcomes and does not replace therapy, legal advice, or crisis support.
        </p>
      </div>
    </GlassCard>
  )
}
