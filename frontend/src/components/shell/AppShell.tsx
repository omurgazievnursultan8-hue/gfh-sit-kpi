import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { RootState } from '../../app/store'
import { IconRail } from './IconRail'
import { NavPanel } from './NavPanel'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { PageTitleProvider, usePageTitleKey } from '../../context/PageContext'
import { NAV_SECTIONS, type SectionKey, type Role } from './navConfig'
import { pushRecent } from './navMemory'

const NO_SHELL_PATHS = ['/login', '/forgot-password', '/reset-password', '/change-password', '/pdpa-consent']
const PIN_KEY = 'gfh_nav_pinned'
// Known section keys — guards storage hydrate against stale/corrupt values
// (e.g. section renamed across deploys).
const KNOWN_SECTION_KEYS: ReadonlySet<string> = new Set(NAV_SECTIONS.map(s => s.key))
function readStoredSection(): SectionKey | null {
  const raw = safeGet(PIN_KEY)
  return raw && KNOWN_SECTION_KEYS.has(raw) ? (raw as SectionKey) : null
}

// Safari private mode + locked-down profiles throw on localStorage access.
// Wrap so shell never crashes on storage failure.
function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}
function safeRemove(key: string): void {
  try { localStorage.removeItem(key) } catch { /* noop */ }
}
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
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, passwordExpired, pdpaRequired, role, userId } = useSelector((s: RootState) => s.auth)

  const allowedSections: SectionKey[] = useMemo(
    () => NAV_SECTIONS.filter(s => role && s.roles.includes(role as Role)).map(s => s.key),
    [role],
  )

  // Hover-first model:
  //   activeSection != null  → panel currently shown (hover- or pin-driven)
  //   pinned = true          → click-pinned; ignores mouseleave close
  //   pinned = false         → hover-opened; closes on mouseleave grace
  // Hydrate from storage without role check — role loads async after reload.
  // Effect below re-validates once role lands.
  const [activeSection, setActiveSection] = useState<SectionKey | null>(() => readStoredSection())
  const [pinned, setPinned] = useState<boolean>(() => readStoredSection() !== null)

  // Once role arrives, drop stored pin if section not allowed for this role.
  useEffect(() => {
    if (!role) return
    const storedPin = readStoredSection()
    if (storedPin && !allowedSections.includes(storedPin)) {
      setPinned(false)
      setActiveSection(null)
      safeRemove(PIN_KEY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Cached media-query results. Listen for changes so detached monitor
  // hot-plug or zoom-induced layout swap stays accurate.
  const [hoverCapable, setHoverCapable] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  )
  const [coarsePointer, setCoarsePointer] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  )
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mqHover = window.matchMedia('(hover: hover)')
    const mqCoarse = window.matchMedia('(pointer: coarse)')
    const mqMobile = window.matchMedia('(max-width: 768px)')
    const h = () => setHoverCapable(mqHover.matches)
    const c = () => setCoarsePointer(mqCoarse.matches)
    const m = () => setIsMobileViewport(mqMobile.matches)
    mqHover.addEventListener('change', h)
    mqCoarse.addEventListener('change', c)
    mqMobile.addEventListener('change', m)
    return () => {
      mqHover.removeEventListener('change', h)
      mqCoarse.removeEventListener('change', c)
      mqMobile.removeEventListener('change', m)
    }
  }, [])

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

  // Persist the pinned section (or clear) so it survives reloads.
  useEffect(() => {
    if (pinned && activeSection) safeSet(PIN_KEY, activeSection)
    else safeRemove(PIN_KEY)
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

  // Click rail icon: pin / switch section.
  //   - Already pinned → just switch section (stays pinned; unpin only via PinOff/Esc).
  //   - Not pinned → pin to that section (overrides any hover state).
  const handleSectionClick = useCallback((section: SectionKey, trigger?: HTMLElement | null) => {
    cancelHoverTimers()
    // Coarse pointer (touch/stylus) opens panel without permanent pin — avoids
    // sticky-pin trap on phones. Hover-capable pointers keep click-to-pin.
    setPinned(!coarsePointer)
    setActiveSection(section)
    if (trigger) lastTriggerRef.current = trigger
  }, [cancelHoverTimers, coarsePointer])

  // Hover open: schedule open after delay (instant switch if panel already open).
  const handleSectionHover = useCallback((section: SectionKey) => {
    if (!hoverCapable) return
    if (closeTimerRef.current) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    if (activeSection != null) { setActiveSection(section); return }
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current)
    openTimerRef.current = window.setTimeout(() => setActiveSection(section), HOVER_OPEN_DELAY)
  }, [activeSection, hoverCapable])

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
    // Return focus to whichever rail icon opened the panel (overlay click,
    // unpin click, etc.) so keyboard users don't land at document root.
    lastTriggerRef.current?.focus()
    lastTriggerRef.current = null
  }, [cancelHoverTimers])

  // Esc closes the panel (overrides pin).
  // Store rail icon that opened panel, to restore focus on Esc.
  const lastTriggerRef = useRef<HTMLElement | null>(null)

  // When mobile drawer closes, return focus to hamburger (queried by aria-controls)
  // — keyboard users opened it from there.
  const prevMobileOpenRef = useRef(false)
  useEffect(() => {
    if (prevMobileOpenRef.current && !mobileOpen) {
      const btn = document.querySelector<HTMLButtonElement>('button[aria-controls="gfh-icon-rail"]')
      btn?.focus()
    }
    prevMobileOpenRef.current = mobileOpen
  }, [mobileOpen])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || paletteOpen) return
      if (mobileOpen) {
        setMobileOpen(false)
        return
      }
      if (activeSection != null) {
        setActiveSection(null)
        setPinned(false)
        // Restore focus to triggering rail icon for keyboard users.
        lastTriggerRef.current?.focus()
        lastTriggerRef.current = null
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeSection, paletteOpen, mobileOpen])

  const panelOpen = activeSection !== null
  const overlayVisible = panelOpen || mobileOpen

  // Lock body scroll while mobile drawer or overlay is open — prevents
  // background-scroll-through on iOS Safari.
  // Must run before the early return below to keep hook order stable.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const lock = mobileOpen || (panelOpen && isMobileViewport) || paletteOpen
    document.body.style.overflow = lock ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, panelOpen, isMobileViewport, paletteOpen])

  // Route-change announcer — politely announces resolved page title to AT
  // on path change. One live region, prefers page context title when set.
  const contextTitleKey = usePageTitleKey()
  const routeAnnouncement = useMemo(() => {
    if (contextTitleKey) return t(contextTitleKey)
    // Longest-match wins — avoids "/admin/users" announcing parent "/admin".
    let best: { labelKey: string; len: number } | null = null
    for (const s of NAV_SECTIONS) {
      for (const g of s.groups) {
        for (const it of g.items) {
          const m = it.end
            ? location.pathname === it.to
            : (location.pathname === it.to || location.pathname.startsWith(it.to + '/'))
          if (m && (!best || it.to.length > best.len)) best = { labelKey: it.labelKey, len: it.to.length }
        }
      }
    }
    return best ? t(best.labelKey) : ''
  }, [contextTitleKey, location.pathname, t, i18n.language])

  // Sync document.title — browser tab + AT page-load announcement.
  useEffect(() => {
    if (typeof document === 'undefined') return
    const brand = t('shell.brand', 'АСУ КПИ')
    document.title = routeAnnouncement ? `${routeAnnouncement} — ${brand}` : (brand as string)
  }, [routeAnnouncement, t])

  // Skip first announce — browser already speaks page title on load. Live
  // region fires only on route CHANGE thereafter.
  const announceMountedRef = useRef(false)
  const liveAnnouncement = announceMountedRef.current ? routeAnnouncement : ''
  useEffect(() => { announceMountedRef.current = true }, [])

  if (!showShell) {
    return <PageTitleProvider>{children}</PageTitleProvider>
  }

  const activeAccent = activeSection
    ? NAV_SECTIONS.find(s => s.key === activeSection)?.accent
    : undefined

  return (
    <PageTitleProvider>
      <div
        className={`app-shell${panelOpen ? ' app-shell--panel-open' : ''}${pinned ? ' app-shell--pinned' : ''}`}
        style={activeAccent ? ({ '--section-accent': activeAccent } as React.CSSProperties) : undefined}
      >
        <a href="#gfh-main" className="skip-link">
          {t('nav.skipToContent', 'Перейти к содержимому')}
        </a>
        <IconRail
          activeSection={activeSection}
          pinned={pinned}
          onSectionClick={handleSectionClick}
          onSectionHover={handleSectionHover}
          onRailLeave={handlePanelLeave}
          onRailEnter={handlePanelEnter}
          onOpenPalette={() => setPaletteOpen(true)}
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
          <div
            className="mobile-overlay"
            aria-hidden="true"
            onClick={closePanel}
          />
        )}

        <div
          className="app-shell-main"
          onMouseDownCapture={() => { if (activeSection != null && !pinned) { cancelHoverTimers(); setActiveSection(null) } }}
        >
          <Topbar
            onHamburgerClick={() => setMobileOpen(o => !o)}
            mobileNavOpen={mobileOpen}
          />
          <main id="gfh-main" style={{ flex: 1, overflow: 'auto', scrollMarginTop: 'var(--topbar-h)' }} tabIndex={-1}>
            {children}
          </main>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </div>

        {chordVisible && (
          <div
            className="chord-hint"
            role="status"
            aria-live="polite"
            aria-label={t('nav.chordHint', 'Аккорд g — нажмите вторую клавишу: d, m, e, v, a, h, t, u, s') as string}
          >
            <kbd aria-hidden="true">g</kbd>
            <span className="chord-hint-dots" aria-hidden="true">…</span>
            <span className="chord-hint-label" aria-hidden="true">d · m · e · v · a · h · t · u · s</span>
          </div>
        )}
      </div>
    </PageTitleProvider>
  )
}
