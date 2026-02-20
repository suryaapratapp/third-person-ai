const PUTER_SRC = 'https://js.puter.com/v2/'
let loadingPromise = null

export async function loadPuter() {
  if (typeof window === 'undefined') {
    throw new Error('Demo AI is only available in browser mode.')
  }

  if (window.puter) return window.puter
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PUTER_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.puter))
      existing.addEventListener('error', () => reject(new Error('Failed to load Demo AI script.')))
      return
    }

    const script = document.createElement('script')
    script.src = PUTER_SRC
    script.async = true
    script.onload = () => {
      if (!window.puter) {
        reject(new Error('Demo AI script loaded, but the service is unavailable right now.'))
        return
      }
      resolve(window.puter)
    }
    script.onerror = () => reject(new Error('Failed to load Demo AI script.'))
    document.head.appendChild(script)
  }).finally(() => {
    loadingPromise = null
  })

  return loadingPromise
}
