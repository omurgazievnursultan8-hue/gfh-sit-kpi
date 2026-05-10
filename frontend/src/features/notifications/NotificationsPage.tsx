import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Bell } from 'lucide-react'
import { AppDispatch, RootState } from '../../app/store'
import { fetchNotifications, markAllRead } from './notificationsSlice'

export function NotificationsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { items, unreadCount, loading } = useSelector((s: RootState) => s.notifications)

  useEffect(() => { dispatch(fetchNotifications()) }, [dispatch])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Уведомления</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => dispatch(markAllRead())}
            className="text-sm text-primary hover:underline"
          >
            Отметить все как прочитанные ({unreadCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400">Уведомлений нет</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {items.map(n => (
            <div key={n.id} className={`px-4 py-4 hover:bg-gray-50 ${!n.read ? 'bg-blue-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                    <span className="font-medium text-gray-900 text-sm">{n.titleRu}</span>
                  </div>
                  {n.bodyRu && (
                    <p className="text-sm text-gray-600 mt-1">{n.bodyRu}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                  {new Date(n.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
