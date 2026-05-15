import { useRef, useEffect, type ReactNode } from 'react'
import { FilterDropdown, type FilterOption } from './FilterDropdown'

export type StatusFilter = 'all' | 'active' | 'inactive'
export type ViewMode = 'table' | 'cards'

const ROLE_OPTIONS: FilterOption[] = [
  { value: '',                        label: 'Все роли' },
  { value: 'ADMIN',                   label: 'Администратор' },
  { value: 'CHAIRMAN',                label: 'Председатель' },
  { value: 'DEPUTY_CHAIRMAN',         label: 'Зам. председателя' },
  { value: 'HEAD_OF_DEPARTMENT',      label: 'Нач. департамента' },
  { value: 'HEAD_OF_DEPARTMENT_UNIT', label: 'Нач. отдела' },
  { value: 'EMPLOYEE',                label: 'Сотрудник' },
]

const STATUS_OPTIONS: FilterOption[] = [
  { value: '',         label: 'Любой статус' },
  { value: 'active',   label: 'Активные' },
  { value: 'inactive', label: 'Заблокированные' },
]

interface UsersFiltersProps {
  search: string
  onSearch: (v: string) => void
  role: string
  onRole: (v: string) => void
  status: StatusFilter
  onStatus: (v: StatusFilter) => void
  view: ViewMode
  onView: (v: ViewMode) => void
  matchedCount: number
  totalCount: number
}

export function UsersFilters({
  search, onSearch, role, onRole, status, onStatus,
  view, onView, matchedCount, totalCount,
}: UsersFiltersProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // `/` focuses search (⌘K is taken by the global command palette).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (typing) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
      {/* Search box */}
      <div className="relative" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
        <svg
          viewBox="0 0 24 24" aria-hidden
          style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            width: 15, height: 15, stroke: 'var(--ink-dim)', fill: 'none', strokeWidth: 2,
          }}
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16" y1="16" x2="21" y2="21" />
        </svg>
        <input
          ref={inputRef}
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Поиск по ФИО или email…"
          aria-label="Поиск пользователей"
          className="users-search-input w-full outline-none"
          style={{
            height: 34, padding: '0 34px 0 33px',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 8, fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit',
          }}
        />
        <kbd
          className="font-mono"
          style={{
            position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: 'var(--ink-faint)', background: 'var(--surface-mute)',
            border: '1px solid var(--line)', borderRadius: 4, padding: '1px 5px',
          }}
        >
          /
        </kbd>
      </div>

      <FilterDropdown label="Роль" value={role} options={ROLE_OPTIONS} onChange={onRole} />
      <FilterDropdown
        label="Статус"
        value={status === 'all' ? '' : status}
        options={STATUS_OPTIONS}
        onChange={v => onStatus((v || 'all') as StatusFilter)}
      />

      <span
        className="font-mono"
        style={{ fontSize: 11, color: 'var(--ink-faint)', marginLeft: 2 }}
      >
        {matchedCount} / {totalCount}
      </span>

      <div className="flex-1" />

      <Segmented
        ariaLabel="Режим отображения"
        value={view}
        options={[
          { value: 'table', icon: <IconViewTable />, title: 'Таблица' },
          { value: 'cards', icon: <IconViewCards />, title: 'Карточки' },
        ]}
        onChange={onView}
      />

      <style>{`
        .users-search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
        }
      `}</style>
    </div>
  )
}

function IconViewTable() {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden
      style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  )
}
function IconViewCards() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'currentColor' }}>
      <rect x="3"  y="3"  width="8" height="8" rx="1.6" />
      <rect x="13" y="3"  width="8" height="8" rx="1.6" />
      <rect x="3"  y="13" width="8" height="8" rx="1.6" />
      <rect x="13" y="13" width="8" height="8" rx="1.6" />
    </svg>
  )
}

function Segmented<T extends string>({
  ariaLabel, value, options, onChange,
}: {
  ariaLabel: string
  value: T
  options: { value: T; icon: ReactNode; title: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center"
      style={{
        background: 'var(--surface-mute)', border: '1px solid var(--line)',
        borderRadius: 8, padding: 2, gap: 2,
      }}
    >
      {options.map(o => {
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={selected}
            aria-label={o.title}
            title={o.title}
            className="inline-flex items-center justify-center transition-colors"
            style={{
              width: 30, height: 26, borderRadius: 6,
              background: selected ? 'var(--surface)' : 'transparent',
              color: selected ? 'var(--accent)' : 'var(--ink-faint)',
              border: `1px solid ${selected ? 'var(--line)' : 'transparent'}`,
              boxShadow: selected ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
            }}
          >
            {o.icon}
          </button>
        )
      })}
    </div>
  )
}
