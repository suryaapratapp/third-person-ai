import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Plus, UserCircle2, X } from 'lucide-react'
import DemoModeInfoModal from '../components/DemoModeInfoModal'
import GlassCard from '../components/GlassCard'
import { useAuth } from '../context/AuthContext'
import { useDemoMode } from '../context/DemoModeContext'

const PROFILE_KEY = 'tpai_profile'
const presetLanguages = ['English', 'Hindi', 'Spanish', 'French', 'Tamil', 'German']

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return { location: '', languages: [], favoriteFood: '' }
    const parsed = JSON.parse(raw)
    return {
      location: parsed?.location || '',
      languages: Array.isArray(parsed?.languages) ? parsed.languages : [],
      favoriteFood: parsed?.favoriteFood || '',
    }
  } catch {
    return { location: '', languages: [], favoriteFood: '' }
  }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const {
    enabled: demoModeEnabled,
    consent: demoModeConsent,
    setEnabled: setDemoModeEnabled,
    setConsent: setDemoModeConsent,
  } = useDemoMode()
  const [form, setForm] = useState(() => loadProfile())
  const [customLanguage, setCustomLanguage] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  const [isDemoInfoOpen, setIsDemoInfoOpen] = useState(false)

  useEffect(() => {
    if (!showSaved) return undefined
    const id = window.setTimeout(() => setShowSaved(false), 2200)
    return () => window.clearTimeout(id)
  }, [showSaved])

  const languageOptions = useMemo(() => {
    const existing = new Set([...presetLanguages, ...form.languages])
    return [...existing]
  }, [form.languages])

  const toggleLanguage = (value) => {
    setForm((prev) => {
      if (prev.languages.includes(value)) {
        return { ...prev, languages: prev.languages.filter((item) => item !== value) }
      }
      return { ...prev, languages: [...prev.languages, value] }
    })
  }

  const addCustomLanguage = () => {
    const value = customLanguage.trim()
    if (!value) return
    if (!form.languages.includes(value)) {
      setForm((prev) => ({ ...prev, languages: [...prev.languages, value] }))
    }
    setCustomLanguage('')
  }

  const saveProfile = () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(form))
    setShowSaved(true)
  }

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <GlassCard className="border-white/15 bg-slate-950/45 p-6 sm:p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-300/25 via-cyan-300/20 to-rose-300/20 text-cyan-100 ring-1 ring-white/15">
            <UserCircle2 className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">Profile</h1>
          <p className="mt-2 text-sm text-slate-100/80">Signed in as {user?.email || 'Unknown user'}.</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4">
              <p className="text-sm font-semibold text-white">Demo Mode - experimental insights</p>
              <p className="mt-1 text-xs text-slate-100/75">
                This is an early preview of analysis quality. Results may vary, so avoid sharing highly sensitive information.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextEnabled = !demoModeEnabled
                    setDemoModeEnabled(nextEnabled)
                    if (nextEnabled && !demoModeConsent) {
                      setIsDemoInfoOpen(true)
                    }
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    demoModeEnabled
                      ? 'border-cyan-200/40 bg-cyan-300/10 text-cyan-100'
                      : 'border-white/20 bg-white/5 text-slate-100/85 hover:bg-white/10'
                  }`}
                >
                  {demoModeEnabled ? 'Disable Demo Mode' : 'Enable Demo Mode'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsDemoInfoOpen(true)}
                  className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  Learn more
                </button>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-100/70">Location</span>
              <input
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="City, Country"
                className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
              />
            </label>

            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-100/70">Languages spoken</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {languageOptions.map((language) => {
                  const selected = form.languages.includes(language)
                  return (
                    <button
                      key={language}
                      type="button"
                      onClick={() => toggleLanguage(language)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selected
                          ? 'border-cyan-200/40 bg-cyan-300/10 text-cyan-100'
                          : 'border-white/20 bg-white/5 text-slate-100/85 hover:bg-white/10'
                      }`}
                    >
                      {language}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={customLanguage}
                  onChange={(event) => setCustomLanguage(event.target.value)}
                  placeholder="Add custom language"
                  className="h-9 flex-1 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                />
                <button
                  type="button"
                  onClick={addCustomLanguage}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              {form.languages.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.languages.map((language) => (
                    <span key={`selected-${language}`} className="inline-flex items-center gap-1 rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] text-cyan-100">
                      {language}
                      <button
                        type="button"
                        onClick={() => toggleLanguage(language)}
                        className="rounded-full p-0.5 hover:bg-cyan-200/20"
                        aria-label={`Remove ${language}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-100/70">Favorite food</span>
              <input
                value={form.favoriteFood}
                onChange={(event) => setForm((prev) => ({ ...prev, favoriteFood: event.target.value }))}
                placeholder="Your comfort meal"
                className="mt-1 h-10 w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveProfile}
              className="rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Save
            </button>
            {showSaved ? (
              <p className="inline-flex items-center gap-1 text-xs text-emerald-100">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Profile updated
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/analyses"
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
            >
              Your Recaps
            </Link>
            <Link
              to="/chat-analysis"
              className="rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Start Chat Analysis
            </Link>
          </div>
        </GlassCard>
      </section>
      <DemoModeInfoModal
        isOpen={isDemoInfoOpen}
        onClose={() => setIsDemoInfoOpen(false)}
        consentAlreadyGiven={demoModeConsent}
        onAcceptConsent={() => {
          setDemoModeConsent(true)
          setIsDemoInfoOpen(false)
        }}
      />
    </main>
  )
}
