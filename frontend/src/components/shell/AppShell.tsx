import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'
import { IconRail } from './IconRail'
import { NavPanel } from './NavPanel'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { PageTitleProvider } from '../../context/PageContext'
import { NAV_SECTIONS, type SectionKey, type Role } from './navConfig'

const NO_SHELL_PATHS = ['/login', '/forgot-password', '/reset-password', '/change-password', '/pdpa-consent']
const STORAGE_KEY = 'gfh_nav_section'

function sectionForPath(path: string, allowed: SectionKey[]): SectionKey | null {
  let best: { section: SectionKey; len: number } | null = null
  for (const s of NAV_SECTIONS) {
    if (!allowed.includes(s.key)) continue
    for (const g of s.groups) {
      for (const item of g.items) {
        const match = item.end ? path === item.to : (path === item.to || path.startsWith(item.to + '/'))
        if (match && (!best || item.to.length > best.len)) {
          best = { section: s.key, len: item.to.length }
        }
      }
    }
  }
  return best?.section ?? null
}

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const { isAuthenticated, passwordExpired, pdpaRequired, role } = useSelector((s: RootState) => s.auth)

  const allowedSections: SectionKey[] = NAV_SECTIONS
    .filter(s => role && s.roles.includes(role as Role))
    .map(s => s.key)

  const [activeSection, setActiveSection] = useState<SectionKey | null>(() => {
    const routeSection = sectionForPath(location.pathname, allowedSections)
    if (routeSection) return routeSection
    const stored = localStorage.getItem(STORAGE_KEY) as SectionKey | null
    if (stored && allowedSections.includes(stored)) return stored
    return allowedSections[0] ?? null
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Re-sync section when navigating to a path belonging to a different section.
  useEffect(() => {
    const routeSection = sectionForPath(location.pathname, allowedSections)
    if (routeSection && routeSection !== activeSection) {
      setActiveSection(routeSection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (activeSection) localStorage.setItem(STORAGE_KEY, activeSection)
  }, [activeSection])

  // Cmd/Ctrl+K toggles command palette globally.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const showShell =
    isAuthenticated &&
    !passwordExpired &&
    !pdpaRequired &&
    !NO_SHELL_PATHS.includes(location.pathname)

  const handleSectionClick = useCallback((section: SectionKey) => {
    setActiveSection(prev => prev === section ? null : section)
  }, [])

  const closePanel = useCallback(() => {
    setActiveSection(null)
    setMobileOpen(false)
  }, [])

  if (!showShell) {
    return <PageTitleProvider>{children}</PageTitleProvider>
  }

  const panelOpen = activeSection !== null
  const overlayVisible = panelOpen || mobileOpen

  return (
    <PageTitleProvider>
      <div className={`app-shell${panelOpen ? ' app-shell--panel-open' : ''}`}>
        <IconRail
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
          mobileOpen={mobileOpen}
        />

        <NavPanel activeSection={activeSection} onClose={closePanel} />

        {overlayVisible && (
          <div className="mobile-overlay" onClick={closePanel} />
        )}

        <div className="app-shell-main">
          <Topbar onHamburgerClick={() => setMobileOpen(o => !o)} onSearchClick={() => setPaletteOpen(true)} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </div>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </PageTitleProvider>
  )
}
