function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function hasString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function hasNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function stripFence(text) {
  const trimmed = String(text || '').trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i)
  return fenceMatch ? fenceMatch[1] : trimmed
}

export function parseJsonSafely(text) {
  try {
    return JSON.parse(stripFence(text))
  } catch {
    return null
  }
}

export function validateDemoAnalysisPayload(payload) {
  if (!isObject(payload)) return { valid: false, reason: 'Top-level payload is not an object.' }
  if (!hasString(payload.analysisId)) return { valid: false, reason: 'analysisId missing.' }
  if (!Array.isArray(payload.participants)) return { valid: false, reason: 'participants must be an array.' }
  if (!isObject(payload.compatibility) || !hasNumber(payload.compatibility.score)) {
    return { valid: false, reason: 'compatibility section missing.' }
  }
  if (!isObject(payload.sentiment) || !Array.isArray(payload.sentiment.timelineMarkers)) {
    return { valid: false, reason: 'sentiment section missing.' }
  }
  if (!Array.isArray(payload.majorEvents)) return { valid: false, reason: 'majorEvents must be an array.' }
  if (!Array.isArray(payload.personality)) return { valid: false, reason: 'personality must be an array.' }
  if (!isObject(payload.copy)) return { valid: false, reason: 'copy section missing.' }
  return { valid: true, reason: '' }
}
