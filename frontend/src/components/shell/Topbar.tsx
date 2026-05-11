import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, Search } from 'lucide-react'
import { AppDispatch, RootState } from '../../app/store'
import { fetchNotifications } from '../../features/notifications/notificationsSlice'
import { usePageTitleKey } from '../../context/PageContext'
import { NAV_SECTIONS } from './navConfig'
import { NotificationsMenu } from './NotificationsMenu'

interface TopbarProps {
  onHamburgerClick: () => void
  onSearchClick?: () => void
}

export function Topbar({ onHamburgerClick, onSearchClick }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { unreadCount } = useSelector((s: RootState) => s.notifications)
  const dispatch = useDispatch<AppDispatch>()
  const contextTitleKey = usePageTitleKey()
  const [bellOpen, setBellOpen] = useState(false)
  const bellWrapRef = useRef<HTMLDivElement>(null)
  const hoverCloseTimer = useRef<number | null>(null)
  const cancelHoverClose = () => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current)
      hoverCloseTimer.current = null
    }
  }
  const scheduleHoverClose = () => {
    cancelHoverClose()
    hoverCloseTimer.current = window.setTimeout(() => setBellOpen(false), 220)
  }
  useEffect(() => () => cancelHoverClose(), [])

  useEffect(() => {
    if (!bellOpen) return
    const onDown = (e: MouseEvent) => {
      if (!bellWrapRef.current?.contains(e.target as Node)) setBellOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBellOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [bellOpen])

  const openBell = () => {
    cancelHoverClose()
    if (!bellOpen) dispatch(fetchNotifications())
    setBellOpen(true)
  }

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
  }, [location.pathname, t, i18n.language])

  const pageLabel = contextTitleKey ? t(contextTitleKey) : derivedLabel

  const handleBellClick = () => {
    cancelHoverClose()
    if (!bellOpen) dispatch(fetchNotifications())
    setBellOpen(o => !o)
  }

  return (
    <header className="app-topbar">
      <button
        className="hamburger"
        onClick={onHamburgerClick}
        type="button"
        aria-label={t('nav.toggleMenu', 'Меню навигации') as string}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
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

        <div
          className="topbar-bell-wrap"
          ref={bellWrapRef}
          onMouseEnter={openBell}
          onMouseLeave={scheduleHoverClose}
        >
          <button
            className="topbar-iconbtn"
            onClick={handleBellClick}
            onFocus={openBell}
            type="button"
            aria-haspopup="menu"
            aria-expanded={bellOpen}
          >
            <Bell />
            {unreadCount > 0 && <span className="topbar-dot-notif" />}
          </button>

          {bellOpen && <NotificationsMenu onClose={() => setBellOpen(false)} />}
        </div>

      </div>
    </header>
  )
}
