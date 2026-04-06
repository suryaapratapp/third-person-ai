import { Outlet } from 'react-router-dom'
import NavBar from '../components/NavBar'
import ParticleBackground from '../components/ParticleBackground'
import ApiStatusBanner from '../components/ApiStatusBanner'
import ApiConfigBanner from '../components/ApiConfigBanner'

export default function AppShell() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-[radial-gradient(circle_at_12%_18%,_rgba(37,99,235,0.22)_0%,_rgba(15,23,42,0)_42%),radial-gradient(circle_at_85%_18%,_rgba(168,85,247,0.2)_0%,_rgba(15,23,42,0)_44%),linear-gradient(160deg,_#030712_0%,_#0b1120_45%,_#111827_100%)]">
      <ParticleBackground />
      <div className="pointer-events-none absolute -left-24 top-8 h-64 w-64 animate-float-slow rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-52 h-72 w-72 animate-float-delayed rounded-full bg-violet-300/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 animate-float-slow rounded-full bg-rose-300/10 blur-3xl" />

      <div className="relative z-10 flex flex-col flex-1">
        <NavBar />
        <ApiConfigBanner />
        {import.meta.env.DEV ? <ApiStatusBanner /> : null}
        <div className="flex-1">
       <Outlet />
       </div>
      </div>
    </div>
  )
}
