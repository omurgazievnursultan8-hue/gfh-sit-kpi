import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
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
  mobileNavOpen?: boolean
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')
const SEARCH_KBD = IS_MAC ? '⌘K' : 'Ctrl+K'

export function Topbar({ onHamburgerClick, onSearchClick, mobileNavOpen }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { unreadCount } = useSelector((s: RootState) => s.notifications)
  const dispatch = useDispatch<AppDispatch>()
  const contextTitleKey = usePageTitleKey()
  const [bellOpen, setBellOpen] = useState(false)
  const bellWrapRef = useRef<HTMLDivElement>(null)
  const bellBtnRef = useRef<HTMLButtonElement>(null)
  const prevBellOpenRef = useRef(false)
  const hoverCloseTimer = useRef<number | null>(null)
  const cancelHoverClose = () => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current)
      hoverCloseTimer.current = null
    }
  }
  const scheduleHoverClose = () => {
    cancelHoverClose()
    hoverCloseTimer.current = window.setTimeout(() => setBellOpen(false), 140)
  }
  useEffect(() => () => cancelHoverClose(), [])

  useEffect(() => {
    if (!bellOpen) return
    const onDown = (e: MouseEvent) => {
      if (!bellWrapRef.current?.contains(e.target as Node)) setBellOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBellOpen(false)
        bellBtnRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [bellOpen])

  // Restore focus to bell button on close (any path), but not on initial mount.
  useEffect(() => {
    if (prevBellOpenRef.current && !bellOpen) {
      const active = document.activeElement
      const insideWrap = !!bellWrapRef.current && active instanceof Node && bellWrapRef.current.contains(active)
      if (insideWrap) bellBtnRef.current?.focus()
    }
    prevBellOpenRef.current = bellOpen
  }, [bellOpen])

  // Throttle notification refetch on hover-reopen — rapid mouseenter/leave loops
  // otherwise hammer /notifications endpoint.
  const FETCH_THROTTLE_MS = 5_000
  const lastFetchRef = useRef(0)
  const fetchNotificationsThrottled = () => {
    const now = Date.now()
    if (now - lastFetchRef.current < FETCH_THROTTLE_MS) return
    lastFetchRef.current = now
    dispatch(fetchNotifications())
  }
  const openBell = () => {
    cancelHoverClose()
    if (!bellOpen) fetchNotificationsThrottled()
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
    if (!bellOpen) fetchNotificationsThrottled()
    setBellOpen(o => !o)
  }

  return (
    <header className="app-topbar">
      <button
        className="hamburger"
        onClick={onHamburgerClick}
        type="button"
        aria-label={t('nav.toggleMenu', 'Меню навигации') as string}
        aria-controls="gfh-icon-rail"
        aria-expanded={!!mobileNavOpen}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <nav className="topbar-crumbs" aria-label={t('nav.breadcrumbs', 'Хлебные крошки') as string}>
        {pageLabel ? (
          <Link to="/dashboard" className="topbar-crumb-link">{t('nav.home')}</Link>
        ) : (
          <span aria-current="page">{t('nav.home')}</span>
        )}
        {pageLabel && (
          <>
            <span className="sep" aria-hidden="true">/</span>
            <span className="current" aria-current="page">{pageLabel}</span>
          </>
        )}
      </nav>

      <div className="topbar-actions">
        {onSearchClick && (
          <button
            className="topbar-search"
            onClick={onSearchClick}
            type="button"
            title={`${t('palette.placeholder', 'Поиск разделов…')} (${SEARCH_KBD})`}
            aria-label={t('palette.placeholder', 'Поиск разделов…') as string}
            aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
          >
            <Search size={15} aria-hidden="true" />
            <span className="topbar-search-label">{t('palette.placeholder', 'Поиск разделов…')}</span>
            <kbd className="topbar-search-kbd" aria-hidden="true">{SEARCH_KBD}</kbd>
          </button>
        )}

        <div
          className="topbar-bell-wrap"
          ref={bellWrapRef}
          onMouseEnter={openBell}
          onMouseLeave={scheduleHoverClose}
        >
          <button
            ref={bellBtnRef}
            className="topbar-iconbtn"
            onClick={handleBellClick}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || (e.key === 'Enter' && !bellOpen)) {
                e.preventDefault()
                cancelHoverClose()
                if (!bellOpen) fetchNotificationsThrottled()
                setBellOpen(true)
              }
            }}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={bellOpen}
            aria-controls="gfh-notif-menu"
            aria-label={
              (unreadCount > 0
                ? t('nav.notificationsWithCount', { count: unreadCount, defaultValue: 'Уведомления ({{count}} непрочитанных)' })
                : t('nav.notifications', 'Уведомления')) as string
            }
          >
            <Bell aria-hidden="true" />
            {unreadCount > 0 && <span className="topbar-dot-notif" aria-hidden="true" />}
          </button>

          {bellOpen && <NotificationsMenu onClose={() => setBellOpen(false)} />}
        </div>

      </div>
    </header>
  )
}
