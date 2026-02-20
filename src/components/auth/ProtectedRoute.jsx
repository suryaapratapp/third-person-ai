import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return null
  }

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

  return children
}
