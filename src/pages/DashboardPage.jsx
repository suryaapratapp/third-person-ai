import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity,
  Copy,
  Download,
  HeartHandshake,
  MessageSquare,
  Scale,
  Share2,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import ReflectionNotes from '../components/dashboard/ReflectionNotes'
import ShareInsightModal from '../components/dashboard/ShareInsightModal'
import EventDetailsDrawer from '../components/dashboard/EventDetailsDrawer'
import WordCloudPanel from '../components/dashboard/WordCloudPanel'
import { useAuth } from '../context/AuthContext'
import { useDemoMode } from '../context/DemoModeContext'
import { usePrivacy } from '../context/PrivacyContext'
import {
  deleteAnalysis,
  exportAnalysis,
  getAnalysis,
  listAnalyses,
  setLastOpenedAnalysisId,
} from '../services/analysisServiceApi'
import {
  getIntent,
  getIntentLabel,
  getDashboardWindowPreference,
  isValidDashboardWindow,
  setDashboardWindowPreference,
} from '../services/preferencesService'

const windowOptions = [
  { value: 'early', label: '7d' },
  { value: 'recent', label: '30d' },
  { value: 'all', label: 'All' },
]

const timeBlockLabels = ['Late night', 'Early morning', 'Morning', 'Afternoon', 'Evening', 'Night']

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0))
}

function toPersonMap(names = []) {
  const map = new Map()
  names.forEach((name, index) => {
    map.set(name, `Person ${String.fromCharCode(65 + index)}`)
  })
  return map
}

function computeVolatility(sentimentTimeline = []) {
  if (!sentimentTimeline.length) return 10
  const values = sentimentTimeline.map((item) => Number(item.value || 0))
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function getOverallSentimentLabel(sentimentTimeline = []) {
  if (!sentimentTimeline.length) return 'Beta'
  const avg = sentimentTimeline.reduce((sum, item) => sum + Number(item.value || 0), 0) / sentimentTimeline.length
  if (avg >= 65) return 'Mostly warm'
  if (avg >= 48) return 'Mixed but workable'
  return 'Tense phases'
}

function toScoreLabel(metricId, score) {
  if (metricId === 'compatibility') {
    if (score >= 75) return 'Strong'
    if (score >= 55) return 'Mixed'
    return 'Needs care'
  }
  if (metricId === 'stability') {
    if (score >= 72) return 'Steady'
    if (score >= 55) return 'Up and down'
    return 'Hot and cold'
  }
  if (metricId === 'effort') {
    if (score >= 72) return 'Balanced'
    if (score >= 55) return 'Uneven'
    return 'Ghost risk'
  }
  if (score >= 72) return 'Clear'
  if (score >= 55) return 'Mixed'
  return 'Fuzzy'
}

function toSparkline(score, sentimentTimeline = []) {
  if (sentimentTimeline.length) {
    return sentimentTimeline.slice(0, 6).map((item) => clamp(item.value))
  }
  return [clamp(score - 10), clamp(score - 4), clamp(score + 2), clamp(score)]
}

function getEngagementBalance(participants = []) {
  if (participants.length < 2) return 62
  const sorted = [...participants].sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0))
  const a = sorted[0]?.messageCount || 0
  const b = sorted[1]?.messageCount || 0
  const total = a + b || 1
  const diff = Math.abs((a / total) - (b / total))
  return clamp(Math.round(100 - diff * 120), 18, 96)
}

function getClarityScore(analysis) {
  const messageCount = Number(analysis?.importSummary?.stats?.messageCount || 0)
  const volatility = computeVolatility(analysis?.sentimentTimeline || [])
  const base = 78 - volatility * 2.6
  const countBoost = messageCount ? Math.min(14, Math.log10(messageCount + 1) * 4) : 0
  return clamp(Math.round(base + countBoost), 20, 95)
}

function toAttachmentTag(compatibility, stability, effort) {
  if (compatibility >= 72 && stability >= 68 && effort >= 62) return 'Style: Balanced (beta)'
  if (stability < 48 && effort < 52) return 'Style: Hot and cold (beta)'
  if (effort < 45) return 'Style: Pulling away (beta)'
  return 'Style: Intense (beta)'
}

function buildScoreboard(analysis, participants) {
  const compatibility = clamp(analysis.compatibilityScore || 0)
  const volatility = computeVolatility(analysis.sentimentTimeline || [])
  const stability = clamp(Math.round(100 - volatility * 3.3), 20, 96)
  const effort = getEngagementBalance(participants)
  const clarity = getClarityScore(analysis)
  const attachmentTag = toAttachmentTag(compatibility, stability, effort)

  return [
    {
      id: 'compatibility',
      title: 'Compatibility Score',
      score: compatibility,
      label: toScoreLabel('compatibility', compatibility),
      icon: HeartHandshake,
      sparkline: toSparkline(compatibility, analysis.sentimentTimeline || []),
    },
    {
      id: 'stability',
      title: 'Emotional Stability',
      score: stability,
      label: toScoreLabel('stability', stability),
      icon: Activity,
      sparkline: toSparkline(stability, analysis.sentimentTimeline || []),
    },
    {
      id: 'effort',
      title: 'Effort Balance',
      score: effort,
      label: toScoreLabel('effort', effort),
      icon: Scale,
      sparkline: toSparkline(effort, analysis.sentimentTimeline || []),
    },
    {
      id: 'clarity',
      title: 'Communication Clarity',
      score: clarity,
      label: toScoreLabel('clarity', clarity),
      icon: MessageSquare,
      sparkline: toSparkline(clarity, analysis.sentimentTimeline || []),
    },
    {
      id: 'attachment',
      title: 'Attachment Signal',
      score: null,
      label: attachmentTag,
      icon: Zap,
      sparkline: toSparkline(Math.round((compatibility + stability + effort) / 3), analysis.sentimentTimeline || []),
    },
  ]
}

function adjustDataByWindow(data, windowKey) {
  const safe = Array.isArray(data) ? data : []
  if (!safe.length) return []
  if (windowKey === 'early') return safe.slice(0, Math.max(3, Math.round(safe.length * 0.35)))
  if (windowKey === 'recent') return safe.slice(Math.max(0, safe.length - Math.max(4, Math.round(safe.length * 0.65))))
  return safe
}

function mapParticipantsForUI(participants, hideNames) {
  if (!Array.isArray(participants)) return []
  if (!hideNames) return participants
  return participants.map((item, index) => ({
    ...item,
    name: `Person ${String.fromCharCode(65 + index)}`,
  }))
}

function formatRange(startDateISO, endDateISO) {
  if (!startDateISO || !endDateISO) return 'Unknown'
  const start = new Date(startDateISO)
  const end = new Date(endDateISO)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Unknown'
  return `${start.toLocaleDateString()} -> ${end.toLocaleDateString()}`
}

function maskMessageText(text) {
  return String(text || '')
    .replace(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/g, '[redacted-phone]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { enabled: demoModeEnabled } = useDemoMode()
  const { hideNames } = usePrivacy()
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [windowKey, setWindowKey] = useState('recent')
  const [sharePayload, setSharePayload] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [revealRelatedMessages, setRevealRelatedMessages] = useState(false)
  const [timelineMode, setTimelineMode] = useState('mood')
  const [deepDiveOpen, setDeepDiveOpen] = useState(false)
  const [copyState, setCopyState] = useState('')

  const analysisId = searchParams.get('analysisId')
  const intentLabel = getIntentLabel(getIntent(user?.email || null))

  useEffect(() => {
    let active = true

    async function loadData() {
      setIsLoading(true)
      setLoadError('')
      try {
        if (analysisId) {
          const item = await getAnalysis(analysisId)
          if (!active) return
          setAnalysis(item)
        } else {
          const latest = (await listAnalyses())[0] || null
          if (!active) return
          setAnalysis(latest)
        }
      } catch (error) {
        if (!active) return
        setAnalysis(null)
        setLoadError(error?.error?.message || 'Unable to load dashboard right now.')
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [analysisId])

  useEffect(() => {
    const queryWindowRaw = searchParams.get('window')
    const queryWindow = queryWindowRaw === 'peak' ? 'recent' : queryWindowRaw
    if (isValidDashboardWindow(queryWindow)) {
      setWindowKey(queryWindow)
      setDashboardWindowPreference(queryWindow)
      return
    }

    const storedRaw = getDashboardWindowPreference()
    const stored = storedRaw === 'peak' ? 'recent' : storedRaw
    const fallback = stored || 'recent'
    setWindowKey(fallback)
    const next = new URLSearchParams(searchParams)
    next.set('window', fallback)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!analysis?.id) return
    setLastOpenedAnalysisId(analysis.id)
  }, [analysis?.id])

  const demoInsights = analysis?.demoInsights || {}
  const participantMap = useMemo(
    () => toPersonMap((analysis?.importSummary?.participants || []).filter(Boolean)),
    [analysis?.importSummary?.participants],
  )

  const participants = useMemo(() => {
    const sourceParticipants = demoInsights.engagement?.participants || []
    const mapped = sourceParticipants.map((item, index) => ({
      ...item,
      name: hideNames ? `Person ${String.fromCharCode(65 + index)}` : item.name,
    }))
    return mapped
  }, [demoInsights.engagement?.participants, hideNames])

  const scoreboard = useMemo(() => {
    if (!analysis) return []
    return buildScoreboard(analysis, participants)
  }, [analysis, participants])

  const engagementSeries = useMemo(() => {
    const rows = adjustDataByWindow(demoInsights.engagement?.engagementOverTime || [], windowKey)
    if (!rows.length) return []
    return rows.map((row) => {
      const next = { week: row.week }
      participants.forEach((participant) => {
        const key = hideNames ? participant.name : participant.name
        next[key] = Number(row[participant.name] || row[key] || 0)
      })
      return next
    })
  }, [demoInsights.engagement?.engagementOverTime, hideNames, participants, windowKey])

  const heatmapRows = useMemo(() => {
    const rows = adjustDataByWindow(demoInsights.engagement?.weeklyHeatmap || [], windowKey)
    if (rows.length) return rows
    return []
  }, [demoInsights.engagement?.weeklyHeatmap, windowKey])

  const compatibility = demoInsights.compatibility || {
    score: analysis?.compatibilityScore || 0,
    label: 'Beta',
    summary: 'Compatibility narrative is generating.',
    strengths: [],
    challenges: [],
    growth: [],
  }

  const sentimentBuckets = useMemo(() => {
    const rows = adjustDataByWindow(demoInsights.sentiment?.buckets || [], windowKey)
    if (rows.length) {
      return rows.map((item) => ({
        point: item.week,
        sentiment: Math.round(50 + Number(item.sentiment || 0) * 14),
        volume: item.totalMessages || 0,
      }))
    }
    return (analysis?.sentimentTimeline || []).map((item) => ({
      point: item.label,
      sentiment: Number(item.value || 0),
      volume: 0,
    }))
  }, [analysis?.sentimentTimeline, demoInsights.sentiment?.buckets, windowKey])

  const majorEvents = useMemo(() => {
    const rows = safeArray(demoInsights.majorEvents)
    return rows.map((event, index) => ({
      ...event,
      id: event.id || `event_${index + 1}`,
      event: event.event || `Event ${index + 1}`,
      summary: event.summary || 'Summary pending',
      dateApprox: event.dateApprox || 'Date unavailable',
      relatedMessages: safeArray(event.relatedMessages).map((message) => ({
        ...message,
        speaker: hideNames
          ? (participantMap.get(message.speaker) || `Person ${String.fromCharCode(65 + (participantMap.size % 26))}`)
          : message.speaker,
      })),
    }))
  }, [demoInsights.majorEvents, hideNames, participantMap])

  const personalityRows = useMemo(() => {
    const rows = safeArray(demoInsights.personality)
    return rows.map((item, index) => ({
      ...item,
      participant: hideNames ? `Person ${String.fromCharCode(65 + index)}` : item.participant,
      dimensions: safeArray(item.dimensions),
      strengthTags: safeArray(item.strengthTags),
      weaknessTags: safeArray(item.weaknessTags),
    }))
  }, [demoInsights.personality, hideNames])

  const wordCloudRows = useMemo(() => {
    return safeArray(demoInsights.wordClouds).map((item, index) => ({
      name: hideNames ? `Person ${String.fromCharCode(65 + index)}` : item.name,
      words: safeArray(item.words),
    }))
  }, [demoInsights.wordClouds, hideNames])

  const receipts = useMemo(() => {
    if (!analysis) return []
    return [
      { id: 'vibe', label: 'Our vibe is', value: getOverallSentimentLabel(analysis.sentimentTimeline || []) },
      { id: 'style', label: 'Communication style', value: compatibility.label || 'Beta' },
      { id: 'score', label: 'Compatibility', value: `${analysis.compatibilityScore || 0}%` },
      { id: 'pattern', label: 'Top pattern', value: compatibility.strengths?.[0]?.title || 'Signal building' },
    ]
  }, [analysis, compatibility.label, compatibility.strengths])

  const askLoveGuru = (insight, prompt) => {
    if (!analysis?.id) return
    const payload = {
      analysisId: analysis.id,
      source: 'dashboard',
      insight,
      title: insight,
      keyPoints: [
        compatibility.summary || 'Demo insight',
        `Window: ${windowOptions.find((item) => item.value === windowKey)?.label || '30d'}`,
      ],
    }
    try {
      localStorage.setItem('loveGuruContext', JSON.stringify(payload))
      localStorage.setItem('loveGuruDraftMessage', prompt)
    } catch {
      // no-op
    }
    navigate(`/love-guru?analysisId=${analysis.id}&source=dashboard&insight=${encodeURIComponent(insight)}`)
  }

  const handleDelete = async () => {
    if (!analysis?.id) return
    await deleteAnalysis(analysis.id)
    setIsDeleteModalOpen(false)
    navigate('/chat-analysis', { replace: true })
  }

  const handleExportJson = async () => {
    if (!analysis?.id) return
    const payload = await exportAnalysis(analysis.id)
    if (!payload) return
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${analysis.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleCopySummary = async () => {
    const text = receipts.map((item) => `${item.label}: ${item.value}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopyState('Copied')
    } catch {
      setCopyState('Copy failed')
    }
    window.setTimeout(() => setCopyState(''), 1500)
  }

  if (isLoading) {
    return (
      <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <section className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <GlassCard key={`dash-skeleton-${index}`} className="border-white/15 bg-slate-950/45 p-5">
              <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-8 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-white/10" />
            </GlassCard>
          ))}
        </section>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-6xl">
          <GlassCard className="border-white/15 bg-slate-950/45 p-6">
            <p className="text-sm text-rose-200">{loadError}</p>
          </GlassCard>
        </section>
      </main>
    )
  }

  if (!analysis) {
    return (
      <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <GlassCard className="border-white/15 bg-slate-950/45 p-6 text-center sm:p-8">
            <h1 className="text-2xl font-semibold text-white">No analysis yet</h1>
            <p className="mt-3 text-sm text-slate-100/80">Run your first analysis to unlock this dashboard.</p>
            <Link
              to="/chat-analysis"
              className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100"
            >
              Go to Chat Analysis
            </Link>
          </GlassCard>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100/85">Dashboard</p>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Your conversation decode</h1>
              <p className="mt-2 text-sm text-slate-100/80">
                Source: {analysis.sourceApp}. Date range: {formatRange(
                  analysis.importSummary?.stats?.startDateISO,
                  analysis.importSummary?.stats?.endDateISO,
                )}
              </p>
              {intentLabel ? (
                <p className="mt-1 text-sm text-cyan-100/90">Insights tailored to: {intentLabel}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {demoModeEnabled ? (
                <span className="rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-medium text-amber-100">
                  Demo Mode - experimental
                </span>
              ) : null}
              <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                {analysis.demoInsights?.copy?.welcome || 'Insights are pattern-based and non-diagnostic.'}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="w-full sm:w-56">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-100/70">Conversation duration</span>
              <select
                value={windowKey}
                onChange={(event) => {
                  const next = event.target.value
                  if (!isValidDashboardWindow(next)) return
                  setWindowKey(next)
                  setDashboardWindowPreference(next)
                  const query = new URLSearchParams(searchParams)
                  query.set('window', next)
                  setSearchParams(query, { replace: true })
                }}
                className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-white outline-none"
              >
                {windowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => askLoveGuru('analysis-summary', 'Break down my top insights and what I should do next.')}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Ask Love Guru
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:bg-white/15"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200/30 bg-rose-300/10 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-300/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete analysis
              </button>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Relationship Scoreboard</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {scoreboard.map((metric) => (
              <div key={metric.id} className="rounded-xl border border-white/15 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-100/70">{metric.title}</p>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-cyan-100">
                    <metric.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-xl font-semibold text-white">
                  {metric.score === null ? metric.label : `${metric.score}%`}
                </p>
                <p className="mt-1 text-xs text-slate-100/75">{metric.score === null ? 'Signal tag' : metric.label}</p>
                <div className="mt-3 flex items-end gap-1.5">
                  {metric.sparkline.map((point, index) => (
                    <span
                      key={`${metric.id}-${index}`}
                      className="flex-1 rounded-sm bg-gradient-to-t from-cyan-300/15 to-cyan-100/65"
                      style={{ height: `${Math.max(8, Math.round((point / 100) * 34))}px` }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => askLoveGuru(metric.id, `Explain my ${metric.title.toLowerCase()} and what I should do next.`)}
                  className="mt-3 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  Ask Love Guru
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Engagement Analysis</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/15 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Message count by person</p>
              <div className="mt-3 space-y-3">
                {participants.length ? participants.map((item, index) => {
                  const max = Math.max(...participants.map((row) => row.messageCount || 1))
                  const width = `${Math.max(8, Math.round(((item.messageCount || 0) / max) * 100))}%`
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-xs text-slate-100/80">
                        <span>{item.name}</span>
                        <span>{item.messageCount || 0}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-950/75">
                        <div
                          className={`h-2 rounded-full ${index % 2 === 0 ? 'bg-rose-300/80' : 'bg-sky-300/80'}`}
                          style={{ width }}
                        />
                      </div>
                    </div>
                  )
                }) : (
                  <p className="text-xs text-slate-100/70">Participant metrics are loading.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/15 bg-slate-900/60 p-4 lg:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Engagement over time</p>
              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        color: '#e2e8f0',
                      }}
                    />
                    {participants.map((item, index) => (
                      <Line
                        key={`engagement-${item.name}`}
                        type="monotone"
                        dataKey={item.name}
                        stroke={index % 2 === 0 ? '#f9a8d4' : '#7dd3fc'}
                        strokeWidth={2.4}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/15 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Weekly heatmap</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-[11px] uppercase tracking-[0.16em] text-slate-100/60">Day</th>
                    {timeBlockLabels.map((block) => (
                      <th key={block} className="pb-2 text-center text-[11px] uppercase tracking-[0.16em] text-slate-100/60">
                        {block}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapRows.length ? heatmapRows.map((row) => (
                    <tr key={row.day}>
                      <td className="py-1 text-xs font-medium text-slate-100/80">{row.day}</td>
                      {safeArray(row.blocks).map((cell, index) => {
                        const alpha = Math.min(0.92, Math.max(0.14, (cell.count || 0) / 16))
                        return (
                          <td key={`${row.day}-${index}`} className="px-1 py-1">
                            <div
                              className="h-7 rounded-md border border-white/10"
                              style={{ backgroundColor: `rgba(56, 189, 248, ${alpha})` }}
                              title={`${row.day} ${cell.block}: ${cell.count || 0}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="py-2 text-xs text-slate-100/70">Heatmap data is loading.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Compatibility Analysis</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="h-2 w-52 overflow-hidden rounded-full bg-slate-900/70">
              <div className="h-2 rounded-full bg-gradient-to-r from-rose-300/80 via-violet-300/80 to-cyan-300/80" style={{ width: `${clamp(compatibility.score)}%` }} />
            </div>
            <p className="text-sm font-semibold text-cyan-100">{clamp(compatibility.score)}% • {compatibility.label || 'Beta'}</p>
          </div>
          <p className="mt-3 rounded-xl border border-cyan-200/25 bg-cyan-300/10 p-3 text-sm text-cyan-100/95">
            {compatibility.summary || 'Compatibility summary is generating.'}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-200/25 bg-emerald-300/10 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/85">Strengths</p>
              <ul className="mt-2 space-y-2 text-sm text-emerald-100/95">
                {safeArray(compatibility.strengths).length ? safeArray(compatibility.strengths).slice(0, 4).map((item) => (
                  <li key={item.title}>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs">{item.detail}</p>
                  </li>
                )) : <li className="text-xs">Beta</li>}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200/25 bg-amber-300/10 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-amber-100/85">Potential Challenges</p>
              <ul className="mt-2 space-y-2 text-sm text-amber-100/95">
                {safeArray(compatibility.challenges).length ? safeArray(compatibility.challenges).slice(0, 4).map((item) => (
                  <li key={item.title}>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs">{item.detail}</p>
                  </li>
                )) : <li className="text-xs">Beta</li>}
              </ul>
            </div>
            <div className="rounded-xl border border-cyan-200/25 bg-cyan-300/10 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/85">Growth Opportunities</p>
              <ul className="mt-2 space-y-2 text-sm text-cyan-100/95">
                {safeArray(compatibility.growth).length ? safeArray(compatibility.growth).slice(0, 4).map((item) => (
                  <li key={item.title}>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs">{item.detail}</p>
                  </li>
                )) : <li className="text-xs">Beta</li>}
              </ul>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Major Events</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/15 bg-slate-900/60">
            <table className="w-full min-w-[700px] border-collapse">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-slate-100/70">Date</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-slate-100/70">Event</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.16em] text-slate-100/70">Summary</th>
                  <th className="px-3 py-2 text-right text-[11px] uppercase tracking-[0.16em] text-slate-100/70">Action</th>
                </tr>
              </thead>
              <tbody>
                {majorEvents.length ? majorEvents.map((event) => (
                  <tr key={event.id} className="border-b border-white/5 last:border-b-0">
                    <td className="px-3 py-2 text-xs text-slate-100/75">{event.dateApprox}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-white">{event.event}</td>
                    <td className="px-3 py-2 text-xs text-slate-100/80">{event.summary}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event)
                          setRevealRelatedMessages(false)
                        }}
                        className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100 transition hover:bg-cyan-300/20"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-xs text-slate-100/70">No major events found yet (demo).</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Detailed Sentiment Analysis</h2>
            <div className="inline-flex rounded-full border border-white/15 bg-slate-900/65 p-1">
              <button
                type="button"
                onClick={() => setTimelineMode('mood')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  timelineMode === 'mood' ? 'bg-white text-indigo-700' : 'text-slate-100/85'
                }`}
              >
                Mood
              </button>
              <button type="button" disabled className="cursor-not-allowed rounded-full px-3 py-1 text-xs font-medium text-slate-100/50">
                Effort
              </button>
              <button type="button" disabled className="cursor-not-allowed rounded-full px-3 py-1 text-xs font-medium text-slate-100/50">
                Conflict
              </button>
            </div>
          </div>
          <div className="mt-3 h-60 rounded-xl border border-white/10 bg-slate-900/55 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sentimentBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="point" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                  }}
                />
                <Line type="monotone" dataKey="sentiment" stroke="#38bdf8" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="volume" stroke="#f9a8d4" strokeWidth={1.8} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 rounded-xl border border-white/15 bg-slate-900/60 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/80">Notable markers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {safeArray(demoInsights.sentiment?.timelineMarkers).length ? safeArray(demoInsights.sentiment.timelineMarkers).slice(0, 8).map((marker) => (
                <span
                  key={`${marker.dateApprox}-${marker.label}`}
                  className="rounded-full border border-violet-200/30 bg-violet-300/10 px-2.5 py-1 text-xs text-violet-100"
                >
                  {marker.dateApprox}: {marker.label}
                </span>
              )) : <span className="text-xs text-slate-100/70">Markers are generating.</span>}
            </div>
            <p className="mt-3 text-sm text-slate-100/80">{demoInsights.sentiment?.narrative || 'Sentiment narrative is generating.'}</p>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Personality Analysis</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {personalityRows.length ? personalityRows.map((profile) => (
              <div key={profile.participant} className="rounded-xl border border-white/15 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{profile.participant}</p>
                  <p className="text-lg font-semibold text-cyan-100">{profile.archetypeCode || 'Beta'}</p>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {safeArray(profile.dimensions).slice(0, 10).map((dimension) => (
                    <div key={`${profile.participant}-${dimension.key}`} className="rounded-lg border border-white/10 bg-slate-950/55 p-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-100/80">
                        <span>{dimension.key}</span>
                        <span>{Math.round(Number(dimension.value || 0))}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-900/70">
                        <div className="h-1.5 rounded-full bg-cyan-300/75" style={{ width: `${clamp(dimension.value)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-100/80">Strengths</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {safeArray(profile.strengthTags).slice(0, 6).map((tag) => (
                      <span key={tag} className="rounded-full border border-emerald-200/30 bg-emerald-300/10 px-2 py-0.5 text-[11px] text-emerald-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-amber-100/80">Weaknesses</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {safeArray(profile.weaknessTags).slice(0, 6).map((tag) => (
                      <span key={tag} className="rounded-full border border-amber-200/30 bg-amber-300/10 px-2 py-0.5 text-[11px] text-amber-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-100/82">{profile.narrative || 'Personality narrative is generating.'}</p>
              </div>
            )) : (
              <div className="rounded-xl border border-white/15 bg-slate-900/60 p-4 text-sm text-slate-100/75">
                Personality analysis is generating.
              </div>
            )}
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Word Clouds</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSharePayload({
                  title: 'Private relationship snapshot',
                  subtitle: `Compatibility ${analysis.compatibilityScore || 0}%`,
                  details: receipts.map((item) => `${item.label}: ${item.value}`),
                })}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-slate-100 transition hover:bg-white/15"
              >
                <Share2 className="h-3.5 w-3.5" />
                Download card
              </button>
              <button
                type="button"
                onClick={() => void handleCopySummary()}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/20"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy summary
              </button>
              {copyState ? <span className="text-xs text-slate-100/80">{copyState}</span> : null}
            </div>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {wordCloudRows.length ? wordCloudRows.map((row) => (
              <WordCloudPanel key={row.name} title={row.name} words={row.words} />
            )) : (
              <>
                <WordCloudPanel title="Participant A" words={[]} />
                <WordCloudPanel title="Participant B" words={[]} />
              </>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-white/15 bg-slate-900/60 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/80">Receipts (private)</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {receipts.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 bg-slate-950/55 p-2">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-100/65">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setDeepDiveOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-slate-900/60 px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-white">Deep Dive (for nerds)</p>
              <p className="mt-1 text-xs text-slate-100/70">Lower-level metrics and legacy outputs.</p>
            </div>
            <span className="text-xs text-slate-100/75">{deepDiveOpen ? 'Hide' : 'Show'}</span>
          </button>
          {deepDiveOpen ? (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/15 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/80">MBTI</p>
                <p className="mt-2 text-sm text-slate-100/85">
                  {analysis.mbti?.personA || 'Unknown'} / {analysis.mbti?.personB || 'Unknown'}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/80">Response patterns</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-100/85">
                  {safeArray(analysis.responsePatterns).slice(0, 4).map((item) => (
                    <li key={item.label}>{item.label}: {item.value}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/15 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/80">Viral moments</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-100/85">
                  {safeArray(analysis.viralMoments).slice(0, 3).map((item) => (
                    <li key={item.title}>{item.title}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </GlassCard>
      </section>

      <ReflectionNotes analysisId={analysis.id} />

      <ShareInsightModal payload={sharePayload} onClose={() => setSharePayload(null)} />
      <EventDetailsDrawer
        isOpen={Boolean(selectedEvent)}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        revealMessages={revealRelatedMessages}
        onToggleRevealMessages={() => setRevealRelatedMessages((value) => !value)}
        hideNames={hideNames}
      />
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete analysis"
        labelledBy="delete-analysis-title"
        maxWidthClass="max-w-md"
      >
        <p className="text-sm text-slate-100/85">
          This removes this analysis and related notes from this device.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-lg border border-rose-200/30 bg-rose-300/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/20"
          >
            Delete
          </button>
        </div>
      </Modal>
    </main>
  )
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}
