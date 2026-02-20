const rawApiUrl = String(import.meta.env.VITE_API_URL || '').trim()

export const API_BASE_URL = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : ''
export const AI_MODE = String(import.meta.env.VITE_AI_MODE || 'demo').trim().toLowerCase() || 'demo'

export function isApiConfigured(): boolean {
  return Boolean(API_BASE_URL)
}
