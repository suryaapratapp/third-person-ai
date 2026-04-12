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
  if (!node) return

  let ticking = false

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect()
        setShowMobileWaitlistCta(rect.top <= 72)
        ticking = false
      })
      ticking = true
    }
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
    <div className="min-h-screen flex flex-col">
    <main className="px-4  pt-8 sm:px-6 lg:px-8">
 <section className="relative w-full flex items-center justify-center py-16 sm:py-20">
      
      {/* Background Glow Effects */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute left-1/4 bottom-1/3 h-72 w-72 rounded-full bg-pink-400/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl text-center">
        
        {/* Product Name */}
        <h1 className="tracking-tight font-['Poppins']">
          <span className="block text-4xl font-bold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
            THIRD PERSON
          </span>
        </h1>

        {/* Tagline */}
        <p className="mt-6 text-base text-slate-300 sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
          An AI that helps you step outside your own perspective — understand
          relationships, decode patterns, and make clearer decisions.
        </p>

        {/* Emotional Layer */}
        <p className="mt-4 text-sm text-slate-400 sm:text-base">
          Clarity in chaos. Perspective in moments that matter.
        </p>

        {/* Divider */}
        <div className="mt-8 h-px w-24 mx-auto bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        {/* Call-to-Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          to="/chat-analysis"
          className="inline-flex items-center justify-center rounded-full 
          border border-white/20 px-6 py-3 text-sm font-semibold text-white
          transition-all duration-300
          bg-cyan-700
          hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.6)]"
        >
          Analyze your chats
        </Link>

        <Link
          to="/vibe-check"
          className="inline-flex items-center justify-center rounded-full 
          border border-white/20 px-6 py-3 text-sm font-semibold text-white
          transition-all duration-300
          hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.6)]"
        >
          Vibe Check
        </Link>
     
        </div>
      </div>
    </section>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
  <div className="flex flex-col items-center gap-8 sm:gap-10 lg:flex-row lg:items-center">

    {/* LEFT CONTENT */}
    <div className="flex-1 text-center lg:text-left">
      {/* <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100/85">
        Third Person AI
      </p> */}

      {/* Heading */}
      <h1 className="mt-3 leading-tight flex flex-col gap-3">
        <span className="block text-4xl font-semibold text-white sm:text-5xl lg:text-6xl">
          See your relationship
        </span>
        <span className="block text-2xl font-medium text-cyan-300 sm:text-4xl lg:text-5xl">
          From a third perspective
        </span>
      </h1>

      {/* Subtext */}
      <p className="mt-4 max-w-lg text-sm text-slate-100/80 sm:mx-auto sm:text-base lg:mx-0">
        Third Person AI reads patterns in your chats so you can understand what is happening,
        what to do next, and what to stop overthinking.
      </p>

      {/* Buttons */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
        <Link
          to="/chat-analysis"
          className="inline-flex items-center justify-center rounded-full 
          border border-white/20 px-6 py-3 text-sm font-semibold text-white
          transition-all duration-300
          bg-cyan-700
          hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.6)]"
        >
          Analyze your chats
        </Link>

        <Link
          to="/vibe-check"
          className="inline-flex items-center justify-center rounded-full 
          border border-white/20 px-6 py-3 text-sm font-semibold text-white
          transition-all duration-300
          hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.6)]"
        >
          Vibe Check
        </Link>
      </div>

      {/* Privacy */}
      <div className="mt-3 flex justify-center lg:justify-start">
        <button
          type="button"
          onClick={() => setIsPrivacyOpen(true)}
          className="text-xs text-slate-100/70 underline-offset-4 transition hover:underline hover:text-white"
        >
          Privacy & Safety
        </button>
      </div>
    </div>

    {/* RIGHT BOX (future media) */}
    <div className="flex-1 flex items-center justify-center">
      <GlassCard className="relative w-full max-w-md h-[220px] sm:h-[260px] lg:h-[320px] border-white/15 bg-slate-950/45 overflow-hidden">
        
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-4 right-4 h-16 w-16 rounded-full border border-white/20 bg-white/5" />

        {/* Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
          Your video / image here
        </div>
      </GlassCard>
    </div>

  </div>
</section>
{/* How it works*/}
      <section
  id="how-it-works"
  className="relative mx-auto min-h-screen max-w-7xl px-4 py-16 flex flex-col justify-center"
>
  {/* Background glow (modern feel) */}
  {/* <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
  </div> */}

  {/* Section Title */}
  <div className="text-center">
    <SectionTitle
      eyebrow="How It Works"
      title="From screenshots to shared understanding"
      // subtitle="A simple three-step flow built for mobile-first speed and emotional context."
    />
  </div>

  {/* Steps */}
  <div className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">
    {steps.map((step, index) => (
      <div key={step.title} className="relative flex flex-col items-center lg:flex-1">

        {/* Card */}
        <GlassCard
          className="group relative w-full h-full border-white/15 bg-slate-950/40 p-6 sm:p-8
          transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        >
          {/* Step badge */}
          <div className="absolute -top-3 left-6 rounded-full border border-cyan-200/30 bg-slate-900 px-3 py-1 text-xs text-cyan-200">
            Step {index + 1}
          </div>

          <h3 className="mt-4 text-lg font-semibold text-white sm:text-xl">
            {step.title}
          </h3>

          <p className="mt-3 text-sm leading-relaxed text-slate-100/80 sm:text-base">
            {step.text}
          </p>

          {/* subtle glow on hover */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute inset-0 rounded-xl bg-cyan-400/5 blur-xl" />
          </div>
        </GlassCard>

        {/* Arrows */}
        {index < steps.length - 1 && (
  <>
    {/* Desktop arrow (center-right of card) */}
    <ArrowRight
      className="hidden lg:block absolute top-1/2 -right-6 -translate-y-1/2 h-5 w-5 text-cyan-200/70"
    />

    {/* Mobile arrow (below card) */}
    <ArrowDown className="mt-4 h-5 w-5 text-cyan-200/70 lg:hidden" />
  </>
)}
      </div>
    ))}
  </div>
</section>

{/* What you get*/ }
      <section className="relative mx-auto mt-14 min-h-screen max-w-7xl px-4 py-16 flex flex-col justify-center">
  
  {/* Subtle background glow */}
  {/* <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl" />
  </div> */}

  {/* Title */}
  <div className="text-center">
    <SectionTitle
      eyebrow="What You Get"
      // title="Every report is designed to help you act, repair, or move forward with intention."
      // title="Insights that feel human, not robotic"
      subtitle="Every report is designed to help you act, repair, or move forward with intention."
    />
  </div>

  {/* Cards */}
  <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {outcomes.map((outcome) => (
      <GlassCard
        key={outcome.name}
        className="group relative h-full border-white/15 bg-slate-950/40 p-6 sm:p-7
        transition-all duration-300 
        hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
      >
        {/* Icon */}
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTones[outcome.tone]}
          transition-transform duration-300 group-hover:scale-110`}
        >
          <outcome.icon className="h-5 w-5" />
        </span>

        {/* Title */}
        <h3 className="mt-4 text-base font-semibold text-white sm:text-lg">
          {outcome.name}
        </h3>

        {/* Text */}
        <p className="mt-2 text-sm leading-relaxed text-slate-100/80 sm:text-base">
          {outcome.text}
        </p>

        {/* Glow effect on hover */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 rounded-xl bg-violet-400/5 blur-xl" />
        </div>
      </GlassCard>
    ))}
  </div>

</section>

{/*When to use */}
      <section className="relative mx-auto mt-14 min-h-screen max-w-7xl px-4 py-16 flex flex-col justify-center">

  {/* Background glow */}
  {/* <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-rose-400/10 blur-3xl" />
  </div> */}

  {/* Title */}
  <div className="text-center">
    <SectionTitle
      eyebrow="When to Use AI Relationship Analysis"
      // title="When to Use AI Relationship Analysis"
      subtitle="From dating to breakups, it provides insights at every stage."
    />
  </div>

  {/* Cards */}
  <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {useCases.map((item) => (
      <GlassCard
        key={item.title}
        className="group relative h-full border-white/15 bg-slate-950/35 p-6 sm:p-7
        transition-all duration-300
        hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
      >
        {/* Icon */}
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTones[item.tone]}
          transition-transform duration-300 group-hover:scale-110`}
        >
          <item.icon className="h-5 w-5" />
        </span>

        {/* Title */}
        <h3 className="mt-3 text-base font-semibold text-white sm:text-lg">
          {item.title}
        </h3>

        {/* Text */}
        <p className="mt-2 text-sm leading-relaxed text-slate-100/80 sm:text-base">
          {item.text}
        </p>

        {/* Hover glow */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 rounded-xl bg-rose-400/5 blur-xl" />
        </div>
      </GlassCard>
    ))}
  </div>

</section>

{/*Persona */}
     <section className="relative mx-auto mt-14 min-h-screen max-w-7xl px-4 py-16 flex flex-col justify-center">

  {/* Background glow */}
  {/* <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl" />
  </div> */}

  {/* Title */}
  <div className="text-center">
    <SectionTitle
      eyebrow="Personas"
      title="Pick the voice you need right now"
      subtitle="Switch tones depending on whether you want tactical advice or emotional support."
    />
  </div>

  {/* Cards */}
  <div className="mt-12 grid gap-6 sm:grid-cols-2">
    {personas.map((persona, index) => (
      <GlassCard
        key={persona.title}
        className="group relative flex h-[260px] sm:h-[300px] items-center justify-between overflow-visible border-white/15 bg-slate-950/40 p-6 sm:p-8
        transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
      >

        {/* LEFT CONTENT */}
        <div className="z-10 flex h-full max-w-[60%] flex-col justify-start">

  {/* TOP TITLE (EMPHASIZED) */}
  <h3
    className={`text-xl sm:text-2xl font-semibold tracking-tight
    ${index === 0 
      ? "text-violet-300 font-serif"   // The Coach
      : "text-rose-300 font-serif"}     // The Bestie
    `}
  >
    {persona.title}
  </h3>

  {/* DESCRIPTION */}
  <p className="mt-4 text-sm leading-relaxed text-slate-100/85 sm:text-base">
    {persona.description}
  </p>

</div>

        {/* RIGHT AVATAR PLACEHOLDER */}
        <div className="relative flex h-full w-[40%] items-center justify-center">
          
          {/* fake avatar */}
          <div className="relative h-28 w-28 sm:h-36 sm:w-36 transition-all duration-300 group-hover:scale-150 group-hover:-translate-y-2">

           <img
            src={index === 0 ? "/coach-removebg-preview.png" : "/bestie-removebg-preview.png"}
            alt={persona.title}
            className="
              h-full w-full object-contain
              transform

              scale-[1.3] sm:scale-[1.5]   /* smaller on mobile */

              transition-transform duration-500 ease-out

              group-hover:scale-[1.5] sm:group-hover:scale-[1.7]
              group-hover:-translate-y-2 sm:group-hover:-translate-y-4
            "
          />

         </div>

         {/* glow behind avatar */}
           {/* <div className="absolute h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-white/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" /> */}
         </div>

        {/* subtle hover glow */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 rounded-xl bg-violet-400/5 blur-xl" />
        </div>

      </GlassCard>
    ))}
  </div>

</section>

{/*LOve guru */}
      <section className="relative mx-auto mt-14 min-h-screen max-w-7xl px-4 py-16 flex flex-col justify-center">

  {/* Background glow */}
  {/* <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
  </div> */}

  {/* Title */}
  <div className="text-center">
    <SectionTitle
      eyebrow="Meet"
      title={
        <>
         <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent text-5xl sm:text-6xl lg:text-7xl">Love Guru</span>
        </>
      }
      subtitle="Love Guru helps you read relationship patterns and choose your next move with more clarity and less noise."
    />
  </div>

  {/* Content */}
  <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">

    {/* LEFT CARD */}
    <GlassCard className="group relative h-full border-white/15 bg-slate-950/40 p-6 sm:p-8 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">

      <h3 className="text-xl sm:text-2xl font-semibold text-white">
        {/* Built for real dynamics, not just romance */}
      </h3>

      {/* Persona selector */}
      <div className="mt-6 rounded-2xl border border-white/15 bg-slate-900/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">
          Personas
        </p>

        <div className="mt-3 inline-flex rounded-xl border border-white/15 bg-slate-950/70 p-1">
          <button
            type="button"
            onClick={() => setSelectedPersona('coach')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              selectedPersona === 'coach'
                ? 'bg-white text-indigo-700 shadow-md'
                : 'text-slate-100/85 hover:bg-white/10'
            }`}
          >
            Coach
          </button>

          <button
            type="button"
            onClick={() => setSelectedPersona('bestie')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              selectedPersona === 'bestie'
                ? 'bg-white text-indigo-700 shadow-md'
                : 'text-slate-100/85 hover:bg-white/10'
            }`}
          >
            Bestie
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-100/84">
          {selectedPersona === 'coach'
            ? 'Structured guidance • calm mentor vibe'
            : 'GenZ best friend • honest + supportive'}
        </p>
      </div>

      <p className="mt-4 text-xs text-cyan-100/84">
        After your analysis, Love Guru answers based on your patterns.
      </p>

      <Link
        to="/chat-analysis"
        className="mt-6 inline-flex items-center justify-center rounded-xl 
        border border-white/20 px-5 py-3 text-sm font-semibold text-white
        transition-all duration-300
        hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.5)]"
      >
        Try Love Guru after your first analysis
      </Link>

      {/* subtle hover glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 rounded-xl bg-cyan-400/5 blur-xl" />
      </div>
    </GlassCard>

    {/* RIGHT VISUAL */}
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md">
        <LoveGuruMascot />
      </div>
    </div>

  </div>
</section>

{/* How We Generate */}
<section className="relative w-full min-h-screen flex items-center">

  {/* Background glow */}
  {/* <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
  </div> */}

  {/* Inner container */}
  <div className="mx-auto w-full max-w-7xl px-4 py-16">

    {/* Title */}
    <div className="text-center">
      <SectionTitle
        eyebrow="Methodology"
        title="How we generate insights"
        subtitle="A transparent process built on interpretable communication signals instead of black-box scoring."
      />
    </div>

    {/* Cards */}
    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {methodologyCards.map((item) => (
        <GlassCard
          key={item.title}
          className="group relative h-full border-white/15 bg-slate-950/40 p-5 sm:p-6
          transition-all duration-300
          hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
        >
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTones[item.tone]}
            transition-transform duration-300 group-hover:scale-110`}
          >
            <item.icon className="h-5 w-5" />
          </span>

          <h3 className="mt-4 text-base font-semibold text-white sm:text-lg">
            {item.title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-slate-100/80 sm:text-base">
            {item.text}
          </p>

          {/* Hover glow */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute inset-0 rounded-xl bg-amber-400/5 blur-xl" />
          </div>
        </GlassCard>
      ))}
    </div>

    {/* Limitations box */}
    <div className="mt-10 rounded-xl border border-amber-200/25 bg-amber-300/10 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/90">
        Limitations and emotional safety
      </p>

      <p className="mt-3 text-sm text-slate-100/85 sm:text-base">
        Insights are based on text patterns and can miss context outside messages. If conversations involve serious distress,
        safety concerns, or legal risk, seek support from licensed professionals or appropriate services.
      </p>
    </div>

  </div>
</section>

      <VibeMatchLandingSection sectionRef={vibeMatchRef} onJoinWaitlist={onJoinWaitlist} />

      

      <section id="faqs" className="mx-auto mt-14 w-full max-w-4xl px-4 sm:px-6 pb-6">
  <SectionTitle
    eyebrow="FAQs"
    title="Relationship Analysis FAQs"
    subtitle="Clear answers about what the system can do, where it helps most, and where human judgment still matters."
  />

  <div className="space-y-3">
    {faqs.map((faq, index) => {
      const isOpen = openFaq === index

      return (
        <GlassCard
          key={faq.question}
          className="border-white/15 bg-slate-950/40 p-0 transition-all duration-300 hover:bg-white/5"
        >
          {/* Question */}
          <h3>
            <button
              id={`faq-trigger-${index}`}
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${index}`}
              onClick={() => setOpenFaq(isOpen ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-sm sm:text-base font-medium text-white"
            >
              <span>{faq.question}</span>

              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                  isOpen ? 'rotate-180 text-cyan-300' : 'text-slate-300'
                }`}
              />
            </button>
          </h3>

          {/* Answer (Animated) */}
          <div
            id={`faq-panel-${index}`}
            role="region"
            aria-labelledby={`faq-trigger-${index}`}
            className={`grid transition-all duration-300 ease-in-out
              ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
            `}
          >
            <div className="overflow-hidden">
              <div className="px-5 pb-4 max-w-2xl">
                <p className="text-sm sm:text-base leading-relaxed text-cyan-300">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      )
    })}
  </div>
</section>


    

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
     <footer className="relative w-full mt-20 border-t border-white/10 bg-slate-950/60 backdrop-blur-xl">

  {/* Container */}
  <div className="mx-auto max-w-7xl px-6 py-12 ">

    {/* Top Section */}
    <div className="flex flex-col gap-10 md:flex-row md:justify-between md:items-start">

      {/* Brand */}
      <div className="max-w-sm">
        <h3 className="text-xl font-semibold text-white">
          Third Person AI
        </h3>
        <p className="mt-3 text-sm text-slate-100/80">
          See your relationships from a clearer perspective. Built for modern relationships, situationships, and everything in between.
        </p>
      </div>

      {/* Links */}
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">

        {/* Product */}
        <div>
          <p className="text-sm font-semibold text-white">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-100/75">
            <li><a href="#" className="hover:text-white transition">Chat Analysis</a></li>
            <li><a href="#" className="hover:text-white transition">Vibe Check</a></li>
            <li><a href="#" className="hover:text-white transition">Love Guru</a></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <p className="text-sm font-semibold text-white">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-100/75">
            <li><a href="#" className="hover:text-white transition">About</a></li>
            <li><a href="#" className="hover:text-white transition">Contact</a></li>
            <li><a href="#" className="hover:text-white transition">Privacy</a></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <p className="text-sm font-semibold text-white">Support</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-100/75">
            <li><a href="#" className="hover:text-white transition">FAQs</a></li>
            <li><a href="#" className="hover:text-white transition">Help Center</a></li>
          </ul>
        </div>

      </div>
    </div>

    {/* Divider */}
    <div className="mt-10 border-t border-white/10 pt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

      {/* Copyright */}
      <p className="text-xs text-slate-100/70">
        © 2026 Third Person AI. All rights reserved.
      </p>

      {/* Social Icons */}
      <div className="flex items-center gap-4">

        <a href="#" className="group">
          <div className="p-2 rounded-full bg-white/5 transition group-hover:bg-white/10 group-hover:shadow-[0_0_12px_rgba(255,255,255,0.4)]">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 5.8a8.5 8.5 0 01-2.4.6 4.2 4.2 0 001.8-2.3 8.3 8.3 0 01-2.6 1A4.1 4.1 0 0015.5 4c-2.3 0-4.1 1.9-4.1 4.2 0 .3 0 .6.1.9A11.7 11.7 0 013 4.8a4.2 4.2 0 001.3 5.6 4 4 0 01-1.9-.5v.1c0 2 1.4 3.7 3.3 4.1a4 4 0 01-1.8.1c.5 1.6 2.1 2.8 4 2.8A8.3 8.3 0 012 19.5a11.6 11.6 0 006.3 1.9c7.5 0 11.6-6.3 11.6-11.7v-.5A8.4 8.4 0 0022 5.8z"/>
            </svg>
          </div>
        </a>

        <a href="#" className="group">
          <div className="p-2 rounded-full bg-white/5 transition group-hover:bg-white/10 group-hover:shadow-[0_0_12px_rgba(255,255,255,0.4)]">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.8 0-5 2.2-5 5v14c0 2.8 2.2 5 5 5h14c2.8 0 5-2.2 5-5v-14c0-2.8-2.2-5-5-5zm-7 19c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7zm0-11.5c-2.5 0-4.5 2-4.5 4.5S9.5 16.5 12 16.5s4.5-2 4.5-4.5S14.5 7.5 12 7.5zm4.8-2.3c-.6 0-1.1-.5-1.1-1.1S16.2 3 16.8 3s1.1.5 1.1 1.1-.5 1.1-1.1 1.1z"/>
            </svg>
          </div>
        </a>

        <a href="#" className="group">
          <div className="p-2 rounded-full bg-white/5 transition group-hover:bg-white/10 group-hover:shadow-[0_0_12px_rgba(255,255,255,0.4)]">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4h-16c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-12c0-1.1-.9-2-2-2zm-10 10l-6-4 6-4v8zm2 0v-8l6 4-6 4z"/>
            </svg>
          </div>
        </a>

      </div>
    </div>

  </div>
</footer>
    </div>
  )
}