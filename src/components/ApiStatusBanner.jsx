import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '../api/client'

export default function ApiStatusBanner() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/health`)
        if (cancelled) return
        setStatus(response.ok ? 'connected' : 'disconnected')
      } catch {
        if (!cancelled) setStatus('disconnected')
      }
    }

    void check()
    const intervalId = window.setInterval(check, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  const toneClass =
    status === 'connected'
      ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
      : status === 'disconnected'
        ? 'border-rose-300/35 bg-rose-300/10 text-rose-100'
        : 'border-white/20 bg-white/5 text-slate-100'

  return (
    <div className={`mx-auto mt-2 max-w-6xl rounded-lg border px-3 py-2 text-xs ${toneClass}`}>
      API: {getApiBaseUrl()} | {status}
    </div>
  )
}
