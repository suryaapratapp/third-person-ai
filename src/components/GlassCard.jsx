export default function GlassCard({ className = '', children }) {
  return (
    <div
      className={`rounded-2xl border border-white/15 bg-slate-950/35 p-5 shadow-xl shadow-black/30 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}
