import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { CalendarClock } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role } from './navConfig'
import { RootState } from '../../app/store'
import { useCurrentPeriod, formatPeriodLabel, daysUntilDeadline } from './useCurrentPeriod'

interface NavPanelProps {
  activeSection: SectionKey | null
  onClose: () => void
}

export function NavPanel({ activeSection, onClose }: NavPanelProps) {
  const { t, i18n } = useTranslation()
  const { role } = useSelector((s: RootState) => s.auth)
  const { period } = useCurrentPeriod()
  const lang = (i18n.language?.startsWith('kg') ? 'kg' : 'ru') as 'ru' | 'kg'

  const section = activeSection ? NAV_SECTIONS.find(s => s.key === activeSection) ?? null : null

  const visibleGroups = section
    ? section.groups.map(g => ({
        ...g,
        items: g.items.filter(item => role && item.roles.includes(role as Role)),
      })).filter(g => g.items.length > 0)
    : []

  return (
    <div className={`nav-panel${section ? ' nav-panel--visible' : ''}`}>
      {section && (
        <>
          <div className="nav-brand">
            <div className="nav-brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="28" height="28">
                <rect x="2" y="2" width="28" height="28" rx="6" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M9 22 L9 10 L16 10 L16 16 L23 16 L23 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square"/>
                <circle cx="23" cy="10" r="1.6" fill="currentColor"/>
              </svg>
            </div>
            <div className="nav-brand-text">
              <div className="nav-brand-name">{t(section.labelKey)}</div>
              <div className="nav-brand-sub">{t(section.subKey)}</div>
            </div>
          </div>

          {period && (
            <div className="nav-period">
              <div className="nav-period-icon"><CalendarClock size={14} /></div>
              <div className="nav-period-body">
                <div className="nav-period-label">{formatPeriodLabel(period, lang)}</div>
                <div className="nav-period-meta">
                  <span className="nav-period-status">{t('period.active', 'Активный период')}</span>
                  <span className="nav-period-dot">·</span>
                  <span className="nav-period-days">
                    {daysUntilDeadline(period)} {t('period.daysShort', 'дн.')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="nav-scroll">
            {visibleGroups.map((group, idx) => (
              <div key={group.groupKey} className="nav-group">
                <div className="nav-group-title">
                  <span className="nav-group-num">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="nav-group-label">{t(group.groupKey)}</span>
                  <span className="nav-group-rule" aria-hidden="true" />
                </div>
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

        </>
      )}
    </div>
  )
}
