import { apiFetch } from '../api/client'

function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query.set(key, String(value))
  })
  const raw = query.toString()
  return raw ? `?${raw}` : ''
}

export async function listAdminUsers(params) {
  return apiFetch(`/admin/users${toQuery(params)}`, { method: 'GET' })
}

export async function createAdminUser(payload) {
  return apiFetch('/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function updateAdminUser(id, payload) {
  return apiFetch(`/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminUser(id) {
  return apiFetch(`/admin/users/${id}`, {
    method: 'DELETE',
  })
}

export async function listAdminUploadSessions(params) {
  return apiFetch(`/admin/upload-sessions${toQuery(params)}`, { method: 'GET' })
}

export async function updateAdminUploadSession(id, payload) {
  return apiFetch(`/admin/upload-sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminUploadSession(id) {
  return apiFetch(`/admin/upload-sessions/${id}`, {
    method: 'DELETE',
  })
}
