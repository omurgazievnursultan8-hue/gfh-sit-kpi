import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitleKey } from '../../context/PageContext'
import { NAV_SECTIONS } from './navConfig'
import {
  applyDv3Palette, dv3PaletteOptions, loadDv3Palette, setDv3Palette, DV3_PALETTE_EVENT,
} from '../../lib/dashboardPalettes'

interface TopbarProps {
  onHamburgerClick: () => void
  mobileNavOpen?: boolean
}

export function Topbar({ onHamburgerClick, mobileNavOpen }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const contextTitleKey = usePageTitleKey()
  const [palette, setPalette] = useState<string>(loadDv3Palette)
  useEffect(() => { applyDv3Palette(palette) }, [palette])
  useEffect(() => {
    function onPaletteEvt(e: Event) {
      const v = (e as CustomEvent<string>).detail
      if (typeof v === 'string') setPalette(v)
    }
    window.addEventListener(DV3_PALETTE_EVENT, onPaletteEvt)
    return () => window.removeEventListener(DV3_PALETTE_EVENT, onPaletteEvt)
  }, [])

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

      <div className="topbar-actions">
        <select
          className="topbar-palette-select"
          value={palette}
          onChange={e => setDv3Palette(e.target.value)}
          title={t('dashboard.paletteLabel', 'Palette') as string}
          aria-label={t('dashboard.paletteLabel', 'Palette') as string}
        >
          {dv3PaletteOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
     </div>
    </header>
  )
}
