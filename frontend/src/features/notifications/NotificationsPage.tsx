import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { AppDispatch, RootState } from '../../app/store'
import { fetchNotifications, markAllRead, type Notification } from './notificationsSlice'
import { usePageTitle } from '../../context/PageContext'

export function NotificationsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { t, i18n } = useTranslation()
  const { items, unreadCount, loading } = useSelector((s: RootState) => s.notifications)

  usePageTitle('notification.title')
  useEffect(() => { dispatch(fetchNotifications()) }, [dispatch])

  const isKg = i18n.language.startsWith('kg')
  const locale = isKg ? 'ky-KG' : 'ru-RU'
  const pickTitle = (n: Notification) => (isKg ? n.titleKg : n.titleRu) || n.titleRu
  const pickBody = (n: Notification) => (isKg ? n.bodyKg : n.bodyRu) || n.bodyRu

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 id="notif-page-title" className="text-2xl font-bold text-gray-900">
          {t('notification.title')}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={() => dispatch(markAllRead())}
            className="text-sm text-primary hover:underline"
          >
            {t('notification.markAllRead')} ({unreadCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400" role="status">
          {t('common.loading', 'Загрузка...')}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12" role="status">
          <Bell size={48} className="mx-auto text-gray-200 mb-4" aria-hidden="true" />
          <p className="text-gray-400">{t('notification.noNotifications')}</p>
        </div>
      ) : (
        <ul
          className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100"
          role="list"
          aria-labelledby="notif-page-title"
        >
          {items.map(n => {
            const body = pickBody(n)
            const unreadSrLabel = !n.read
              ? `${t('notification.unread', 'Не прочитано')} — ${pickTitle(n)}`
              : undefined
            return (
              <li
                key={n.id}
                className={`px-4 py-4 hover:bg-gray-50 ${!n.read ? 'bg-blue-50' : ''}`}
                aria-label={unreadSrLabel}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <span
                          className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="font-medium text-gray-900 text-sm">{pickTitle(n)}</span>
                    </div>
                    {body && (
                      <p className="text-sm text-gray-600 mt-1">{body}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                    <time dateTime={n.createdAt}>
                      {new Date(n.createdAt).toLocaleString(locale)}
                    </time>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
