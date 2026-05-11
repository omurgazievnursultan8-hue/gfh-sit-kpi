import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../app/store'
import { markAllRead } from '../../features/notifications/notificationsSlice'

interface Props {
  onClose: () => void
}

export function NotificationsMenu({ onClose }: Props) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const { items, unreadCount } = useSelector((s: RootState) => s.notifications)

  const locale = i18n.language.startsWith('kg') ? 'ky-KG' : 'ru-RU'

  return (
    <>
      <div className="notif-menu" role="menu" aria-label={t('notification.title') as string}>
        <span className="notif-menu-mark" aria-hidden="true">N</span>

        <div className="notif-menu-head">
          <span className="notif-menu-title">{t('notification.title')}</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-menu-markall"
              onClick={() => dispatch(markAllRead())}
            >
              {t('notification.markAllRead')}
            </button>
          )}
        </div>

        <div className="notif-menu-list">
          {items.length === 0 ? (
            <div className="notif-menu-empty">{t('notification.noNotifications')}</div>
          ) : (
            items.slice(0, 10).map(n => (
              <div
                key={n.id}
                className={`notif-menu-item${!n.read ? ' unread' : ''}`}
                role="menuitem"
              >
                <div className="notif-menu-item-title">{n.titleRu}</div>
                {n.bodyRu && <div className="notif-menu-item-body">{n.bodyRu}</div>}
                <div className="notif-menu-item-time">
                  {new Date(n.createdAt).toLocaleString(locale)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="notif-menu-foot">
          <a href="/notifications" className="notif-menu-foot-link" onClick={onClose}>
            {t('notification.viewAll')} →
          </a>
        </div>
      </div>
    </>
  )
}
