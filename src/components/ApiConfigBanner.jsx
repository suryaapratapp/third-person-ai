import { API_BASE_URL, isApiConfigured } from '../config/runtime'

export default function ApiConfigBanner() {
  if (isApiConfigured()) return null

  return (
    <div className="mx-auto mt-2 max-w-6xl rounded-lg border border-rose-300/40 bg-rose-300/12 px-3 py-2 text-xs text-rose-100">
      API is not configured (VITE_API_URL missing).
      {API_BASE_URL ? null : ' Set VITE_API_URL and redeploy.'}
    </div>
  )
}
