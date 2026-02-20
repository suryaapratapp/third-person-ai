import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Heart, Menu, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import DemoModeInfoModal from './DemoModeInfoModal'
import { useAuth } from '../context/AuthContext'
import { useDemoMode } from '../context/DemoModeContext'

const links = [
  { label: 'Home', to: '/' },
  { label: 'Chat Analysis', to: '/chat-analysis' },
  { label: 'Recaps', to: '/analyses' },
  { label: 'Vibe Check', to: '/vibe-check' },
  { label: 'Vibe Match', to: '/vibe-match' },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { isAuthenticated, user, signOut } = useAuth()
  const {
    enabled: demoModeEnabled,
    consent: demoModeConsent,
    setConsent: setDemoModeConsent,
  } = useDemoMode()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isDemoInfoOpen, setIsDemoInfoOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const userMenuRef = useRef(null)
  const userMenuButtonRef = useRef(null)

  const syncMenuPosition = () => {
    const trigger = userMenuButtonRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuWidth = 248
    const viewportWidth = window.innerWidth
    const nextLeft = Math.max(12, Math.min(rect.right - menuWidth, viewportWidth - menuWidth - 12))

    setMenuPosition({
      top: rect.bottom + 8,
      left: nextLeft,
    })
  }

  useEffect(() => {
    if (!isUserMenuOpen) return undefined

    syncMenuPosition()

    const onPointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
      }
    }

    const onLayout = () => {
      syncMenuPosition()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, true)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, true)
    }
  }, [isUserMenuOpen])

  const onSignOut = async () => {
    await signOut()
    setIsUserMenuOpen(false)
    setIsMobileOpen(false)
    navigate('/auth/signin')
  }

  const truncateEmail = (value) => {
    if (!value) return 'Account'
    if (value.length <= 26) return value
    return `${value.slice(0, 23)}...`
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/15 bg-slate-950/55 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-300/35 via-violet-300/30 to-cyan-300/35 text-white shadow-lg shadow-black/35 ring-1 ring-white/15">
            <Heart className="h-5 w-5" />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Third Person AI</p>
            <p className="text-[11px] tracking-[0.2em] text-cyan-100/80">READ BETWEEN LINES</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {demoModeEnabled ? (
            <span
              className="hidden rounded-full border border-amber-200/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-medium text-amber-100 md:inline-flex"
              title="AI insights are experimental and not final."
            >
              Demo Mode
            </span>
          ) : null}
          <nav className="hidden items-center gap-1 overflow-x-auto rounded-full border border-white/15 bg-white/5 p-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-xs font-medium transition sm:px-4 ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow'
                      : 'text-slate-100/90 hover:bg-white/15 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {isAuthenticated ? (
            <div className="relative">
              <button
                ref={userMenuButtonRef}
                type="button"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                onClick={() => {
                  if (!isUserMenuOpen) syncMenuPosition()
                  setIsUserMenuOpen((value) => !value)
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
              >
                <span className="max-w-[150px] truncate sm:max-w-[220px]">{truncateEmail(user?.email)}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth/signin"
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
              >
                Sign In
              </Link>
              <Link
                to="/auth/register"
                className="rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMobileOpen((value) => !value)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-slate-100 transition hover:bg-white/15 md:hidden"
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isMobileOpen ? (
        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-2">
            {demoModeEnabled ? (
              <p className="mb-2 rounded-lg border border-amber-200/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                Demo Mode: AI insights are experimental and not final.
              </p>
            ) : null}
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileOpen(false)}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `mb-1 block rounded-xl px-3 py-2 text-sm font-medium transition last:mb-0 ${
                    isActive ? 'bg-white text-indigo-700' : 'text-slate-100/90 hover:bg-white/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onSignOut}
                className="mt-2 block w-full rounded-xl border border-rose-200/30 bg-rose-300/10 px-3 py-2 text-left text-sm font-medium text-rose-100 transition hover:bg-rose-300/20"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/auth/register"
                onClick={() => setIsMobileOpen(false)}
                className="mt-2 block rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Register
              </Link>
            )}
          </div>
        </div>
      ) : null}
      {isUserMenuOpen
        ? createPortal(
            <div
              ref={userMenuRef}
              className="fixed z-[70] min-w-[220px] max-w-[280px] whitespace-nowrap rounded-xl border border-white/15 bg-slate-900/96 py-2 shadow-2xl shadow-black/55 backdrop-blur"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
              role="menu"
              aria-label="User menu"
            >
              <Link
                role="menuitem"
                to="/profile"
                onClick={() => setIsUserMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-100/90 transition hover:bg-white/10"
              >
                Profile
              </Link>
              <Link
                role="menuitem"
                to="/change-password"
                onClick={() => setIsUserMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-xs font-medium text-slate-100/90 transition hover:bg-white/10"
              >
                Change password
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setIsDemoInfoOpen(true)
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-100/90 transition hover:bg-white/10"
              >
                Demo Mode
              </button>
              <div className="my-1 h-px bg-white/10" />
              <button
                type="button"
                role="menuitem"
                onClick={onSignOut}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-rose-100 transition hover:bg-rose-300/15"
              >
                Sign Out
              </button>
            </div>,
            document.body,
          )
        : null}
      <DemoModeInfoModal
        isOpen={isDemoInfoOpen}
        onClose={() => setIsDemoInfoOpen(false)}
        consentAlreadyGiven={demoModeConsent}
        onAcceptConsent={() => {
          setDemoModeConsent(true)
          setIsDemoInfoOpen(false)
        }}
      />
    </header>
  )
}
