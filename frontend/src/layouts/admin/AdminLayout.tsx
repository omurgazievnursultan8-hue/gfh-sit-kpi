import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'

export function AdminLayout() {
  const role = useSelector((s: RootState) => s.auth.role)
  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
