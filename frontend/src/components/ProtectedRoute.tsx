import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../app/store'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, role, passwordExpired, bootstrapped } = useSelector((s: RootState) => s.auth)

  // Wait for the mount-time /auth/me check before deciding to redirect.
  if (!bootstrapped) {
    return <div className="auth-splash" aria-busy="true" />
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (passwordExpired) return <Navigate to="/change-password" replace />
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
