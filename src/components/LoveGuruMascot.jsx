export default function LoveGuruMascot() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="pointer-events-none absolute -left-12 top-12 h-28 w-28 rounded-full bg-cyan-300/18 blur-2xl animate-guru-glow" />
      <div className="pointer-events-none absolute -right-10 top-10 h-28 w-28 rounded-full bg-fuchsia-300/20 blur-2xl animate-guru-glow-delayed" />
      <div className="pointer-events-none absolute bottom-8 left-1/3 h-24 w-24 rounded-full bg-rose-300/18 blur-2xl animate-guru-glow" />

      <div className="animate-float-slow rounded-[28px] border border-white/15 bg-slate-950/62 p-4 shadow-2xl shadow-black/45">
        <svg
          viewBox="0 0 280 280"
          className="h-auto w-full"
          role="img"
          aria-label="Love Guru mascot"
        >
          <defs>
            <linearGradient id="guruShell" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="guruFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdf2f8" />
              <stop offset="100%" stopColor="#f5d0fe" />
            </linearGradient>
            <radialGradient id="guruCore" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#f9a8d4" />
              <stop offset="55%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#67e8f9" />
            </radialGradient>
          </defs>

          <circle cx="140" cy="140" r="126" fill="rgba(15,23,42,0.76)" stroke="rgba(192,132,252,0.35)" />

          <g className="origin-center animate-guru-bob">
            <rect x="72" y="64" width="136" height="130" rx="58" fill="url(#guruShell)" />
            <rect x="84" y="76" width="112" height="102" rx="48" fill="url(#guruFace)" />

            <rect x="102" y="103" width="76" height="40" rx="18" fill="#1e293b" opacity="0.92" />
            <circle cx="124" cy="123" r="7" fill="#67e8f9" />
            <circle cx="156" cy="123" r="7" fill="#f472b6" />
            <path d="M118 150c8 7 36 7 44 0" stroke="#334155" strokeWidth="4" strokeLinecap="round" />

            <rect x="82" y="172" width="116" height="74" rx="36" fill="url(#guruShell)" />
            <ellipse cx="140" cy="208" rx="27" ry="24" fill="url(#guruCore)" className="animate-guru-pulse" />
            <path
              d="M132 206c2-4 7-5 10-2 3-3 8-2 10 2 2 4 0 7-10 13-10-6-12-9-10-13z"
              fill="rgba(255,255,255,0.9)"
            />
          </g>

          <g className="origin-center animate-guru-orbit">
            <circle cx="52" cy="86" r="3.5" fill="rgba(103,232,249,0.9)" />
            <circle cx="226" cy="98" r="3.2" fill="rgba(244,114,182,0.88)" />
            <circle cx="220" cy="186" r="3.8" fill="rgba(192,132,252,0.9)" />
            <circle cx="64" cy="200" r="2.8" fill="rgba(244,114,182,0.82)" />
          </g>
        </svg>
      </div>
    </div>
  )
}
