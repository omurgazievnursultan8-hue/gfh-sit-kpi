import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut, User, Lock } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role } from './navConfig'
import { RootState, AppDispatch } from '../../app/store'
import { logoutAction } from '../../features/auth/authSlice'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'
import { getInitials } from './shellUtils'

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
  onSectionClick: (section: SectionKey) => void
  mobileOpen: boolean
}

export function IconRail({ activeSection, onSectionClick, mobileOpen }: IconRailProps) {
  const { t } = useTranslation()
  const { role, email } = useSelector((s: RootState) => s.auth)
  const unreadCount = useSelector((s: RootState) => s.notifications?.unreadCount ?? 0)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLButtonElement>(null)

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
  const initials = email ? getInitials(email) : '?'

  const handleLogout = async () => {
    setMenuOpen(false)
    await dispatch(logoutAction())
    navigate('/login')
  }

  return (
    <aside className={`icon-rail${mobileOpen ? ' icon-rail--mobile-open' : ''}`}>
      <a href="/dashboard" className="rail-logo">
        <span>АСУ</span>
        <div className="rail-tooltip">АСУ КПИ</div>
      </a>

      <div className="rail-divider" />

      {visibleSections.map(section => {
        const Icon = section.icon
        const hasAlert = section.key === 'cabinet' && unreadCount > 0
        return (
          <button
            key={section.key}
            className={`rail-icon${activeSection === section.key ? ' active' : ''}`}
            onClick={() => onSectionClick(section.key)}
            type="button"
          >
            <Icon />
            {hasAlert && <span className="rail-badge" aria-label={`${unreadCount}`} />}
            <div className="rail-tooltip">{t(section.labelKey)}</div>
          </button>
        )
      })}

      <div className="rail-spacer" />

      <button className="rail-action" onClick={toggle} type="button">
        {theme === 'dark' ? <Sun /> : <Moon />}
        <div className="rail-tooltip">{theme === 'dark' ? t('nav.lightTheme', 'Светлая') : t('nav.darkTheme', 'Тёмная')}</div>
      </button>

      <button
        ref={avatarRef}
        className={`rail-avatar-btn${menuOpen ? ' active' : ''}`}
        type="button"
        onClick={() => setMenuOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {initials}
        {!menuOpen && <div className="rail-tooltip">{email}</div>}
      </button>

      {menuOpen && (
        <div ref={menuRef} className="rail-menu" role="menu">
          <div className="rail-menu-head">
            <div className="rail-menu-avatar">{initials}</div>
            <div className="rail-menu-id">
              <div className="rail-menu-email">{email}</div>
              <div className="rail-menu-role">{role ? roleLabel(role) : ''}</div>
            </div>
          </div>
          <div className="rail-menu-divider" />
          <button className="rail-menu-item" type="button" onClick={() => setMenuOpen(false)}>
            <User size={16} /> {t('nav.profile', 'Профиль')}
          </button>
          <button
            className="rail-menu-item"
            type="button"
            onClick={() => { setMenuOpen(false); navigate('/change-password') }}
          >
            <Lock size={16} /> {t('nav.changePassword', 'Сменить пароль')}
          </button>
          <div className="rail-menu-divider" />
          <button className="rail-menu-item danger" type="button" onClick={handleLogout}>
            <LogOut size={16} /> {t('nav.logout')}
          </button>
        </div>
      )}
    </aside>
  )
}
