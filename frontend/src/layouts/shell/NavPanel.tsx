import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { PinOff, Star } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role, NavItem } from './navConfig'
import { RootState } from '../../app/store'
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
  const { t } = useTranslation()
  const location = useLocation()
  const { role, userId } = useSelector((s: RootState) => s.auth)

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

  // Focus first nav item when panel opens via click/keyboard (pinned mode).
  // Skip when hover-opened to avoid stealing focus from mouse users.
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevPinnedRef = useRef(pinned)
  useEffect(() => {
    if (section && pinned && !prevPinnedRef.current) {
      const first = scrollRef.current?.querySelector<HTMLAnchorElement>('a.nav-item')
      first?.focus()
    }
    prevPinnedRef.current = pinned
  }, [section, pinned])

  // Preserve nav-scroll position per section across switches.
  const scrollMemoryRef = useRef<Map<string, number>>(new Map())
  const prevSectionKeyRef = useRef<string | null>(null)
  useEffect(() => {
    const el = scrollRef.current
    const prev = prevSectionKeyRef.current
    if (prev && el) scrollMemoryRef.current.set(prev, el.scrollTop)
    const nextKey = section?.key ?? null
    if (nextKey && el) el.scrollTop = scrollMemoryRef.current.get(nextKey) ?? 0
    prevSectionKeyRef.current = nextKey
  }, [section])

  return (
    <>
    {/* Live region outside aria-hidden subtree so AT actually announces section change. */}
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {section ? t(section.labelKey) : ''}
    </div>
    <div
      id="gfh-nav-panel"
      className={`nav-panel${section ? ' nav-panel--visible' : ''}${pinned ? ' nav-panel--pinned' : ''}`}
      onMouseEnter={onPanelEnter}
      onMouseLeave={onPanelLeave}
      role="navigation"
      aria-label={section ? (t(section.labelKey) as string) : undefined}
      aria-hidden={!section}
    >
      {section && (
        <>
          <div className="nav-brand">
            <div className="nav-brand-text">
              <div className="nav-brand-name" title={t(section.labelKey) as string}>{t(section.labelKey)}</div>
              <div className="nav-brand-rule" aria-hidden="true" />
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


          <div className="nav-scroll" ref={scrollRef}>
            {pinnedItems.length > 0 && (
              <div className="nav-group">
                <div className="nav-group-title">
                  <span className="nav-group-num" aria-hidden="true">
                    <Star size={11} fill="currentColor" />
                  </span>
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
                      title={t(item.labelKey) as string}
                      onClick={() => {
                        pushRecent(userId, item.to)
                        const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
                        if (!pinned || isMobile) onClose()
                      }}
                      className={({ isActive }) =>
                        `nav-item${isActive ? ' nav-item--active' : ''}`
                      }
                    >
                      <Icon aria-hidden="true" />
                      <span className="nav-item-label">{t(item.labelKey)}</span>
                      {/* span+role=button avoids invalid <a>-contains-<button> nesting (HTML "interactive content" rule). */}
                      <span
                        role="button"
                        tabIndex={0}
                        className="nav-pin nav-pin--on"
                        aria-label={t('nav.unpin', 'Открепить') as string}
                        aria-pressed={true}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(item.to) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault(); e.stopPropagation(); handleTogglePin(item.to)
                          }
                        }}
                      >
                        <Star size={13} fill="currentColor" aria-hidden="true" />
                      </span>
                    </NavLink>
                  )
                })}
              </div>
            )}
            {visibleGroups.map((group, idx) => (
              <div key={group.groupKey} className="nav-group">
                <div className="nav-group-title">
                  <span className="nav-group-num" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</span>
                  <span className="nav-group-label">{t(group.groupKey)}</span>
                  <span className="nav-group-rule" aria-hidden="true" />
                </div>
                {group.items.map(item => {
                  const Icon = item.icon
                  const isFav = favsSet.has(item.to)
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      title={t(item.labelKey) as string}
                      onClick={() => {
                        pushRecent(userId, item.to)
                        const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
                        if (!pinned || isMobile) onClose()
                      }}
                      className={({ isActive }) =>
                        `nav-item${isActive ? ' nav-item--active' : ''}`
                      }
                    >
                      <Icon aria-hidden="true" />
                      <span className="nav-item-label">{t(item.labelKey)}</span>
                      <span
                        role="button"
                        tabIndex={0}
                        className={`nav-pin${isFav ? ' nav-pin--on' : ''}`}
                        aria-label={(isFav ? t('nav.unpin', 'Открепить') : t('nav.pin', 'Закрепить')) as string}
                        aria-pressed={isFav}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTogglePin(item.to) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault(); e.stopPropagation(); handleTogglePin(item.to)
                          }
                        }}
                      >
                        <Star size={13} fill={isFav ? 'currentColor' : 'none'} aria-hidden="true" />
                      </span>
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </div>

          {pinned && (
            <NavFAB
              role={(role as Role | null) ?? null}
              onOpenPalette={() => { onOpenPalette(); if (!pinned) onClose() }}
              onNavigate={() => { if (!pinned) onClose() }}
            />
          )}
        </>
      )}
    </div>
    </>
  )
}
