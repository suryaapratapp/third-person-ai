const DASHBOARD_WINDOW_KEY = 'tpai:dashboard:window'
const USER_INTENT_KEY = 'tpai:user:intent'
const FALLBACK_INTENT_KEYS = ['tpai:intent', 'tpai:onboarding:intent']
const BOT_PERSONA_KEY = 'tpai:bot:persona'
const BOT_TONE_KEY = 'tpai:bot:tone'
const VALID_WINDOWS = ['early', 'recent', 'all']
const VALID_PERSONAS = ['coach', 'bestie']
const VALID_TONES = ['gentle', 'balanced', 'direct']
const INTENT_VALUES = ['compatibility', 'confusing_dynamics', 'overthinking_anxiety', 'missed_signs', 'closure_clarity']

const INTENT_LABELS = {
  compatibility: 'Compatibility',
  confusing_dynamics: 'Confusing dynamics',
  overthinking_anxiety: 'Overthinking & anxiety',
  missed_signs: 'Missed signs',
  closure_clarity: 'Closure & clarity',
}

function toSafeUserId(userIdentifier) {
  if (!userIdentifier || typeof userIdentifier !== 'string') return null
  const normalized = userIdentifier.trim().toLowerCase()
  return normalized || null
}

function getIntentStorageKey(userIdentifier) {
  return `tpai:intent:${getUserKey(userIdentifier)}`
}

export function getUserKey(userIdentifier) {
  const safeUser = toSafeUserId(userIdentifier)
  return safeUser ? `user:${safeUser}` : 'anonymous'
}

export function isValidDashboardWindow(value) {
  return VALID_WINDOWS.includes(value)
}

export function getDashboardWindowPreference() {
  try {
    const raw = localStorage.getItem(DASHBOARD_WINDOW_KEY)
    if (!raw) return null
    if (raw === 'peak') return 'recent'
    return isValidDashboardWindow(raw) ? raw : null
  } catch {
    return null
  }
}

export function setDashboardWindowPreference(windowKey) {
  if (!isValidDashboardWindow(windowKey)) return
  localStorage.setItem(DASHBOARD_WINDOW_KEY, windowKey)
}

export function isValidIntent(value) {
  return INTENT_VALUES.includes(value)
}

export function getIntentLabel(intentValue) {
  if (!intentValue) return null
  return INTENT_LABELS[intentValue] ?? intentValue
}

export function getIntent(userIdentifier) {
  try {
    const scopedRaw = localStorage.getItem(getIntentStorageKey(userIdentifier))
    if (isValidIntent(scopedRaw)) return scopedRaw

    if (toSafeUserId(userIdentifier)) return null

    const legacyRaw = localStorage.getItem(USER_INTENT_KEY)
    if (isValidIntent(legacyRaw)) return legacyRaw

    for (const key of FALLBACK_INTENT_KEYS) {
      const fallback = localStorage.getItem(key)
      if (isValidIntent(fallback)) return fallback
    }
  } catch {
    return null
  }

  return null
}

export function setIntent(intentValue, userIdentifier) {
  if (!isValidIntent(intentValue)) return
  localStorage.setItem(getIntentStorageKey(userIdentifier), intentValue)
}

export function clearIntent(userIdentifier) {
  try {
    localStorage.removeItem(getIntentStorageKey(userIdentifier))

    if (!toSafeUserId(userIdentifier)) {
      localStorage.removeItem(USER_INTENT_KEY)
      for (const key of FALLBACK_INTENT_KEYS) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // no-op
  }
}

export function getUserIntentPreference(userIdentifier) {
  return getIntent(userIdentifier)
}

export function setUserIntentPreference(intent, userIdentifier) {
  setIntent(intent, userIdentifier)
}

export function isValidBotPersona(value) {
  return VALID_PERSONAS.includes(value)
}

export function isValidBotTone(value) {
  return VALID_TONES.includes(value)
}

export function getBotPersonaPreference() {
  try {
    const raw = localStorage.getItem(BOT_PERSONA_KEY)
    if (!raw) return 'coach'
    return isValidBotPersona(raw) ? raw : 'coach'
  } catch {
    return 'coach'
  }
}

export function setBotPersonaPreference(persona) {
  if (!isValidBotPersona(persona)) return
  localStorage.setItem(BOT_PERSONA_KEY, persona)
}

export function getBotTonePreference() {
  try {
    const raw = localStorage.getItem(BOT_TONE_KEY)
    if (!raw) return 'balanced'
    return isValidBotTone(raw) ? raw : 'balanced'
  } catch {
    return 'balanced'
  }
}

export function setBotTonePreference(tone) {
  if (!isValidBotTone(tone)) return
  localStorage.setItem(BOT_TONE_KEY, tone)
}

export {
  VALID_WINDOWS,
  VALID_PERSONAS,
  VALID_TONES,
  INTENT_VALUES,
  INTENT_LABELS,
}
