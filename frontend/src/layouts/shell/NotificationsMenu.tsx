import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { AppDispatch, RootState } from '../../app/store'
import { markAllRead } from '@/features/notifications/slice'

interface Props {
  onClose: () => void
}

export function NotificationsMenu({ onClose }: Props) {
  const { t, i18n } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const { items, unreadCount } = useSelector((s: RootState) => s.notifications)
  const rootRef = useRef<HTMLDivElement>(null)

  // Focus first interactive element on mount + Tab-trap inside dialog.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const focusables = () => Array.from(
      root.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null)
    const first = focusables()[0]
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) return
      const f = list[0]
      const l = list[list.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === f) { e.preventDefault(); l.focus() }
      else if (!e.shiftKey && active === l) { e.preventDefault(); f.focus() }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [])

  const isKg = i18n.language.startsWith('kg')
  const locale = isKg ? 'ky-KG' : 'ru-RU'
  const pickTitle = (n: typeof items[number]) => (isKg ? n.titleKg : n.titleRu) || n.titleRu
  const pickBody = (n: typeof items[number]) => (isKg ? n.bodyKg : n.bodyRu) || n.bodyRu

  return (
    <div
      ref={rootRef}
      id="gfh-notif-menu"
      className="notif-menu"
      role="dialog"
      aria-label={t('notification.title') as string}
    >
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

      {items.length === 0 ? (
        <div className="notif-menu-list">
          <div className="notif-menu-empty" role="status">{t('notification.noNotifications')}</div>
        </div>
      ) : (
        <ul className="notif-menu-list" role="list">
          {items.slice(0, 10).map(n => {
            const body = pickBody(n)
            return (
              <li
                key={n.id}
                className={`notif-menu-item${!n.read ? ' unread' : ''}`}
                aria-label={!n.read ? (t('notification.unread', 'Не прочитано') + ' — ' + pickTitle(n)) : undefined}
              >
                <div className="notif-menu-item-title">{pickTitle(n)}</div>
                {body && <div className="notif-menu-item-body">{body}</div>}
                <div className="notif-menu-item-time">
                  <time dateTime={n.createdAt}>
                    {new Date(n.createdAt).toLocaleString(locale)}
                  </time>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="notif-menu-foot">
        <Link to="/notifications" className="notif-menu-foot-link" onClick={onClose}>
          {t('notification.viewAll')} →
        </Link>
      </div>
    </div>
  )
}
