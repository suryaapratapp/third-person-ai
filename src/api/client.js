import { API_BASE_URL, isApiConfigured } from '../config/runtime'

async function parseBody(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

function toApiError(status, payload, fallbackMessage) {
  const message = payload?.error || payload?.message || fallbackMessage || `Request failed (${status})`
  return {
    error: {
      message,
      code: payload?.code,
      details: payload?.details,
      status,
      data: payload,
    },
  }
}

function getMissingApiConfigError() {
  return toApiError(0, null, 'API is not configured (VITE_API_URL missing).')
}

async function getAuthService() {
  return import('../services/authService')
}

function redirectToSignIn() {
  if (typeof window === 'undefined') return
  if (window.location.pathname !== '/auth/signin') {
    window.location.assign('/auth/signin')
  }
}

async function requestRefreshToken(refreshToken) {
  if (!isApiConfigured()) {
    return null
  }
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  const payload = await parseBody(response)
  if (!response.ok || !payload?.tokens?.accessToken) {
    return null
  }

  return payload
}

async function withAuthRetry(path, options, retryOn401) {
  if (!isApiConfigured()) {
    throw getMissingApiConfigError()
  }

  const authService = await getAuthService()
  const session = authService.getSession()
  const headers = new Headers(options.headers || {})

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status !== 401 || !retryOn401) {
    return response
  }

  const refreshToken = session?.refreshToken
  if (!refreshToken) {
    authService.clearSession()
    redirectToSignIn()
    return response
  }

  const refreshed = await requestRefreshToken(refreshToken)
  if (!refreshed) {
    authService.clearSession()
    redirectToSignIn()
    return response
  }

  authService.setSession({
    user: refreshed.user,
    accessToken: refreshed.tokens.accessToken,
    refreshToken: refreshed.tokens.refreshToken,
  })

  const retryHeaders = new Headers(options.headers || {})
  retryHeaders.set('Authorization', `Bearer ${refreshed.tokens.accessToken}`)

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: retryHeaders,
  })
}

export async function apiFetch(path, options = {}) {
  if (!isApiConfigured()) {
    throw getMissingApiConfigError()
  }

  const response = await withAuthRetry(path, options, true)
  const payload = await parseBody(response)

  if (!response.ok) {
    if (response.status === 401) {
      const authService = await getAuthService()
      authService.clearSession()
      redirectToSignIn()
      throw toApiError(401, payload, 'Session expired. Please sign in again.')
    }

    throw toApiError(response.status, payload)
  }

  return payload
}

export function getApiBaseUrl() {
  return API_BASE_URL
}

export function normalizeApiError(error) {
  if (error?.error?.message) return error
  if (error instanceof Error) {
    return { error: { message: error.message } }
  }

  return { error: { message: 'Unexpected error' } }
}
