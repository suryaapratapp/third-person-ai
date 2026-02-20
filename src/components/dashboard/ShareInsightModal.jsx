import { useEffect, useMemo, useState } from 'react'
import { Download, X } from 'lucide-react'

function wrapText(context, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = ''

  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (context.measureText(next).width <= maxWidth) {
      line = next
    } else {
      if (line) lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)
  return lines
}

function createInsightImage(payload) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 720
  const context = canvas.getContext('2d')
  if (!context) return null

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#020617')
  gradient.addColorStop(0.6, '#111827')
  gradient.addColorStop(1, '#1e293b')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.strokeStyle = 'rgba(148, 163, 184, 0.35)'
  context.lineWidth = 2
  context.strokeRect(28, 28, canvas.width - 56, canvas.height - 56)

  context.fillStyle = 'rgba(56, 189, 248, 0.18)'
  context.fillRect(56, 56, canvas.width - 112, 96)

  context.fillStyle = '#e2e8f0'
  context.font = '600 28px "Plus Jakarta Sans", "Manrope", sans-serif'
  context.fillText('Shared Insight', 76, 115)

  context.fillStyle = '#f8fafc'
  context.font = '700 54px "Plus Jakarta Sans", "Manrope", sans-serif'
  context.fillText(payload.title, 76, 245)

  context.fillStyle = '#cbd5e1'
  context.font = '400 28px "Plus Jakarta Sans", "Manrope", sans-serif'
  const subtitleLines = wrapText(context, payload.subtitle, canvas.width - 152)
  let y = 300
  subtitleLines.slice(0, 3).forEach((line) => {
    context.fillText(line, 76, y)
    y += 42
  })

  context.font = '500 24px "Plus Jakarta Sans", "Manrope", sans-serif'
  payload.details.slice(0, 4).forEach((line) => {
    const lines = wrapText(context, line, canvas.width - 180)
    lines.forEach((wrapped) => {
      context.fillStyle = '#e2e8f0'
      context.fillText(`- ${wrapped}`, 92, y)
      y += 34
    })
    y += 10
  })

  context.fillStyle = '#93c5fd'
  context.font = '500 22px "Plus Jakarta Sans", "Manrope", sans-serif'
  context.fillText('Third Person AI', 76, canvas.height - 72)

  return canvas.toDataURL('image/png')
}

export default function ShareInsightModal({ payload, onClose }) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    if (!payload) return
    const image = createInsightImage(payload)
    if (image) setDataUrl(image)
  }, [payload])

  const fileName = useMemo(() => {
    if (!payload) return 'insight.png'
    return `${payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
  }, [payload])

  if (!payload) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="share-insight-title">
      <div className="w-full max-w-3xl rounded-2xl border border-white/20 bg-slate-900/95 p-4 shadow-2xl shadow-black/50 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Share Insight</p>
            <h2 id="share-insight-title" className="mt-1 text-lg font-semibold text-white">{payload.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/5 p-2 text-slate-200 transition hover:bg-white/15"
            aria-label="Close share insight"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-white/15 bg-slate-950/70">
          {dataUrl ? (
            <img src={dataUrl} alt={`${payload.title} share preview`} className="w-full" />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-slate-100/70">Preparing preview...</div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <a
            href={dataUrl || '#'}
            download={fileName}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </a>
        </div>
      </div>
    </div>
  )
}
