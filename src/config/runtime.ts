const rawApiUrl = String(import.meta.env.VITE_API_URL || '').trim()
const rawAdminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '').trim()

export const API_BASE_URL = rawApiUrl ? rawApiUrl.replace(/\/$/, '') : ''
export const AI_MODE = String(import.meta.env.VITE_AI_MODE || 'demo').trim().toLowerCase() || 'demo'
export const ADMIN_EMAILS = rawAdminEmails
  ? rawAdminEmails
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
  : []

export function isApiConfigured(): boolean {
  return Boolean(API_BASE_URL)
}

export function isClientAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  if (!ADMIN_EMAILS.length) return false
  return ADMIN_EMAILS.includes(String(email).toLowerCase().trim())
}
