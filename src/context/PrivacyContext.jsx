import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const PRIVACY_KEY = 'tpai:privacy:controls'

const PrivacyContext = createContext(null)

function readPrivacySettings() {
  try {
    const raw = localStorage.getItem(PRIVACY_KEY)
    if (!raw) return { hideNames: false, maskSensitiveInfo: true }
    const parsed = JSON.parse(raw)
    return {
      hideNames: Boolean(parsed.hideNames),
      maskSensitiveInfo: parsed.maskSensitiveInfo !== false,
    }
  } catch {
    return { hideNames: false, maskSensitiveInfo: true }
  }
}

export function PrivacyProvider({ children }) {
  const [settings, setSettings] = useState({ hideNames: false, maskSensitiveInfo: true })

  useEffect(() => {
    setSettings(readPrivacySettings())
  }, [])

  useEffect(() => {
    localStorage.setItem(PRIVACY_KEY, JSON.stringify(settings))
  }, [settings])

  const value = useMemo(
    () => ({
      hideNames: settings.hideNames,
      maskSensitiveInfo: settings.maskSensitiveInfo,
      setHideNames: (next) => setSettings((prev) => ({ ...prev, hideNames: Boolean(next) })),
      setMaskSensitiveInfo: (next) => setSettings((prev) => ({ ...prev, maskSensitiveInfo: Boolean(next) })),
      toggleHideNames: () => setSettings((prev) => ({ ...prev, hideNames: !prev.hideNames })),
      toggleMaskSensitiveInfo: () => setSettings((prev) => ({ ...prev, maskSensitiveInfo: !prev.maskSensitiveInfo })),
    }),
    [settings],
  )

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

export function usePrivacy() {
  const context = useContext(PrivacyContext)
  if (!context) {
    throw new Error('usePrivacy must be used within PrivacyProvider')
  }
  return context
}
