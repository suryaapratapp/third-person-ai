import { useMemo } from 'react'

const CLOUD_WIDTH = 1000
const CLOUD_HEIGHT = 750
const MIN_SIZE = 12
const MAX_SIZE = 34
const MAX_WORDS = 44
const PLACEMENT_ATTEMPTS = 96

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeWords(words) {
  return (Array.isArray(words) ? words : [])
    .filter((item) => item?.word && Number(item?.count) > 0)
    .map((item) => ({ word: String(item.word), count: Number(item.count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_WORDS)
}

function hashSeed(input) {
  let hash = 2166136261
  const str = String(input || '')
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRandom(seed) {
  let state = seed || 1
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function getDisplayTitle(title) {
  const value = String(title || 'Participant')
  if (value.includes('Top Words')) return value
  return value.endsWith('s') ? `${value}' Top Words` : `${value}'s Top Words`
}

function createLayout(words, title) {
  const seedBase = hashSeed(`${title}:${words.map((item) => `${item.word}-${item.count}`).join('|')}`)
  const random = createRandom(seedBase)
  const min = words.length ? Math.min(...words.map((item) => item.count)) : 0
  const max = words.length ? Math.max(...words.map((item) => item.count)) : 1
  const spread = max - min || 1
  const centerX = CLOUD_WIDTH / 2
  const centerY = CLOUD_HEIGHT / 2

  const placedBoxes = []
  const placedWords = []

  const collides = (candidate) => {
    for (let i = 0; i < placedBoxes.length; i += 1) {
      const box = placedBoxes[i]
      if (
        candidate.x < box.x + box.w + 4 &&
        candidate.x + candidate.w + 4 > box.x &&
        candidate.y < box.y + box.h + 4 &&
        candidate.y + candidate.h + 4 > box.y
      ) {
        return true
      }
    }
    return false
  }

  words.forEach((item, index) => {
    const ratio = (item.count - min) / spread
    const tierSize = clamp(Math.round(MIN_SIZE + ratio * (MAX_SIZE - MIN_SIZE)), MIN_SIZE, MAX_SIZE)
    const color =
      ratio > 0.72
        ? 'rgba(186, 230, 253, 0.98)'
        : ratio > 0.4
          ? 'rgba(224, 242, 254, 0.88)'
          : 'rgba(240, 249, 255, 0.78)'

    let placed = null
    let size = tierSize
    let cycles = 0

    while (!placed && cycles < 3) {
      let angle = random() * Math.PI * 2 + index * 0.33
      for (let step = 0; step < PLACEMENT_ATTEMPTS; step += 1) {
        const radius = 12 + step * 4.2
        const x = centerX + Math.cos(angle) * radius + (random() - 0.5) * 14
        const y = centerY + Math.sin(angle) * radius * 0.72 + (random() - 0.5) * 10
        const rotate = ratio > 0.7 ? 0 : random() < 0.25 ? (random() < 0.5 ? -8 : 8) : 0
        const width = item.word.length * size * 0.56
        const height = size * 1.2
        const box = {
          x: x - width / 2,
          y: y - height / 2,
          w: width,
          h: height,
        }

        const insideBounds =
          box.x >= 10 &&
          box.y >= 10 &&
          box.x + box.w <= CLOUD_WIDTH - 10 &&
          box.y + box.h <= CLOUD_HEIGHT - 10

        if (insideBounds && !collides(box)) {
          placed = {
            word: item.word,
            count: item.count,
            style: {
              left: `${(x / CLOUD_WIDTH) * 100}%`,
              top: `${(y / CLOUD_HEIGHT) * 100}%`,
              fontSize: `${size}px`,
              transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
              color,
              opacity: 0.8 + ratio * 0.2,
            },
          }
          placedBoxes.push(box)
          break
        }

        angle += 0.41
      }

      if (!placed) {
        size = Math.max(MIN_SIZE - 1, size - 2)
        cycles += 1
      }
    }

    if (placed) {
      placedWords.push(placed)
    }
  })

  return placedWords
}

export default function WordCloudPanel({ title, words }) {
  const normalized = useMemo(() => normalizeWords(words), [words])
  const placedWords = useMemo(() => createLayout(normalized, title), [normalized, title])
  const showCloud = placedWords.length >= 8
  const displayTitle = useMemo(() => getDisplayTitle(title), [title])

  return (
    <div className="rounded-xl border border-white/15 bg-slate-900/60 p-4">
      <p className="text-sm font-semibold text-white">{displayTitle}</p>
      {showCloud ? (
        <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-lg border border-cyan-200/20 bg-slate-950/60 shadow-inner shadow-cyan-900/20">
          {placedWords.map((item, index) => (
            <span
              key={`${item.word}-${index}`}
              className="absolute whitespace-nowrap font-semibold leading-none"
              style={item.style}
              title={`${item.word} • ${item.count}`}
            >
              {item.word}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {normalized.length ? (
            normalized.slice(0, 30).map((item, index) => (
              <span
                key={`${item.word}-${index}`}
                className="rounded-full border border-cyan-200/30 bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-100"
              >
                {item.word}
              </span>
            ))
          ) : (
            <p className="text-xs text-slate-100/70">Word cloud data is still loading.</p>
          )}
        </div>
      )}
    </div>
  )
}
