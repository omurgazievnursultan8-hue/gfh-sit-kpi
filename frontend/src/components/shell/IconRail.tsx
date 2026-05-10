import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role } from './navConfig'
import { RootState, AppDispatch } from '../../app/store'
import { logoutAction } from '../../features/auth/authSlice'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'

function getInitials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split('.')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

interface IconRailProps {
  activeSection: SectionKey | null
  onSectionClick: (section: SectionKey) => void
  mobileOpen: boolean
}

export function IconRail({ activeSection, onSectionClick, mobileOpen }: IconRailProps) {
  const { t } = useTranslation()
  const { role, email } = useSelector((s: RootState) => s.auth)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const visibleSections = NAV_SECTIONS.filter(
    s => role && s.roles.includes(role as Role)
  )
  const initials = email ? getInitials(email) : '?'

  const handleLogout = async () => {
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
        return (
          <button
            key={section.key}
            className={`rail-icon${activeSection === section.key ? ' active' : ''}`}
            onClick={() => onSectionClick(section.key)}
            type="button"
          >
            <Icon />
            <div className="rail-tooltip">{t(section.labelKey)}</div>
          </button>
        )
      })}

      <div className="rail-spacer" />

      <button className="rail-action" onClick={toggle} type="button">
        {theme === 'dark' ? <Sun /> : <Moon />}
        <div className="rail-tooltip">{theme === 'dark' ? t('nav.lightTheme', 'Светлая') : t('nav.darkTheme', 'Тёмная')}</div>
      </button>

      <button className="rail-action logout" onClick={handleLogout} type="button">
        <LogOut />
        <div className="rail-tooltip">{t('nav.logout')}</div>
      </button>

      <button className="rail-avatar-btn" type="button" title={email ?? ''}>
        {initials}
        <div className="rail-tooltip">{email}</div>
      </button>
    </aside>
  )
}
