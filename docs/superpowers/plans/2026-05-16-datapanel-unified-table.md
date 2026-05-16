# DataPanel Unified Table Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable `DataPanel<T>` component bundling table, search, declarative filters, pagination, and a table/cards view switch — then ship a new users page (`UsersPageV2`) built on it at feature parity with the existing one.

**Architecture:** `DataPanel<T>` wraps the existing `DataTable<T>` (unchanged) and adds a toolbar (search + filters + view switch) and a pager footer. Two data modes: `client` (panel owns search/filter/sort/page state and slices rows) and `server` (panel is controlled, emits `onStateChange`). Sub-components `DataPanelToolbar` and `DataPanelPager` live beside it in `src/components/`.

**Tech Stack:** React 18, TypeScript, Vite. No frontend test framework exists in this repo — verification is `npx tsc --noEmit` + `npm run build` + manual checks. Do NOT add vitest/jest.

---

## File Structure

- Create: `frontend/src/components/DataPanelPager.tsx` — range label + page buttons.
- Create: `frontend/src/components/DataPanelToolbar.tsx` — search input, filter renderer, view switch.
- Create: `frontend/src/components/DataPanel.tsx` — main component, both data modes, table + card render.
- Create: `frontend/src/features/users/UsersPageV2.tsx` — new users page on `DataPanel`.
- Modify: `frontend/src/App.tsx` — add `/users-v2` route.

The existing `frontend/src/features/users/UsersPage.tsx`, `DataTable.tsx`, and all `features/users/components/*` are reused unchanged.

All commands run from `frontend/`. Verification command throughout: `npx tsc --noEmit` (expected: no output, exit 0).

---

### Task 1: DataPanelPager component

**Files:**
- Create: `frontend/src/components/DataPanelPager.tsx`

- [ ] **Step 1: Create the pager component**

Create `frontend/src/components/DataPanelPager.tsx`:

```tsx
/**
 * Pagination footer for DataPanel — range label + numbered page buttons.
 * Extracted from the original UsersPage pager block; same cream-theme styling.
 */

interface DataPanelPagerProps {
  /** 0-based current page. */
  page: number
  /** Total page count (>= 1). */
  totalPages: number
  /** 1-based first visible row index. */
  rangeFrom: number
  /** 1-based last visible row index. */
  rangeTo: number
  /** Total matched row count. */
  total: number
  onPage: (p: number) => void
}

export function DataPanelPager({
  page, totalPages, rangeFrom, rangeTo, total, onPage,
}: DataPanelPagerProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 mt-3 flex-wrap"
      style={{
        padding: '11px 16px', borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--surface-mute)',
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
        Показано{' '}
        <strong className="font-mono" style={{ color: 'var(--ink)' }}>
          {rangeFrom}–{rangeTo}
        </strong>{' '}
        из{' '}
        <strong className="font-mono" style={{ color: 'var(--ink)' }}>{total}</strong>
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <PagerButton disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))} ariaLabel="Предыдущая">
            ←
          </PagerButton>
          {Array.from({ length: totalPages }).map((_, i) => {
            const selected = page === i
            return (
              <button
                key={i}
                onClick={() => onPage(i)}
                aria-current={selected ? 'page' : undefined}
                className="font-mono transition-colors"
                style={{
                  minWidth: 28, height: 28, padding: '0 8px', borderRadius: 4,
                  fontSize: 11, fontWeight: 600,
                  background: selected ? 'var(--accent)' : 'var(--surface)',
                  color: selected ? 'var(--surface)' : 'var(--ink-soft)',
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
                  cursor: 'pointer',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
            )
          })}
          <PagerButton
            disabled={page >= totalPages - 1}
            onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
            ariaLabel="Следующая"
          >
            →
          </PagerButton>
        </div>
      )}
    </div>
  )
}

function PagerButton({
  children, disabled, onClick, ariaLabel,
}: {
  children: React.ReactNode; disabled?: boolean; onClick: () => void; ariaLabel: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="font-mono transition-colors"
      style={{
        width: 28, height: 28, borderRadius: 4, fontSize: 12, fontWeight: 700,
        background: 'var(--surface)',
        color: disabled ? 'var(--ink-dim)' : 'var(--ink-soft)',
        border: '1px solid var(--line)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DataPanelPager.tsx
git commit -m "feat(datapanel): add DataPanelPager pagination footer"
```

---

### Task 2: DataPanelToolbar component

**Files:**
- Create: `frontend/src/components/DataPanelToolbar.tsx`

This file also exports the shared `FilterDef` and `ViewKind` types consumed by `DataPanel`.

- [ ] **Step 1: Create the toolbar component**

Create `frontend/src/components/DataPanelToolbar.tsx`:

```tsx
import { useRef, useEffect, type ReactNode } from 'react'

/**
 * DataPanel toolbar — search input, declarative filters, custom filter slot,
 * and the table/cards view switch. Cream-theme styling to match the app tables.
 */

export type ViewKind = 'table' | 'cards'

export interface FilterDef {
  /** Stable key — also the key in the filter-values record. */
  key: string
  label: string
  /**
   * 'select' renders a styled native <select>; `options` is required and its
   * FIRST entry must be the "clear" entry (empty value, e.g. "Все роли").
   * 'toggle' renders a chip that flips between '' and options[0].value;
   * `options` must have exactly one entry.
   */
  type: 'select' | 'toggle'
  options?: { value: string; label: string }[]
}

interface DataPanelToolbarProps {
  searchable: boolean
  search: string
  onSearch: (v: string) => void
  searchPlaceholder?: string

  filters: FilterDef[]
  filterValues: Record<string, string>
  onFilter: (key: string, value: string) => void
  filterSlot?: ReactNode

  views: ViewKind[]
  view: ViewKind
  onView: (v: ViewKind) => void

  /** Page-level actions rendered at the toolbar's trailing edge. */
  toolbarActions?: ReactNode
}

export function DataPanelToolbar({
  searchable, search, onSearch, searchPlaceholder,
  filters, filterValues, onFilter, filterSlot,
  views, view, onView, toolbarActions,
}: DataPanelToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // `/` focuses the search box (⌘K is the global command palette).
  useEffect(() => {
    if (!searchable) return
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
  }, [searchable])

  return (
    <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
      {searchable && (
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
            placeholder={searchPlaceholder ?? 'Поиск…'}
            aria-label="Поиск"
            className="dp-search-input w-full outline-none"
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
      )}

      {filters.map(f => {
        const value = filterValues[f.key] ?? ''
        if (f.type === 'toggle') {
          const opt = f.options?.[0]
          if (!opt) return null
          const on = value === opt.value
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilter(f.key, on ? '' : opt.value)}
              aria-pressed={on}
              className="transition-colors"
              style={{
                height: 34, padding: '0 12px', borderRadius: 8,
                fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                background: on ? 'var(--accent)' : 'var(--surface)',
                color: on ? 'var(--surface)' : 'var(--ink-soft)',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--line)'}`,
              }}
            >
              {opt.label}
            </button>
          )
        }
        return (
          <select
            key={f.key}
            value={value}
            aria-label={f.label}
            onChange={e => onFilter(f.key, e.target.value)}
            className="dp-filter-select outline-none"
            style={{
              height: 34, padding: '0 28px 0 11px', borderRadius: 8,
              fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
              color: value ? 'var(--ink)' : 'var(--ink-soft)',
              background: value ? 'var(--accent-mute)' : 'var(--surface)',
              border: `1px solid ${value ? 'var(--accent)' : 'var(--line)'}`,
            }}
          >
            {(f.options ?? []).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )
      })}

      {filterSlot}

      <div className="flex-1" />

      {toolbarActions}

      {views.length > 1 && (
        <div
          role="group"
          aria-label="Режим отображения"
          className="inline-flex items-center"
          style={{
            background: 'var(--surface-mute)', border: '1px solid var(--line)',
            borderRadius: 8, padding: 2, gap: 2,
          }}
        >
          {views.map(v => {
            const selected = view === v
            return (
              <button
                key={v}
                type="button"
                onClick={() => onView(v)}
                aria-pressed={selected}
                aria-label={v === 'table' ? 'Таблица' : 'Карточки'}
                title={v === 'table' ? 'Таблица' : 'Карточки'}
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
                {v === 'table' ? <IconViewTable /> : <IconViewCards />}
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        .dp-search-input:focus, .dp-filter-select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
        }
      `}</style>
    </div>
  )
}

function IconViewTable() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
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
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DataPanelToolbar.tsx
git commit -m "feat(datapanel): add DataPanelToolbar (search, filters, view switch)"
```

---

### Task 3: DataPanel main component

**Files:**
- Create: `frontend/src/components/DataPanel.tsx`

- [ ] **Step 1: Create the DataPanel component**

Create `frontend/src/components/DataPanel.tsx`:

```tsx
import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { DataTable, type Column, type SortDir } from './DataTable'
import { DataPanelToolbar, type FilterDef, type ViewKind } from './DataPanelToolbar'
import { DataPanelPager } from './DataPanelPager'

/**
 * Unified table panel — table/cards view, search, declarative filters and
 * pagination around the existing DataTable. Two modes:
 *  - 'client': panel owns search/filter/sort/page state and slices `rows`.
 *  - 'server': panel is controlled; it emits onStateChange and renders the
 *    `rows` (current page) the parent supplies.
 */

export type { FilterDef, ViewKind } from './DataPanelToolbar'
export type { Column, SortDir } from './DataTable'

export interface PanelState {
  search: string
  filters: Record<string, string>
  sort: { key: string; dir: SortDir } | null
  page: number
}

export interface DataPanelProps<T> {
  mode?: 'client' | 'server'
  columns: Column<T>[]
  rows: T[]
  rowKey: (r: T) => string | number
  loading?: boolean
  caption: string
  empty?: ReactNode

  searchable?: boolean
  searchText?: (r: T) => string
  searchPlaceholder?: string

  filters?: FilterDef[]
  clientFilter?: (r: T, values: Record<string, string>) => boolean
  filterSlot?: ReactNode

  comparator?: (key: string) => (a: T, b: T) => number
  defaultSort?: { key: string; dir: SortDir }

  views?: ViewKind[]
  renderCard?: (r: T) => ReactNode
  viewStorageKey?: string

  pageSize?: number
  /** server mode — current 0-based page (controlled). */
  page?: number
  /** server mode — total matched row count. */
  totalElements?: number
  onStateChange?: (s: PanelState) => void

  onRowClick?: (r: T) => void
  toolbarActions?: ReactNode
}

function loadView(key: string | undefined, views: ViewKind[]): ViewKind {
  if (key) {
    const saved = localStorage.getItem(key)
    if (saved === 'table' || saved === 'cards') {
      if (views.includes(saved)) return saved
    }
  }
  return views[0]
}

export function DataPanel<T>({
  mode = 'client',
  columns, rows, rowKey, loading = false, caption, empty,
  searchable = false, searchText, searchPlaceholder,
  filters = [], clientFilter, filterSlot,
  comparator, defaultSort,
  views = ['table', 'cards'], renderCard, viewStorageKey,
  pageSize = 25, page: pageProp, totalElements, onStateChange,
  onRowClick, toolbarActions,
}: DataPanelProps<T>) {
  const [search, setSearch] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(defaultSort ?? null)
  const [clientPage, setClientPage] = useState(0)
  const [view, setView] = useState<ViewKind>(() => loadView(viewStorageKey, views))

  const page = mode === 'server' ? (pageProp ?? 0) : clientPage

  useEffect(() => {
    if (viewStorageKey) localStorage.setItem(viewStorageKey, view)
  }, [view, viewStorageKey])

  // server mode: report state changes to the parent.
  useEffect(() => {
    if (mode === 'server') onStateChange?.({ search, filters: filterValues, sort, page })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, search, filterValues, sort, page])

  // Reset to the first page whenever a filter/search/sort changes.
  useEffect(() => {
    if (mode === 'client') setClientPage(0)
    else onStateChange?.({ search, filters: filterValues, sort, page: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterValues, sort])

  const handleFilter = useCallback((key: string, value: string) => {
    setFilterValues(prev => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }, [])

  const handleSort = useCallback((key: string) => {
    setSort(prev => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      return { key, dir: 'asc' }
    })
  }, [])

  // ---- client mode: search -> filter -> sort -> slice ----
  const processed = useMemo(() => {
    if (mode === 'server') return rows
    let out = rows
    const q = search.trim().toLowerCase()
    if (q && searchText) out = out.filter(r => searchText(r).toLowerCase().includes(q))
    if (clientFilter && Object.keys(filterValues).length > 0) {
      out = out.filter(r => clientFilter(r, filterValues))
    }
    if (sort && comparator) {
      const cmp = comparator(sort.key)
      const dir = sort.dir === 'asc' ? 1 : -1
      out = [...out].sort((a, b) => cmp(a, b) * dir)
    }
    return out
  }, [mode, rows, search, searchText, clientFilter, filterValues, sort, comparator])

  const total = mode === 'server' ? (totalElements ?? rows.length) : processed.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const visible = mode === 'server'
    ? rows
    : processed.slice(page * pageSize, page * pageSize + pageSize)

  const rangeFrom = total === 0 ? 0 : page * pageSize + 1
  const rangeTo = mode === 'server'
    ? Math.min(page * pageSize + rows.length, total)
    : Math.min(page * pageSize + pageSize, total)

  const setPage = useCallback((p: number) => {
    if (mode === 'client') setClientPage(p)
    else onStateChange?.({ search, filters: filterValues, sort, page: p })
  }, [mode, onStateChange, search, filterValues, sort])

  return (
    <div>
      <DataPanelToolbar
        searchable={searchable}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={filterValues}
        onFilter={handleFilter}
        filterSlot={filterSlot}
        views={views}
        view={view}
        onView={setView}
        toolbarActions={toolbarActions}
      />

      {view === 'cards' && renderCard ? (
        loading ? (
          <div
            className="text-center"
            style={{
              padding: '56px 24px', fontSize: 13.5, color: 'var(--ink-faint)',
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
            }}
          >
            Загрузка…
          </div>
        ) : visible.length === 0 ? (
          <div
            className="text-center"
            style={{
              padding: '56px 24px', fontSize: 13.5, color: 'var(--ink-faint)',
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
            }}
          >
            {empty ?? 'Нет данных'}
          </div>
        ) : (
          <div
            className="grid gap-3.5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))' }}
          >
            {visible.map(r => (
              <div key={rowKey(r)}>{renderCard(r)}</div>
            ))}
          </div>
        )
      ) : (
        <div
          style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
          }}
        >
          <DataTable
            columns={columns}
            rows={visible}
            rowKey={rowKey}
            caption={caption}
            loading={loading}
            sort={sort ?? undefined}
            onSort={handleSort}
            onRowClick={onRowClick}
            empty={empty}
          />
        </div>
      )}

      {!loading && total > 0 && (
        <DataPanelPager
          page={page}
          totalPages={totalPages}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          total={total}
          onPage={setPage}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/DataPanel.tsx
git commit -m "feat(datapanel): add DataPanel component with client/server modes"
```

---

### Task 4: UsersPageV2 page

**Files:**
- Create: `frontend/src/features/users/UsersPageV2.tsx`

Notes for the engineer:
- `User` type and `usersApi` come from `frontend/src/features/users/usersApi.ts`. Relevant `User` fields used here: `id` (number), `fullName` (string), `email` (string), `role` (string), `position` (string | null/undefined), `isActive` (boolean).
- `ROLE_RANK` is exported from `frontend/src/features/users/components/usersMeta.tsx` — a `Record<string, number>` mapping role → sort rank.
- `Avatar`, `RoleBadge`, `StatusPill` are exported from `usersMeta.tsx`.
- `UserRowMenu` + `UserActions` type from `components/UserRowMenu`.
- `UserCardGrid` is NOT reused (it renders its own grid); instead the per-card markup below is passed to `DataPanel.renderCard`. Card markup is copied from `UserCardGrid.tsx` so the card visuals match the old page.

- [ ] **Step 1: Create the page**

Create `frontend/src/features/users/UsersPageV2.tsx`:

```tsx
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Layout } from '../../components/Layout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { UserFormModal } from './components/UserFormModal'
import { UsersSavedViews } from './components/UsersSavedViews'
import { UserDetailDrawer } from './components/UserDetailDrawer'
import { UserRowMenu, type UserActions } from './components/UserRowMenu'
import { Avatar, RoleBadge, StatusPill, ROLE_RANK } from './components/usersMeta'
import type { StatusFilter } from './components/UsersFilters'
import { User, usersApi } from './usersApi'

const VIEW_KEY = 'gfh_users_v2_view'

const ROLE_OPTIONS = [
  { value: '',                        label: 'Все роли' },
  { value: 'ADMIN',                   label: 'Администратор' },
  { value: 'CHAIRMAN',                label: 'Председатель' },
  { value: 'DEPUTY_CHAIRMAN',         label: 'Зам. председателя' },
  { value: 'HEAD_OF_DEPARTMENT',      label: 'Нач. департамента' },
  { value: 'HEAD_OF_DEPARTMENT_UNIT', label: 'Нач. отдела' },
  { value: 'EMPLOYEE',                label: 'Сотрудник' },
]
const STATUS_OPTIONS = [
  { value: '',         label: 'Любой статус' },
  { value: 'active',   label: 'Активные' },
  { value: 'inactive', label: 'Заблокированные' },
]

const FILTERS: FilterDef[] = [
  { key: 'role',   label: 'Роль',   type: 'select', options: ROLE_OPTIONS },
  { key: 'status', label: 'Статус', type: 'select', options: STATUS_OPTIONS },
]

export function UsersPageV2() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  // Saved-view tabs drive role/status filters. They live outside DataPanel,
  // so role/status are page state and passed into DataPanel via filterSlot=null;
  // the DataPanel `filters` config renders the dropdowns and reports values back.
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [savedViewRole, setSavedViewRole] = useState('')
  const [savedViewStatus, setSavedViewStatus] = useState<StatusFilter>('all')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      // ~100 employees — fetch wide, DataPanel filters/sorts client-side.
      const data = await usersApi.list(0, 500)
      setUsers(data.content)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const drawerUser = drawerId != null ? users.find(u => u.id === drawerId) ?? null : null

  const openDrawer = (user: User) => { setDrawerId(user.id); setDrawerOpen(true) }
  const closeDrawer = () => setDrawerOpen(false)

  const confirm = (title: string, description: string, onConfirm: () => void) => {
    closeDrawer()
    setConfirmDialog({ open: true, title, description, onConfirm })
  }
  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }))

  const actions: UserActions = {
    onEdit: (user) => { closeDrawer(); setEditingUser(user) },
    onDeactivate: (user) => confirm(
      'Деактивировать пользователя',
      `Вы уверены, что хотите деактивировать ${user.fullName}? Доступ будет заблокирован немедленно.`,
      async () => {
        try { await usersApi.deactivate(user.id); loadUsers() }
        finally { closeConfirm() }
      },
    ),
    onReactivate: (user) => confirm(
      'Активировать пользователя',
      `Активировать ${user.fullName}?`,
      async () => {
        try { await usersApi.reactivate(user.id); loadUsers() }
        finally { closeConfirm() }
      },
    ),
    onResetPassword: (user) => confirm(
      'Сбросить пароль',
      `Сбросить пароль для ${user.fullName}? Пользователю будет выдан временный пароль.`,
      async () => {
        try { await usersApi.resetPassword(user.id) }
        finally { closeConfirm() }
      },
    ),
  }

  // ---- DataPanel config ----
  const columns: Column<User>[] = [
    {
      key: 'name', header: 'Пользователь', sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} role={u.role} active={u.isActive} size={34} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{u.fullName}</span>
        </div>
      ),
    },
    {
      key: 'email', header: 'Email', sortable: true,
      render: (u) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{u.email}</span>,
    },
    {
      key: 'role', header: 'Роль', sortable: true,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'position', header: 'Должность',
      render: (u) => (
        <span style={{ fontSize: 13, color: u.position ? 'var(--ink-soft)' : 'var(--ink-dim)' }}>
          {u.position ?? '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (u) => <StatusPill active={u.isActive} />,
    },
    {
      key: 'actions', header: 'Действия', align: 'right', srOnlyHeader: true,
      render: (u) => (
        <div onClick={e => e.stopPropagation()}>
          <UserRowMenu user={u} actions={actions} />
        </div>
      ),
    },
  ]

  const searchText = (u: User) => `${u.fullName} ${u.email}`

  const clientFilter = (u: User, v: Record<string, string>) => {
    if (v.role && u.role !== v.role) return false
    if (v.status === 'active' && !u.isActive) return false
    if (v.status === 'inactive' && u.isActive) return false
    return true
  }

  const comparator = (key: string) => (a: User, b: User): number => {
    switch (key) {
      case 'email':    return a.email.localeCompare(b.email)
      case 'role':     return (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99)
      case 'position': return (a.position ?? '').localeCompare(b.position ?? '', 'ru')
      case 'status':   return Number(b.isActive) - Number(a.isActive)
      default:         return a.fullName.localeCompare(b.fullName, 'ru')
    }
  }

  const renderCard = (u: User): ReactNode => (
    <div
      className="users-card"
      onClick={() => openDrawer(u)}
      tabIndex={0}
      role="button"
      aria-label={`Открыть профиль: ${u.fullName}`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(u) }
      }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={u.fullName} role={u.role} active={u.isActive} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            {u.fullName}
          </div>
          <div className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {u.email}
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <UserRowMenu user={u} actions={actions} />
        </div>
      </div>
      <div className="flex flex-col gap-2.5" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
        <CardMetaRow k="Должность">
          <span style={{ color: u.position ? 'var(--ink)' : 'var(--ink-dim)' }}>{u.position ?? '—'}</span>
        </CardMetaRow>
        <CardMetaRow k="Роль"><RoleBadge role={u.role} /></CardMetaRow>
        <CardMetaRow k="Статус"><StatusPill active={u.isActive} /></CardMetaRow>
      </div>
      <style>{`
        .users-card { cursor: pointer; transition: border-color 120ms ease, box-shadow 120ms ease; outline: none; }
        .users-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-md); }
        .users-card:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
      `}</style>
    </div>
  )

  const addButton = (
    <button
      onClick={() => setShowCreateModal(true)}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'var(--accent)', color: 'var(--surface)',
        border: '1px solid var(--accent-ink)', cursor: 'pointer',
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Добавить
    </button>
  )

  return (
    <Layout>
      <div style={{ padding: '8px 0 32px' }}>
        <div className="mb-5">
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
            Сотрудники
          </h1>
          <p style={{ marginTop: 5, fontSize: 14, color: 'var(--ink-soft)', maxWidth: 600, lineHeight: 1.5 }}>
            Управление учётными записями, ролями и доступом сотрудников.
          </p>
        </div>

        <UsersSavedViews
          users={users}
          role={savedViewRole}
          status={savedViewStatus}
          onApply={(r, s) => { setSavedViewRole(r); setSavedViewStatus(s) }}
        />

        <DataPanel<User>
          mode="client"
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          loading={loading}
          caption="Список сотрудников"
          empty="Совпадений не найдено"
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по ФИО или email…"
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'name', dir: 'asc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          viewStorageKey={VIEW_KEY}
          pageSize={25}
          onRowClick={openDrawer}
          toolbarActions={addButton}
        />
      </div>

      <UserDetailDrawer
        user={drawerUser}
        open={drawerOpen && drawerUser != null}
        onClose={closeDrawer}
        actions={actions}
      />

      <UserFormModal
        open={showCreateModal || !!editingUser}
        user={editingUser}
        onClose={() => { setShowCreateModal(false); setEditingUser(null) }}
        onSave={async (data) => {
          if (editingUser) await usersApi.update(editingUser.id, data)
          else await usersApi.create(data)
          loadUsers()
        }}
      />

      <ConfirmDialog {...confirmDialog} onCancel={closeConfirm} variant="danger" />
    </Layout>
  )
}

function CardMetaRow({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ minHeight: 22 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{k}</span>
      <span className="truncate" style={{ fontSize: 13, textAlign: 'right' }}>{children}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify the imported names exist**

Run: `grep -nE "export.*ROLE_RANK|export.*Avatar|export.*RoleBadge|export.*StatusPill" frontend/src/features/users/components/usersMeta.tsx`
Expected: matches for `ROLE_RANK`, `Avatar`, `RoleBadge`, `StatusPill`. If `ROLE_RANK` is not exported there, find its real location with `grep -rn "ROLE_RANK" frontend/src/features/users` and fix the import.

Run: `grep -nE "fullName|position|isActive" frontend/src/features/users/usersApi.ts`
Expected: confirms `User` field names. Adjust `searchText`/`clientFilter`/`comparator`/columns if the real field names differ.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0. Fix any type mismatch (e.g. `UsersSavedViews` `onApply` signature, `UserActions` shape) against the real component props.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/users/UsersPageV2.tsx
git commit -m "feat(users): add UsersPageV2 built on DataPanel"
```

---

### Task 5: Route + final verification

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Import UsersPageV2**

In `frontend/src/App.tsx`, find the existing line:

```tsx
import { UsersPage } from './features/users/UsersPage'
```

Add directly below it:

```tsx
import { UsersPageV2 } from './features/users/UsersPageV2'
```

- [ ] **Step 2: Add the route**

In `frontend/src/App.tsx`, find the existing flat route:

```tsx
<Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
```

Add directly below it:

```tsx
<Route path="/users-v2" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPageV2 /></ProtectedRoute>} />
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: build succeeds, exit 0, no TypeScript errors.

- [ ] **Step 5: Manual verification**

Start the dev stack (`./scripts/dev-start.sh` from repo root), log in as admin, then:
- Visit `/users` — old page still works unchanged (search, filters, sort, pager, view switch, drawer, row actions, create/edit).
- Visit `/users-v2` — verify:
  - Search box filters by name/email; `/` key focuses it.
  - Role and Status dropdowns filter rows.
  - Column sort works (name, email, role, status); clicking toggles asc/desc.
  - Pager shows correct range, page buttons navigate, resets to page 1 on filter change.
  - Table/cards view switch works; selection persists after reload (localStorage `gfh_users_v2_view`).
  - Saved-view tabs render above the panel.
  - Row click / card click opens the detail drawer.
  - Row menu actions (edit, deactivate, reactivate, reset password) work; confirm dialog appears.
  - "Добавить" button opens the create modal; create + edit persist and reload the list.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(users): route /users-v2 to UsersPageV2"
```

---

## Self-Review Notes

- **Spec coverage:** unified component (Tasks 1-3), declarative filters + custom slot (`filters` + `filterSlot`, Task 2/3), search (Task 2/3), pagination (Task 1/3), card/table switch (Task 2/3), client + server modes (Task 3), new users page at feature parity (Task 4), new route (Task 5). All spec sections covered.
- **Server mode** has no consumer page in this plan (spec marks other-page migration out of scope); it is implemented in Task 3 and verified by `tsc`/`build` only — acceptable per spec.
- **Type consistency:** `Column<T>`, `SortDir` defined in `DataTable.tsx`, re-exported by `DataPanel.tsx`; `FilterDef`, `ViewKind` defined in `DataPanelToolbar.tsx`, re-exported by `DataPanel.tsx`. `PanelState` defined once in `DataPanel.tsx`. Task 4 verification Step 2 guards against `User`/`usersMeta` name drift.
