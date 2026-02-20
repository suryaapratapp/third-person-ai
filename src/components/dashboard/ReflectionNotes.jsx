import { useEffect, useMemo, useState } from 'react'

const PROMPTS = [
  'What surprised me was...',
  'What felt validating was...',
  'What I want to do next is...',
]

function getNotesKey(analysisId) {
  return `tpai:notes:${analysisId}`
}

export default function ReflectionNotes({ analysisId }) {
  const [value, setValue] = useState('')
  const [saveState, setSaveState] = useState('saved')

  const notesKey = useMemo(() => (analysisId ? getNotesKey(analysisId) : null), [analysisId])

  useEffect(() => {
    if (!notesKey) {
      setValue('')
      setSaveState('saved')
      return
    }

    try {
      const raw = localStorage.getItem(notesKey)
      setValue(raw ?? '')
    } catch {
      setValue('')
    }

    setSaveState('saved')
  }, [notesKey])

  useEffect(() => {
    if (!notesKey) return undefined

    setSaveState('saving')
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(notesKey, value)
      } finally {
        setSaveState('saved')
      }
    }, 500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [value, notesKey])

  const insertPrompt = (prompt) => {
    setValue((prev) => (prev.trim() ? `${prev}\n\n${prompt}` : prompt))
  }

  return (
    <section className="mx-auto mt-6 max-w-6xl">
      <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Your thoughts</h2>
          <span className="text-xs text-slate-100/70">{saveState === 'saving' ? 'Saving...' : 'Saved'}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => insertPrompt(prompt)}
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-slate-100 transition hover:bg-white/15"
            >
              {prompt}
            </button>
          ))}
        </div>

        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={7}
          placeholder="Capture what stands out from this analysis and what you want to do next."
          className="mt-3 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
        />
      </div>
    </section>
  )
}
