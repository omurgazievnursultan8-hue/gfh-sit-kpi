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
