import React, { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useDensity } from '../../hooks/useDensity'
import styles from './DataTable.module.css'

/**
 * Generic data table — sortable, sticky header, density modes, skeleton + empty
 * states, accessible (caption, scope, aria-sort). Styled with the app CSS vars
 * (--ink / --line / --accent) to match the users panel aesthetic.
 */

export type SortDir = 'asc' | 'desc'
export type Density = 'comfortable' | 'compact'
export type ColAlign = 'left' | 'right' | 'center'

export interface Column<T> {
  /** Stable key — also the sort key passed to onSort. */
  key: string
  /** Header label. Pass a node for icons; string for plain text. */
  header: React.ReactNode
  /** Cell renderer. */
  render: (row: T) => React.ReactNode
  sortable?: boolean
  align?: ColAlign
  /** Fixed column width (e.g. '64px', '20%'). */
  width?: string
  /** Hide the header text visually, keep it for screen readers. */
  srOnlyHeader?: boolean
  /** When false, the column cannot be hidden via the columns config menu
   *  and is omitted from that menu's checklist. Default true. */
  hideable?: boolean
  /** Hidden on first load (no persisted state). User can still toggle on. */
  defaultHidden?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  /** Stable React key per row. */
  rowKey: (row: T) => string | number
  /** Accessible table caption (visually hidden). */
  caption: string
  loading?: boolean
  sort?: { key: string; dir: SortDir }
  onSort?: (key: string) => void
  onRowClick?: (row: T) => void
  /** Row density. Omit to follow the app-wide density preference. */
  density?: Density
  /** Shown when rows is empty and not loading. */
  empty?: React.ReactNode
  /** Skeleton row count while loading. Default 8. */
  skeletonRows?: number
  /** Expanded-row content. When set, rows in `expandedKeys` render an extra
   *  full-width row beneath them. */
  renderExpanded?: (row: T) => React.ReactNode
  /** Keys (per rowKey) whose expanded content is visible. */
  expandedKeys?: Set<string | number>
  /** When set, renders a row-count footer below the table.
   *  Pass server total for paginated tables; rows.length otherwise. */
  totalCount?: number
  /** Optional per-row className — e.g. to dim or highlight rows. */
  rowClassName?: (row: T) => string | undefined
  /** Hide the column-header row (data rows only). Caption keeps a11y context. */
  hideHeader?: boolean
}

interface DensityTokens {
  cellPad: string
  fontSize: number
}

const DENSITY: Record<Density, DensityTokens> = {
  comfortable: { cellPad: '11px 16px', fontSize: 13.5 },
  compact:     { cellPad: '6px 14px',  fontSize: 13 },
}

const srOnly: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
}

export function DataTable<T>({
  columns, rows, rowKey, caption, loading = false,
  sort, onSort, onRowClick, density: densityProp,
  empty, skeletonRows = 8, renderExpanded, expandedKeys, totalCount,
  rowClassName, hideHeader = false,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const { density: contextDensity } = useDensity()
  const density = densityProp ?? contextDensity
  const d = DENSITY[density]
  const clickable = !!onRowClick

  if (!loading && rows.length === 0) {
    return (
      <div
        className="text-center"
        role="status"
        style={{ padding: '56px 24px', fontSize: 13.5, color: 'var(--ink-faint)' }}
      >
        {empty ?? t('dataPanel.noData')}
      </div>
    )
  }

  return (
    <div className={['overflow-x-auto', clickable ? styles.clickable : undefined].filter(Boolean).join(' ')}>
      <table
        className="w-full"
        style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: d.fontSize }}
      >
        <caption style={srOnly}>{caption}</caption>
        <thead style={hideHeader ? srOnly : undefined}>
          <tr>
            {columns.map(col => {
              const active = sort?.key === col.key
              const canSort = col.sortable && !!onSort
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : (col.sortable ? 'none' : undefined)}
                  style={{
                    textAlign: col.align ?? 'left',
                    padding: canSort ? 0 : '10px 16px',
                    width: col.width,
                    fontSize: 12, fontWeight: 500,
                    color: 'var(--ink-soft)',
                    background: 'var(--surface-mute)',
                    borderBottom: '1px solid var(--line)',
                    position: 'sticky', top: 0, zIndex: 2,
                  }}
                >
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => onSort!(col.key)}
                      className={`${styles.sortBtn} inline-flex items-center gap-1.5 transition-colors`}
                      style={{
                        width: '100%',
                        justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                        padding: '10px 16px',
                        fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                        color: active ? 'var(--ink)' : 'var(--ink-soft)',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                      }}
                    >
                      <span style={col.srOnlyHeader ? srOnly : undefined}>{col.header}</span>
                      <SortChevron active={active} dir={sort?.dir ?? 'asc'} />
                    </button>
                  ) : (
                    <span style={col.srOnlyHeader ? srOnly : undefined}>{col.header}</span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className={styles.row} aria-hidden="true">
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: d.cellPad }}>
                      <div className={styles.skeleton} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row, rowIndex) => {
                const key = rowKey(row)
                const expanded = !!renderExpanded && !!expandedKeys?.has(key)
                return (
                  <Fragment key={key}>
                    <tr
                      className={[
                        styles.row,
                        rowIndex % 2 === 1 ? styles.rowEven : undefined,
                        rowClassName?.(row),
                      ].filter(Boolean).join(' ')}
                      onClick={clickable ? () => onRowClick!(row) : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onKeyDown={clickable ? e => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick!(row) }
                      } : undefined}
                    >
                      {columns.map(col => (
                        <td
                          key={col.key}
                          style={{
                            padding: d.cellPad,
                            textAlign: col.align ?? 'left',
                            verticalAlign: 'middle',
                            color: 'var(--ink)',
                          }}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                    {expanded && (
                      <tr className={styles.expandedRow}>
                        <td colSpan={columns.length} style={{ padding: 0 }}>
                          {renderExpanded!(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
        </tbody>
      </table>

      {totalCount !== undefined && !loading && (
        <div
          style={{
            padding: '8px 16px', fontSize: 12, color: 'var(--ink-faint)',
            borderTop: '1px solid var(--line-soft)', textAlign: 'right',
          }}
        >
          {t('dataPanel.total')}: {totalCount}
        </div>
      )}
    </div>
  )
}

function SortChevron({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden
      style={{
        width: 12, height: 12, fill: 'none', strokeWidth: 2.4,
        stroke: active ? 'var(--accent)' : 'var(--ink-dim)',
        transform: active && dir === 'desc' ? 'rotate(180deg)' : 'none',
        transition: 'stroke 120ms ease, transform 150ms ease',
      }}
    >
      <polyline points="6 15 12 9 18 15" />
    </svg>
  )
}
