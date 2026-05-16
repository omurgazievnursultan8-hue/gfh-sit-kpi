import type { User } from '../usersApi'
import type { StatusFilter } from './UsersFilters'

export interface SavedView {
  id: string
  label: string
  role: string
  status: StatusFilter
}

// Quick-filter presets — underline tabs, reference "saved views" pattern.
export const SAVED_VIEWS: SavedView[] = [
  { id: 'all',      label: 'Все',             role: '',      status: 'all' },
  { id: 'active',   label: 'Активные',        role: '',      status: 'active' },
  { id: 'inactive', label: 'Заблокированные', role: '',      status: 'inactive' },
  { id: 'admins',   label: 'Администраторы',  role: 'ADMIN', status: 'all' },
]

function countFor(users: User[], v: SavedView): number {
  return users.filter(u => {
    if (v.role && u.role !== v.role) return false
    if (v.status === 'active' && !u.isActive) return false
    if (v.status === 'inactive' && u.isActive) return false
    return true
  }).length
}

interface Props {
  users: User[]
  role: string
  status: StatusFilter
  onApply: (role: string, status: StatusFilter) => void
}

export function UsersSavedViews({ users, role, status, onApply }: Props) {
  const activeId = SAVED_VIEWS.find(v => v.role === role && v.status === status)?.id ?? null

  return (
    <div
      role="tablist"
      aria-label="Быстрые фильтры"
      className="flex flex-wrap items-center gap-1 mb-3.5"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {SAVED_VIEWS.map(v => {
        const selected = v.id === activeId
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onApply(v.role, v.status)}
            className="inline-flex items-center gap-2 transition-colors"
            style={{
              height: 33, padding: '0 11px', marginBottom: -1,
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
              color: selected ? 'var(--ink)' : 'var(--ink-faint)',
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${selected ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {v.label}
            <span
              style={{
                fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 999,
                fontVariantNumeric: 'tabular-nums',
                background: selected ? 'var(--accent-mute)' : 'var(--surface-mute)',
                color: selected ? 'var(--accent)' : 'var(--ink-faint)',
                border: `1px solid ${selected ? 'var(--accent-soft)' : 'var(--line-soft)'}`,
              }}
            >
              {countFor(users, v)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
