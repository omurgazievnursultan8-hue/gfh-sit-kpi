import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { logoutAction } from '../features/auth/authSlice'
import { markAllRead, fetchNotifications } from '../features/notifications/notificationsSlice'
import { AppDispatch, RootState } from '../app/store'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Header() {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { email, role } = useSelector((s: RootState) => s.auth)
  const { items, unreadCount } = useSelector((s: RootState) => s.notifications)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = async () => {
    await dispatch(logoutAction())
    navigate('/login')
  }

  const handleBellClick = () => {
    if (!dropdownOpen) dispatch(fetchNotifications())
    setDropdownOpen(!dropdownOpen)
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-10">
      <span className="text-sm text-gray-500">{role}</span>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        <div className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 text-gray-500 hover:text-gray-800"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="font-semibold text-gray-900 text-sm">Уведомления</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => dispatch(markAllRead())}
                      className="text-xs text-primary hover:underline"
                    >
                      Отметить все как прочитанные
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-400">
                      Нет уведомлений
                    </div>
                  ) : (
                    items.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${
                          !n.read ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900 text-sm">{n.titleRu}</div>
                        {n.bodyRu && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.bodyRu}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-gray-100">
                  <a href="/notifications" className="text-xs text-primary hover:underline"
                    onClick={() => setDropdownOpen(false)}>
                    Все уведомления →
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        <span className="text-sm text-gray-700">{email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:underline"
        >
          {t('nav.logout')}
        </button>
      </div>
    </header>
  )
}
