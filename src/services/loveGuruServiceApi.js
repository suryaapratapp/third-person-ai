import { apiFetch } from '../api/client'

export async function createThread({ analysisId, persona, tone }) {
  const payload = await apiFetch('/love-guru/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysisId, persona, tone }),
  })

  return payload.thread
}

export async function listThreads(analysisId) {
  const payload = await apiFetch(`/love-guru/threads?analysisId=${encodeURIComponent(analysisId)}`, {
    method: 'GET',
  })

  return Array.isArray(payload?.threads) ? payload.threads : []
}

export async function getMessages(threadId) {
  const payload = await apiFetch(`/love-guru/threads/${threadId}/messages`, {
    method: 'GET',
  })

  return Array.isArray(payload?.messages) ? payload.messages : []
}

export async function sendMessage(threadId, text) {
  return apiFetch(`/love-guru/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}
