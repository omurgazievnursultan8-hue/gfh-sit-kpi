import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, type Column, type SortDir } from './DataTable'
import { DataPanelToolbar, type FilterDef, type ViewKind } from './DataPanelToolbar'
import { DataPanelPager } from './DataPanelPager'
import { ActiveFilterChips } from './ActiveFilterChips'
import { ColumnsMenu } from './ColumnsMenu'
import { SavedViewsTabs } from './SavedViewsTabs'
import {
  type SavedView, type PanelViewState, DEFAULT_VIEW_ID,
  loadPanelState, savePanelState, loadSavedViews, saveSavedViews, panelStateEquals,
  loadActiveViewId, saveActiveViewId,
} from './panelStorage'

/**
 * Unified table panel — table/cards view, search, declarative filters and
 * pagination around the existing DataTable. Two modes:
 *  - 'client': panel owns search/filter/sort/page state and slices `rows`.
 *  - 'server': panel is controlled; it emits onStateChange and renders the
 *    `rows` (current page) the parent supplies.
 */

export type { FilterDef, ViewKind } from './DataPanelToolbar'
export type { Column, SortDir } from './DataTable'
export type { SavedView } from './panelStorage'

export interface PanelState {
  search: string
  filters: Record<string, string>
  sort: { key: string; dir: SortDir } | null
  page: number
  pageSize: number
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
  /** Controlled filter values — when set, the panel does not own filter state. */
  filterValues?: Record<string, string>
  /** Called with the full next filter-values record when a filter changes. */
  onFilterValuesChange?: (values: Record<string, string>) => void

  comparator?: (key: string) => (a: T, b: T) => number
  defaultSort?: { key: string; dir: SortDir }

  views?: ViewKind[]
  renderCard?: (r: T) => ReactNode
  viewStorageKey?: string
  /** Enables saved views + working-state persistence. Two localStorage keys
   *  are derived: `${key}:state` and `${key}:views`. Supersedes viewStorageKey. */
  panelStorageKey?: string
  /** Show the columns show/hide dropdown in the toolbar. */
  columnConfig?: boolean
  /** Show the active-filter chip row below the toolbar. Default true when
   *  `filters` is non-empty. */
  showFilterChips?: boolean

  /** Initial rows-per-page (default 10). User can change it via the pager select. */
  pageSize?: number
  /** Selectable rows-per-page values shown in the pager (default 10/25/50/100). */
  pageSizeOptions?: number[]
  /** server mode — current 0-based page (controlled). */
  page?: number
  /** server mode — total matched row count. */
  totalElements?: number
  onStateChange?: (s: PanelState) => void

  onRowClick?: (r: T) => void
  toolbarActions?: ReactNode

  /** Forwarded to the inner DataTable in table view. */
  renderExpanded?: (row: T) => ReactNode
  expandedKeys?: Set<string | number>
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

function CardsPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-center"
      style={{
        padding: '56px 24px', fontSize: 13.5, color: 'var(--ink-faint)',
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
      }}
    >
      {children}
    </div>
  )
}

export function DataPanel<T>({
  mode = 'client',
  columns, rows, rowKey, loading = false, caption, empty,
  searchable = false, searchText, searchPlaceholder,
  filters = [], clientFilter, filterSlot,
  filterValues: filterValuesProp, onFilterValuesChange,
  comparator, defaultSort,
  views = ['table', 'cards'], renderCard, viewStorageKey,
  panelStorageKey, columnConfig = false, showFilterChips,
  pageSize: pageSizeProp = 10, pageSizeOptions = [10, 25, 50, 100],
  page: pageProp, totalElements, onStateChange,
  onRowClick, toolbarActions,
  renderExpanded, expandedKeys,
}: DataPanelProps<T>) {
  const { t } = useTranslation()
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
  const [activeViewId, setActiveViewId] = useState(
    () => (panelStorageKey ? loadActiveViewId(panelStorageKey) : DEFAULT_VIEW_ID),
  )

  // Persist the active view id so a reload restores the selected tab.
  useEffect(() => {
    if (panelStorageKey) saveActiveViewId(panelStorageKey, activeViewId)
  }, [panelStorageKey, activeViewId])

  // Keep `view` valid if the `views` prop set shrinks after mount.
  useEffect(() => {
    if (!views.includes(view)) setView(views[0])
  }, [views, view])

  const rawPage = mode === 'server' ? (pageProp ?? 0) : clientPage

  // Latest onStateChange kept in a ref so the state-reporting effects below can
  // call the current callback without listing it as a dependency (which would
  // re-fire them whenever an unmemoized parent callback changes identity).
  const onStateChangeRef = useRef(onStateChange)
  useEffect(() => { onStateChangeRef.current = onStateChange }, [onStateChange])

  useEffect(() => {
    if (viewStorageKey) localStorage.setItem(viewStorageKey, view)
  }, [view, viewStorageKey])

  // Persist the full working state under panelStorageKey so a reload restores
  // filters/sort/columns/mode. Filters only round-trip when uncontrolled.
  useEffect(() => {
    if (!panelStorageKey) return
    savePanelState(panelStorageKey, { search, filters: filterValues, sort, hiddenColumns, view })
  }, [panelStorageKey, search, filterValues, sort, hiddenColumns, view])

  // Single emitter: on mount and whenever search/filter/sort/pageSize changes,
  // reset to the first page. Page changes are emitted directly by `setPage`, so
  // there is no separate page-watching effect (which would double-fire).
  useEffect(() => {
    if (mode === 'client') setClientPage(0)
    else onStateChangeRef.current?.({ search, filters: filterValues, sort, page: 0, pageSize })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, search, filterValues, sort, pageSize])

  const handleFilter = useCallback((key: string, value: string) => {
    const apply = (prev: Record<string, string>) => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    }
    if (filterValuesProp !== undefined) onFilterValuesChange?.(apply(filterValuesProp))
    else setFilterValuesState(apply)
  }, [filterValuesProp, onFilterValuesChange])

  const handleSort = useCallback((key: string) => {
    setSort(prev => {
      if (prev?.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      return { key, dir: 'asc' }
    })
  }, [])

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

  const handleUpdateView = useCallback((id: string) => {
    setSavedViews(prev => {
      const next = prev.map(v => (v.id === id ? { ...v, state: currentState } : v))
      if (panelStorageKey) saveSavedViews(panelStorageKey, next)
      return next
    })
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

  // Row count matching each view's search + filters, for the tab badges.
  // Mirrors the search/filter steps of `processed`. Computed once per render
  // into a Map (instead of a per-tab callback) so SavedViewsTabs' repeated
  // count() lookups are O(1). Empty map in server mode (only the current page
  // is in `rows`, so a total would be wrong).
  const countByViewId = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>()
    if (mode === 'server') return map
    const compute = (st: PanelViewState): number => {
      let out = rows
      const q = st.search.trim().toLowerCase()
      if (q && searchText) out = out.filter(r => searchText(r).toLowerCase().includes(q))
      if (clientFilter && Object.keys(st.filters).length > 0) {
        out = out.filter(r => clientFilter(r, st.filters))
      }
      return out.length
    }
    map.set(DEFAULT_VIEW_ID, compute(defaultViewState))
    for (const v of savedViews) map.set(v.id, compute(v.state))
    return map
  }, [mode, rows, searchText, clientFilter, defaultViewState, savedViews])

  const countForView = useCallback(
    (viewId: string): number | null => countByViewId.get(viewId) ?? null,
    [countByViewId],
  )

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
  // Clamp the effective page so a shrunk dataset cannot strand the view on an
  // out-of-range empty page.
  const page = Math.min(Math.max(0, rawPage), totalPages - 1)
  const visible = mode === 'server'
    ? rows
    : processed.slice(page * pageSize, page * pageSize + pageSize)

  const rangeFrom = total === 0 ? 0 : page * pageSize + 1
  const rangeTo = mode === 'server'
    ? Math.min(page * pageSize + rows.length, total)
    : Math.min(page * pageSize + pageSize, total)

  const setPage = useCallback((p: number) => {
    if (mode === 'client') setClientPage(p)
    else onStateChangeRef.current?.({ search, filters: filterValues, sort, page: p, pageSize })
  }, [mode, search, filterValues, sort, pageSize])

  return (
    <div className="dp-dash">
      {panelStorageKey && (
        <SavedViewsTabs
          views={savedViews}
          activeViewId={activeViewId}
          modified={viewModified}
          count={countForView}
          onApply={handleApplyView}
          onSave={handleSaveView}
          onUpdate={handleUpdateView}
          onDelete={handleDeleteView}
        />
      )}

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

      {view === 'cards' && renderCard ? (
        loading ? (
          <CardsPlaceholder>{t('dataPanel.loading')}</CardsPlaceholder>
        ) : visible.length === 0 ? (
          <CardsPlaceholder>{empty ?? t('dataPanel.noData')}</CardsPlaceholder>
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
            columns={visibleColumns}
            rows={visible}
            rowKey={rowKey}
            caption={caption}
            loading={loading}
            sort={sort ?? undefined}
            onSort={handleSort}
            onRowClick={onRowClick}
            empty={empty}
            renderExpanded={renderExpanded}
            expandedKeys={expandedKeys}
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
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageSize={setPageSize}
        />
      )}
    </div>
  )
}
