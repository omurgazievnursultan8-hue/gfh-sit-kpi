import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, Search } from 'lucide-react'
import { AppDispatch, RootState } from '../../app/store'
import { markAllRead, fetchNotifications } from '../../features/notifications/notificationsSlice'
import { usePageTitleKey } from '../../context/PageContext'
import { NAV_SECTIONS } from './navConfig'
import { getInitials } from './shellUtils'

interface TopbarProps {
  onHamburgerClick: () => void
  onSearchClick?: () => void
}

export function Topbar({ onHamburgerClick, onSearchClick }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { email } = useSelector((s: RootState) => s.auth)
  const { items, unreadCount } = useSelector((s: RootState) => s.notifications)
  const dispatch = useDispatch<AppDispatch>()
  const contextTitleKey = usePageTitleKey()
  const [bellOpen, setBellOpen] = useState(false)

  const derivedLabel = useMemo(() => {
    for (const section of NAV_SECTIONS) {
      for (const group of section.groups) {
        const item = group.items.find(i =>
          i.end
            ? location.pathname === i.to
            : location.pathname.startsWith(i.to)
        )
        if (item) return t(item.labelKey)
      }
    }
    return ''
  }, [location.pathname, t])

  const pageLabel = contextTitleKey ? t(contextTitleKey) : derivedLabel

  const handleBellClick = () => {
    if (!bellOpen) dispatch(fetchNotifications())
    setBellOpen(o => !o)
  }

  const handleLang = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('gfh_lang', lng)
  }

  const currentLang = i18n.language.startsWith('kg') ? 'kg' : 'ru'
  const initials = email ? getInitials(email) : '?'

  return (
    <header className="app-topbar">
      <button className="hamburger" onClick={onHamburgerClick} type="button">
        <svg viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="topbar-crumbs">
        <span>{t('nav.home')}</span>
        {pageLabel && (
          <>
            <span className="sep">/</span>
            <span className="current">{pageLabel}</span>
          </>
        )}
      </div>

      <div className="topbar-actions">
        {onSearchClick && (
          <button className="topbar-search" onClick={onSearchClick} type="button" title="Cmd/Ctrl+K">
            <Search size={15} />
            <span className="topbar-search-label">{t('palette.placeholder', 'Поиск разделов…')}</span>
            <kbd className="topbar-search-kbd">⌘K</kbd>
          </button>
        )}

        <div className="lang-toggle">
          <button
            className={currentLang === 'ru' ? 'lang-active' : ''}
            onClick={() => handleLang('ru')}
            type="button"
          >
            RU
          </button>
          <button
            className={currentLang === 'kg' ? 'lang-active' : ''}
            onClick={() => handleLang('kg')}
            type="button"
          >
            KG
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button className="topbar-iconbtn" onClick={handleBellClick} type="button">
            <Bell />
            {unreadCount > 0 && <span className="topbar-dot-notif" />}
          </button>

          {bellOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setBellOpen(false)}
              />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 320, background: 'var(--surface)',
                border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)', zIndex: 50,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderBottom: '1px solid var(--line-soft)',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                    Уведомления
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => dispatch(markAllRead())}
                      style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                      type="button"
                    >
                      Отметить все
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {items.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
                      Нет уведомлений
                    </div>
                  ) : (
                    items.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--line-soft)',
                          background: !n.read ? 'var(--accent-mute)' : undefined,
                        }}
                      >
                        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{n.titleRu}</div>
                        {n.bodyRu && (
                          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{n.bodyRu}</div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4 }}>
                          {new Date(n.createdAt).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--line-soft)' }}>
                  <a href="/notifications" style={{ fontSize: 12, color: 'var(--accent)' }}
                    onClick={() => setBellOpen(false)}>
                    Все уведомления →
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="topbar-avatar" title={email ?? ''}>{initials}</div>
      </div>
    </header>
  )
}
