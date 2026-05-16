import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
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
  pageSize: pageSizeProp = 10, pageSizeOptions = [10, 25, 50, 100],
  page: pageProp, totalElements, onStateChange,
  onRowClick, toolbarActions,
}: DataPanelProps<T>) {
  const [search, setSearch] = useState('')
  const [filterValuesState, setFilterValuesState] = useState<Record<string, string>>({})
  const filterValues = filterValuesProp ?? filterValuesState
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(defaultSort ?? null)
  const [clientPage, setClientPage] = useState(0)
  const [pageSize, setPageSize] = useState(pageSizeProp)
  const [view, setView] = useState<ViewKind>(() => loadView(viewStorageKey, views))

  // Keep `view` valid if the `views` prop set shrinks after mount.
  useEffect(() => {
    if (!views.includes(view)) setView(views[0])
  }, [views, view])

  const page = mode === 'server' ? (pageProp ?? 0) : clientPage

  // Latest onStateChange kept in a ref so the state-reporting effects below can
  // call the current callback without listing it as a dependency (which would
  // re-fire them whenever an unmemoized parent callback changes identity).
  const onStateChangeRef = useRef(onStateChange)
  useEffect(() => { onStateChangeRef.current = onStateChange }, [onStateChange])

  useEffect(() => {
    if (viewStorageKey) localStorage.setItem(viewStorageKey, view)
  }, [view, viewStorageKey])

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
    else onStateChangeRef.current?.({ search, filters: filterValues, sort, page: p, pageSize })
  }, [mode, search, filterValues, sort, pageSize])

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
          <CardsPlaceholder>Загрузка…</CardsPlaceholder>
        ) : visible.length === 0 ? (
          <CardsPlaceholder>{empty ?? 'Нет данных'}</CardsPlaceholder>
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
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageSize={setPageSize}
        />
      )}
    </div>
  )
}
