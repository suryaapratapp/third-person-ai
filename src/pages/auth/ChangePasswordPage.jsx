import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

export default function ChangePasswordPage() {
  const { changePassword } = useAuth()

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordState = getPasswordRuleState(form.newPassword)
  const isPasswordValid = useMemo(() => Object.values(passwordState).every(Boolean), [passwordState])

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!form.currentPassword) {
      setError('Current password is required.')
      return
    }

    if (!isPasswordValid) {
      setError('New password must meet all requirements.')
      return
    }

    if (form.confirmNewPassword !== form.newPassword) {
      setError('Confirm password must match new password.')
      return
    }

    setIsSubmitting(true)
    const result = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setNotice('Password updated.')
    setForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
  }

  return (
    <AuthCard
      title="Change Password"
      subtitle="Update your password to keep your account secure."
      footer={
        <span>
          Back to{' '}
          <Link className="text-cyan-200 hover:text-cyan-100" to="/profile">
            Profile
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm text-slate-100/90" htmlFor="current-password">
            Current Password
          </label>
          <input
            id="current-password"
            type="password"
            value={form.currentPassword}
            onChange={(event) => {
              setError('')
              setNotice('')
              setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
            }}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-100/90" htmlFor="new-password">
            New Password
          </label>
          <input
            id="new-password"
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
        </div>

        <div>
          <label className="block text-sm text-slate-100/90" htmlFor="confirm-new-password">
            Confirm New Password
          </label>
          <input
            id="confirm-new-password"
            type="password"
            value={form.confirmNewPassword}
            onChange={(event) => {
              setError('')
              setNotice('')
              setForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))
            }}
            className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-cyan-200/60 transition focus:ring"
            autoComplete="new-password"
          />
        </div>

        {notice ? <p className="text-sm text-emerald-200">{notice}</p> : null}
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </AuthCard>
  )
}
