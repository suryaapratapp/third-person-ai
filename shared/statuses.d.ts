export declare const UPLOAD_SESSION_STATUS: Readonly<{
  READY: 'READY'
  QUEUED: 'QUEUED'
  PARSING: 'PARSING'
  PARSED: 'PARSED'
  FAILED: 'FAILED'
}>

export declare const ANALYSIS_RUN_STATUS: Readonly<{
  QUEUED: 'QUEUED'
  RUNNING: 'RUNNING'
  COMPLETED: 'COMPLETED'
  FAILED: 'FAILED'
}>

export declare const ANALYSIS_PUBLIC_STATUS: Readonly<{
  READY: 'READY'
  ANALYZING: 'ANALYZING'
  FAILED: 'FAILED'
  PENDING: 'PENDING'
}>

export declare const ACTIVE_ANALYSIS_RUN_STATUSES: readonly ('QUEUED' | 'RUNNING')[]
export declare const ACTIVE_UPLOAD_SESSION_STATUSES: readonly ('QUEUED' | 'PARSING')[]

export declare function normalizeAnalysisRunStatus(
  value: unknown,
): 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null

export declare function normalizeUploadSessionStatus(
  value: unknown,
): 'READY' | 'QUEUED' | 'PARSING' | 'PARSED' | 'FAILED' | null

export declare function toPublicAnalysisStatus(
  value: unknown,
): 'READY' | 'ANALYZING' | 'FAILED' | 'PENDING'

export declare function isPublicAnalysisTerminalStatus(value: unknown): boolean
