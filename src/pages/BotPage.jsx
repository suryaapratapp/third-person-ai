import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bot, MessageSquare, Pencil, Send, ShieldCheck, Sparkles, Trash2, UserRound, X } from 'lucide-react'
import DemoAiUnavailableModal from '../components/DemoAiUnavailableModal'
import DemoModeInfoModal from '../components/DemoModeInfoModal'
import GlassCard from '../components/GlassCard'
import HowItWorksPanel from '../components/bot/HowItWorksPanel'
import ToneSelector from '../components/bot/ToneSelector'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useDemoMode } from '../context/DemoModeContext'
import { usePrivacy } from '../context/PrivacyContext'
import {
  getBotPersonaPreference,
  getBotTonePreference,
  getIntent,
  getIntentLabel,
  setBotPersonaPreference,
  setBotTonePreference,
} from '../services/preferencesService'
import { getAnalysis, getLastOpenedAnalysisId } from '../services/analysisServiceApi'
import {
  createDemoThread,
  getDemoThreadMessages,
  listDemoThreads,
  sendDemoLoveGuruThreadMessage,
} from '../services/demoAiService'
import { createThread, getMessages, listThreads, sendMessage } from '../services/loveGuruServiceApi'

function getThreadMetaStoreKey(analysisId, userId) {
  return `third_person_thread_meta_${userId || 'default'}_${analysisId || 'none'}`
}

function loadThreadMeta(analysisId, userId) {
  try {
    const raw = localStorage.getItem(getThreadMetaStoreKey(analysisId, userId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveThreadMeta(analysisId, userId, nextMeta) {
  try {
    localStorage.setItem(getThreadMetaStoreKey(analysisId, userId), JSON.stringify(nextMeta))
  } catch {
    // no-op
  }
}

const personas = [
  {
    id: 'coach',
    label: 'Coach',
    description: 'Mentor energy',
  },
  {
    id: 'bestie',
    label: 'Bestie',
    description: 'GenZ bestie energy',
  },
]

function toSafeContext(raw, hideNames) {
  if (!raw || typeof raw !== 'object') return null

  const points = Array.isArray(raw.keyPoints) ? raw.keyPoints.slice(0, 3).map((item) => String(item)) : []
  const source = raw.source === 'key-moment' ? 'Key Moment' : 'Dashboard'
  const title = String(raw.title || 'Insight')

  if (!hideNames) {
    return { ...raw, sourceLabel: source, title, keyPoints: points }
  }

  const normalizedPoints = points.map((item) =>
    item
      .replace(/\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g, 'Person A')
      .replace(/\b[A-Z][a-z]+\b/g, (match) => (match === 'Dashboard' || match === 'Moment' ? match : 'Person A')),
  )

  return {
    ...raw,
    sourceLabel: source,
    title,
    keyPoints: normalizedPoints,
  }
}

export default function BotPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const {
    enabled: demoModeEnabled,
    consent: demoModeConsent,
    setConsent: setDemoModeConsent,
    setEnabled: setDemoModeEnabled,
  } = useDemoMode()
  const { hideNames } = usePrivacy()
  const userId = user?.email ?? null
  const [persona, setPersona] = useState(() => getBotPersonaPreference())
  const [tone, setTone] = useState(() => getBotTonePreference())
  const [intent, setIntent] = useState(() => getIntent(userId))
  const [message, setMessage] = useState('')
  const [context, setContext] = useState(null)
  const [threadId, setThreadId] = useState('')
  const [threads, setThreads] = useState([])
  const [threadMeta, setThreadMeta] = useState({})
  const [editingThreadId, setEditingThreadId] = useState('')
  const [editingThreadName, setEditingThreadName] = useState('')
  const [messages, setMessages] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState('')
  const [isMockMode, setIsMockMode] = useState(false)
  const [isDemoInfoOpen, setIsDemoInfoOpen] = useState(false)
  const [demoConsentRequired, setDemoConsentRequired] = useState(false)
  const [pendingSendAfterConsent, setPendingSendAfterConsent] = useState('')
  const [demoFailureState, setDemoFailureState] = useState({ open: false, message: '', draft: '' })

  useEffect(() => {
    setBotPersonaPreference(persona)
  }, [persona])

  useEffect(() => {
    setBotTonePreference(tone)
  }, [tone])

  useEffect(() => {
    setIntent(getIntent(userId))
  }, [userId])

  useEffect(() => {
    if (!demoModeEnabled || !demoModeConsent || !pendingSendAfterConsent || isSending) return
    const messageToSend = pendingSendAfterConsent
    setPendingSendAfterConsent('')
    setDemoConsentRequired(false)
    setIsDemoInfoOpen(false)
    setMessage(messageToSend)
    void handleSend(messageToSend)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoModeEnabled, demoModeConsent, pendingSendAfterConsent, isSending])

  useEffect(() => {
    let parsedContext = null

    try {
      const rawContext = localStorage.getItem('loveGuruContext')
      if (rawContext) {
        parsedContext = JSON.parse(rawContext)
      }
    } catch {
      parsedContext = null
    }

    const fromQuery = {
      analysisId: searchParams.get('analysisId') || null,
      source: searchParams.get('source') || parsedContext?.source || null,
      insight: searchParams.get('insight') || parsedContext?.insight || null,
      title: parsedContext?.title || null,
      keyPoints: parsedContext?.keyPoints || [],
    }

    if (fromQuery.source || fromQuery.insight || fromQuery.title) {
      setContext(toSafeContext(fromQuery, hideNames))
    } else {
      setContext(null)
    }

    try {
      const draft = localStorage.getItem('loveGuruDraftMessage')
      if (draft && !message.trim()) {
        setMessage(draft)
      }
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, hideNames])

  const activeAnalysisId =
    searchParams.get('analysisId') || context?.analysisId || getLastOpenedAnalysisId() || ''
  const requestedThreadId = searchParams.get('threadId') || ''

  useEffect(() => {
    setThreadMeta(loadThreadMeta(activeAnalysisId, userId))
  }, [activeAnalysisId, userId])

  useEffect(() => {
    let active = true

    async function loadThreads() {
      if (!activeAnalysisId) {
        setThreads([])
        setThreadId('')
        setMessages([])
        return
      }

      try {
        const meta = loadThreadMeta(activeAnalysisId, userId)
        setThreadMeta(meta)

        const threadList = demoModeEnabled
          ? listDemoThreads(activeAnalysisId)
          : await listThreads(activeAnalysisId)
        if (!active) return

        const visibleThreads = threadList.filter((thread) => !meta?.[thread.id]?.deleted)
        setThreads(visibleThreads)

        const selectedThread = visibleThreads.find((thread) => thread.id === requestedThreadId) || visibleThreads[0]
        if (!selectedThread) {
          setThreadId('')
          setMessages([])
          if (requestedThreadId) {
            const next = new URLSearchParams(searchParams)
            next.delete('threadId')
            setSearchParams(next, { replace: true })
          }
          return
        }

        if (requestedThreadId && !visibleThreads.some((thread) => thread.id === requestedThreadId)) {
          const next = new URLSearchParams(searchParams)
          next.delete('threadId')
          setSearchParams(next, { replace: true })
        }

        setThreadId(selectedThread.id)
        const threadMessages = demoModeEnabled
          ? getDemoThreadMessages(selectedThread.id)
          : await getMessages(selectedThread.id)
        if (!active) return
        setMessages(threadMessages)
      } catch (error) {
        if (!active) return
        const status = error?.error?.status
        if (status === 404) {
          setThreadId('')
          setThreads([])
          setMessages([])
          setChatError('')
          return
        }
        setChatError(error?.error?.message || 'Unable to load chat history right now.')
      }
    }

    void loadThreads()
    return () => {
      active = false
    }
  }, [activeAnalysisId, demoModeEnabled, requestedThreadId, setSearchParams, userId])

  useEffect(() => {
    let active = true

    async function loadMode() {
      try {
        const health = await apiFetch('/health', { method: 'GET' })
        if (!active) return
        setIsMockMode(health?.analysisMode === 'mock')
      } catch {
        if (active) setIsMockMode(false)
      }
    }

    void loadMode()
    return () => {
      active = false
    }
  }, [])

  const intentLabel = useMemo(() => getIntentLabel(intent), [intent])

  const quickActions = useMemo(() => {
    if (!context) return []
    return [
      {
        id: 'explain',
        label: 'Ask for explanation',
        prompt: `Explain this ${context.source === 'key-moment' ? 'key moment' : 'dashboard insight'} in plain terms and what signals matter most.`,
      },
      {
        id: 'next-steps',
        label: 'Ask for next steps',
        prompt: 'Give me three practical next steps I can take this week based on this context.',
      },
      {
        id: 'message-draft',
        label: 'Ask for a message to send',
        prompt: 'Draft a message I can send that is clear, calm, and aligned with my goals.',
      },
    ]
  }, [context])

  const clearContext = () => {
    setContext(null)
    try {
      localStorage.removeItem('loveGuruContext')
      localStorage.removeItem('loveGuruDraftMessage')
    } catch {
      // no-op
    }
  }

  const resolveThreadName = (thread, index) => {
    const customName = threadMeta?.[thread.id]?.name
    if (customName) return customName
    return `Thread ${index + 1}`
  }

  const startRenameThread = (thread, index) => {
    setEditingThreadId(thread.id)
    setEditingThreadName(resolveThreadName(thread, index))
  }

  const saveRenameThread = () => {
    if (!editingThreadId) return
    const nextMeta = {
      ...threadMeta,
      [editingThreadId]: {
        ...(threadMeta[editingThreadId] || {}),
        name: editingThreadName.trim() || undefined,
      },
    }
    setThreadMeta(nextMeta)
    saveThreadMeta(activeAnalysisId, userId, nextMeta)
    setEditingThreadId('')
    setEditingThreadName('')
  }

  const handleDeleteThread = (threadIdToDelete) => {
    const nextMeta = {
      ...threadMeta,
      [threadIdToDelete]: {
        ...(threadMeta[threadIdToDelete] || {}),
        deleted: true,
      },
    }
    setThreadMeta(nextMeta)
    saveThreadMeta(activeAnalysisId, userId, nextMeta)
    const nextThreads = threads.filter((thread) => thread.id !== threadIdToDelete)
    setThreads(nextThreads)
    if (threadId === threadIdToDelete) {
      setThreadId(nextThreads[0]?.id || '')
      setMessages([])
    }
  }

  const handleSelectThread = async (nextThreadId) => {
    setThreadId(nextThreadId)
    setChatError('')
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('threadId', nextThreadId)
    setSearchParams(nextParams, { replace: true })
    try {
      const threadMessages = demoModeEnabled
        ? getDemoThreadMessages(nextThreadId)
        : await getMessages(nextThreadId)
      setMessages(threadMessages)
    } catch (error) {
      const status = error?.error?.status
      if (status === 404) {
        setThreadId('')
        setMessages([])
        const next = new URLSearchParams(searchParams)
        next.delete('threadId')
        setSearchParams(next, { replace: true })
        return
      }
      setChatError(error?.error?.message || 'Unable to load selected thread.')
    }
  }

  const handleSend = async (overrideMessage, options = {}) => {
    const trimmed = String(overrideMessage ?? message).trim()
    const useDemoMode = demoModeEnabled && !options.forceMock
    if (!trimmed || isSending) return
    if (!activeAnalysisId) {
      setChatError('Open an analysis from Dashboard to start Love Guru chat.')
      return
    }

    if (useDemoMode && !demoModeConsent) {
      setPendingSendAfterConsent(trimmed)
      setDemoConsentRequired(true)
      setIsDemoInfoOpen(true)
      return
    }

    setChatError('')
    setIsSending(true)

    try {
      let currentThreadId = threadId

      if (!currentThreadId) {
        const thread = useDemoMode
          ? createDemoThread({
            analysisId: activeAnalysisId,
            persona,
            tone,
          })
          : await createThread({
            analysisId: activeAnalysisId,
            persona,
            tone,
          })
        currentThreadId = thread.id
        setThreadId(thread.id)
        setThreads((prev) => [thread, ...prev])
      }

      const result = useDemoMode
        ? await sendDemoLoveGuruThreadMessage({
          threadId: currentThreadId,
          analysis: await getAnalysis(activeAnalysisId),
          userMessage: trimmed,
          persona,
          tone,
        })
        : await sendMessage(currentThreadId, trimmed)
      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage])
      setMessage('')
    } catch (error) {
      if (useDemoMode) {
        setDemoFailureState({
          open: true,
          message: error?.message || 'Demo AI unavailable right now.',
          draft: trimmed,
        })
        setChatError('Demo AI unavailable right now.')
        return
      }

      const status = error?.error?.status
      if (status === 404) {
        setThreadId('')
        setMessages([])
        setChatError('This thread is no longer available. Start a new chat.')
        return
      }
      setChatError(error?.error?.message || 'Unable to send message right now.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl space-y-4">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Love Guru</p>
          {demoModeEnabled ? (
            <p className="mt-2 inline-flex rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">
              Demo Mode - replies are experimental
            </p>
          ) : null}
          {!demoModeEnabled && isMockMode ? (
            <p className="mt-2 inline-flex rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">
              Demo mode (no OpenAI used)
            </p>
          ) : null}
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Conversation Guidance Workspace</h1>
          <p className="mt-2 text-sm text-slate-100/80">Use persona and tone controls to set how guidance is framed before chatting.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Use my intent: {intentLabel ?? 'No intent selected'}
            </span>
            {!intentLabel ? (
              <Link
                to="/chat-analysis"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/15"
              >
                Set intent in Chat Analysis
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setIntent(getIntent(userId))}
              className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/15"
            >
              Refresh intent
            </button>
            {demoModeEnabled ? (
              <button
                type="button"
                onClick={() => {
                  setDemoConsentRequired(false)
                  setIsDemoInfoOpen(true)
                }}
                className="inline-flex items-center rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100 transition hover:bg-amber-300/20"
              >
                Demo Mode info
              </button>
            ) : null}
          </div>
        </GlassCard>

        {context ? (
          <GlassCard className="border-white/15 bg-slate-950/45 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Context</p>
                <p className="mt-1 text-sm font-semibold text-white">From: {context.sourceLabel || 'Dashboard'}</p>
                <p className="mt-1 text-sm text-slate-100/80">{context.title || 'Selected insight'}</p>
              </div>
              <button
                type="button"
                onClick={clearContext}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs text-slate-100 transition hover:bg-white/15"
              >
                <X className="h-3.5 w-3.5" />
                Clear context
              </button>
            </div>
            {context.keyPoints?.length ? (
              <ul className="mt-3 space-y-1.5 text-sm text-slate-100/80">
                {context.keyPoints.map((point) => (
                  <li key={point} className="rounded-lg border border-white/10 bg-slate-900/55 px-3 py-2">
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
            {quickActions.length ? (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-100/80">Start from</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setMessage(action.prompt)}
                      className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/15"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </GlassCard>
        ) : null}

        <HowItWorksPanel />

        <GlassCard className="border-white/15 bg-slate-950/45 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-slate-900/55 p-3">
              <p className="text-sm font-semibold text-white">Persona</p>
              <div className="mt-3 inline-flex rounded-xl border border-white/15 bg-slate-950/70 p-1">
                {personas.map((option) => {
                  const active = persona === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPersona(option.id)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        active ? 'bg-white text-indigo-700' : 'text-slate-100/85 hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-xs text-slate-100/75">{personas.find((item) => item.id === persona)?.description}</p>
            </div>

            <ToneSelector value={tone} onChange={setTone} />
          </div>
        </GlassCard>

        <GlassCard className="border-white/15 bg-slate-950/45 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-white/15 bg-slate-900/55 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Threads</p>
                <span className="text-[11px] text-slate-100/70">{threads.length}</span>
              </div>
              {threads.length ? (
                <div className="mt-3 space-y-2">
                  {threads.map((thread, index) => {
                    const isActive = thread.id === threadId
                    const updatedAt = thread.updatedAt || thread.createdAt
                    return (
                      <div key={thread.id} className={`rounded-lg border p-2 ${isActive ? 'border-cyan-200/40 bg-cyan-300/10' : 'border-white/10 bg-slate-950/55'}`}>
                        {editingThreadId === thread.id ? (
                          <div className="space-y-2">
                            <input
                              value={editingThreadName}
                              onChange={(event) => setEditingThreadName(event.target.value)}
                              className="h-8 w-full rounded-md border border-white/15 bg-slate-900/70 px-2 text-xs text-white outline-none ring-cyan-200/60 transition focus:ring"
                            />
                            <div className="flex gap-1">
                              <button type="button" onClick={saveRenameThread} className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white">Save</button>
                              <button type="button" onClick={() => setEditingThreadId('')} className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-100/85">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleSelectThread(thread.id)}
                              className="w-full text-left"
                            >
                              <p className="truncate text-xs font-semibold text-white">{resolveThreadName(thread, index)}</p>
                              <p className="mt-1 text-[11px] text-slate-100/65">{updatedAt ? `Updated ${new Date(updatedAt).toLocaleString()}` : 'Updated recently'}</p>
                            </button>
                            <div className="mt-2 flex gap-1">
                              <button
                                type="button"
                                onClick={() => startRenameThread(thread, index)}
                                className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-slate-100/85"
                              >
                                <Pencil className="h-3 w-3" />
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteThread(thread.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-200/30 bg-rose-300/10 px-2 py-1 text-[11px] text-rose-100"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-100/70">No threads yet. Send a first message to create one.</p>
              )}
            </aside>

            <div>
              <div className="flex items-start gap-3 rounded-xl border border-white/15 bg-slate-900/55 p-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-300/15 text-violet-100">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">Love Guru</p>
                    <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-medium text-cyan-100">
                      Persona: {persona === 'coach' ? 'Coach' : 'Bestie'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-100/80">
                    I'll tailor this conversation to: {intentLabel ?? 'your selected context once intent is set'}. Current style: {persona === 'coach' ? 'Coach' : 'Bestie'} with a {tone} tone.
                  </p>
                </div>
              </div>

              {!threadId && !messages.length ? (
                <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-slate-900/45 p-6 text-center">
                  <MessageSquare className="mx-auto h-6 w-6 text-cyan-100/90" />
                  <p className="mt-2 text-sm font-semibold text-white">Start a chat with Love Guru</p>
                  <p className="mt-1 text-xs text-slate-100/75">Send your first prompt and we will create a new thread for this analysis.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {!messages.length ? (
                    <div className="flex justify-start">
                      <div className="max-w-[90%] rounded-xl border border-cyan-200/25 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                        We can map options and likely outcomes first, then draft a message aligned to your intent.
                      </div>
                    </div>
                  ) : null}

                  {messages.map((item) => (
                    <div key={item.id} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed sm:max-w-[88%] ${
                          item.role === 'user'
                            ? 'border border-white/20 bg-white/10 text-slate-100'
                            : 'border border-cyan-200/25 bg-cyan-300/10 text-cyan-100'
                        }`}
                      >
                        {item.content}
                      </div>
                    </div>
                  ))}
                  {isSending ? (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/25 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-100" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-100 [animation-delay:120ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-100 [animation-delay:240ms]" />
                        Love Guru is thinking...
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/15 bg-slate-900/55 p-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-200">
                  <UserRound className="h-4 w-4" />
                </span>
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder="Type your message..."
                  className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isSending}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-slate-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {chatError ? <p className="mt-2 text-xs text-rose-200">{chatError}</p> : null}
              {context ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-100/85">
                  <Sparkles className="h-3.5 w-3.5" />
                  Draft prefilled from dashboard context.
                </p>
              ) : null}
            </div>
          </div>
        </GlassCard>
      </section>
      <DemoModeInfoModal
        isOpen={isDemoInfoOpen}
        onClose={() => {
          if (demoConsentRequired && !demoModeConsent) return
          setIsDemoInfoOpen(false)
          setDemoConsentRequired(false)
          setPendingSendAfterConsent('')
        }}
        consentAlreadyGiven={demoModeConsent}
        requireConsent={demoConsentRequired}
        onAcceptConsent={() => {
          setDemoModeConsent(true)
        }}
      />
      <DemoAiUnavailableModal
        isOpen={demoFailureState.open}
        message={demoFailureState.message}
        onRetry={() => {
          const draft = demoFailureState.draft
          setDemoFailureState({ open: false, message: '', draft: '' })
          void handleSend(draft)
        }}
        onUseMockMode={() => {
          const draft = demoFailureState.draft
          setDemoFailureState({ open: false, message: '', draft: '' })
          setDemoModeEnabled(false)
          void handleSend(draft, { forceMock: true })
        }}
        onClose={() => setDemoFailureState({ open: false, message: '', draft: '' })}
      />
    </main>
  )
}
