import {
  siInstagram,
  siMessenger,
  siSnapchat,
  siTelegram,
  siWhatsapp,
} from 'simple-icons'

const ICON_MAP = {
  whatsapp: siWhatsapp,
  telegram: siTelegram,
  instagram: siInstagram,
  messenger: siMessenger,
  snapchat: siSnapchat,
}

function getIconColor(icon) {
  if (!icon?.hex) return '#cbd5e1'
  return `#${icon.hex}`
}

function IMessageIcon({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="imessageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34C759" />
          <stop offset="100%" stopColor="#5ac8fa" />
        </linearGradient>
      </defs>
      <path
        d="M12 2c5.5 0 10 3.8 10 8.5S17.5 19 12 19c-1.1 0-2.2-.2-3.2-.5L4 21l1.1-3.5C3.8 16 2 13.9 2 10.5 2 5.8 6.5 2 12 2z"
        fill="url(#imessageGradient)"
      />
      <circle cx="8.5" cy="10.5" r="1.1" fill="#ffffff" />
      <circle cx="12" cy="10.5" r="1.1" fill="#ffffff" />
      <circle cx="15.5" cy="10.5" r="1.1" fill="#ffffff" />
    </svg>
  )
}

export default function MessagingAppIcon({
  app,
  className = '',
  size = 20,
  withRing = true,
}) {
  if (app === 'imessage') {
    return (
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/80 ${
          withRing ? 'ring-1 ring-cyan-200/25' : ''
        } ${className}`}
      >
        <IMessageIcon size={size} />
      </span>
    )
  }

  const icon = ICON_MAP[app]
  const color = getIconColor(icon)

  if (!icon) {
    return (
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xs font-semibold text-slate-100 ${className}`}
      >
        {String(app || '?').slice(0, 1).toUpperCase()}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950/80 ${
        withRing ? 'ring-1 ring-white/15' : ''
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path d={icon.path} fill={color} />
      </svg>
    </span>
  )
}
