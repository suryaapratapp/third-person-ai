import { Outlet } from 'react-router-dom'
import NavBar from '../components/NavBar'
import ParticleBackground from '../components/ParticleBackground'
import ApiStatusBanner from '../components/ApiStatusBanner'

export default function AppShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_18%,_rgba(37,99,235,0.22)_0%,_rgba(15,23,42,0)_42%),radial-gradient(circle_at_85%_18%,_rgba(168,85,247,0.2)_0%,_rgba(15,23,42,0)_44%),linear-gradient(160deg,_#030712_0%,_#0b1120_45%,_#111827_100%)]">
      <ParticleBackground />
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 animate-float-slow rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-52 h-72 w-72 animate-float-delayed rounded-full bg-violet-300/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 animate-float-slow rounded-full bg-rose-300/10 blur-3xl" />

      <div className="relative z-10">
        <NavBar />
        {import.meta.env.DEV ? <ApiStatusBanner /> : null}
        <Outlet />
        <footer className="mx-auto mt-14 flex max-w-6xl items-center justify-center px-4 pb-8 text-xs text-slate-100/75 sm:px-6 lg:px-8">
          <p>(c) 2026 Third Person AI</p>
        </footer>
      </div>
    </div>
  )
}
