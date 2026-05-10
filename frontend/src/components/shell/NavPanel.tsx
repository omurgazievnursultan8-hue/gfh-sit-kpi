import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, User, Lock, LogOut } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role } from './navConfig'
import { RootState, AppDispatch } from '../../app/store'
import { logoutAction } from '../../features/auth/authSlice'

function getInitials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split('.')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

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

interface NavPanelProps {
  activeSection: SectionKey | null
  onClose: () => void
}

export function NavPanel({ activeSection, onClose }: NavPanelProps) {
  const { t } = useTranslation()
  const { role, email } = useSelector((s: RootState) => s.auth)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [popoverOpen, setPopoverOpen] = useState(false)

  const section = activeSection ? NAV_SECTIONS.find(s => s.key === activeSection) ?? null : null

  const visibleGroups = section
    ? section.groups.map(g => ({
        ...g,
        items: g.items.filter(item => role && item.roles.includes(role as Role)),
      })).filter(g => g.items.length > 0)
    : []

  const initials = email ? getInitials(email) : '?'

  const handleLogout = async () => {
    setPopoverOpen(false)
    onClose()
    await dispatch(logoutAction())
    navigate('/login')
  }

  return (
    <div className={`nav-panel${section ? ' nav-panel--visible' : ''}`}>
      {section && (
        <>
          <div className="nav-brand">
            <div className="nav-brand-name">{t(section.labelKey)}</div>
            <div className="nav-brand-sub">{t(section.subKey)}</div>
          </div>

          <div className="nav-scroll">
            {visibleGroups.map(group => (
              <div key={group.groupKey} className="nav-group">
                <div className="nav-group-title">{t(group.groupKey)}</div>
                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `nav-item${isActive ? ' nav-item--active' : ''}`
                      }
                    >
                      <Icon />
                      <span className="nav-item-label">{t(item.labelKey)}</span>
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="nav-footer">
            <div className={`profile-popover${popoverOpen ? ' profile-popover--visible' : ''}`}>
              <button className="profile-popover-item" type="button"
                onClick={() => setPopoverOpen(false)}>
                <User size={16} />
                Профиль
              </button>
              <button className="profile-popover-item" type="button"
                onClick={() => { navigate('/change-password'); setPopoverOpen(false); onClose() }}>
                <Lock size={16} />
                Сменить пароль
              </button>
              <div className="profile-popover-divider" />
              <button className="profile-popover-item danger" type="button" onClick={handleLogout}>
                <LogOut size={16} />
                {t('nav.logout')}
              </button>
            </div>

            <button className="me-card" type="button" onClick={() => setPopoverOpen(o => !o)}>
              <div className="me-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="me-name">{email}</div>
                <div className="me-role">{role ? roleLabel(role) : ''}</div>
              </div>
              <div className="me-more"><MoreHorizontal size={16} /></div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
