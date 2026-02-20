export default function LoveGuruCaricature() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="pointer-events-none absolute -left-10 top-8 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl" />
      <div className="pointer-events-none absolute -right-8 top-3 h-28 w-28 rounded-full bg-violet-300/20 blur-2xl" />
      <div className="pointer-events-none absolute bottom-6 left-12 h-20 w-20 rounded-full bg-rose-300/20 blur-2xl" />

      <div className="animate-float-slow rounded-3xl border border-white/15 bg-slate-950/60 p-4 shadow-xl shadow-black/40">
        <svg viewBox="0 0 260 260" className="h-auto w-full" role="img" aria-label="Love Guru character illustration">
          <defs>
            <linearGradient id="hair" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="hoodie" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="heartGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>

          <circle cx="130" cy="130" r="118" fill="rgba(15,23,42,0.65)" stroke="rgba(148,163,184,0.25)" />
          <ellipse cx="130" cy="102" rx="52" ry="56" fill="#f8d8cf" />
          <path d="M78 92c6-28 28-46 52-46s46 18 52 46c-7-6-17-10-29-11-20-2-37 3-52 11z" fill="url(#hair)" />
          <path d="M77 150c12-12 30-20 53-20s41 8 53 20v56H77z" fill="url(#hoodie)" />
          <path d="M116 167c5-8 15-10 22-4 7-6 17-4 22 4 4 8 1 15-22 30-23-15-26-22-22-30z" fill="url(#heartGlow)" />
          <circle cx="112" cy="103" r="4.5" fill="#0f172a" />
          <circle cx="148" cy="103" r="4.5" fill="#0f172a" />
          <path d="M113 124c11 10 23 10 34 0" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />

          <circle cx="40" cy="76" r="4" fill="rgba(34,211,238,0.7)" />
          <circle cx="220" cy="90" r="3" fill="rgba(244,114,182,0.65)" />
          <circle cx="212" cy="168" r="3.5" fill="rgba(167,139,250,0.75)" />
          <circle cx="58" cy="182" r="2.8" fill="rgba(244,114,182,0.7)" />
        </svg>
      </div>
    </div>
  )
}
