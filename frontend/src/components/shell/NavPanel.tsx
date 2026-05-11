import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { CalendarClock, PinOff, Star } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role, NavItem } from './navConfig'
import { RootState } from '../../app/store'
import { useCurrentPeriod, formatPeriodLabel, daysUntilDeadline, periodProgress } from './useCurrentPeriod'
import { pushRecent, getEffectiveFavs, toggleFavWithDefaults } from './navMemory'
import { NavFAB } from './NavFAB'

interface NavPanelProps {
  activeSection: SectionKey | null
  pinned: boolean
  onClose: () => void
  onUnpin: () => void
  onPanelEnter: () => void
  onPanelLeave: () => void
  onOpenPalette: () => void
}

export function NavPanel({ activeSection, pinned, onClose, onUnpin, onPanelEnter, onPanelLeave, onOpenPalette }: NavPanelProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { role, userId } = useSelector((s: RootState) => s.auth)
  const { period } = useCurrentPeriod()
  const lang = (i18n.language?.startsWith('kg') ? 'kg' : 'ru') as 'ru' | 'kg'

  const section = activeSection ? NAV_SECTIONS.find(s => s.key === activeSection) ?? null : null

  // Breadcrumb tail: resolve current path → group + item inside the active section.
  // Group omitted when section has only one group (redundant noise).
  const crumb = useMemo(() => {
    if (!section) return null
    let best: { groupKey: string; itemLabelKey: string; len: number } | null = null
    for (const g of section.groups) {
      for (const it of g.items) {
        const m = it.end ? location.pathname === it.to : (location.pathname === it.to || location.pathname.startsWith(it.to + '/'))
        if (m && (!best || it.to.length > best.len)) best = { groupKey: g.groupKey, itemLabelKey: it.labelKey, len: it.to.length }
      }
    }
    if (!best) return null
    const parts: string[] = []
    if (section.groups.length > 1) parts.push(t(best.groupKey))
    parts.push(t(best.itemLabelKey))
    return parts.join(' · ')
  }, [section, location.pathname, t])

  const visibleGroups = section
    ? section.groups.map(g => ({
        ...g,
        items: g.items.filter(item => role && item.roles.includes(role as Role)),
      })).filter(g => g.items.length > 0)
    : []

  // Flat index of every nav item, keyed by `to`, for resolving pin paths.
  const itemIndex = useMemo(() => {
    const map = new Map<string, NavItem>()
    for (const s of NAV_SECTIONS) for (const g of s.groups) for (const it of g.items) map.set(it.to, it)
    return map
  }, [])

  // Pinned items state. Re-read after every toggle to refresh both pinned group + stars.
  const [favsTick, setFavsTick] = useState(0)
  const effectiveFavs = useMemo(
    () => getEffectiveFavs(userId, role),
    // favsTick forces recompute after toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, role, favsTick],
  )
  const favsSet = useMemo(() => new Set(effectiveFavs), [effectiveFavs])
  const pinnedItems = effectiveFavs
    .map(to => itemIndex.get(to))
    .filter((it): it is NavItem => !!it && !!role && it.roles.includes(role as Role))

  const handleTogglePin = (to: string) => {
    toggleFavWithDefaults(userId, role, to)
    setFavsTick(n => n + 1)
  }

  return (
    <div
      className={`nav-panel${section ? ' nav-panel--visible' : ''}${pinned ? ' nav-panel--pinned' : ''}`}
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
    >
      {section && (
        <>
          <div className="nav-brand">
            <div className="nav-brand-mark" aria-hidden="true">
              <img
                src="/brand/gfh-mark.png"
                alt=""
                width={28}
                height={28}
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement
                  el.style.display = 'none'
                  el.parentElement?.classList.add('nav-brand-mark--fallback')
                }}
              />
              <svg className="nav-brand-mark-fallback-svg" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
                <rect x="2" y="2" width="28" height="28" rx="6" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M9 22 L9 10 L16 10 L16 16 L23 16 L23 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square"/>
                <circle cx="23" cy="10" r="1.6" fill="currentColor"/>
              </svg>
            </div>
            <div className="nav-brand-text">
              <div className="nav-brand-name">{t(section.labelKey)}</div>
              <div className="nav-brand-sub" title={crumb ?? undefined}>
                {crumb ?? t(section.subKey)}
              </div>
            </div>
            {pinned && (
              <button
                type="button"
                className="nav-brand-pin-btn"
                onClick={onUnpin}
                aria-label={t('nav.unpinPanel', 'Открепить панель') as string}
                title={t('nav.unpinPanel', 'Открепить панель') as string}
              >
                <PinOff size={14} />
              </button>
            )}
          </div>

          {period && (() => {
            const prog = periodProgress(period)
            const barClass = prog.pct >= 90 ? ' nav-period-bar--late' : prog.pct >= 70 ? ' nav-period-bar--warn' : ''
            return (
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
                  <div
                    className={`nav-period-bar${barClass}`}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={prog.pct}
                    title={`${prog.daysElapsed} / ${prog.daysTotal} ${t('period.daysShort', 'дн.')} · ${t('period.until', 'до')} ${prog.endLabel}`}
                  >
                    <span className="nav-period-bar-fill" style={{ width: `${prog.pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="nav-scroll">
            {pinnedItems.length > 0 && (
              <div className="nav-group">
                <div className="nav-group-title">
                  <span className="nav-group-num">★</span>
                  <span className="nav-group-label">{t('nav.groupPinned', 'Закреплённое')}</span>
                  <span className="nav-group-rule" aria-hidden="true" />
                </div>
                {pinnedItems.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={`pin-${item.to}`}
                      to={item.to}
                      end={item.end}
                      onClick={() => { pushRecent(userId, item.to); onClose() }}
                      className={({ isActive }) =>
                        `nav-item${isActive ? ' nav-item--active' : ''}`
                      }
                    >
                      <Icon />
                      <span className="nav-item-label">{t(item.labelKey)}</span>
                      <button
                        type="button"
                        className="nav-pin nav-pin--on"
                        aria-label={t('nav.unpin', 'Открепить') as string}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(item.to) }}
                      >
                        <Star size={13} fill="currentColor" />
                      </button>
                    </NavLink>
                  )
                })}
              </div>
            )}
            {visibleGroups.map((group, idx) => (
              <div key={group.groupKey} className="nav-group">
                <div className="nav-group-title">
                  <span className="nav-group-num">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="nav-group-label">{t(group.groupKey)}</span>
                  <span className="nav-group-rule" aria-hidden="true" />
                </div>
                {group.items.map(item => {
                  const Icon = item.icon
                  const pinned = favsSet.has(item.to)
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => { pushRecent(userId, item.to); onClose() }}
                      className={({ isActive }) =>
                        `nav-item${isActive ? ' nav-item--active' : ''}`
                      }
                    >
                      <Icon />
                      <span className="nav-item-label">{t(item.labelKey)}</span>
                      <button
                        type="button"
                        className={`nav-pin${pinned ? ' nav-pin--on' : ''}`}
                        aria-label={(pinned ? t('nav.unpin', 'Открепить') : t('nav.pin', 'Закрепить')) as string}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(item.to) }}
                      >
                        <Star size={13} fill={pinned ? 'currentColor' : 'none'} />
                      </button>
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </div>

          {pinned && (
            <NavFAB
              role={(role as Role | null) ?? null}
              onOpenPalette={() => { onOpenPalette(); onClose() }}
              onNavigate={onClose}
            />
          )}
        </>
      )}
    </div>
  )
}
