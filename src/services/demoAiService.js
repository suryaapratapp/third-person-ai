import {
  appendLoveGuruThreadMessage,
  clearDemoAnalysesStore,
  createThreadStore,
  deleteDemoAnalysisStore,
  deleteThreadStore,
  getDemoAnalysisStore,
  getThreadMessagesStore,
  listDemoAnalysesStore,
  listThreadsStoreByAnalysis,
  runDemoPipeline,
  sendLoveGuru,
} from './demoAiOrchestrator'
import { loadPuter } from '../utils/loadPuter'
import { hasDemoModeConsent, isDemoModeEnabled } from './demoModeService'

function createDemoError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

export async function ensureDemoAiReady(options = {}) {
  const requireConsent = options.requireConsent !== false

  if (!isDemoModeEnabled()) {
    throw createDemoError('DEMO_MODE_DISABLED', 'Demo Mode is disabled.')
  }
  if (requireConsent && !hasDemoModeConsent()) {
    throw createDemoError('DEMO_CONSENT_REQUIRED', 'Consent is required before using Demo Mode.')
  }

  try {
    await loadPuter()
  } catch (error) {
    throw createDemoError('DEMO_AI_UNAVAILABLE', error?.message || 'Demo AI unavailable right now.')
  }
}

export async function runDemoAnalysis({
  inputText,
  manualParticipants = [],
  manualDateRange = null,
  sendFullText = false,
  intent = null,
}) {
  return runDemoPipeline({
    rawText: inputText,
    manualParticipants,
    manualDateRange,
    allowRawSend: Boolean(sendFullText),
    personaPreference: intent || null,
  })
}

export function listDemoAnalyses() {
  return listDemoAnalysesStore()
}

export function getDemoAnalysis(id) {
  return getDemoAnalysisStore(id)
}

export function deleteDemoAnalysis(id) {
  deleteDemoAnalysisStore(id)
  try {
    localStorage.removeItem(`tpai:notes:${id}`)
  } catch {
    // no-op
  }
}

export function clearDemoAnalyses() {
  clearDemoAnalysesStore()
}

export function listDemoThreads(analysisId) {
  return listThreadsStoreByAnalysis(analysisId)
}

export function createDemoThread({ analysisId, persona, tone }) {
  return createThreadStore({ analysisId, persona, tone })
}

export function getDemoThreadMessages(threadId) {
  return getThreadMessagesStore(threadId)
}

export function deleteDemoThread(threadId) {
  deleteThreadStore(threadId)
}

export async function sendLoveGuruMessage({
  analysisSummary,
  threadContext = [],
  userMessage,
  persona,
  tone,
}) {
  if (!analysisSummary?.id) {
    throw createDemoError('DEMO_ANALYSIS_NOT_FOUND', 'Analysis not found for Love Guru context.')
  }
  return sendLoveGuru({
    analysisId: analysisSummary.id,
    threadId: analysisSummary.threadId,
    persona,
    tone,
    userMessage,
    threadMessages: threadContext,
  })
}

export async function sendDemoLoveGuruThreadMessage({
  threadId,
  analysis,
  userMessage,
  persona,
  tone,
}) {
  if (!analysis?.id) {
    throw createDemoError('DEMO_ANALYSIS_NOT_FOUND', 'Analysis context missing for Love Guru.')
  }
  return appendLoveGuruThreadMessage({
    analysisId: analysis.id,
    threadId,
    persona,
    tone,
    userMessage,
  })
}
