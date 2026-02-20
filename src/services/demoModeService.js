import { AI_MODE } from '../config/runtime'

const DEMO_MODE_ENABLED_KEY = 'tpai_demo_mode_enabled'
const DEMO_MODE_CONSENT_KEY = 'tpai_demo_mode_consent'
const DEMO_MODE_FULL_TEXT_SESSION_KEY = 'tpai_demo_mode_full_text'

function toBoolean(value) {
  return value === true || value === 'true'
}

export function isEnvDemoMode() {
  return AI_MODE === 'demo'
}

export function isDemoModeEnabled() {
  try {
    const stored = localStorage.getItem(DEMO_MODE_ENABLED_KEY)
    if (stored === null) return isEnvDemoMode()
    return toBoolean(stored)
  } catch {
    return isEnvDemoMode()
  }
}

export function setDemoModeEnabled(enabled) {
  try {
    localStorage.setItem(DEMO_MODE_ENABLED_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new Event('tpai:demo-mode-changed'))
  } catch {
    // no-op
  }
}

export function hasDemoModeConsent() {
  try {
    return toBoolean(localStorage.getItem(DEMO_MODE_CONSENT_KEY))
  } catch {
    return false
  }
}

export function setDemoModeConsent(consent) {
  try {
    localStorage.setItem(DEMO_MODE_CONSENT_KEY, consent ? 'true' : 'false')
    window.dispatchEvent(new Event('tpai:demo-mode-changed'))
  } catch {
    // no-op
  }
}

export function isFullTextDemoEnabledForSession() {
  try {
    return toBoolean(sessionStorage.getItem(DEMO_MODE_FULL_TEXT_SESSION_KEY))
  } catch {
    return false
  }
}

export function setFullTextDemoEnabledForSession(enabled) {
  try {
    sessionStorage.setItem(DEMO_MODE_FULL_TEXT_SESSION_KEY, enabled ? 'true' : 'false')
  } catch {
    // no-op
  }
}

export function resetFullTextDemoForSession() {
  try {
    sessionStorage.removeItem(DEMO_MODE_FULL_TEXT_SESSION_KEY)
  } catch {
    // no-op
  }
}
