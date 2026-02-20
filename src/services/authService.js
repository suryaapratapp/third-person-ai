import { apiFetch, normalizeApiError } from '../api/client'

const SESSION_KEY = 'tpai:auth:session'

function normalizeSessionShape(raw) {
  if (!raw || typeof raw !== 'object') return null

  const user = raw.user ?? null
  const accessToken = raw.accessToken ?? raw.tokens?.accessToken ?? null
  const refreshToken = raw.refreshToken ?? raw.tokens?.refreshToken ?? null

  if (!user?.email || !accessToken) return null

  return {
    user,
    accessToken,
    refreshToken,
  }
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const normalized = normalizeSessionShape(parsed)

    if (normalized && (!parsed.accessToken || parsed.tokens)) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(normalized))
    }

    return normalized
  } catch {
    return null
  }
}

export function getSession() {
  return readSession()
}

export function setSession(session) {
  const normalized = normalizeSessionShape(session)
  if (!normalized) {
    localStorage.removeItem(SESSION_KEY)
    return
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(normalized))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

function toSessionFromPayload(payload) {
  return normalizeSessionShape({
    user: payload?.user,
    accessToken: payload?.tokens?.accessToken,
    refreshToken: payload?.tokens?.refreshToken,
  })
}

export async function login(email, password) {
  try {
    const payload = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const session = toSessionFromPayload(payload)
    if (!session) {
      return { ok: false, error: 'Invalid session returned by server.' }
    }

    setSession(session)
    return { ok: true, session }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function registerStart(payload) {
  try {
    const response = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return {
      ok: true,
      user: response.user,
      verification: response.verification,
      demoOtp: response.demoOtp || null,
    }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function getVerificationStatus(email) {
  try {
    const query = new URLSearchParams({ email }).toString()
    const response = await apiFetch(`/auth/verification-status?${query}`, { method: 'GET' })
    return { ok: true, user: response.user, verification: response.verification }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function verifyOtp({ email, channel, otp }) {
  try {
    const response = await apiFetch('/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, channel, otp }),
    })

    return { ok: true, user: response.user, verification: response.verification }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function resendOtp({ email, channel }) {
  try {
    const response = await apiFetch('/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, channel }),
    })

    return { ok: true, ...response }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function completeRegistration(email) {
  try {
    const payload = await apiFetch('/auth/register/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const session = toSessionFromPayload(payload)
    if (!session) {
      return { ok: false, error: 'Invalid session returned by server.' }
    }

    setSession(session)
    return { ok: true, session }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

// Backwards-compatible helper for old register callers.
export async function register(email, password) {
  const start = await registerStart({
    firstName: 'New',
    lastName: 'User',
    email,
    password,
  })

  if (!start.ok) return start

  if (start.verification?.emailVerified) {
    return completeRegistration(email)
  }

  return {
    ok: false,
    error: 'Email verification is required before account activation.',
    needsVerification: true,
  }
}

export async function forgotPassword(email) {
  try {
    const response = await apiFetch('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    return { ok: true, ...response }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function resetPassword({ email, otp, newPassword }) {
  try {
    const payload = await apiFetch('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    })

    const session = toSessionFromPayload(payload)
    if (!session) {
      return { ok: false, error: 'Invalid session returned by server.' }
    }

    setSession(session)
    return { ok: true, session }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function changePassword({ currentPassword, newPassword }) {
  try {
    await apiFetch('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    return { ok: true }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function refresh() {
  const session = readSession()
  if (!session?.refreshToken) {
    return { ok: false, error: 'No refresh token' }
  }

  try {
    const payload = await apiFetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })

    const nextSession = toSessionFromPayload(payload)
    if (!nextSession) {
      clearSession()
      return { ok: false, error: 'Invalid session returned by server.' }
    }

    setSession(nextSession)
    return { ok: true, session: nextSession }
  } catch (error) {
    clearSession()
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function me() {
  try {
    const payload = await apiFetch('/auth/me', { method: 'GET' })
    return { ok: true, user: payload.user }
  } catch (error) {
    const normalized = normalizeApiError(error)
    return { ok: false, error: normalized.error.message }
  }
}

export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // If token is invalid, still clear local session.
  }

  clearSession()
  return { ok: true }
}
