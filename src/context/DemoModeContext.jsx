import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  hasDemoModeConsent,
  isDemoModeEnabled,
  isEnvDemoMode,
  isFullTextDemoEnabledForSession,
  setDemoModeConsent,
  setDemoModeEnabled,
  setFullTextDemoEnabledForSession,
} from '../services/demoModeService'

const DemoModeContext = createContext(null)

export function DemoModeProvider({ children }) {
  const [enabled, setEnabled] = useState(() => isDemoModeEnabled())
  const [consent, setConsent] = useState(() => hasDemoModeConsent())
  const [fullTextSessionEnabled, setFullTextSessionEnabled] = useState(() => isFullTextDemoEnabledForSession())

  useEffect(() => {
    const sync = () => {
      setEnabled(isDemoModeEnabled())
      setConsent(hasDemoModeConsent())
      setFullTextSessionEnabled(isFullTextDemoEnabledForSession())
    }

    window.addEventListener('storage', sync)
    window.addEventListener('tpai:demo-mode-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('tpai:demo-mode-changed', sync)
    }
  }, [])

  const value = useMemo(
    () => ({
      envDemo: isEnvDemoMode(),
      enabled,
      consent,
      fullTextSessionEnabled,
      setEnabled: (nextValue) => {
        setDemoModeEnabled(Boolean(nextValue))
        setEnabled(isDemoModeEnabled())
      },
      setConsent: (nextValue) => {
        setDemoModeConsent(Boolean(nextValue))
        setConsent(hasDemoModeConsent())
      },
      setFullTextSessionEnabled: (nextValue) => {
        setFullTextDemoEnabledForSession(Boolean(nextValue))
        setFullTextSessionEnabled(isFullTextDemoEnabledForSession())
      },
    }),
    [consent, enabled, fullTextSessionEnabled],
  )

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>
}

export function useDemoMode() {
  const context = useContext(DemoModeContext)
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider')
  }
  return context
}

