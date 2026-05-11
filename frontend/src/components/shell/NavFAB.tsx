import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, X, Target, FileCheck, CheckSquare, ListTodo, Users, ClipboardList, Search } from 'lucide-react'
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
  HEAD_OF_DEPARTMENT_UNIT: [
    { key: 'my-tasks', labelKey: 'nav.fabMyTasks', icon: CheckSquare, to: '/my-tasks' },
    { key: 'manager-tasks', labelKey: 'nav.fabManagerTasks', icon: ListTodo, to: '/manager-tasks' },
    { key: 'palette', labelKey: 'nav.fabPalette', icon: Search, action: 'palette' },
  ],
  HEAD_OF_DEPARTMENT: [
    { key: 'my-tasks', labelKey: 'nav.fabMyTasks', icon: CheckSquare, to: '/my-tasks' },
    { key: 'manager-tasks', labelKey: 'nav.fabManagerTasks', icon: ListTodo, to: '/manager-tasks' },
    { key: 'palette', labelKey: 'nav.fabPalette', icon: Search, action: 'palette' },
  ],
  DEPUTY_CHAIRMAN: [
    { key: 'my-tasks', labelKey: 'nav.fabMyTasks', icon: CheckSquare, to: '/my-tasks' },
    { key: 'manager-tasks', labelKey: 'nav.fabManagerTasks', icon: ListTodo, to: '/manager-tasks' },
    { key: 'palette', labelKey: 'nav.fabPalette', icon: Search, action: 'palette' },
  ],
  CHAIRMAN: [
    { key: 'my-tasks', labelKey: 'nav.fabMyTasks', icon: CheckSquare, to: '/my-tasks' },
    { key: 'manager-tasks', labelKey: 'nav.fabManagerTasks', icon: ListTodo, to: '/manager-tasks' },
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

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
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
        <div className="nav-fab-menu" role="menu">
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
                <span className="nav-fab-item-icon"><Icon size={15} /></span>
                <span className="nav-fab-item-label">{t(a.labelKey)}</span>
              </button>
            )
          })}
        </div>
      )}
      <button
        type="button"
        className={`nav-fab${open ? ' nav-fab--open' : ''}`}
        aria-label={t('nav.fabToggle', 'Быстрые действия') as string}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? <X size={18} /> : <Plus size={18} />}
      </button>
    </div>
  )
}
