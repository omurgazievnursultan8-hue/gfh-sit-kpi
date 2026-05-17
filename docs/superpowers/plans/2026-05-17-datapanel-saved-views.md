# DataPanel Saved Views, Columns Config & Filter Chips — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add saved views, column show/hide config, and an active-filter chip row to the shared `DataPanel` component, with `CriteriaPageV2` as the first consumer.

**Architecture:** Three features built into `DataPanel`. A `panelStorage.ts` util handles localStorage for the working state and the saved-view list. Three new presentational components (`SavedViewsMenu`, `ColumnsMenu`, `ActiveFilterChips`) are owned by `DataPanel` and mounted through `DataPanelToolbar`. `DataTable` is unchanged — it receives a column array already filtered by hidden columns.

**Tech Stack:** React 18, TypeScript, Vite. No frontend test runner exists in this repo — verification is `npx tsc --noEmit`, `npm run build`, and the manual checks listed per task.

---

## File Structure

- Create `frontend/src/components/panelStorage.ts` — types (`SavedView`, `PanelViewState`) + localStorage load/save helpers.
- Create `frontend/src/components/ActiveFilterChips.tsx` — removable filter-chip row.
- Create `frontend/src/components/ColumnsMenu.tsx` — column show/hide dropdown.
- Create `frontend/src/components/SavedViewsMenu.tsx` — saved-views dropdown.
- Create `frontend/src/components/useOutsideClick.ts` — shared hook to close dropdowns.
- Modify `frontend/src/components/DataTable.tsx` — add `hideable?` to `Column`.
- Modify `frontend/src/components/DataPanelToolbar.tsx` — mount the two menu nodes.
- Modify `frontend/src/components/DataPanel.tsx` — new state, persistence, apply-view, chip row.
- Modify `frontend/src/features/criteria/CriteriaPageV2.tsx` — new props, `hideable` flags, storage-key swap.

All work is on a feature branch off `main`.

---

## Task 1: Branch + `hideable` column field

**Files:**
- Modify: `frontend/src/components/DataTable.tsx:14-27`

- [ ] **Step 1: Create the feature branch**

```bash
cd /home/azamat/Desktop/projects/gfh/kpi
git checkout -b feat/datapanel-saved-views
```

- [ ] **Step 2: Add `hideable` to the `Column` interface**

In `frontend/src/components/DataTable.tsx`, inside `export interface Column<T>`, add this field after `srOnlyHeader`:

```ts
  /** When false, the column cannot be hidden via the columns config menu
   *  and is omitted from that menu's checklist. Default true. */
  hideable?: boolean
```

- [ ] **Step 3: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors (the field is optional, nothing else changes).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/DataTable.tsx
git commit -m "feat(datapanel): add hideable field to Column type"
```

---

## Task 2: `panelStorage.ts` — types and localStorage helpers

**Files:**
- Create: `frontend/src/components/panelStorage.ts`

- [ ] **Step 1: Write the file**

Create `frontend/src/components/panelStorage.ts`:

```ts
import type { SortDir } from './DataTable'
import type { ViewKind } from './DataPanelToolbar'

/** The five fields a saved view / persisted working state captures. */
export interface PanelViewState {
  search: string
  filters: Record<string, string>
  sort: { key: string; dir: SortDir } | null
  hiddenColumns: string[]
  view: ViewKind
}

export interface SavedView {
  id: string
  name: string
  state: PanelViewState
}

/** Id of the built-in, non-deletable default view. */
export const DEFAULT_VIEW_ID = '__default__'

const stateKey = (k: string) => `${k}:state`
const viewsKey = (k: string) => `${k}:views`

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function loadPanelState(key: string): PanelViewState | null {
  return readJson<PanelViewState>(stateKey(key))
}

export function savePanelState(key: string, state: PanelViewState): void {
  try {
    localStorage.setItem(stateKey(key), JSON.stringify(state))
  } catch {
    /* quota / disabled storage — ignore, persistence is best-effort */
  }
}

export function loadSavedViews(key: string): SavedView[] {
  const v = readJson<SavedView[]>(viewsKey(key))
  return Array.isArray(v) ? v : []
}

export function saveSavedViews(key: string, views: SavedView[]): void {
  try {
    localStorage.setItem(viewsKey(key), JSON.stringify(views))
  } catch {
    /* ignore — best-effort */
  }
}

/** Structural equality of two working states (field order independent). */
export function panelStateEquals(a: PanelViewState, b: PanelViewState): boolean {
  if (a.search !== b.search) return false
  if (a.view !== b.view) return false
  if ((a.sort?.key ?? '') !== (b.sort?.key ?? '')) return false
  if ((a.sort?.dir ?? '') !== (b.sort?.dir ?? '')) return false
  const fa = Object.keys(a.filters), fb = Object.keys(b.filters)
  if (fa.length !== fb.length) return false
  if (fa.some(k => a.filters[k] !== b.filters[k])) return false
  const ha = [...a.hiddenColumns].sort(), hb = [...b.hiddenColumns].sort()
  if (ha.length !== hb.length) return false
  return ha.every((k, i) => k === hb[i])
}
```

- [ ] **Step 2: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/panelStorage.ts
git commit -m "feat(datapanel): add panelStorage util for views persistence"
```

---

## Task 3: `useOutsideClick` hook

**Files:**
- Create: `frontend/src/components/useOutsideClick.ts`

- [ ] **Step 1: Write the file**

Create `frontend/src/components/useOutsideClick.ts`:

```ts
import { useEffect, type RefObject } from 'react'

/** Calls `onOutside` when a pointerdown lands outside `ref`, or Escape is
 *  pressed. Pass `active=false` to disable (e.g. while the menu is closed). */
export function useOutsideClick(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onOutside: () => void,
): void {
  useEffect(() => {
    if (!active) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, active, onOutside])
}
```

- [ ] **Step 2: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/useOutsideClick.ts
git commit -m "feat(datapanel): add useOutsideClick hook"
```

---

## Task 4: `ActiveFilterChips` component

**Files:**
- Create: `frontend/src/components/ActiveFilterChips.tsx`

- [ ] **Step 1: Write the file**

Create `frontend/src/components/ActiveFilterChips.tsx`:

```tsx
import type { FilterDef } from './DataPanelToolbar'

interface ActiveFilterChipsProps {
  filters: FilterDef[]
  values: Record<string, string>
  onClear: (key: string) => void
  onClearAll: () => void
}

/** Row of removable chips, one per active filter value. Renders nothing when
 *  no filter is active. The filter's option label is resolved from FilterDef. */
export function ActiveFilterChips({ filters, values, onClear, onClearAll }: ActiveFilterChipsProps) {
  const active = filters.filter(f => values[f.key])
  if (active.length === 0) return null

  const optionLabel = (f: FilterDef, value: string): string => {
    const opt = f.options?.find(o => o.value === value)
    return opt?.label ?? value
  }

  return (
    <div className="flex flex-wrap items-center gap-2" style={{ marginTop: -4, marginBottom: 14 }}>
      {active.map(f => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5"
          style={{
            fontSize: 12, height: 26, padding: '0 6px 0 10px', borderRadius: 999,
            background: 'var(--accent-mute)', color: 'var(--accent)',
            border: '1px solid var(--accent-soft)',
          }}
        >
          <span style={{ color: 'var(--ink-soft)' }}>{f.label}:</span>
          {optionLabel(f, values[f.key])}
          <button
            type="button"
            onClick={() => onClear(f.key)}
            aria-label={`Убрать фильтр: ${f.label}`}
            className="inline-flex items-center justify-center"
            style={{
              width: 16, height: 16, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'inherit', padding: 0,
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden style={{ width: 11, height: 11, stroke: 'currentColor', strokeWidth: 2.6, fill: 'none' }}>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        style={{
          fontSize: 12, height: 26, padding: '0 8px', borderRadius: 8,
          background: 'transparent', color: 'var(--ink-soft)',
          border: 'none', cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        Очистить все
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ActiveFilterChips.tsx
git commit -m "feat(datapanel): add ActiveFilterChips component"
```

---

## Task 5: `ColumnsMenu` component

**Files:**
- Create: `frontend/src/components/ColumnsMenu.tsx`

- [ ] **Step 1: Write the file**

Create `frontend/src/components/ColumnsMenu.tsx`:

```tsx
import { useRef, useState } from 'react'
import type { Column } from './DataTable'
import { useOutsideClick } from './useOutsideClick'

interface ColumnsMenuProps<T> {
  columns: Column<T>[]
  hiddenColumns: string[]
  onToggle: (key: string) => void
}

const BTN_STYLE: React.CSSProperties = {
  height: 34, padding: '0 11px', borderRadius: 8,
  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
  background: 'var(--surface)', color: 'var(--ink-soft)',
  border: '1px solid var(--line)',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

/** Toolbar dropdown to show/hide table columns. Non-hideable columns
 *  (hideable === false) are excluded from the checklist. */
export function ColumnsMenu<T>({ columns, hiddenColumns, onToggle }: ColumnsMenuProps<T>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, open, () => setOpen(false))

  const toggleable = columns.filter(c => c.hideable !== false)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={BTN_STYLE}>
        <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="9.5" y1="4" x2="9.5" y2="20" />
          <line x1="15.5" y1="4" x2="15.5" y2="20" />
        </svg>
        Столбцы
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 30,
            minWidth: 200, padding: 6, borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {toggleable.map(c => {
            const visible = !hiddenColumns.includes(c.key)
            return (
              <label
                key={c.key}
                className="flex items-center gap-2.5"
                style={{ padding: '7px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: 'var(--ink)' }}
              >
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => onToggle(c.key)}
                  style={{ width: 14, height: 14, accentColor: 'var(--accent)' }}
                />
                <span>{typeof c.header === 'string' ? c.header : c.key}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ColumnsMenu.tsx
git commit -m "feat(datapanel): add ColumnsMenu component"
```

---

## Task 6: `SavedViewsMenu` component

**Files:**
- Create: `frontend/src/components/SavedViewsMenu.tsx`

- [ ] **Step 1: Write the file**

Create `frontend/src/components/SavedViewsMenu.tsx`:

```tsx
import { useRef, useState } from 'react'
import { useOutsideClick } from './useOutsideClick'
import { type SavedView, DEFAULT_VIEW_ID } from './panelStorage'

interface SavedViewsMenuProps {
  views: SavedView[]          // custom views only (default is implicit)
  activeViewId: string
  modified: boolean           // working state diverges from the active view
  onApply: (id: string) => void
  onSave: (name: string) => void
  onDelete: (id: string) => void
}

const BTN_STYLE: React.CSSProperties = {
  height: 34, padding: '0 11px', borderRadius: 8,
  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
  background: 'var(--surface)', color: 'var(--ink-soft)',
  border: '1px solid var(--line)',
  display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 240,
}

/** Toolbar dropdown: pick / save / delete saved views. The built-in default
 *  view ("Все") is always listed first and cannot be deleted. */
export function SavedViewsMenu({ views, activeViewId, modified, onApply, onSave, onDelete }: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, open, () => setOpen(false))

  const activeName = activeViewId === DEFAULT_VIEW_ID
    ? 'Все'
    : (views.find(v => v.id === activeViewId)?.name ?? 'Все')

  const handleSave = () => {
    const name = window.prompt('Название представления:')?.trim()
    if (name) onSave(name)
    setOpen(false)
  }

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '7px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
    background: active ? 'var(--accent-mute)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--ink)',
    border: 'none', textAlign: 'left',
  })

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={BTN_STYLE}>
        <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, flexShrink: 0 }}>
          <polyline points="4 6 9 6" /><polyline points="4 12 9 12" /><polyline points="4 18 9 18" />
          <circle cx="15" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="15" cy="18" r="2" />
        </svg>
        <span className="truncate">{activeName}{modified ? ' • изменено' : ''}</span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30,
            minWidth: 240, padding: 6, borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <button type="button" style={rowStyle(activeViewId === DEFAULT_VIEW_ID)}
            onClick={() => { onApply(DEFAULT_VIEW_ID); setOpen(false) }}>
            <Check on={activeViewId === DEFAULT_VIEW_ID} />
            <span className="flex-1">Все</span>
          </button>

          {views.map(v => (
            <div key={v.id} className="flex items-center" style={{ gap: 2 }}>
              <button type="button" style={{ ...rowStyle(activeViewId === v.id), flex: 1 }}
                onClick={() => { onApply(v.id); setOpen(false) }}>
                <Check on={activeViewId === v.id} />
                <span className="flex-1 truncate">{v.name}</span>
              </button>
              <button type="button" aria-label={`Удалить: ${v.name}`}
                onClick={() => onDelete(v.id)}
                style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--ink-faint)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <svg viewBox="0 0 24 24" aria-hidden style={{ width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                  <polyline points="3 6 21 6" />
                  <path d="M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--line)', margin: '4px 4px 2px' }} />
          <button type="button" style={rowStyle(false)} onClick={handleSave}>
            <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Сохранить как…</span>
          </button>
        </div>
      )}
    </div>
  )
}

function Check({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, flexShrink: 0, fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, opacity: on ? 1 : 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
```

- [ ] **Step 2: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SavedViewsMenu.tsx
git commit -m "feat(datapanel): add SavedViewsMenu component"
```

---

## Task 7: Mount menu slots in `DataPanelToolbar`

**Files:**
- Modify: `frontend/src/components/DataPanelToolbar.tsx:24-47,150-156`

- [ ] **Step 1: Add two node props to the props interface**

In `DataPanelToolbar.tsx`, add to `interface DataPanelToolbarProps`, after `filterSlot?: ReactNode`:

```ts
  /** Saved-views dropdown — rendered at the leading edge, before search. */
  viewsMenu?: ReactNode
  /** Columns config dropdown — rendered next to the view switch. */
  columnsMenu?: ReactNode
```

- [ ] **Step 2: Destructure the new props**

In the `DataPanelToolbar` function signature, add `viewsMenu, columnsMenu` to the destructured params (after `filters, filterValues, onFilter, filterSlot,`):

```ts
  filters, filterValues, onFilter, filterSlot, viewsMenu, columnsMenu,
```

- [ ] **Step 3: Render `viewsMenu` before the search input**

In the returned JSX, immediately after the opening `<div className="flex flex-wrap items-center gap-2.5 mb-3.5">`, add:

```tsx
      {viewsMenu}
```

- [ ] **Step 4: Render `columnsMenu` before the view switch**

In the returned JSX, immediately before the `{views.length > 1 && (` block, add:

```tsx
      {columnsMenu}
```

- [ ] **Step 5: Verify types**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/DataPanelToolbar.tsx
git commit -m "feat(datapanel): add viewsMenu and columnsMenu slots to toolbar"
```

---

## Task 8: Wire features into `DataPanel`

**Files:**
- Modify: `frontend/src/components/DataPanel.tsx` (whole file — see steps)

- [ ] **Step 1: Update imports and re-exports**

Replace the import block and the type re-exports at the top of `DataPanel.tsx` (lines 1-15) with:

```tsx
import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { DataTable, type Column, type SortDir } from './DataTable'
import { DataPanelToolbar, type FilterDef, type ViewKind } from './DataPanelToolbar'
import { DataPanelPager } from './DataPanelPager'
import { ActiveFilterChips } from './ActiveFilterChips'
import { ColumnsMenu } from './ColumnsMenu'
import { SavedViewsMenu } from './SavedViewsMenu'
import {
  type SavedView, type PanelViewState, DEFAULT_VIEW_ID,
  loadPanelState, savePanelState, loadSavedViews, saveSavedViews, panelStateEquals,
} from './panelStorage'

export type { FilterDef, ViewKind } from './DataPanelToolbar'
export type { Column, SortDir } from './DataTable'
export type { SavedView } from './panelStorage'
```

- [ ] **Step 2: Add new props to `DataPanelProps`**

In `interface DataPanelProps<T>`, after the `viewStorageKey?: string` line, add:

```ts
  /** Enables saved views + working-state persistence. Two localStorage keys
   *  are derived: `${key}:state` and `${key}:views`. Supersedes viewStorageKey. */
  panelStorageKey?: string
  /** Show the columns show/hide dropdown in the toolbar. */
  columnConfig?: boolean
  /** Show the active-filter chip row below the toolbar. Default true when
   *  `filters` is non-empty. */
  showFilterChips?: boolean
```

- [ ] **Step 3: Destructure the new props**

In the `DataPanel` function signature, change the line `views = ['table', 'cards'], renderCard, viewStorageKey,` to:

```tsx
  views = ['table', 'cards'], renderCard, viewStorageKey,
  panelStorageKey, columnConfig = false, showFilterChips,
```

- [ ] **Step 4: Initialise state from persisted panel state**

Replace the state-declaration block (currently lines 103-109, `const [search, setSearch] ...` through `const [view, setView] ...`) with:

```tsx
  const persisted = useMemo<PanelViewState | null>(
    () => (panelStorageKey ? loadPanelState(panelStorageKey) : null),
    [panelStorageKey],
  )

  const [search, setSearch] = useState(persisted?.search ?? '')
  const [filterValuesState, setFilterValuesState] = useState<Record<string, string>>(
    persisted?.filters ?? {},
  )
  const filterValues = filterValuesProp ?? filterValuesState
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(
    persisted?.sort ?? defaultSort ?? null,
  )
  const [clientPage, setClientPage] = useState(0)
  const [pageSize, setPageSize] = useState(pageSizeProp)
  const [view, setView] = useState<ViewKind>(
    () => persisted?.view ?? loadView(viewStorageKey, views),
  )
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(persisted?.hiddenColumns ?? [])
  const [savedViews, setSavedViews] = useState<SavedView[]>(
    () => (panelStorageKey ? loadSavedViews(panelStorageKey) : []),
  )
  const [activeViewId, setActiveViewId] = useState(DEFAULT_VIEW_ID)
```

- [ ] **Step 5: Persist working state on change**

Immediately after the existing `useEffect` that writes `viewStorageKey` (the block `useEffect(() => { if (viewStorageKey) localStorage.setItem(viewStorageKey, view) }, [view, viewStorageKey])`), add:

```tsx
  // Persist the full working state under panelStorageKey so a reload restores
  // filters/sort/columns/mode. Filters only round-trip when uncontrolled.
  useEffect(() => {
    if (!panelStorageKey) return
    savePanelState(panelStorageKey, { search, filters: filterValues, sort, hiddenColumns, view })
  }, [panelStorageKey, search, filterValues, sort, hiddenColumns, view])
```

- [ ] **Step 6: Add the apply-view, save, delete, and column-toggle handlers**

After the existing `handleSort` `useCallback` block, add:

```tsx
  const setFilters = useCallback((next: Record<string, string>) => {
    if (filterValuesProp !== undefined) onFilterValuesChange?.(next)
    else setFilterValuesState(next)
  }, [filterValuesProp, onFilterValuesChange])

  const currentState = useMemo<PanelViewState>(
    () => ({ search, filters: filterValues, sort, hiddenColumns, view }),
    [search, filterValues, sort, hiddenColumns, view],
  )

  const defaultViewState = useMemo<PanelViewState>(
    () => ({ search: '', filters: {}, sort: defaultSort ?? null, hiddenColumns: [], view: views[0] }),
    [defaultSort, views],
  )

  const applyState = useCallback((s: PanelViewState) => {
    setSearch(s.search)
    setFilters(s.filters)
    setSort(s.sort)
    setHiddenColumns(s.hiddenColumns)
    if (views.includes(s.view)) setView(s.view)
  }, [setFilters, views])

  const handleApplyView = useCallback((id: string) => {
    setActiveViewId(id)
    if (id === DEFAULT_VIEW_ID) { applyState(defaultViewState); return }
    const v = savedViews.find(x => x.id === id)
    if (v) applyState(v.state)
  }, [applyState, defaultViewState, savedViews])

  const handleSaveView = useCallback((name: string) => {
    const v: SavedView = { id: crypto.randomUUID(), name, state: currentState }
    setSavedViews(prev => {
      const next = [...prev, v]
      if (panelStorageKey) saveSavedViews(panelStorageKey, next)
      return next
    })
    setActiveViewId(v.id)
  }, [currentState, panelStorageKey])

  const handleDeleteView = useCallback((id: string) => {
    setSavedViews(prev => {
      const next = prev.filter(v => v.id !== id)
      if (panelStorageKey) saveSavedViews(panelStorageKey, next)
      return next
    })
    setActiveViewId(curr => (curr === id ? DEFAULT_VIEW_ID : curr))
  }, [panelStorageKey])

  const handleToggleColumn = useCallback((key: string) => {
    setHiddenColumns(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }, [])

  const activeViewState = activeViewId === DEFAULT_VIEW_ID
    ? defaultViewState
    : (savedViews.find(v => v.id === activeViewId)?.state ?? defaultViewState)
  const viewModified = !panelStateEquals(currentState, activeViewState)

  const visibleColumns = useMemo(
    () => columns.filter(c => !hiddenColumns.includes(c.key)),
    [columns, hiddenColumns],
  )
```

- [ ] **Step 7: Build the menu nodes and pass them to the toolbar**

Replace the `<DataPanelToolbar ... />` element (lines ~190-203) with:

```tsx
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
        viewsMenu={panelStorageKey ? (
          <SavedViewsMenu
            views={savedViews}
            activeViewId={activeViewId}
            modified={viewModified}
            onApply={handleApplyView}
            onSave={handleSaveView}
            onDelete={handleDeleteView}
          />
        ) : undefined}
        columnsMenu={columnConfig ? (
          <ColumnsMenu
            columns={columns}
            hiddenColumns={hiddenColumns}
            onToggle={handleToggleColumn}
          />
        ) : undefined}
      />

      {(showFilterChips ?? filters.length > 0) && (
        <ActiveFilterChips
          filters={filters}
          values={filterValues}
          onClear={(key) => handleFilter(key, '')}
          onClearAll={() => setFilters({})}
        />
      )}
```

- [ ] **Step 8: Use `visibleColumns` for the table render**

In the `<DataTable ... />` element, change `columns={columns}` to `columns={visibleColumns}`.

- [ ] **Step 9: Verify types and build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/DataPanel.tsx
git commit -m "feat(datapanel): wire saved views, columns config, filter chips"
```

---

## Task 9: Adopt the features in `CriteriaPageV2`

**Files:**
- Modify: `frontend/src/features/criteria/CriteriaPageV2.tsx:11,67,104-135,255-277`

- [ ] **Step 1: Swap the storage key constant**

Change line 11 from:

```ts
const VIEW_KEY = 'gfh_criteria_v2_view'
```

to:

```ts
const PANEL_KEY = 'gfh_criteria_v2'
```

- [ ] **Step 2: Remove the controlled filter state**

Delete this line from the component body (currently line 67):

```ts
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
```

The page no longer owns filter state — `DataPanel` does. (`useState` stays imported; it is still used for other state.)

- [ ] **Step 3: Mark non-hideable columns**

In the `columns` array, add `hideable: false` to the `name` column and the `actions` column.

The `name` column's first line becomes:

```tsx
      key: 'name', header: 'Критерий', sortable: true, hideable: false,
```

The `actions` column's first line becomes:

```tsx
      key: 'actions', header: 'Действия', align: 'right', srOnlyHeader: true, hideable: false,
```

- [ ] **Step 4: Update the `DataPanel` props**

In the `<DataPanel<Criteria> ... />` element, remove these two lines:

```tsx
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
```

and replace the line `viewStorageKey={VIEW_KEY}` with:

```tsx
          panelStorageKey={PANEL_KEY}
          columnConfig
```

- [ ] **Step 5: Verify types and build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 6: Manual verification**

Start the dev stack (`./scripts/dev-start.sh`), log in as admin, open `/criteria-v2`, and confirm:
- A "Все" views dropdown and a "Столбцы" dropdown appear in the toolbar.
- Selecting the "Область" filter shows a removable chip below the toolbar; the × clears it; "Очистить все" clears all.
- "Столбцы" hides `scope`/`weight`/`status` from the table; `Критерий` and the actions column are absent from the checklist and stay visible. Cards view is unaffected.
- "Сохранить как…" prompts for a name, the view appears in the dropdown with a ✓; changing a filter adds "• изменено" to the dropdown label.
- Reload the page — filters, sort, hidden columns, and table/cards mode are restored.
- Deleting a custom view removes it; the built-in "Все" has no trash control.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/criteria/CriteriaPageV2.tsx
git commit -m "feat(criteria): enable saved views and columns config on v2 page"
```

---

## Self-Review Notes

- **Spec coverage:** saved views (Tasks 2, 6, 8), built-in default view (`DEFAULT_VIEW_ID`, Tasks 2/6/8), localStorage persistence (Task 2, Task 8 step 5), columns config show/hide (Tasks 1, 5, 8), `hideable` flag (Tasks 1, 9), filter chips below toolbar (Tasks 4, 8), controlled-vs-uncontrolled filter routing (`setFilters`, Task 8 step 6) — all covered.
- **Type consistency:** `PanelViewState` / `SavedView` defined once in `panelStorage.ts`, imported everywhere. `DEFAULT_VIEW_ID` used consistently. `setFilters` / `applyState` / `handleApplyView` names consistent across steps.
- **No backend, no column reorder, no view rename** — per spec "Out of Scope".
