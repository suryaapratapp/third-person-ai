export default function SegmentedControl({ options, value, onChange, label = 'Select option' }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-white/15 bg-slate-900/65 p-1" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
              isActive
                ? 'bg-white text-indigo-700 shadow'
                : 'text-slate-100/85 hover:bg-white/15 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
