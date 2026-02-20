import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clearIntent } from '../services/preferencesService'
import {
  changePassword as changePasswordRequest,
  clearSession,
  completeRegistration as completeRegistrationRequest,
  forgotPassword as forgotPasswordRequest,
  getSession,
  getVerificationStatus as getVerificationStatusRequest,
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
  registerStart as registerStartRequest,
  resendOtp as resendOtpRequest,
  resetPassword as resetPasswordRequest,
  setSession,
  verifyOtp as verifyOtpRequest,
} from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      const existing = getSession()
      if (!existing?.user?.email) {
        if (active) {
          setSessionState(null)
          setIsBootstrapping(false)
        }
        return
      }

      const result = await meRequest()
      if (!active) return

      if (result.ok) {
        const next = {
          ...existing,
          user: result.user,
        }
        setSession(next)
        setSessionState(next)
      } else {
        clearSession()
        setSessionState(null)
      }

      setIsBootstrapping(false)
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => {
    const registerStart = async (payload) => registerStartRequest(payload)
    const verifyOtp = async (payload) => verifyOtpRequest(payload)
    const resendOtp = async (payload) => resendOtpRequest(payload)
    const getVerificationStatus = async (email) => getVerificationStatusRequest(email)

    const completeRegistration = async (email) => {
      const result = await completeRegistrationRequest(email)
      if (!result.ok) return result
      setSessionState(result.session)
      return { ok: true }
    }

    const signIn = async ({ email, password }) => {
      const result = await loginRequest(email, password)
      if (!result.ok) return result
      setSessionState(result.session)
      return { ok: true }
    }

    const forgotPassword = async (email) => forgotPasswordRequest(email)

    const resetPassword = async ({ email, otp, newPassword }) => {
      const result = await resetPasswordRequest({ email, otp, newPassword })
      if (!result.ok) return result
      setSessionState(result.session)
      return { ok: true }
    }

    const changePassword = async ({ currentPassword, newPassword }) =>
      changePasswordRequest({ currentPassword, newPassword })

    const signOut = async () => {
      clearIntent(session?.user?.email)
      await logoutRequest()
      setSessionState(null)
    }

    return {
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.user?.email),
      isBootstrapping,
      registerStart,
      verifyOtp,
      resendOtp,
      getVerificationStatus,
      completeRegistration,
      signIn,
      forgotPassword,
      resetPassword,
      changePassword,
      signOut,
    }
  }, [isBootstrapping, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
