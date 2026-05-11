import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { LogOut, Lock } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role } from './navConfig'
import { RootState, AppDispatch } from '../../app/store'
import { logoutAction } from '../../features/auth/authSlice'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { getInitials } from './shellUtils'
import { useUserCounters } from './useUserCounters'

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'Администратор',
    CHAIRMAN: 'Председатель',
    DEPUTY_CHAIRMAN: 'Зам. председателя',
    HEAD_OF_DEPARTMENT: 'Нач. отдела',
    HEAD_OF_DEPARTMENT_UNIT: 'Нач. подотдела',
    EMPLOYEE: 'Сотрудник',
  }
  return map[role] ?? role
}

interface IconRailProps {
  activeSection: SectionKey | null
  pinned: boolean
  onSectionClick: (section: SectionKey) => void
  onSectionHover: (section: SectionKey) => void
  onRailEnter: () => void
  onRailLeave: () => void
  mobileOpen: boolean
}

export function IconRail({ activeSection, pinned, onSectionClick, onSectionHover, onRailEnter, onRailLeave, mobileOpen }: IconRailProps) {
  const { t, i18n } = useTranslation()
  const { role, email, fullName } = useSelector((s: RootState) => s.auth)
  const counters = useUserCounters()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const currentLang = (i18n.language?.startsWith('kg') ? 'kg' : 'ru') as 'ru' | 'kg'
  const setLang = (lng: 'ru' | 'kg') => {
    i18n.changeLanguage(lng)
    try { localStorage.setItem('gfh_lang', lng) } catch { /* noop */ }
  }
  const [menuOpen, setMenuOpen] = useState(false)
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
    hoverCloseTimer.current = window.setTimeout(() => setMenuOpen(false), 220)
  }
  useEffect(() => () => cancelHoverClose(), [])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || avatarRef.current?.contains(t)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const visibleSections = NAV_SECTIONS.filter(
    s => role && s.roles.includes(role as Role)
  )
  const initials = getInitials(fullName ?? email)
  const displayName = fullName ?? email ?? ''

  const handleLogout = async () => {
    setMenuOpen(false)
    await dispatch(logoutAction())
    navigate('/login')
  }

  return (
    <aside
      className={`icon-rail${mobileOpen ? ' icon-rail--mobile-open' : ''}`}
      onMouseEnter={onRailEnter}
      onMouseLeave={onRailLeave}
    >
      <a href="/dashboard" className="rail-logo" aria-label={t('shell.brand', 'АСУ КПИ') as string}>
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
        <span className="rail-build-chip" aria-hidden="true">v1.0</span>
        <div className="rail-tooltip">{t('shell.brand', 'АСУ КПИ')}</div>
      </a>

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
            onClick={() => onSectionClick(section.key)}
            onMouseEnter={() => onSectionHover(section.key)}
            onFocus={() => onSectionHover(section.key)}
            type="button"
            title={isActive && pinned ? t('nav.pinnedHint', 'Закреплено · клик чтобы открепить') : undefined}
          >
            <Icon />
            {count > 0 && (
              <span className={`rail-count rail-count--${tier}`} aria-label={`${count}`}>{label}</span>
            )}
            <span className="rail-label">{t(section.railKey)}</span>
            <div className="rail-tooltip">{t(section.labelKey)}</div>
          </button>
        )
      })}

      <div className="rail-spacer" />

      <button
        ref={avatarRef}
        className={`rail-avatar-btn${menuOpen ? ' active' : ''}${role ? ` rail-avatar-btn--${role.toLowerCase()}` : ''}`}
        type="button"
        onClick={() => { cancelHoverClose(); setMenuOpen(o => !o) }}
        onMouseEnter={() => { cancelHoverClose(); setMenuOpen(true) }}
        onMouseLeave={scheduleHoverClose}
        onFocus={() => { cancelHoverClose(); setMenuOpen(true) }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {initials}
        {!menuOpen && <div className="rail-tooltip">{displayName}</div>}
      </button>

      {menuOpen && (
        <div
          ref={menuRef}
          className={`rail-menu${role ? ` rail-menu--${role.toLowerCase()}` : ''}`}
          role="menu"
          aria-label={displayName}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={scheduleHoverClose}
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
                  {roleLabel(role)}
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
              <Lock size={15} /> {t('auth.changePassword')}
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
                  onClick={() => setLang('ru')}
                >RU</button>
                <button
                  type="button"
                  className={`rail-menu-seg-btn${currentLang === 'kg' ? ' active' : ''}`}
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
                  onClick={() => { if (theme !== 'light') toggle() }}
                >{t('nav.lightTheme', 'Светлая')}</button>
                <button
                  type="button"
                  className={`rail-menu-seg-btn${theme === 'dark' ? ' active' : ''}`}
                  onClick={() => { if (theme !== 'dark') toggle() }}
                >{t('nav.darkTheme', 'Тёмная')}</button>
              </div>
            </div>
          </div>

          <div className="rail-menu-section">
            <div className="rail-menu-section-title">{t('nav.menuSession', 'Сессия')}</div>
            <button className="rail-menu-item danger" type="button" role="menuitem" onClick={handleLogout}>
              <LogOut size={15} /> {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
