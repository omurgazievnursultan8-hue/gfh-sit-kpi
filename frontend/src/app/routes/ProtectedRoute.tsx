import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { RootState } from '@/app/store'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, role, passwordExpired, pdpaRequired, bootstrapped } = useSelector((s: RootState) => s.auth)
  const location = useLocation()
  const { t } = useTranslation()

  // Wait for the mount-time /auth/me check before deciding to redirect.
  if (!bootstrapped) {
    return (
      <div className="auth-splash" role="status" aria-busy="true" aria-live="polite">
        <span className="sr-only">{t('common.loading', 'Загрузка...')}</span>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  // Skip self-redirect on /change-password and /pdpa-consent — otherwise
  // the page that satisfies the requirement loops on itself.
  if (passwordExpired && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  if (pdpaRequired && location.pathname !== '/pdpa-consent' && location.pathname !== '/change-password') {
    return <Navigate to="/pdpa-consent" replace />
  }
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
