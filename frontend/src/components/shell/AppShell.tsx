import { useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'
import { IconRail } from './IconRail'
import { NavPanel } from './NavPanel'
import { Topbar } from './Topbar'
import { PageTitleProvider } from '../../context/PageContext'
import type { SectionKey } from './navConfig'

const NO_SHELL_PATHS = ['/login', '/forgot-password', '/reset-password', '/change-password', '/pdpa-consent']

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const { isAuthenticated, passwordExpired, pdpaRequired } = useSelector((s: RootState) => s.auth)
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const overlayVisible = activeSection !== null || mobileOpen

  return (
    <PageTitleProvider>
      <div className="app-shell">
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
          <Topbar onHamburgerClick={() => setMobileOpen(o => !o)} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </PageTitleProvider>
  )
}
