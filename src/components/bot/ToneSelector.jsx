const toneLabels = {
  gentle: 'Gentle',
  balanced: 'Balanced',
  direct: 'Direct',
}

const toneDescriptions = {
  gentle: 'Soft, reassuring language with low pressure suggestions.',
  balanced: 'Clear guidance with emotional support and practical framing.',
  direct: 'Straightforward feedback with concise action-oriented advice.',
}

const toneOrder = ['gentle', 'balanced', 'direct']

export default function ToneSelector({ value, onChange }) {
  const index = toneOrder.indexOf(value)
  const currentIndex = index === -1 ? 1 : index

  const onSliderChange = (event) => {
    const nextIndex = Number(event.target.value)
    onChange(toneOrder[nextIndex] ?? 'balanced')
  }

  return (
    <div className="rounded-xl border border-white/15 bg-slate-900/55 p-3">
      <label htmlFor="tone-slider" className="text-sm font-semibold text-white">
        Tone
      </label>
      <input
        id="tone-slider"
        type="range"
        min="0"
        max="2"
        step="1"
        value={currentIndex}
        onChange={onSliderChange}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-300"
      />
      <div className="mt-2 flex items-center justify-between text-xs text-slate-100/75">
        <span>Gentle</span>
        <span>Balanced</span>
        <span>Direct</span>
      </div>
      <p className="mt-3 text-xs text-cyan-100/90">Current: {toneLabels[toneOrder[currentIndex]]}</p>
      <p className="mt-1 text-xs text-slate-100/75">{toneDescriptions[toneOrder[currentIndex]]}</p>
    </div>
  )
}
