import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AuthCard from '../../components/auth/AuthCard'
import { useAuth } from '../../context/AuthContext'

function StatusPill({ verified }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        verified
          ? 'border-emerald-200/40 bg-emerald-300/12 text-emerald-100'
          : 'border-amber-200/40 bg-amber-300/12 text-amber-100'
      }`}
    >
      {verified ? 'Verified' : 'Pending'}
    </span>
  )
}

export default function VerifyDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { completeRegistration, getVerificationStatus, resendOtp, verifyOtp } = useAuth()

  const emailFromQuery = searchParams.get('email') || ''
  const email = location.state?.email || emailFromQuery

  const [verification, setVerification] = useState(null)
  const [emailOtp, setEmailOtp] = useState('')
  const [phoneOtp, setPhoneOtp] = useState('')
  const [notice, setNotice] = useState(location.state?.notice || '')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState({ email: 0, phone: 0 })
  const [demoOtp, setDemoOtp] = useState(location.state?.demoOtp || null)

  const isDemoUi = useMemo(() => import.meta.env.VITE_AI_MODE === 'demo' || Boolean(demoOtp), [demoOtp])

  useEffect(() => {
    if (!email) {
      setIsLoading(false)
      return
    }

    let active = true
    async function loadStatus() {
      setIsLoading(true)
      const result = await getVerificationStatus(email)
      if (!active) return

      if (!result.ok) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      setVerification(result.verification)
      setIsLoading(false)
    }

    void loadStatus()

    return () => {
      active = false
    }
  }, [email, getVerificationStatus])

  useEffect(() => {
    if (!cooldown.email && !cooldown.phone) return undefined

    const timer = window.setInterval(() => {
      setCooldown((prev) => ({
        email: prev.email > 0 ? prev.email - 1 : 0,
        phone: prev.phone > 0 ? prev.phone - 1 : 0,
      }))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldown.email, cooldown.phone])

  const canContinue = Boolean(verification?.emailVerified)

  const onVerify = async (channel) => {
    setError('')
    setNotice('')
    const otp = channel === 'email' ? emailOtp : phoneOtp
    if (!otp.trim()) {
      setError(`Enter ${channel} OTP.`)
      return
    }

    setIsSubmitting(true)
    const result = await verifyOtp({ email, channel, otp: otp.trim() })
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setVerification(result.verification)
    setNotice(`${channel === 'email' ? 'Email' : 'Phone'} verification successful.`)
  }

  const onResend = async (channel) => {
    if (cooldown[channel] > 0) return

    setError('')
    setNotice('')
    const result = await resendOtp({ email, channel })
    if (!result.ok) {
      setError(result.error)
      return
    }

    setCooldown((prev) => ({ ...prev, [channel]: 30 }))
    if (result.demoOtp) {
      setDemoOtp((prev) => ({ ...(prev || {}), [channel === 'email' ? 'emailOtp' : 'phoneOtp']: result.demoOtp }))
    }
    setNotice(`${channel === 'email' ? 'Email' : 'Phone'} OTP resent.`)
  }

  const onContinue = async () => {
    if (!email) return
    setError('')
    setNotice('')

    setIsSubmitting(true)
    const result = await completeRegistration(email)
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    navigate('/analyses', {
      replace: true,
      state: { notice: 'Verification successful. Your account is ready.' },
    })
  }

  if (!email) {
    return (
      <AuthCard
        title="Verify your details"
        subtitle="Start by creating an account, then come back here for OTP verification."
        footer={
          <Link className="text-cyan-200 hover:text-cyan-100" to="/auth/register">
            Back to Register
          </Link>
        }
      >
        <p className="text-sm text-slate-100/80">Missing email context for verification.</p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Verify your details"
      subtitle="This helps keep accounts safe and real."
      footer={
        <span>
          Want to use a different email?{' '}
          <Link className="text-cyan-200 hover:text-cyan-100" to="/auth/register">
            Register again
          </Link>
        </span>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-white/15 bg-slate-900/45 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Account email</p>
          <p className="mt-1 text-sm text-white">{email}</p>
        </div>

        {isDemoUi ? (
          <div className="rounded-xl border border-amber-200/30 bg-amber-300/10 p-3 text-xs text-amber-100">
            Demo Mode - OTP is simulated.
            {demoOtp?.emailOtp ? <p className="mt-1">Email OTP: {demoOtp.emailOtp}</p> : null}
            {demoOtp?.phoneOtp ? <p className="mt-1">Phone OTP: {demoOtp.phoneOtp}</p> : null}
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-slate-100/80">Loading verification status...</p>
        ) : (
          <>
            <div className="rounded-xl border border-white/15 bg-slate-900/55 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Email OTP</p>
                <StatusPill verified={Boolean(verification?.emailVerified)} />
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={emailOtp}
                  onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  placeholder="6-digit code"
                  className="h-10 flex-1 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                />
                <button
                  type="button"
                  onClick={() => void onVerify('email')}
                  disabled={isSubmitting || verification?.emailVerified}
                  className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Verify
                </button>
              </div>
              <button
                type="button"
                onClick={() => void onResend('email')}
                disabled={cooldown.email > 0}
                className="mt-2 text-xs text-slate-100/78 underline-offset-4 transition hover:text-slate-100 hover:underline disabled:no-underline disabled:opacity-50"
              >
                {cooldown.email > 0 ? `Resend in ${cooldown.email}s` : 'Resend OTP'}
              </button>
            </div>

            {verification?.phoneRequired ? (
              <div className="rounded-xl border border-white/15 bg-slate-900/55 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">Phone OTP (optional)</p>
                  <StatusPill verified={Boolean(verification?.phoneVerified)} />
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={phoneOtp}
                    onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="6-digit code"
                    className="h-10 flex-1 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                  />
                  <button
                    type="button"
                    onClick={() => void onVerify('phone')}
                    disabled={isSubmitting || verification?.phoneVerified}
                    className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Verify
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void onResend('phone')}
                  disabled={cooldown.phone > 0}
                  className="mt-2 text-xs text-slate-100/78 underline-offset-4 transition hover:text-slate-100 hover:underline disabled:no-underline disabled:opacity-50"
                >
                  {cooldown.phone > 0 ? `Resend in ${cooldown.phone}s` : 'Resend OTP'}
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void onContinue()}
              disabled={!canContinue || isSubmitting}
              className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Finishing...' : 'Continue'}
            </button>
          </>
        )}

        {notice ? <p className="text-sm text-emerald-200">{notice}</p> : null}
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      </div>
    </AuthCard>
  )
}
