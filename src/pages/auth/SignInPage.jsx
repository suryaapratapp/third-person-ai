import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCard from '../../components/auth/AuthCard'
import { useAuth } from '../../context/AuthContext'

function getRedirectPath(state) {
  if (state?.from && typeof state.from === 'string') {
    return state.from
  }
  return '/analyses'
}

export default function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  const redirectPath = useMemo(() => getRedirectPath(location.state), [location.state])
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectMessage = location.state?.message || location.state?.notice || ''

  const validate = () => {
    const next = {}
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.'

    if (!form.password) next.password = 'Password is required.'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setIsSubmitting(true)
    const result = await signIn(form)
    setIsSubmitting(false)
    if (!result.ok) {
      setSubmitError(result.error)
      return
    }

    navigate(redirectPath, { replace: true })
  }

  return (
    <AuthCard
      title="Sign In"
      subtitle="Access Chat Analysis, Recaps, and Love Guru."
      footer={
        <span>
          New here?{' '}
          <Link className="text-cyan-200 hover:text-cyan-100" to="/auth/register">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {redirectMessage ? (
          <div className="rounded-xl border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">
            {redirectMessage}
          </div>
        ) : null}

        <label className="block text-sm text-slate-100/90" htmlFor="signin-email">
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          value={form.email}
          onChange={(event) => {
            setErrors((prev) => ({ ...prev, email: '' }))
            setSubmitError('')
            setForm((prev) => ({ ...prev, email: event.target.value }))
          }}
          className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
          autoComplete="email"
        />
        {errors.email ? <p className="text-xs text-rose-200">{errors.email}</p> : null}

        <label className="block text-sm text-slate-100/90" htmlFor="signin-password">
          Password
        </label>
        <input
          id="signin-password"
          type="password"
          value={form.password}
          onChange={(event) => {
            setErrors((prev) => ({ ...prev, password: '' }))
            setSubmitError('')
            setForm((prev) => ({ ...prev, password: event.target.value }))
          }}
          className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
          autoComplete="current-password"
        />
        {errors.password ? <p className="text-xs text-rose-200">{errors.password}</p> : null}

        <div className="text-right">
          <Link className="text-xs text-cyan-200 hover:text-cyan-100" to="/auth/forgot-password">
            Forgot password?
          </Link>
        </div>

        {submitError ? <p className="text-sm text-rose-200">{submitError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </AuthCard>
  )
}
