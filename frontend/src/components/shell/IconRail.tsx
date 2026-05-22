import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, NavLink } from 'react-router-dom'
import { LogOut, Lock, Bell, Search } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role } from './navConfig'
import { RootState, AppDispatch } from '../../app/store'
import { logoutAction } from '../../features/auth/authSlice'
import { fetchNotifications } from '../../features/notifications/notificationsSlice'
import { useTheme } from '../../hooks/useTheme'
import { useDensity } from '../../hooks/useDensity'
import { useTranslation } from 'react-i18next'
import { getInitials } from './shellUtils'
import { useUserCounters } from './useUserCounters'
import { NotificationsMenu } from './NotificationsMenu'

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')
const SEARCH_KBD = IS_MAC ? '⌘K' : 'Ctrl+K'

const ROLE_KEY: Record<string, string> = {
  ADMIN: 'nav.roleAdmin',
  CHAIRMAN: 'nav.roleChairman',
  DEPUTY_CHAIRMAN: 'nav.roleDeputyChairman',
  HEAD_OF_DEPARTMENT: 'nav.roleHeadOfDepartment',
  HEAD_OF_DEPARTMENT_UNIT: 'nav.roleHeadOfDepartmentUnit',
  EMPLOYEE: 'nav.roleEmployee',
}

interface IconRailProps {
  activeSection: SectionKey | null
  pinned: boolean
  onSectionClick: (section: SectionKey, trigger?: HTMLElement | null) => void
  onSectionHover: (section: SectionKey) => void
  onRailEnter: () => void
  onRailLeave: () => void
  onOpenPalette: () => void
  mobileOpen: boolean
}

export function IconRail({ activeSection, pinned, onSectionClick, onSectionHover, onRailEnter, onRailLeave, onOpenPalette, mobileOpen }: IconRailProps) {
  const railRef = useRef<HTMLElement>(null)
  const { t, i18n } = useTranslation()
  const { role, email, fullName } = useSelector((s: RootState) => s.auth)
  const { unreadCount } = useSelector((s: RootState) => s.notifications)
  const counters = useUserCounters()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const { density, setDensity } = useDensity()
  const currentLang = (i18n.language?.startsWith('kg') ? 'kg' : 'ru') as 'ru' | 'kg'
  const setLang = (lng: 'ru' | 'kg') => {
    i18n.changeLanguage(lng)
    try { localStorage.setItem('gfh_lang', lng) } catch { /* noop */ }
  }
  const [menuOpen, setMenuOpen] = useState(false)
  // True only when menu opened via click/keyboard — used to gate focus move.
  const menuFocusOnOpenRef = useRef(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLButtonElement>(null)
  const hoverCloseTimer = useRef<number | null>(null)
  const cancelHoverClose = () => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current)
      hoverCloseTimer.current = null
    }
  }
  const scheduleHoverClose = () => {
    cancelHoverClose()
    hoverCloseTimer.current = window.setTimeout(() => setMenuOpen(false), 140)
  }
  useEffect(() => () => cancelHoverClose(), [])

  // Mobile drawer open: move focus to first rail-icon for keyboard users.
  const prevMobileRef = useRef(mobileOpen)
  useEffect(() => {
    if (mobileOpen && !prevMobileRef.current) {
      const first = railRef.current?.querySelector<HTMLButtonElement>('button.rail-icon')
      first?.focus()
    }
    prevMobileRef.current = mobileOpen
  }, [mobileOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || avatarRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    const getItems = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); avatarRef.current?.focus(); return }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
      const items = getItems()
      if (items.length === 0) return
      const idx = items.indexOf(document.activeElement as HTMLElement)
      e.preventDefault()
      let next = 0
      if (e.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % items.length
      else if (e.key === 'ArrowUp') next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length
      else if (e.key === 'Home') next = 0
      else if (e.key === 'End') next = items.length - 1
      items[next]?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    // Move focus into menu only when opened by click/keyboard, not hover.
    const raf = menuFocusOnOpenRef.current
      ? requestAnimationFrame(() => { getItems()[0]?.focus() })
      : 0
    menuFocusOnOpenRef.current = false
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [menuOpen])

  // Notifications bell (moved from topbar). Click-toggle — hover is reserved
  // for the rail's nav-panel peek, so the bell must not also hover-open.
  const [bellOpen, setBellOpen] = useState(false)
  const bellWrapRef = useRef<HTMLDivElement>(null)
  const bellBtnRef = useRef<HTMLButtonElement>(null)
  const FETCH_THROTTLE_MS = 5_000
  const lastFetchRef = useRef(0)
  const fetchNotificationsThrottled = () => {
    const now = Date.now()
    if (now - lastFetchRef.current < FETCH_THROTTLE_MS) return
    lastFetchRef.current = now
    dispatch(fetchNotifications())
  }
  useEffect(() => {
    if (!bellOpen) return
    const onDown = (e: MouseEvent) => {
      if (!bellWrapRef.current?.contains(e.target as Node)) setBellOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setBellOpen(false); bellBtnRef.current?.focus() }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [bellOpen])
  const toggleBell = () => {
    if (!bellOpen) fetchNotificationsThrottled()
    setBellOpen(o => !o)
  }

  const visibleSections = useMemo(
    () => NAV_SECTIONS.filter(s => role && s.roles.includes(role as Role)),
    [role],
  )
  const initials = getInitials(fullName ?? email)
  const displayName = fullName ?? email ?? ''

  const handleLogout = async () => {
    setMenuOpen(false)
    await dispatch(logoutAction())
    navigate('/login')
  }

  return (
    <nav
      ref={railRef as React.RefObject<HTMLElement>}
      id="gfh-icon-rail"
      className={`icon-rail${mobileOpen ? ' icon-rail--mobile-open' : ''}`}
      onMouseEnter={onRailEnter}
      onMouseLeave={onRailLeave}
      aria-label={t('nav.primary', 'Основная навигация') as string}
    >
      <NavLink to="/dashboard" end className="rail-logo" aria-label={t('shell.brand', 'АСУ КПИ') as string}>
        <span className="rail-logo-cell">
          <img
            src="/brand/gfh-mark.png"
            alt=""
            width={32}
            height={32}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement
              el.style.display = 'none'
              el.parentElement?.classList.add('rail-logo-cell--fallback')
            }}
          />
          <svg className="rail-logo-fallback-svg" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <rect x="2" y="2" width="28" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M9 22 L9 10 L16 10 L16 16 L23 16 L23 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square"/>
            <circle cx="23" cy="10" r="1.6" fill="currentColor"/>
          </svg>
        </span>
        <div className="rail-tooltip" aria-hidden="true">{t('shell.brand', 'АСУ КПИ')} · v1.0</div>
      </NavLink>

      {visibleSections.map(section => {
        const Icon = section.icon
        let count = 0
        if (section.key === 'cabinet') count = counters.pendingEvaluations + counters.unreadNotifications
        else if (section.key === 'admin') count = counters.openAppeals
        const label = count > 99 ? '99+' : String(count)
        const tier = count >= 10 ? 'danger' : count > 0 ? 'warn' : ''
        const isActive = activeSection === section.key
        return (
          <button
            key={section.key}
            className={`rail-icon${isActive ? ' active' : ''}${isActive && pinned ? ' pinned' : ''}`}
            onClick={(e) => onSectionClick(section.key, e.currentTarget)}
            onMouseEnter={() => onSectionHover(section.key)}
            type="button"
            aria-pressed={isActive && pinned ? true : undefined}
            aria-expanded={isActive}
            aria-controls="gfh-nav-panel"
            title={isActive && pinned ? t('nav.pinnedHint', 'Закреплено · клик чтобы открепить') : undefined}
          >
            <Icon aria-hidden="true" />
            {count > 0 && (
              <span
                className={`rail-count rail-count--${tier}`}
                role="status"
                aria-label={t('nav.badgeCount', '{{count}} новых', { count }) as string}
              >{label}</span>
            )}
            <span className="rail-label">{t(section.railKey)}</span>
            <div className="rail-tooltip" aria-hidden="true">{t(section.labelKey)}</div>
          </button>
        )
      })}

      <div className="rail-spacer" />

      <button
        className="rail-icon"
        type="button"
        onClick={onOpenPalette}
        aria-keyshortcuts={IS_MAC ? 'Meta+K' : 'Control+K'}
        aria-label={`${t('palette.placeholder', 'Поиск разделов…')} (${SEARCH_KBD})`}
      >
        <Search aria-hidden="true" />
        <span className="rail-label">{t('nav.search', 'Поиск')}</span>
        <div className="rail-tooltip" aria-hidden="true">{t('palette.placeholder', 'Поиск разделов…')} · {SEARCH_KBD}</div>
      </button>

      <div className="rail-notif-wrap" ref={bellWrapRef}>
        <button
          ref={bellBtnRef}
          className={`rail-icon${bellOpen ? ' active' : ''}`}
          type="button"
          onClick={toggleBell}
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
          {unreadCount > 0 && (
            <span className="rail-count rail-count--warn" role="status"
              aria-label={t('nav.badgeCount', '{{count}} новых', { count: unreadCount }) as string}
            >{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
          <span className="rail-label">{t('nav.notifications', 'Уведомления')}</span>
          {!bellOpen && <div className="rail-tooltip" aria-hidden="true">{t('nav.notifications', 'Уведомления')}</div>}
        </button>
        {bellOpen && <NotificationsMenu onClose={() => setBellOpen(false)} />}
      </div>

      <button
        ref={avatarRef}
        className={`rail-avatar-btn${menuOpen ? ' active' : ''}${role ? ` rail-avatar-btn--${role.toLowerCase()}` : ''}`}
        type="button"
        onClick={() => { cancelHoverClose(); menuFocusOnOpenRef.current = true; setMenuOpen(o => !o) }}
        onMouseEnter={() => { cancelHoverClose(); menuFocusOnOpenRef.current = false; setMenuOpen(true) }}
        onMouseLeave={scheduleHoverClose}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            menuFocusOnOpenRef.current = true
            setMenuOpen(true)
          }
        }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls="gfh-account-menu"
        aria-label={displayName || (t('nav.menuAccount', 'Аккаунт') as string)}
      >
        {initials}
        {!menuOpen && <div className="rail-tooltip" aria-hidden="true">{displayName}</div>}
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          id="gfh-account-menu"
          className={`rail-menu${role ? ` rail-menu--${role.toLowerCase()}` : ''}`}
          role="menu"
          aria-label={displayName}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={scheduleHoverClose}
          onBlur={(e) => {
            // Close when focus moves outside both menu and avatar trigger.
            const next = e.relatedTarget as Node | null
            if (!next) return
            if (menuRef.current?.contains(next) || avatarRef.current?.contains(next)) return
            setMenuOpen(false)
          }}
        >
          <span className="rail-menu-mark" aria-hidden="true">АСУ</span>
          <div className="rail-menu-head">
            <div className="rail-menu-avatar">{initials}</div>
            <div className="rail-menu-id">
              {fullName && <div className="rail-menu-name">{fullName}</div>}
              <div className="rail-menu-email">{email}</div>
              {role && (
                <div className="rail-menu-role">
                  <span className="rail-menu-role-dot" aria-hidden="true" />
                  {t(ROLE_KEY[role] ?? '', { defaultValue: role })}
                </div>
              )}
            </div>
          </div>

          <div className="rail-menu-section">
            <div className="rail-menu-section-title">{t('nav.menuAccount', 'Аккаунт')}</div>
            <button
              className="rail-menu-item"
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); navigate('/change-password') }}
            >
              <Lock size={15} aria-hidden="true" /> {t('auth.changePassword')}
            </button>
          </div>

          <div className="rail-menu-section">
            <div className="rail-menu-section-title">{t('nav.menuPrefs', 'Настройки')}</div>
            <div className="rail-menu-toggle" role="group" aria-label={t('nav.language', 'Язык') as string}>
              <span className="rail-menu-toggle-label">{t('nav.language', 'Язык')}</span>
              <div className="rail-menu-seg">
                <button
                  type="button"
                  className={`rail-menu-seg-btn${currentLang === 'ru' ? ' active' : ''}`}
                  aria-pressed={currentLang === 'ru'}
                  onClick={() => setLang('ru')}
                >RU</button>
                <button
                  type="button"
                  className={`rail-menu-seg-btn${currentLang === 'kg' ? ' active' : ''}`}
                  aria-pressed={currentLang === 'kg'}
                  onClick={() => setLang('kg')}
                >KG</button>
              </div>
            </div>
            <div className="rail-menu-toggle" role="group" aria-label={t('nav.theme', 'Тема') as string}>
              <span className="rail-menu-toggle-label">{t('nav.theme', 'Тема')}</span>
              <div className="rail-menu-seg">
                <button
                  type="button"
                  className={`rail-menu-seg-btn${theme === 'light' ? ' active' : ''}`}
                  aria-pressed={theme === 'light'}
                  onClick={() => { if (theme !== 'light') toggle() }}
                >{t('nav.lightTheme', 'Светлая')}</button>
                <button
                  type="button"
                  className={`rail-menu-seg-btn${theme === 'dark' ? ' active' : ''}`}
                  aria-pressed={theme === 'dark'}
                  onClick={() => { if (theme !== 'dark') toggle() }}
                >{t('nav.darkTheme', 'Тёмная')}</button>
              </div>
            </div>
            <div className="rail-menu-toggle" role="group" aria-label={t('nav.density', 'Плотность') as string}>
              <span className="rail-menu-toggle-label">{t('nav.density', 'Плотность')}</span>
              <div className="rail-menu-seg">
                <button
                  type="button"
                  className={`rail-menu-seg-btn${density === 'comfortable' ? ' active' : ''}`}
                  aria-pressed={density === 'comfortable'}
                  onClick={() => setDensity('comfortable')}
                >{t('nav.densityComfortable', 'Просторно')}</button>
                <button
                  type="button"
                  className={`rail-menu-seg-btn${density === 'compact' ? ' active' : ''}`}
                  aria-pressed={density === 'compact'}
                  onClick={() => setDensity('compact')}
                >{t('nav.densityCompact', 'Компактно')}</button>
              </div>
            </div>
          </div>

          <div className="rail-menu-section">
            <div className="rail-menu-section-title">{t('nav.menuSession', 'Сессия')}</div>
            <button className="rail-menu-item danger" type="button" role="menuitem" onClick={handleLogout}>
              <LogOut size={15} aria-hidden="true" /> {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
