import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isClientAdminEmail } from '../../config/runtime'

export default function AdminRoute({ children }) {
  const { user, isBootstrapping, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isBootstrapping) return null

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/auth/signin"
        replace
        state={{
          from: location.pathname + location.search,
          message: 'Please sign in to continue.',
        }}
      />
    )
  }

  if (!isClientAdminEmail(user?.email)) {
    return (
      <Navigate
        to="/analyses"
        replace
        state={{ notice: 'Admin access required for that page.' }}
      />
    )
  }

  return children
}
