import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../../components/auth/AuthCard'
import { useAuth } from '../../context/AuthContext'

const passwordRules = {
  length: /.{8,}/,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
}

const passwordChecklist = [
  { key: 'length', label: '8+ characters' },
  { key: 'uppercase', label: '1 uppercase letter' },
  { key: 'lowercase', label: '1 lowercase letter' },
  { key: 'number', label: '1 number' },
  { key: 'special', label: '1 special character' },
]

function getPasswordRuleState(password) {
  return {
    length: passwordRules.length.test(password),
    uppercase: passwordRules.uppercase.test(password),
    lowercase: passwordRules.lowercase.test(password),
    number: passwordRules.number.test(password),
    special: passwordRules.special.test(password),
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { forgotPassword, resetPassword } = useAuth()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [demoOtp, setDemoOtp] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordState = getPasswordRuleState(form.newPassword)
  const isPasswordValid = useMemo(() => Object.values(passwordState).every(Boolean), [passwordState])

  const requestReset = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!isValidEmail(form.email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    setIsSubmitting(true)
    const result = await forgotPassword(form.email.trim())
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setNotice('Password reset email sent. Enter the OTP to continue.')
    if (result.demoOtp) {
      setDemoOtp(result.demoOtp)
    }
    setStep(2)
  }

  const submitNewPassword = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!form.otp.trim()) {
      setError('Enter the reset OTP.')
      return
    }

    if (!isPasswordValid) {
      setError('New password must meet all requirements.')
      return
    }

    if (form.confirmPassword !== form.newPassword) {
      setError('Confirm Password must match New Password.')
      return
    }

    setIsSubmitting(true)
    const result = await resetPassword({
      email: form.email.trim(),
      otp: form.otp.trim(),
      newPassword: form.newPassword,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    navigate('/analyses', {
      replace: true,
      state: { notice: 'Password updated. You are now signed in.' },
    })
  }

  return (
    <AuthCard
      title="Reset Password"
      subtitle="Recover access to your account with a secure reset code."
      footer={
        <span>
          Remembered it?{' '}
          <Link className="text-cyan-200 hover:text-cyan-100" to="/auth/signin">
            Back to Sign in
          </Link>
        </span>
      }
    >
      {step === 1 ? (
        <form onSubmit={requestReset} className="space-y-4" noValidate>
          <label className="block text-sm text-slate-100/90" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            value={form.email}
            onChange={(event) => {
              setError('')
              setNotice('')
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
            autoComplete="email"
          />

          {notice ? <p className="text-sm text-emerald-200">{notice}</p> : null}
          {error ? <p className="text-sm text-rose-200">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending reset...' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitNewPassword} className="space-y-4" noValidate>
          <div className="rounded-xl border border-white/15 bg-slate-900/45 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Email</p>
            <p className="mt-1 text-sm text-white">{form.email}</p>
          </div>

          {demoOtp ? (
            <div className="rounded-xl border border-amber-200/30 bg-amber-300/10 p-3 text-xs text-amber-100">
              Demo Mode - OTP is simulated. Reset OTP: {demoOtp}
            </div>
          ) : null}

          <label className="block text-sm text-slate-100/90" htmlFor="forgot-otp">
            Reset OTP
          </label>
          <input
            id="forgot-otp"
            value={form.otp}
            onChange={(event) => {
              setError('')
              setNotice('')
              setForm((prev) => ({ ...prev, otp: event.target.value.replace(/\D/g, '').slice(0, 6) }))
            }}
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
          />

          <label className="block text-sm text-slate-100/90" htmlFor="forgot-new-password">
            New Password
          </label>
          <input
            id="forgot-new-password"
            type="password"
            value={form.newPassword}
            onChange={(event) => {
              setError('')
              setNotice('')
              setForm((prev) => ({ ...prev, newPassword: event.target.value }))
            }}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
            autoComplete="new-password"
          />
          <ul className="mt-2 space-y-1.5">
            {passwordChecklist.map((item) => {
              const active = passwordState[item.key]
              return (
                <li key={item.key} className={`text-xs ${active ? 'text-emerald-300' : 'text-slate-100/60'}`}>
                  <span
                    className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                      active ? 'bg-emerald-300' : 'bg-slate-100/40'
                    }`}
                  />
                  {item.label}
                </li>
              )
            })}
          </ul>

          <label className="block text-sm text-slate-100/90" htmlFor="forgot-confirm-password">
            Confirm New Password
          </label>
          <input
            id="forgot-confirm-password"
            type="password"
            value={form.confirmPassword}
            onChange={(event) => {
              setError('')
              setNotice('')
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
            autoComplete="new-password"
          />

          {notice ? <p className="text-sm text-emerald-200">{notice}</p> : null}
          {error ? <p className="text-sm text-rose-200">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
