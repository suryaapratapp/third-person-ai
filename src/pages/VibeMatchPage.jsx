import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  BrainCircuit,
  HeartHandshake,
  Lock,
  MessageCircleHeart,
  ScanHeart,
  Sparkles,
  UserRoundSearch,
} from 'lucide-react'
import HeartParticleBackground from '../components/HeartParticleBackground'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import { useAuth } from '../context/AuthContext'

const whyItWorksCards = [
  {
    title: 'Your communication fingerprint',
    description:
      'Your word choices, pacing, and response style are like a fingerprint - they reveal how you connect, regulate emotions, and show interest.',
    icon: BrainCircuit,
  },
  {
    title: 'Subconscious signals',
    description:
      'Most people do not realize the patterns they repeat in relationships until you see them. We surface signals like emotional consistency, effort balance, and how you handle tension.',
    icon: ScanHeart,
  },
  {
    title: 'Psychology-informed matching',
    description:
      'We look for compatibility across needs and styles, not perfect sameness. The goal is a match that feels safe, fun, and sustainable.',
    icon: UserRoundSearch,
  },
]

const featureChips = [
  'Vibe compatibility',
  'Communication rhythm',
  'Emotional consistency',
  'Effort balance',
  'Conflict style',
  'Humor + playfulness',
  'Attachment signals (beta)',
  'Shared themes + curiosity map',
]

const previewCards = [
  { label: 'High', score: 84, tags: ['Humor', 'Deep talks', 'Fast replies'] },
  { label: 'Strong match', score: 88, tags: ['Late-night chats', 'Curious', 'Music nerd'] },
  { label: 'Medium', score: 82, tags: ['Playful', 'Consistency', 'Voice notes'] },
  { label: 'Strong match', score: 91, tags: ['Long-form', 'Empathy', 'Bookish'] },
  { label: 'High', score: 86, tags: ['Witty', 'Warm', 'Future plans'] },
  { label: 'Strong match', score: 89, tags: ['Reflective', 'Quick check-ins', 'Balanced'] },
]

function loadProfileMeta() {
  try {
    const raw = localStorage.getItem('tpai_profile')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export default function VibeMatchPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [isLoginRequiredOpen, setIsLoginRequiredOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return undefined
    const id = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(id)
  }, [toast])

  const mailtoHref = useMemo(() => {
    if (!user?.email) return ''
    const profile = loadProfileMeta()
    const locale = navigator.language || 'Unknown'

    const bodyLines = [
      'Please add me to the Vibe Match waitlist.',
      '',
      `Account email: ${user.email}`,
      `Locale: ${locale}`,
    ]

    if (profile?.location) {
      bodyLines.push(`Location: ${profile.location}`)
    }

    if (Array.isArray(profile?.languages) && profile.languages.length) {
      bodyLines.push(`Languages: ${profile.languages.join(', ')}`)
    }

    return `mailto:info@thethirdperson.ai?subject=${encodeURIComponent(
      'Vibe Match Waitlist',
    )}&body=${encodeURIComponent(bodyLines.join('\n'))}`
  }, [user?.email])

  const onJoinWaitlist = () => {
    if (!isAuthenticated || !user?.email) {
      setIsLoginRequiredOpen(true)
      return
    }

    if (!mailtoHref) return
    window.location.href = mailtoHref
    setToast('Email draft opened - hit send to join.')
  }

  return (
    <main className="relative isolate overflow-hidden px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_15%_12%,rgba(244,114,182,0.22),transparent_42%),radial-gradient(circle_at_84%_18%,rgba(34,211,238,0.18),transparent_40%),radial-gradient(circle_at_55%_80%,rgba(217,70,239,0.18),transparent_44%),linear-gradient(145deg,#120816_0%,#170b22_45%,#0d1220_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20 [background-image:linear-gradient(rgba(248,250,252,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.07)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="pointer-events-none absolute inset-0 z-0 mix-blend-screen bg-[radial-gradient(circle_at_50%_22%,rgba(236,72,153,0.15),transparent_38%)]" />
      <HeartParticleBackground />

      <div className="relative z-10">
        <section className="mx-auto max-w-6xl">
          <GlassCard className="relative overflow-hidden border-fuchsia-200/25 bg-slate-950/55 p-6 shadow-2xl shadow-black/40 sm:p-8">
            <div className="pointer-events-none absolute -left-24 top-8 h-52 w-52 rounded-full bg-fuchsia-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-2 h-52 w-52 rounded-full bg-cyan-300/15 blur-3xl" />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200/35 bg-fuchsia-300/10 px-3 py-1 text-xs font-semibold text-fuchsia-100">
                <Sparkles className="h-3.5 w-3.5" />
                Launching soon • Waitlist
              </span>
              <button
                type="button"
                onClick={onJoinWaitlist}
                className="rounded-full border border-fuchsia-200/40 bg-fuchsia-300/12 px-3 py-1 text-xs font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/22"
              >
                Join waitlist
              </button>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Find your vibe match
            </h1>
            <p className="mt-4 max-w-[60ch] text-sm text-slate-100/84 sm:text-base">
              A premium matching experience built from how you actually communicate - your tone, rhythm, emotional patterns, and the little signals you do not even notice.
            </p>

            <ul className="mt-5 grid gap-2 text-sm text-slate-100/82 sm:grid-cols-3">
              <li className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">Not just what you say - how you say it.</li>
              <li className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">Patterns &gt; profiles.</li>
              <li className="rounded-xl border border-white/15 bg-white/5 px-3 py-2">Built for dating and best-friends.</li>
            </ul>
          </GlassCard>
        </section>

        <section className="mx-auto mt-6 max-w-6xl">
          <h2 className="text-2xl font-semibold tracking-tight text-white">Why Vibe Match hits different</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {whyItWorksCards.map((card) => {
              const Icon = card.icon
              return (
                <GlassCard key={card.title} className="border-fuchsia-200/20 bg-slate-950/45 p-5">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-200/30 bg-gradient-to-br from-fuchsia-300/20 via-rose-300/20 to-cyan-300/20 text-fuchsia-100">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm text-slate-100/80">{card.description}</p>
                </GlassCard>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-slate-100/70">Insights are informational, not clinical.</p>
        </section>

        <section className="mx-auto mt-6 max-w-6xl">
          <GlassCard className="border-fuchsia-200/20 bg-slate-950/45 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">What Vibe Match uses</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {featureChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100/85"
                >
                  {chip}
                </span>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="mx-auto mt-6 grid max-w-6xl gap-4 md:grid-cols-2">
          <GlassCard className="border-fuchsia-200/20 bg-slate-950/45 p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-fuchsia-200/25 bg-fuchsia-300/10 text-fuchsia-100">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">Date mode</h2>
            <p className="mt-2 text-sm text-slate-100/80">
              Find someone who matches your energy and emotional pace.
            </p>
          </GlassCard>
          <GlassCard className="border-cyan-200/20 bg-slate-950/45 p-5">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
              <MessageCircleHeart className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">Best-friend mode</h2>
            <p className="mt-2 text-sm text-slate-100/80">
              Find your person: same humor, same depth, same vibe.
            </p>
          </GlassCard>
        </section>

        <section className="mx-auto mt-6 max-w-6xl">
          <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Preview matches</h2>
              <span className="text-xs text-slate-100/70">UI preview only</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {previewCards.map((card, index) => (
                <article
                  key={`${card.label}-${index}`}
                  className="rounded-2xl border border-white/15 bg-slate-900/60 p-4"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-300/30 via-rose-300/25 to-cyan-300/25" />
                  <p className="mt-3 text-sm font-semibold text-white" title={`Internal demo score: ${card.score}`}>
                    Vibe compatibility: {card.label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {card.tags.map((tag) => (
                      <span
                        key={`${card.label}-${tag}-${index}`}
                        className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[11px] text-slate-100/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled
                    title="Unlocks at launch"
                    className="mt-4 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100/75 blur-[0.2px] disabled:cursor-not-allowed"
                  >
                    Unlocks at launch
                  </button>
                </article>
              ))}
            </div>
          </GlassCard>
        </section>

        <section className="mx-auto mt-6 max-w-6xl">
          <GlassCard className="border-fuchsia-200/25 bg-gradient-to-br from-slate-900/80 via-slate-900/72 to-fuchsia-500/8 p-6 sm:p-7">
            <h2 className="text-2xl font-semibold text-white">Get early access</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-100/82">
              We&apos;re launching Vibe Match for a small group first. Join the waitlist to get an invite when it opens.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onJoinWaitlist}
                className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-200/45 bg-fuchsia-300/12 px-4 py-2 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/22"
              >
                <Bot className="h-4 w-4" />
                Join our waitlist
              </button>
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(true)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-100/75 underline-offset-4 transition hover:text-slate-100 hover:underline"
              >
                <Lock className="h-3.5 w-3.5" />
                What data is used?
              </button>
            </div>
          </GlassCard>
        </section>
      </div>

      <Modal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        title="What data is used?"
        labelledBy="vibe-match-privacy-title"
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-3 text-sm text-slate-100/85">
          <p>We use derived patterns (tone, timing, topics) - not raw messages.</p>
          <p>Raw messages are never displayed to other users.</p>
          <p>You&apos;ll be able to choose which analyses count for matching (coming soon).</p>
          <button
            type="button"
            onClick={() => setIsPrivacyOpen(false)}
            className="mt-2 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
          >
            Got it
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={isLoginRequiredOpen}
        onClose={() => setIsLoginRequiredOpen(false)}
        title="Sign in to join the waitlist"
        labelledBy="vibe-match-login-title"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-sm text-slate-100/85">
          <p>We need your account email to add you.</p>
          <button
            type="button"
            onClick={() => {
              setIsLoginRequiredOpen(false)
              navigate('/auth/signin', { state: { from: '/vibe-match' } })
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-fuchsia-200/35 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/20"
          >
            Sign in
          </button>
        </div>
      </Modal>

      {toast ? (
        <div className="fixed bottom-4 right-4 z-[80] rounded-xl border border-emerald-200/30 bg-emerald-300/10 px-4 py-2 text-xs font-medium text-emerald-100 shadow-lg shadow-black/40">
          {toast}
        </div>
      ) : null}
    </main>
  )
}
