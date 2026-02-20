import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  Compass,
  HeartPulse,
  Sparkles,
  Target,
  Waves,
} from 'lucide-react'
import GlassCard from '../components/GlassCard'
import { listAnalyses } from '../services/analysisServiceApi'

const sections = [
  {
    title: 'Communication fingerprint',
    description: 'Your rhythm, word choices, and response style reveal how you connect.',
    icon: Waves,
  },
  {
    title: 'Subconscious patterns',
    description: 'We surface repeated dynamics - what you lean toward when things feel good or tense.',
    icon: BrainCircuit,
  },
  {
    title: 'Emotional signature',
    description: 'How your tone shifts over time and what tends to bring you back to balance.',
    icon: HeartPulse,
  },
  {
    title: 'Interest map',
    description: 'Topics you return to, what excites you, what drains you.',
    icon: Compass,
  },
  {
    title: 'Attachment signals (beta)',
    description: 'Not a label - just patterns in closeness, reassurance, and distance.',
    icon: Target,
  },
  {
    title: 'Growth prompts',
    description: 'Small, practical ways to communicate better without changing who you are.',
    icon: Sparkles,
  },
]

export default function VibeCheckPage() {
  const navigate = useNavigate()
  const [hasAnalyses, setHasAnalyses] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      setIsLoading(true)
      try {
        const rows = await listAnalyses()
        if (!active) return
        setHasAnalyses(Array.isArray(rows) && rows.length > 0)
      } catch {
        if (!active) return
        setHasAnalyses(false)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-6 sm:p-8">
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Vibe Check</h1>
          <p className="mt-3 max-w-[60ch] text-sm text-slate-100/82 sm:text-base">
            A deeper read on how you communicate - your tone, pacing, emotional patterns, and the subtle signals you repeat without noticing.
          </p>
          <p className="mt-2 text-xs text-slate-100/68">
            Informational insights - not medical or clinical advice.
          </p>

          {isLoading ? (
            <div className="mt-6 rounded-2xl border border-white/15 bg-slate-900/50 p-5 text-sm text-slate-100/75">
              Loading your analysis context...
            </div>
          ) : !hasAnalyses ? (
            <div className="mt-6 rounded-2xl border border-fuchsia-200/25 bg-fuchsia-300/8 p-5">
              <h2 className="text-lg font-semibold text-white">Run an analysis first - then we&rsquo;ll build your Vibe Check.</h2>
              <p className="mt-2 text-sm text-slate-100/80">
                We need at least one recap to map your communication fingerprint and pattern signals.
              </p>
              <button
                type="button"
                onClick={() => navigate('/chat-analysis')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-fuchsia-200/35 bg-fuchsia-300/12 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/20"
              >
                Start Chat Analysis
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <article
                      key={section.title}
                      className="rounded-2xl border border-white/15 bg-slate-900/55 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/25 bg-gradient-to-br from-violet-300/20 via-cyan-300/20 to-rose-300/20 text-cyan-100">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-amber-200/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                          Beta
                        </span>
                      </div>
                      <h2 className="mt-3 text-base font-semibold text-white">{section.title}</h2>
                      <p className="mt-2 text-sm text-slate-100/75">{section.description}</p>
                    </article>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/analyses?from=vibe-check')}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  Generate from an analysis
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link
                  to="/analyses?from=vibe-check"
                  className="text-sm font-semibold text-slate-100/78 underline-offset-4 transition hover:text-slate-100 hover:underline"
                >
                  Pick an analysis
                </Link>
              </div>
            </>
          )}
        </GlassCard>
      </section>
    </main>
  )
}
