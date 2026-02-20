import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import AuthCard from '../../components/auth/AuthCard'
import { useAuth } from '../../context/AuthContext'

const countryCodes = ['+1', '+44', '+91', '+61', '+81', '+971']

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

function toAge(dob) {
  if (!dob) return null
  const parsed = new Date(dob)
  if (Number.isNaN(parsed.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - parsed.getFullYear()
  const monthDelta = now.getMonth() - parsed.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) {
    age -= 1
  }
  return age
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { registerStart } = useAuth()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    countryCode: '+1',
    phoneLocal: '',
    dob: '',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordState = getPasswordRuleState(form.password)
  const isPasswordValid = Object.values(passwordState).every(Boolean)
  const age = useMemo(() => toAge(form.dob), [form.dob])
  const isUnder18 = typeof age === 'number' && age < 18

  const validateStepOne = () => {
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'First name is required.'
    if (!form.lastName.trim()) next.lastName = 'Last name is required.'
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!isValidEmail(form.email.trim())) next.email = 'Enter a valid email.'

    if (!form.password) next.password = 'Password is required.'
    else if (!isPasswordValid) next.password = 'Password must meet all requirements below.'

    if (!form.confirmPassword) {
      next.confirmPassword = 'Confirm Password is required.'
    } else if (form.confirmPassword !== form.password) {
      next.confirmPassword = 'Confirm Password must match Password.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const validateStepTwo = () => {
    const next = {}
    const trimmedPhone = form.phoneLocal.trim()
    if (trimmedPhone) {
      if (!/^\d{6,15}$/.test(trimmedPhone)) {
        next.phoneLocal = 'Phone must be numeric after country code.'
      }

      if (!/^\+\d{1,4}$/.test(form.countryCode)) {
        next.countryCode = 'Select a valid country code.'
      }
    }

    if (form.dob) {
      const parsed = new Date(form.dob)
      if (Number.isNaN(parsed.getTime())) {
        next.dob = 'Enter a valid date of birth.'
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onContinue = () => {
    setSubmitError('')
    if (!validateStepOne()) return
    setStep(2)
  }

  const onBack = () => {
    setSubmitError('')
    setStep(1)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setSubmitError('')
    if (!validateStepOne()) {
      setStep(1)
      return
    }

    if (!validateStepTwo()) return

    setIsSubmitting(true)
    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phoneLocal.trim() ? `${form.countryCode}${form.phoneLocal.trim()}` : null,
      dob: form.dob || null,
    }

    const result = await registerStart(payload)
    setIsSubmitting(false)

    if (!result.ok) {
      setSubmitError(result.error)
      return
    }

    navigate(`/auth/verify?email=${encodeURIComponent(payload.email)}`, {
      replace: true,
      state: {
        email: payload.email,
        phone: payload.phone,
        demoOtp: result.demoOtp || null,
        notice: 'Registration complete. Verify your details to activate your account.',
      },
    })
  }

  return (
    <AuthCard
      title="Create Account"
      subtitle="Set up your account in two quick steps."
      footer={
        <span>
          Already have an account?{' '}
          <Link className="text-cyan-200 hover:text-cyan-100" to="/auth/signin">
            Sign in
          </Link>
        </span>
      }
    >
      <div className="mb-4 rounded-xl border border-white/15 bg-slate-900/45 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/85">Step {step} of 2</p>
        <div className="mt-2 h-1.5 rounded-full bg-white/10">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-cyan-300/70 to-violet-300/70"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {step === 1 ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-100/90" htmlFor="register-first-name">
                  First Name
                </label>
                <input
                  id="register-first-name"
                  value={form.firstName}
                  onChange={(event) => {
                    setErrors((prev) => ({ ...prev, firstName: '' }))
                    setSubmitError('')
                    setForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }}
                  className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                  autoComplete="given-name"
                />
                {errors.firstName ? <p className="mt-1 text-xs text-rose-200">{errors.firstName}</p> : null}
              </div>
              <div>
                <label className="block text-sm text-slate-100/90" htmlFor="register-last-name">
                  Last Name
                </label>
                <input
                  id="register-last-name"
                  value={form.lastName}
                  onChange={(event) => {
                    setErrors((prev) => ({ ...prev, lastName: '' }))
                    setSubmitError('')
                    setForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }}
                  className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                  autoComplete="family-name"
                />
                {errors.lastName ? <p className="mt-1 text-xs text-rose-200">{errors.lastName}</p> : null}
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-100/90" htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
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
              {errors.email ? <p className="mt-1 text-xs text-rose-200">{errors.email}</p> : null}
            </div>

            <div>
              <label className="block text-sm text-slate-100/90" htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                type="password"
                value={form.password}
                onChange={(event) => {
                  setErrors((prev) => ({ ...prev, password: '' }))
                  setSubmitError('')
                  setForm((prev) => ({ ...prev, password: event.target.value }))
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
              {errors.password ? <p className="mt-1 text-xs text-rose-200">{errors.password}</p> : null}
            </div>

            <div>
              <label className="block text-sm text-slate-100/90" htmlFor="register-confirm-password">
                Confirm Password
              </label>
              <input
                id="register-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => {
                  setErrors((prev) => ({ ...prev, confirmPassword: '' }))
                  setSubmitError('')
                  setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                autoComplete="new-password"
              />
              {errors.confirmPassword ? <p className="mt-1 text-xs text-rose-200">{errors.confirmPassword}</p> : null}
            </div>

            <button
              type="button"
              onClick={onContinue}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm text-slate-100/90">Phone number (optional)</label>
              <div className="mt-1 grid grid-cols-[110px_1fr] gap-2">
                <select
                  value={form.countryCode}
                  onChange={(event) => {
                    setErrors((prev) => ({ ...prev, countryCode: '' }))
                    setSubmitError('')
                    setForm((prev) => ({ ...prev, countryCode: event.target.value }))
                  }}
                  className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none"
                >
                  {countryCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
                <input
                  value={form.phoneLocal}
                  onChange={(event) => {
                    const onlyDigits = event.target.value.replace(/\D/g, '')
                    setErrors((prev) => ({ ...prev, phoneLocal: '' }))
                    setSubmitError('')
                    setForm((prev) => ({ ...prev, phoneLocal: onlyDigits }))
                  }}
                  placeholder="Phone number"
                  inputMode="numeric"
                  className="rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
                  autoComplete="tel-national"
                />
              </div>
              <p className="mt-1 text-xs text-slate-100/65">Include country code. Numeric digits only after the code.</p>
              {errors.countryCode ? <p className="mt-1 text-xs text-rose-200">{errors.countryCode}</p> : null}
              {errors.phoneLocal ? <p className="mt-1 text-xs text-rose-200">{errors.phoneLocal}</p> : null}
            </div>

            <div>
              <label className="block text-sm text-slate-100/90" htmlFor="register-dob">
                Date of Birth (optional)
              </label>
              <input
                id="register-dob"
                type="date"
                value={form.dob}
                onChange={(event) => {
                  setErrors((prev) => ({ ...prev, dob: '' }))
                  setSubmitError('')
                  setForm((prev) => ({ ...prev, dob: event.target.value }))
                }}
                className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
              />
              {errors.dob ? <p className="mt-1 text-xs text-rose-200">{errors.dob}</p> : null}
              {isUnder18 ? (
                <p className="mt-1 text-xs text-amber-200">
                  You appear to be under 18. You can continue, but some experiences may be limited.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-white/15 bg-slate-900/45 p-3">
              <p className="text-sm text-slate-100/85">Next: verify your details with email OTP (required) and phone OTP (optional).</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBack}
                className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/15"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </>
        )}

        {submitError ? <p className="text-sm text-rose-200">{submitError}</p> : null}
      </form>
    </AuthCard>
  )
}
