export const UPLOAD_SESSION_STATUS = Object.freeze({
  READY: 'READY',
  QUEUED: 'QUEUED',
  PARSING: 'PARSING',
  PARSED: 'PARSED',
  FAILED: 'FAILED',
})

export const ANALYSIS_RUN_STATUS = Object.freeze({
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
})

export const ANALYSIS_PUBLIC_STATUS = Object.freeze({
  READY: 'READY',
  ANALYZING: 'ANALYZING',
  FAILED: 'FAILED',
  PENDING: 'PENDING',
})

export const ACTIVE_ANALYSIS_RUN_STATUSES = Object.freeze([
  ANALYSIS_RUN_STATUS.QUEUED,
  ANALYSIS_RUN_STATUS.RUNNING,
])

export const ACTIVE_UPLOAD_SESSION_STATUSES = Object.freeze([
  UPLOAD_SESSION_STATUS.QUEUED,
  UPLOAD_SESSION_STATUS.PARSING,
])

export function normalizeAnalysisRunStatus(value) {
  const normalized = String(value || '').toUpperCase()
  switch (normalized) {
    case ANALYSIS_RUN_STATUS.QUEUED:
    case ANALYSIS_RUN_STATUS.RUNNING:
    case ANALYSIS_RUN_STATUS.COMPLETED:
    case ANALYSIS_RUN_STATUS.FAILED:
      return normalized
    default:
      return null
  }
}

export function normalizeUploadSessionStatus(value) {
  const normalized = String(value || '').toUpperCase()
  switch (normalized) {
    case UPLOAD_SESSION_STATUS.READY:
    case UPLOAD_SESSION_STATUS.QUEUED:
    case UPLOAD_SESSION_STATUS.PARSING:
    case UPLOAD_SESSION_STATUS.PARSED:
    case UPLOAD_SESSION_STATUS.FAILED:
      return normalized
    default:
      return null
  }
}

export function toPublicAnalysisStatus(value) {
  const normalized = normalizeAnalysisRunStatus(value)
  if (!normalized) return ANALYSIS_PUBLIC_STATUS.PENDING
  if (normalized === ANALYSIS_RUN_STATUS.FAILED) return ANALYSIS_PUBLIC_STATUS.FAILED
  if (normalized === ANALYSIS_RUN_STATUS.COMPLETED) return ANALYSIS_PUBLIC_STATUS.READY
  return ANALYSIS_PUBLIC_STATUS.ANALYZING
}

export function isPublicAnalysisTerminalStatus(value) {
  const normalized = String(value || '').toUpperCase()
  return normalized === ANALYSIS_PUBLIC_STATUS.READY || normalized === ANALYSIS_PUBLIC_STATUS.FAILED
}
