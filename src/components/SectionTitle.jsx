export default function SectionTitle({ eyebrow, title, subtitle }) {
  return (
    <div className="mb-8 space-y-3 text-center sm:mb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">{eyebrow}</p>
      <h2 className="text-2xl font-semibold leading-tight text-white sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mx-auto max-w-xl text-sm text-slate-100/80">{subtitle}</p> : null}
    </div>
  )
}
