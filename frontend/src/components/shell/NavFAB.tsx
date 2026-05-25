import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, X, Target, FileCheck, CheckSquare, Users, ClipboardList, Search } from 'lucide-react'
import { Role } from './navConfig'

interface FABAction {
  key: string
  labelKey: string
  icon: React.ElementType
  to?: string
  action?: 'palette'
}

const ACTIONS_BY_ROLE: Record<Role, FABAction[]> = {
  EMPLOYEE: [
    { key: 'my-kpi', labelKey: 'nav.fabMyKpi', icon: Target, to: '/my-kpi' },
    { key: 'my-evals', labelKey: 'nav.fabMyEvals', icon: FileCheck, to: '/my-evaluations' },
    { key: 'palette', labelKey: 'nav.fabPalette', icon: Search, action: 'palette' },
  ],
  ORG_HEAD: [
    { key: 'my-tasks', labelKey: 'nav.fabMyTasks', icon: CheckSquare, to: '/my-tasks' },
    { key: 'palette', labelKey: 'nav.fabPalette', icon: Search, action: 'palette' },
  ],
  DEPUTY_CHAIRMAN: [
    { key: 'my-tasks', labelKey: 'nav.fabMyTasks', icon: CheckSquare, to: '/my-tasks' },
    { key: 'palette', labelKey: 'nav.fabPalette', icon: Search, action: 'palette' },
  ],
  CHAIRMAN: [
    { key: 'my-tasks', labelKey: 'nav.fabMyTasks', icon: CheckSquare, to: '/my-tasks' },
    { key: 'palette', labelKey: 'nav.fabPalette', icon: Search, action: 'palette' },
  ],
  ADMIN: [
    { key: 'users', labelKey: 'nav.fabUsers', icon: Users, to: '/admin/users' },
    { key: 'audit', labelKey: 'nav.fabAudit', icon: ClipboardList, to: '/admin/audit' },
    { key: 'palette', labelKey: 'nav.fabPalette', icon: Search, action: 'palette' },
  ],
}

interface NavFABProps {
  role: Role | null
  onOpenPalette: () => void
  onNavigate?: () => void
}

export function NavFAB({ role, onOpenPalette, onNavigate }: NavFABProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const toggleRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click. Esc closes + returns focus to toggle.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const getItems = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button.nav-fab-item') ?? [])
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
      const items = getItems()
      if (items.length === 0) return
      const idx = items.indexOf(document.activeElement as HTMLButtonElement)
      e.preventDefault()
      let next = 0
      if (e.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % items.length
      else if (e.key === 'ArrowUp') next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length
      else if (e.key === 'Home') next = 0
      else if (e.key === 'End') next = items.length - 1
      items[next]?.focus()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    // Move focus to first menuitem after open frame.
    const raf = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('button.nav-fab-item')?.focus()
    })
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      cancelAnimationFrame(raf)
    }
  }, [open])

  if (!role) return null
  const actions = ACTIONS_BY_ROLE[role]
  if (!actions || actions.length === 0) return null

  const handleAction = (a: FABAction) => {
    setOpen(false)
    if (a.action === 'palette') onOpenPalette()
    else if (a.to) { navigate(a.to); onNavigate?.() }
  }

  return (
    <div ref={rootRef} className={`nav-fab-root${open ? ' nav-fab-root--open' : ''}`}>
      {open && (
        <div
          className="nav-fab-menu"
          id="gfh-fab-menu"
          role="menu"
          ref={menuRef}
          aria-label={t('nav.fabToggle', 'Быстрые действия') as string}
        >
          {actions.map((a, i) => {
            const Icon = a.icon
            return (
              <button
                key={a.key}
                type="button"
                className="nav-fab-item"
                role="menuitem"
                style={{ transitionDelay: `${i * 30}ms` }}
                onClick={() => handleAction(a)}
              >
                <span className="nav-fab-item-icon" aria-hidden="true"><Icon size={15} /></span>
                <span className="nav-fab-item-label">{t(a.labelKey)}</span>
              </button>
            )
          })}
        </div>
      )}
      <button
        ref={toggleRef}
        type="button"
        className={`nav-fab${open ? ' nav-fab--open' : ''}`}
        aria-label={t('nav.fabToggle', 'Быстрые действия') as string}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="gfh-fab-menu"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <X size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
      </button>
    </div>
  )
}
