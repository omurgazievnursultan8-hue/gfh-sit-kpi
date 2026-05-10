import { Outlet, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  const role = useSelector((s: RootState) => s.auth.role)

  if (role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}
