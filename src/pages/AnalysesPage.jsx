import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarClock, Download, FolderOpen, Pencil, RotateCcw, Search, ShieldCheck, Trash2 } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import MessagingAppIcon from '../components/MessagingAppIcon'
import {
  deleteAllAnalyses,
  deleteAnalysis,
  exportAnalysisJson,
  getLastOpenedAnalysisId,
  listAnalyses,
  setLastOpenedAnalysisId,
  updateAnalysis,
} from '../services/analysisServiceApi'
import { INTENT_VALUES, getIntentLabel } from '../services/preferencesService'

const APP_OPTIONS = ['ALL', 'whatsapp', 'imessage', 'telegram', 'instagram', 'messenger', 'snapchat']
const STATUS_OPTIONS = ['ALL', 'READY', 'ANALYZING', 'FAILED']
const TAG_OPTIONS = ['Dating', 'Long-term', 'Breakup', 'Situationship', 'Communication', 'Trust', 'Conflict']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'mostMessages', label: 'Most messages' },
]

function toAppLabel(value) {
  if (!value) return 'Unknown source'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDateRange(startDateISO, endDateISO) {
  if (!startDateISO || !endDateISO) return 'Date range unavailable'
  const start = new Date(startDateISO)
  const end = new Date(endDateISO)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Date range unavailable'
  return `${start.toLocaleDateString()} -> ${end.toLocaleDateString()}`
}

function StatusBadge({ status }) {
  const styles = {
    READY: 'border-cyan-200/30 bg-cyan-300/10 text-cyan-100',
    ANALYZING: 'border-amber-200/30 bg-amber-300/10 text-amber-100',
    FAILED: 'border-rose-200/30 bg-rose-300/10 text-rose-100',
  }

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles[status] || styles.READY}`}>{status || 'READY'}</span>
}

function ConfirmDeleteModal({ item, onCancel, onConfirm }) {
  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-analysis-title">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-5 shadow-2xl shadow-black/50">
        <h2 id="delete-analysis-title" className="text-lg font-semibold text-white">Delete recap?</h2>
        <p className="mt-2 text-sm text-slate-100/80">
          This removes this recap, its notes, and Love Guru context for this recap from this device.
        </p>

        <div className="mt-4 rounded-xl border border-white/15 bg-slate-950/55 p-3 text-sm text-slate-100/80">
          <p>{item.title}</p>
          <p className="text-xs text-slate-100/70">{new Date(item.createdAt).toLocaleString()}</p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(item.id)}
            className="rounded-lg border border-rose-200/30 bg-rose-300/10 px-3 py-1.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20"
          >
            Delete recap
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmDeleteAllModal({ isOpen, input, onInputChange, onCancel, onConfirm }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-all-title">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-5 shadow-2xl shadow-black/50">
        <h2 id="delete-all-title" className="text-lg font-semibold text-white">Delete all recaps?</h2>
        <p className="mt-2 text-sm text-slate-100/80">
          This clears all recap records, notes, and related Love Guru context from this device.
        </p>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-100/70">
          Type DELETE to confirm
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={input !== 'DELETE'}
            onClick={onConfirm}
            className="rounded-lg border border-rose-200/30 bg-rose-300/10 px-3 py-1.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete all
          </button>
        </div>
      </div>
    </div>
  )
}

function ExportModal({ item, onClose, onExportJson }) {
  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-5 shadow-2xl shadow-black/50">
        <h2 id="export-title" className="text-lg font-semibold text-white">Export recap</h2>
        <p className="mt-2 text-sm text-slate-100/80">Choose an export format for this recap.</p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="w-full rounded-xl border border-white/15 bg-slate-950/55 p-3 text-left"
            disabled
          >
            <p className="text-sm font-semibold text-white">Export Summary (PDF)</p>
            <p className="mt-1 text-xs text-slate-100/70">Coming soon</p>
          </button>

          <button
            type="button"
            onClick={() => onExportJson(item.id)}
            className="w-full rounded-xl border border-cyan-200/35 bg-cyan-300/10 p-3 text-left transition hover:bg-cyan-300/20"
          >
            <p className="text-sm font-semibold text-cyan-100">Export Insights (JSON)</p>
            <p className="mt-1 text-xs text-cyan-100/80">Includes metadata, dashboard insights, key moments, and privacy settings.</p>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/15"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AnalysesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pageNotice = typeof location.state?.notice === 'string' ? location.state.notice : ''
  const fromVibeCheck = searchParams.get('from') === 'vibe-check'
  const [version, setVersion] = useState(0)
  const [search, setSearch] = useState('')
  const [appFilter, setAppFilter] = useState('ALL')
  const [intentFilter, setIntentFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sort, setSort] = useState('newest')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deleteAllInput, setDeleteAllInput] = useState('')
  const [exportTarget, setExportTarget] = useState(null)
  const [editingId, setEditingId] = useState('')
  const [titleDraft, setTitleDraft] = useState('')
  const [allAnalyses, setAllAnalyses] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [lastOpened, setLastOpened] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setIsLoading(true)
      setLoadError('')
      try {
        const [all, filtered] = await Promise.all([
          listAnalyses(),
          listAnalyses({
            search,
            app: appFilter,
            intent: intentFilter,
            status: statusFilter,
            sort,
          }),
        ])

        if (!active) return
        setAllAnalyses(all)
        setAnalyses(filtered)

        const lastId = getLastOpenedAnalysisId()
        if (!lastId) {
          setLastOpened(null)
        } else {
          const match = all.find((item) => item.id === lastId)
          setLastOpened(match ?? null)
        }
      } catch (error) {
        if (!active) return
        setLoadError(error?.error?.message || 'Unable to load recaps right now.')
        setAllAnalyses([])
        setAnalyses([])
        setLastOpened(null)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [appFilter, intentFilter, search, sort, statusFilter, version])

  const clearFilters = () => {
    setSearch('')
    setAppFilter('ALL')
    setIntentFilter('ALL')
    setStatusFilter('ALL')
    setSort('newest')
  }

  const onOpenDashboard = (analysisId) => {
    setLastOpenedAnalysisId(analysisId)
    navigate(`/dashboard?analysisId=${analysisId}`)
  }

  const onTalkToLoveGuru = (analysisId) => {
    setLastOpenedAnalysisId(analysisId)
    navigate(`/love-guru?analysisId=${analysisId}`)
  }

  const onConfirmDelete = async (id) => {
    await deleteAnalysis(id)
    setDeleteTarget(null)
    setVersion((prev) => prev + 1)
  }

  const onConfirmDeleteAll = async () => {
    await deleteAllAnalyses()
    setDeleteAllOpen(false)
    setDeleteAllInput('')
    setVersion((prev) => prev + 1)
  }

  const onExportJson = async (id) => {
    const payload = await exportAnalysisJson(id)
    if (!payload) return

    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${id}-insights.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setExportTarget(null)
  }

  const beginRename = (item) => {
    setEditingId(item.id)
    setTitleDraft(item.title)
  }

  const commitRename = (id) => {
    const nextTitle = titleDraft.trim()
    updateAnalysis(id, { title: nextTitle || undefined })
    setEditingId('')
    setTitleDraft('')
    setVersion((prev) => prev + 1)
  }

  if (isLoading) {
    return (
      <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <GlassCard className="border-white/15 bg-slate-950/45 p-6 text-center sm:p-8">
            <p className="text-sm text-slate-100/80">Loading recaps...</p>
          </GlassCard>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <GlassCard className="border-white/15 bg-slate-950/45 p-6 text-center sm:p-8">
            <p className="text-sm text-rose-200">{loadError}</p>
          </GlassCard>
        </div>
      </main>
    )
  }

  const toggleTag = (item, tagValue) => {
    const existing = Array.isArray(item.tags) ? item.tags : []
    const hasTag = existing.includes(tagValue)

    let nextTags
    if (hasTag) {
      nextTags = existing.filter((tag) => tag !== tagValue)
    } else if (existing.length < 3) {
      nextTags = [...existing, tagValue]
    } else {
      nextTags = existing
    }

    updateAnalysis(item.id, { tags: nextTags })
    setVersion((prev) => prev + 1)
  }

  if (!allAnalyses.length) {
    return (
      <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <GlassCard className="border-white/15 bg-slate-950/45 p-6 text-center sm:p-8">
            {pageNotice ? (
              <p className="mb-3 rounded-xl border border-emerald-200/30 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
                {pageNotice}
              </p>
            ) : null}
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">Nothing here yet</h1>
            <p className="mt-3 text-sm text-slate-100/80">Once you analyze a chat, your recaps will show up here.</p>
            <p className="mt-1 text-sm text-slate-100/75">Start with a chat export or paste your conversation.</p>
            <Link
              to="/chat-analysis"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100"
            >
              <FolderOpen className="h-4 w-4" />
              Analyze a chat
            </Link>
            <Link
              to="/#how-it-works"
              className="mt-3 block text-xs text-cyan-200 hover:text-cyan-100"
            >
              How chat analysis works
            </Link>
          </GlassCard>
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          {pageNotice ? (
            <p className="mb-3 rounded-xl border border-emerald-200/30 bg-emerald-300/10 px-3 py-2 text-xs text-emerald-100">
              {pageNotice}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">Your Recaps</h1>
          <p className="mt-2 text-sm text-slate-100/80">Search, organize, and continue your saved relationship recaps.</p>

          {fromVibeCheck ? (
            <div className="mt-4 rounded-xl border border-violet-200/30 bg-violet-300/10 p-3">
              <p className="text-xs text-violet-100/85">Pick a recap to build your Vibe Check profile.</p>
            </div>
          ) : null}

          {lastOpened ? (
            <div className="mt-4 rounded-xl border border-cyan-200/30 bg-cyan-300/10 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Continue where you left off</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-cyan-100">{lastOpened.title}</p>
                <button
                  type="button"
                  onClick={() => onOpenDashboard(lastOpened.id)}
                  className="rounded-lg border border-cyan-200/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                >
                  Open last recap
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            <label className="md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-100/70">Search</span>
              <div className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-slate-950/65 px-3">
                <Search className="h-4 w-4 text-slate-100/60" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Title, participants, app"
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
            </label>

            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-100/70">App</span>
              <select
                value={appFilter}
                onChange={(event) => setAppFilter(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/65 px-3 text-sm text-white outline-none"
              >
                {APP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option === 'ALL' ? 'All' : toAppLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-100/70">Intent</span>
              <select
                value={intentFilter}
                onChange={(event) => setIntentFilter(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/65 px-3 text-sm text-white outline-none"
              >
                <option value="ALL">All</option>
                {INTENT_VALUES.map((intent) => (
                  <option key={intent} value={intent}>{getIntentLabel(intent)}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-100/70">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/65 px-3 text-sm text-white outline-none"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status === 'ALL' ? 'All' : status}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="w-full sm:w-48">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-100/70">Sort</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/65 px-3 text-sm text-white outline-none"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        {!analyses.length ? (
          <GlassCard className="border-white/15 bg-slate-950/45 p-6 text-center">
            <h2 className="text-xl font-semibold text-white">No recaps found</h2>
            <p className="mt-2 text-sm text-slate-100/80">Try a different search or clear filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/15"
            >
              Clear filters
            </button>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {analyses.map((item) => {
              const isEditing = editingId === item.id
              const participants = item.importSummary?.participants ?? [item.participants?.personA, item.participants?.personB].filter(Boolean)
              const stats = item.importSummary?.stats || {}

              return (
                <GlassCard key={item.id} className={`border-white/15 bg-slate-950/40 p-4 ${fromVibeCheck ? 'ring-1 ring-violet-300/25' : ''}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <MessagingAppIcon app={item.sourceApp} className="h-7 w-7 rounded-md" size={16} withRing={false} />

                        {isEditing ? (
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              value={titleDraft}
                              onChange={(event) => setTitleDraft(event.target.value)}
                              className="h-9 w-full rounded-lg border border-white/15 bg-slate-900/65 px-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                            />
                            <button
                              type="button"
                              onClick={() => commitRename(item.id)}
                              className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-100"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        )}

                        <StatusBadge status={item.status} />
                        {item.isDemo ? (
                          <span className="rounded-full border border-amber-200/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100">
                            Demo
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-100/75">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {new Date(item.createdAt).toLocaleString()}
                      </p>

                      <div className="mt-2 grid gap-1 text-xs text-slate-100/75 sm:grid-cols-2">
                        <p>Source: {toAppLabel(item.sourceApp)}</p>
                        <p>Messages: {stats.messageCount ?? 0}</p>
                        <p>Participants: {stats.participantCount ?? participants.length}</p>
                        <p>Date range: {formatDateRange(stats.startDateISO, stats.endDateISO)}</p>
                        <p>Intent: {getIntentLabel(item.intent) ?? 'Not set'}</p>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {item.privacy?.hideNamesUsed ? <span className="rounded-full border border-violet-200/30 bg-violet-300/10 px-2 py-0.5 text-[11px] text-violet-100">Names hidden</span> : null}
                        {item.privacy?.maskSensitiveUsed ? <span className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] text-cyan-100">Sensitive masked</span> : null}
                        {item.tags?.map((tag) => (
                          <span key={tag} className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[11px] text-slate-100/90">{tag}</span>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {TAG_OPTIONS.map((tag) => {
                          const selected = item.tags?.includes(tag)
                          const disabled = !selected && (item.tags?.length || 0) >= 3
                          return (
                            <button
                              key={`${item.id}-${tag}`}
                              type="button"
                              disabled={disabled}
                              onClick={() => toggleTag(item, tag)}
                              className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                                selected
                                  ? 'border-cyan-200/40 bg-cyan-300/10 text-cyan-100'
                                  : 'border-white/20 bg-white/5 text-slate-100/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50'
                              }`}
                            >
                              {tag}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenDashboard(item.id)}
                        className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                      >
                        Open Dashboard
                      </button>
                      <button
                        type="button"
                        onClick={() => onTalkToLoveGuru(item.id)}
                        className="rounded-lg border border-violet-200/35 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:bg-violet-300/20"
                      >
                        Talk to Love Guru
                      </button>
                      <button
                        type="button"
                        onClick={() => beginRename(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Rename
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
                        onClick={() => {
                          setExportTarget(item)
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200/30 bg-rose-300/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                      {item.status === 'FAILED' ? (
                        <button
                          type="button"
                          onClick={() => {
                            updateAnalysis(item.id, { status: 'READY' })
                            setVersion((prev) => prev + 1)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200/35 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/20"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Retry
                        </button>
                      ) : null}
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </section>

      <section className="mx-auto mt-6 max-w-6xl">
        <GlassCard className="border-rose-200/25 bg-rose-300/5 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Danger zone</h2>
          <p className="mt-2 text-sm text-slate-100/80">Delete all recaps and related local data on this device.</p>
          <button
            type="button"
            onClick={() => setDeleteAllOpen(true)}
            className="mt-4 inline-flex items-center gap-1 rounded-lg border border-rose-200/30 bg-rose-300/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-300/20"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Delete all my recaps
          </button>
        </GlassCard>
      </section>

      <ConfirmDeleteModal item={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={onConfirmDelete} />
      <ConfirmDeleteAllModal
        isOpen={deleteAllOpen}
        input={deleteAllInput}
        onInputChange={setDeleteAllInput}
        onCancel={() => {
          setDeleteAllInput('')
          setDeleteAllOpen(false)
        }}
        onConfirm={onConfirmDeleteAll}
      />
      <ExportModal item={exportTarget} onClose={() => setExportTarget(null)} onExportJson={onExportJson} />
    </main>
  )
}
