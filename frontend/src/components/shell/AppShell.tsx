import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'
import { IconRail } from './IconRail'
import { NavPanel } from './NavPanel'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { PageTitleProvider } from '../../context/PageContext'
import { NAV_SECTIONS, type SectionKey, type Role } from './navConfig'
import { pushRecent } from './navMemory'

const NO_SHELL_PATHS = ['/login', '/forgot-password', '/reset-password', '/change-password', '/pdpa-consent']
const STORAGE_KEY = 'gfh_nav_section'
const PIN_KEY = 'gfh_nav_pinned'
const HOVER_OPEN_DELAY = 80
const HOVER_CLOSE_GRACE = 300

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

const CHORD_TTL_MS = 1200

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return el.isContentEditable
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, passwordExpired, pdpaRequired, role, userId } = useSelector((s: RootState) => s.auth)

  const allowedSections: SectionKey[] = NAV_SECTIONS
    .filter(s => role && s.roles.includes(role as Role))
    .map(s => s.key)

  // Hover-first model:
  //   activeSection != null  → panel currently shown (hover- or pin-driven)
  //   pinned = true          → click-pinned; ignores mouseleave close
  //   pinned = false         → hover-opened; closes on mouseleave grace
  const [activeSection, setActiveSection] = useState<SectionKey | null>(() => {
    const storedPin = localStorage.getItem(PIN_KEY) as SectionKey | null
    if (storedPin && allowedSections.includes(storedPin)) return storedPin
    return null
  })
  const [pinned, setPinned] = useState<boolean>(() => {
    const storedPin = localStorage.getItem(PIN_KEY) as SectionKey | null
    return !!(storedPin && allowedSections.includes(storedPin))
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Hover open/close timers.
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const cancelHoverTimers = useCallback(() => {
    if (openTimerRef.current) { window.clearTimeout(openTimerRef.current); openTimerRef.current = null }
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
  }, [])
  useEffect(() => () => cancelHoverTimers(), [cancelHoverTimers])

  // Re-sync to route section only when panel is already open (follow the user).
  useEffect(() => {
    if (activeSection == null) return
    const routeSection = sectionForPath(location.pathname, allowedSections)
    if (routeSection && routeSection !== activeSection) setActiveSection(routeSection)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Record every visit to a known nav item into per-user recents.
  useEffect(() => {
    if (!isAuthenticated) return
    let best: { to: string; len: number } | null = null
    for (const s of NAV_SECTIONS) {
      for (const g of s.groups) {
        for (const it of g.items) {
          const m = it.end ? location.pathname === it.to : (location.pathname === it.to || location.pathname.startsWith(it.to + '/'))
          if (m && (!best || it.to.length > best.len)) best = { to: it.to, len: it.to.length }
        }
      }
    }
    if (best) pushRecent(userId, best.to)
  }, [location.pathname, userId, isAuthenticated])

  useEffect(() => {
    if (activeSection) localStorage.setItem(STORAGE_KEY, activeSection)
  }, [activeSection])

  // Persist the pinned section (or clear) so it survives reloads.
  useEffect(() => {
    if (pinned && activeSection) localStorage.setItem(PIN_KEY, activeSection)
    else localStorage.removeItem(PIN_KEY)
  }, [pinned, activeSection])

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

  // Chord nav: leader `g` then second letter within CHORD_TTL_MS → navigate.
  // Uses event.code (KeyG/KeyD/…) so layout-agnostic (works on ru/kg keyboards).
  // Single ref holds the deadline timestamp; expired = no chord active. No setTimeout needed.
  const [chordVisible, setChordVisible] = useState(false)
  const chordDeadlineRef = useRef(0)
  const tickHintRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isAuthenticated) return
    const isChordActive = () => Date.now() < chordDeadlineRef.current
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      if (paletteOpen) return

      if (!isChordActive()) {
        if (e.code === 'KeyG') {
          e.preventDefault()
          chordDeadlineRef.current = Date.now() + CHORD_TTL_MS
          setChordVisible(true)
          if (tickHintRef.current) window.clearTimeout(tickHintRef.current)
          tickHintRef.current = window.setTimeout(() => {
            if (!isChordActive()) setChordVisible(false)
          }, CHORD_TTL_MS + 16)
        }
        return
      }

      // Second key.
      if (e.key === 'Escape') { chordDeadlineRef.current = 0; setChordVisible(false); return }
      const code = e.code
      if (!code.startsWith('Key')) return
      const letter = code.slice(3).toLowerCase()

      let target: string | null = null
      for (const s of NAV_SECTIONS) {
        if (!role || !s.roles.includes(role as Role)) continue
        for (const g of s.groups) {
          for (const it of g.items) {
            if (it.chord === letter && it.roles.includes(role as Role)) { target = it.to; break }
          }
          if (target) break
        }
        if (target) break
      }
      e.preventDefault()
      chordDeadlineRef.current = 0
      setChordVisible(false)
      if (target) navigate(target)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paletteOpen, role, isAuthenticated, navigate])

  const showShell =
    isAuthenticated &&
    !passwordExpired &&
    !pdpaRequired &&
    !NO_SHELL_PATHS.includes(location.pathname)

  // Click rail icon: pin / unpin sticky.
  //   - Pinned to same section → unpin + close.
  //   - Otherwise → pin to that section (overrides any hover state).
  const handleSectionClick = useCallback((section: SectionKey) => {
    cancelHoverTimers()
    setPinned(prev => {
      if (prev && activeSection === section) {
        setActiveSection(null)
        return false
      }
      setActiveSection(section)
      return true
    })
  }, [activeSection, cancelHoverTimers])

  // Hover open: schedule open after delay (instant switch if panel already open).
  const handleSectionHover = useCallback((section: SectionKey) => {
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    if (activeSection != null) { setActiveSection(section); return }
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
    openTimerRef.current = window.setTimeout(() => setActiveSection(section), HOVER_OPEN_DELAY)
  }, [activeSection])

  // Mouseleave from rail or panel: only closes when not pinned.
  const handlePanelLeave = useCallback(() => {
    if (openTimerRef.current) { window.clearTimeout(openTimerRef.current); openTimerRef.current = null }
    if (pinned) return
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(() => setActiveSection(null), HOVER_CLOSE_GRACE)
  }, [pinned])

  const handlePanelEnter = useCallback(() => {
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
  }, [])

  const closePanel = useCallback(() => {
    cancelHoverTimers()
    setActiveSection(null)
    setPinned(false)
    setMobileOpen(false)
  }, [cancelHoverTimers])

  // Esc closes the panel (overrides pin).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeSection != null && !paletteOpen) {
        setActiveSection(null)
        setPinned(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeSection, paletteOpen])

  if (!showShell) {
    return <PageTitleProvider>{children}</PageTitleProvider>
  }

  const panelOpen = activeSection !== null
  const overlayVisible = panelOpen || mobileOpen
  const activeAccent = activeSection
    ? NAV_SECTIONS.find(s => s.key === activeSection)?.accent
    : undefined

  return (
    <PageTitleProvider>
      <div
        className={`app-shell${panelOpen ? ' app-shell--panel-open' : ''}${pinned ? ' app-shell--pinned' : ''}`}
        style={activeAccent ? ({ '--section-accent': activeAccent } as React.CSSProperties) : undefined}
      >
        <IconRail
          activeSection={activeSection}
          pinned={pinned}
          onSectionClick={handleSectionClick}
          onSectionHover={handleSectionHover}
          onRailLeave={handlePanelLeave}
          onRailEnter={handlePanelEnter}
          mobileOpen={mobileOpen}
        />

        <NavPanel
          activeSection={activeSection}
          pinned={pinned}
          onClose={closePanel}
          onUnpin={() => { setPinned(false); setActiveSection(null) }}
          onPanelEnter={handlePanelEnter}
          onPanelLeave={handlePanelLeave}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        {overlayVisible && (
          <div className="mobile-overlay" onClick={closePanel} />
        )}

        <div
          className="app-shell-main"
          onMouseDownCapture={() => { if (activeSection != null && !pinned) { cancelHoverTimers(); setActiveSection(null) } }}
        >
          <Topbar onHamburgerClick={() => setMobileOpen(o => !o)} onSearchClick={() => setPaletteOpen(true)} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </div>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

        {chordVisible && (
          <div className="chord-hint" role="status" aria-live="polite">
            <kbd>g</kbd>
            <span className="chord-hint-dots">…</span>
            <span className="chord-hint-label">d · m · e · v · a · h · t · u · s</span>
          </div>
        )}
      </div>
    </PageTitleProvider>
  )
}
