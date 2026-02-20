import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Bot,
  Brain,
  CalendarClock,
  ChevronDown,
  FileSearch,
  Fingerprint,
  Flame,
  HeartHandshake,
  ListChecks,
  MessageCircleHeart,
  MessageSquare,
  ShieldCheck,
  Trophy,
  UserMinus,
  Users,
  Volume2,
} from 'lucide-react'
import GlassCard from '../components/GlassCard'
import LoveGuruMascot from '../components/LoveGuruMascot'
import Modal from '../components/Modal'
import PrivacySafetyModal from '../components/PrivacySafetyModal'
import SectionTitle from '../components/SectionTitle'
import VibeMatchLandingSection from '../components/VibeMatchLandingSection'
import { useAuth } from '../context/AuthContext'

const iconTones = {
  rose: 'bg-gradient-to-br from-rose-300/25 to-rose-500/10 text-rose-100 ring-1 ring-rose-200/25',
  violet: 'bg-gradient-to-br from-violet-300/25 to-indigo-500/10 text-violet-100 ring-1 ring-violet-200/25',
  cyan: 'bg-gradient-to-br from-cyan-300/25 to-sky-500/10 text-cyan-100 ring-1 ring-cyan-200/25',
  peach: 'bg-gradient-to-br from-amber-200/25 to-orange-400/10 text-amber-100 ring-1 ring-amber-200/25',
}

const steps = [
  {
    title: 'Upload your chat export',
    text: 'Drop in your conversation file securely and let Third Person AI parse the context in seconds.',
  },
  {
    title: 'Watch the emotional map unfold',
    text: 'See shifts in tone, affection, tension, and reciprocity across your timeline.',
  },
  {
    title: 'Get guidance you can use',
    text: 'Receive actionable recommendations tailored to your dynamic and communication style.',
  },
]

const outcomes = [
  {
    name: 'Compatibility Score',
    text: 'Analyzes conversation patterns to reveal true compatibility.',
    icon: HeartHandshake,
    tone: 'rose',
  },
  {
    name: 'MBTI Analysis',
    text: 'Discover personality types from actual conversation data.',
    icon: Fingerprint,
    tone: 'violet',
  },
  {
    name: 'Sentiment Timeline',
    text: 'Track emotional patterns throughout your relationship.',
    icon: Flame,
    tone: 'peach',
  },
  {
    name: 'Response Patterns',
    text: 'Understand communication dynamics and engagement levels.',
    icon: MessageSquare,
    tone: 'cyan',
  },
  {
    name: 'Activity Heatmap',
    text: 'Visualize when you connect most with each other.',
    icon: CalendarClock,
    tone: 'violet',
  },
  {
    name: 'Viral Moments',
    text: 'Rediscover your funniest and most memorable exchanges.',
    icon: Trophy,
    tone: 'rose',
  },
]

const useCases = [
  {
    title: 'Dating & New Relationships',
    text: 'Analyze early communication patterns to understand compatibility before getting too invested.',
    icon: HeartHandshake,
    tone: 'rose',
  },
  {
    title: 'Long-Term Relationships',
    text: 'Understand how your relationship dynamics have evolved over time.',
    icon: Users,
    tone: 'violet',
  },
  {
    title: 'Post-Breakup Clarity',
    text: 'Get objective insights into what went wrong through AI-powered relationship analysis.',
    icon: UserMinus,
    tone: 'cyan',
  },
  {
    title: 'Mental Clarity',
    text: 'Untangle complex thoughts and emotions to uncover repeating patterns, cut through mental noise, and regain direction and momentum.',
    icon: Brain,
    tone: 'peach',
  },
  {
    title: 'Relationship Clarity',
    text: 'Decode conversations from both perspectives to uncover emotional gaps and hidden misunderstandings.',
    icon: MessageCircleHeart,
    tone: 'rose',
  },
  {
    title: 'A Space That Listens',
    text: "Speak freely in a private, judgment-free space that's always available, and feel heard, understood, and supported.",
    icon: Volume2,
    tone: 'cyan',
  },
]

const personas = [
  {
    title: 'The Coach',
    description:
      'Direct, calm, and strategic. Great for conflict repair plans, message rewrites, and realistic next steps.',
  },
  {
    title: 'The Bestie',
    description:
      'Warm, playful, and emotionally tuned. Great for late-night overthinking spirals and confidence boosts.',
  },
]

const methodologyCards = [
  {
    title: 'Patterns over time',
    text: 'We track communication signals across the timeline, including tone shifts, responsiveness, and recurring themes.',
    icon: Activity,
    tone: 'cyan',
  },
  {
    title: 'Summarize before analysis',
    text: 'We condense long threads into structured context first, which reduces noise before scoring and recommendations.',
    icon: FileSearch,
    tone: 'violet',
  },
  {
    title: 'Explanations with outputs',
    text: 'Each key output is paired with plain-language context so you can understand why a signal appears.',
    icon: ListChecks,
    tone: 'peach',
  },
  {
    title: 'Support, not replacement care',
    text: 'The product is designed for reflection and communication support, not as a substitute for professional care.',
    icon: AlertTriangle,
    tone: 'rose',
  },
]

const faqs = [
  {
    question: 'Can AI predict if a breakup is coming?',
    answer:
      'It cannot predict outcomes with certainty. It flags risk signals like recurring contempt, withdrawal, or unresolved conflict patterns.',
  },
  {
    question: 'What kind of relationship advice can I get?',
    answer:
      'You get communication guidance: tone repair ideas, conflict de-escalation options, and practical message suggestions based on patterns in the chat.',
  },
  {
    question: 'Is this reliable?',
    answer:
      'It is best used as decision support, not absolute truth. Results are pattern-based and should be combined with context and human judgment.',
  },
  {
    question: 'Can it tell if someone is interested in me?',
    answer:
      'It can detect signals such as initiation frequency, response effort, and emotional reciprocity. These are indicators, not guarantees of intent.',
  },
  {
    question: 'Can it understand our inside jokes?',
    answer:
      'It usually captures emotional direction and interaction style even when specific references are niche or private.',
  },
  {
    question: 'How is my data handled?',
    answer:
      'Uploads are processed for analysis and should be governed by your project privacy policy. Sensitive details should be minimized before sharing.',
  },
  {
    question: 'Which chat apps are supported?',
    answer:
      'The system is designed for common export formats from major messaging platforms, with parser coverage expanding over time.',
  },
  {
    question: 'How long does analysis usually take?',
    answer:
      'Most reports are generated within seconds to a few minutes, depending on chat size and feature depth.',
  },
  {
    question: 'What are the accuracy limits?',
    answer:
      'AI may miss sarcasm, cultural context, or offline events. It interprets text signals, not full relationship reality.',
  },
  {
    question: 'Can I use this for ongoing check-ins?',
    answer:
      'Yes. Repeated analysis can help track communication trends over time and show whether recent changes are improving outcomes.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const vibeMatchRef = useRef(null)
  const [openFaq, setOpenFaq] = useState(0)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [isWaitlistLoginOpen, setIsWaitlistLoginOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState('coach')
  const [showMobileWaitlistCta, setShowMobileWaitlistCta] = useState(false)

  useEffect(() => {
    const node = vibeMatchRef.current
    if (!node) return undefined

    const onScroll = () => {
      const rect = node.getBoundingClientRect()
      setShowMobileWaitlistCta(rect.top <= 72)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const onJoinWaitlist = () => {
    if (!isAuthenticated || !user?.email) {
      setIsWaitlistLoginOpen(true)
      return
    }

    const bodyLines = [
      'Please add me to the Vibe Match waitlist.',
      '',
      `Account email: ${user.email}`,
    ]
    const mailto = `mailto:info@thethirdperson.ai?subject=${encodeURIComponent(
      'Vibe Match Waitlist',
    )}&body=${encodeURIComponent(bodyLines.join('\n'))}`
    window.location.href = mailto
  }

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <GlassCard className="relative overflow-hidden border-white/15 bg-slate-950/45 p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-sky-300/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-5 right-4 h-20 w-20 rounded-full border border-white/20 bg-white/5" />

          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100/85">Third Person AI</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-5xl">Decode the vibe. Keep your peace.</h1>
          <p className="mt-4 max-w-2xl text-sm text-slate-100/85 sm:text-base">
            Third Person AI reads patterns in your chats so you can understand what is happening, what to do next, and what to stop overthinking.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/chat-analysis"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-200/40 bg-gradient-to-r from-cyan-300/20 via-violet-300/20 to-rose-300/20 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:brightness-110"
            >
              <MessageSquare className="h-4 w-4" />
              Chat Analysis
            </Link>
            <Link
              to="/vibe-check"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200/30 bg-slate-900/55 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-900/80"
            >
              <Fingerprint className="h-4 w-4" />
              Vibe Check
            </Link>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-100/78 underline-offset-4 transition hover:text-slate-100 hover:underline"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacy & Safety
            </button>
            <span className="text-xs text-slate-100/58">Know your communication style and patterns with Vibe Check.</span>
          </div>
        </GlassCard>
      </section>

      <section id="how-it-works" className="mx-auto mt-14 max-w-6xl">
        <SectionTitle
          eyebrow="How It Works"
          title="From screenshots to shared understanding"
          subtitle="A simple three-step flow built for mobile-first speed and emotional context."
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {steps.map((step, index) => (
            <div key={step.title} className="flex items-center gap-2 sm:flex-1">
              <GlassCard className="h-full w-full border-white/15 bg-slate-950/35">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Step {index + 1}</p>
                <h3 className="mt-2 text-lg font-medium text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-100/80">{step.text}</p>
              </GlassCard>
              {index < steps.length - 1 ? (
                <>
                  <ArrowRight className="hidden h-4 w-4 text-cyan-100/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)] sm:block" />
                  <ArrowDown className="h-4 w-4 text-cyan-100/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)] sm:hidden" />
                </>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl">
        <SectionTitle
          eyebrow="What You Get"
          title="Insights that feel human, not robotic"
          subtitle="Every report is designed to help you act, repair, or move forward with intention."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outcomes.map((outcome) => (
            <GlassCard key={outcome.name} className="h-full border-white/15 bg-slate-950/40">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTones[outcome.tone]}`}>
                <outcome.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{outcome.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-100/80">{outcome.text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl">
        <SectionTitle
          eyebrow="When to Use AI Relationship Analysis"
          title="When to Use AI Relationship Analysis"
          subtitle="From dating to breakups, it provides insights at every stage."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((item) => (
            <GlassCard key={item.title} className="h-full border-white/15 bg-slate-950/35">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTones[item.tone]}`}>
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-100/80">{item.text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl">
        <SectionTitle
          eyebrow="Personas"
          title="Pick the voice you need right now"
          subtitle="Switch tones depending on whether you want tactical advice or emotional support."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {personas.map((persona, index) => (
            <GlassCard key={persona.title} className="relative overflow-hidden border-white/15 bg-slate-950/40">
              <div className={`absolute right-4 top-4 rounded-full p-2 ${index === 0 ? iconTones.violet : iconTones.rose}`}>
                <Bot className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-semibold text-white">{persona.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-100/85">{persona.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl">
        <SectionTitle
          eyebrow="Love Guru"
          title="Meet Love Guru"
          subtitle="Your clarity copilot for partner, friend, family, manager, or anyone you are trying to understand better."
        />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <GlassCard className="h-full border-white/15 bg-slate-950/40 p-5 sm:p-6">
            <h3 className="text-xl font-semibold text-white">Built for real dynamics, not just romance</h3>
            <p className="mt-2 text-sm text-slate-100/82">
              Love Guru helps you read relationship patterns and choose your next move with more clarity and less noise.
            </p>

            <div className="mt-4 rounded-2xl border border-white/15 bg-slate-900/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Personas</p>
              <div className="mt-2 inline-flex rounded-xl border border-white/15 bg-slate-950/70 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedPersona('coach')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selectedPersona === 'coach' ? 'bg-white text-indigo-700' : 'text-slate-100/85 hover:bg-white/10'
                  }`}
                >
                  Coach
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPersona('bestie')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selectedPersona === 'bestie' ? 'bg-white text-indigo-700' : 'text-slate-100/85 hover:bg-white/10'
                  }`}
                >
                  Bestie
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-100/84">
                {selectedPersona === 'coach'
                  ? 'Structured guidance • calm mentor vibe'
                  : 'GenZ best friend • honest + supportive'}
              </p>
            </div>

            <p className="mt-3 text-xs text-cyan-100/84">After your analysis, Love Guru answers based on your patterns.</p>

            <Link
              to="/chat-analysis"
              className="mt-5 inline-flex items-center rounded-xl border border-violet-200/35 bg-gradient-to-r from-violet-300/15 via-cyan-300/15 to-rose-300/15 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/25 transition hover:brightness-110"
            >
              Try Love Guru after your first analysis
            </Link>
          </GlassCard>

          <LoveGuruMascot />
        </div>
      </section>

      <VibeMatchLandingSection sectionRef={vibeMatchRef} onJoinWaitlist={onJoinWaitlist} />

      <section className="mx-auto mt-14 max-w-6xl">
        <SectionTitle
          eyebrow="Methodology"
          title="How we generate insights"
          subtitle="A transparent process built on interpretable communication signals instead of black-box scoring."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {methodologyCards.map((item) => (
            <GlassCard key={item.title} className="h-full border-white/15 bg-slate-950/40">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTones[item.tone]}`}>
                <item.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-100/80">{item.text}</p>
            </GlassCard>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-amber-200/25 bg-amber-300/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/90">Limitations and emotional safety</p>
          <p className="mt-2 text-sm text-slate-100/85">
            Insights are based on text patterns and can miss context outside messages. If conversations involve serious distress,
            safety concerns, or legal risk, seek support from licensed professionals or appropriate services.
          </p>
        </div>
      </section>

      <section id="faqs" className="mx-auto mt-14 max-w-4xl">
        <SectionTitle
          eyebrow="FAQs"
          title="Relationship Analysis FAQs"
          subtitle="Clear answers about what the system can do, where it helps most, and where human judgment still matters."
        />
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <GlassCard key={faq.question} className="border-white/15 bg-slate-950/40 p-0">
                <h3>
                  <button
                    id={`faq-trigger-${index}`}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-white"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? 'rotate-180 text-cyan-100' : 'text-slate-300'}`} />
                  </button>
                </h3>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${index}`}
                  hidden={!isOpen}
                  className="px-5 pb-4"
                >
                  <p className="text-sm leading-relaxed text-slate-100/80">{faq.answer}</p>
                </div>
              </GlassCard>
            )
          })}
        </div>
      </section>

      <footer className="mx-auto mt-14 max-w-6xl rounded-2xl border border-white/15 bg-slate-950/45 px-6 py-8 text-center backdrop-blur-xl">
        <p className="text-sm text-slate-100/85">Made for modern relationships, situationships, and everything in between.</p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-cyan-100/75">(c) 2026 Third Person AI</p>
      </footer>

      <PrivacySafetyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      {showMobileWaitlistCta ? (
        <div className="fixed inset-x-4 bottom-4 z-[85] md:hidden">
          <button
            type="button"
            onClick={onJoinWaitlist}
            className="w-full rounded-full border border-fuchsia-100/40 bg-gradient-to-r from-fuchsia-300/28 via-rose-300/22 to-cyan-300/20 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-fuchsia-900/35 backdrop-blur"
          >
            Join Vibe Match waitlist
          </button>
        </div>
      ) : null}
      <Modal
        isOpen={isWaitlistLoginOpen}
        onClose={() => setIsWaitlistLoginOpen(false)}
        title="Sign in to join the waitlist"
        labelledBy="landing-waitlist-login"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-sm text-slate-100/85">
          <p>Sign in to join the waitlist with your account email.</p>
          <button
            type="button"
            onClick={() => {
              setIsWaitlistLoginOpen(false)
              navigate('/auth/signin', { state: { from: '/' } })
            }}
            className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            Sign in
          </button>
        </div>
      </Modal>
    </main>
  )
}
