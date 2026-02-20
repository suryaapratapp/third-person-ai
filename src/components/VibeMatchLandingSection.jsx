import { Brain, Fingerprint, HeartHandshake, Sparkles } from 'lucide-react'
import GlassCard from './GlassCard'

const cardTones = {
  rose: 'bg-gradient-to-br from-rose-300/25 to-rose-500/10 text-rose-100 ring-1 ring-rose-200/25',
  violet: 'bg-gradient-to-br from-violet-300/25 to-indigo-500/10 text-violet-100 ring-1 ring-violet-200/25',
  cyan: 'bg-gradient-to-br from-cyan-300/25 to-sky-500/10 text-cyan-100 ring-1 ring-cyan-200/25',
}

const highlights = [
  {
    title: 'Communication fingerprint',
    text: 'How you phrase things, pause, and respond says more than profile prompts ever can.',
    icon: Fingerprint,
    tone: 'rose',
  },
  {
    title: 'Subconscious patterns',
    text: 'Signals you may not notice in the moment can reveal your relationship rhythm over time.',
    icon: Brain,
    tone: 'violet',
  },
  {
    title: 'Psychology-informed matching (beta)',
    text: 'We look for style alignment that can feel grounded, fun, and emotionally safe.',
    icon: HeartHandshake,
    tone: 'cyan',
  },
]

export default function VibeMatchLandingSection({ sectionRef, onJoinWaitlist }) {
  return (
    <section ref={sectionRef} className="mx-auto mt-14 max-w-6xl">
      <div className="relative overflow-hidden rounded-3xl border border-fuchsia-200/25 p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(244,114,182,0.25),transparent_38%),radial-gradient(circle_at_82%_20%,rgba(217,70,239,0.2),transparent_42%),radial-gradient(circle_at_55%_86%,rgba(251,113,133,0.16),transparent_48%),linear-gradient(145deg,#1a1024_0%,#25102a_48%,#140f1f_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.24)_0,transparent_38%),radial-gradient(circle_at_72%_72%,rgba(255,255,255,0.2)_0,transparent_35%)]" />
        <div className="pointer-events-none absolute -left-12 top-8 h-36 w-36 rounded-full bg-fuchsia-300/18 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-8 h-36 w-36 rounded-full bg-rose-300/14 blur-3xl" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100/86">Vibe Match</p>
              <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Vibe Match</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-100/84 sm:text-base">
                A premium matching experience built from how you actually communicate - tone, rhythm, and emotional patterns.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200/35 bg-fuchsia-300/12 px-3 py-1 text-xs font-semibold text-fuchsia-100">
              <Sparkles className="h-3.5 w-3.5" />
              Coming soon • Waitlist
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {highlights.map((item) => (
              <GlassCard key={item.title} className="h-full border-white/15 bg-slate-950/48 p-3.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${cardTones[item.tone]}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-100/78">{item.text}</p>
              </GlassCard>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-fuchsia-100/92">Vibe Match is launching soon.</p>
            <button
              type="button"
              onClick={onJoinWaitlist}
              className="inline-flex items-center rounded-xl border border-fuchsia-100/40 bg-gradient-to-r from-fuchsia-300/25 via-rose-300/20 to-cyan-300/20 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/25 transition hover:brightness-110"
            >
              Join waitlist
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
