import { apiFetch } from '../api/client'

export async function createUploadSession(sourceApp) {
  const payload = await apiFetch('/upload-sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceApp }),
  })

  return payload.session
}

export async function uploadFile(uploadSessionId, file) {
  const form = new FormData()
  form.append('file', file)

  return apiFetch(`/upload-sessions/${uploadSessionId}/files`, {
    method: 'POST',
    body: form,
  })
}

export async function pasteText(uploadSessionId, text) {
  return apiFetch(`/upload-sessions/${uploadSessionId}/paste`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

export async function getStatus(uploadSessionId) {
  return apiFetch(`/upload-sessions/${uploadSessionId}`, {
    method: 'GET',
  })
}

export async function runAnalysis(uploadSessionId) {
  return apiFetch(`/upload-sessions/${uploadSessionId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
}

export async function getAnalysisStatus(analysisId) {
  return apiFetch(`/analyses/${analysisId}/status`, {
    method: 'GET',
  })
}
