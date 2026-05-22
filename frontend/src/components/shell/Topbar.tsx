import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitleKey } from '../../context/PageContext'
import { usePeriod, ALL_PERIODS } from '../../context/PeriodContext'
import { formatPeriodRange } from '../../features/evaluations/components/periodFormat'
import { NAV_SECTIONS } from './navConfig'

interface TopbarProps {
  onHamburgerClick: () => void
  mobileNavOpen?: boolean
}

export function Topbar({ onHamburgerClick, mobileNavOpen }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const contextTitleKey = usePageTitleKey()
  const { periodOptions, selectedPeriod, setSelectedPeriod, loading: periodsLoading } = usePeriod()

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

  return (
    <header className="app-topbar">
     <div className="topbar-inner">
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

      <h1 className="topbar-title" aria-current="page">
        {pageLabel || t('nav.home')}
      </h1>

      <div className="topbar-slot">
        <select
          id="dv3-period"
          className="topbar-period"
          aria-label={t('dashboard.periodLabel') as string}
          value={String(selectedPeriod)}
          onChange={e => setSelectedPeriod(e.target.value === ALL_PERIODS ? ALL_PERIODS : Number(e.target.value))}
          disabled={periodsLoading}
        >
          <option value={ALL_PERIODS}>{t('dashboard.allPeriods')}</option>
          {periodOptions.map(p => (
            <option key={p.id} value={p.id}>
              {formatPeriodRange(p, p.id)}
              {p.status === 'ACTIVE' ? ` · ${t('dashboard.periodActive')}` : ''}
            </option>
          ))}
        </select>
      </div>
     </div>
    </header>
  )
}
