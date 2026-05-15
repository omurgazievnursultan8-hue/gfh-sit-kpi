import React, { Fragment } from 'react'

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
  sort, onSort, onRowClick, density = 'comfortable',
  empty, skeletonRows = 8, renderExpanded, expandedKeys, totalCount,
}: DataTableProps<T>) {
  const d = DENSITY[density]
  const clickable = !!onRowClick

  if (!loading && rows.length === 0) {
    return (
      <div
        className="text-center"
        role="status"
        style={{ padding: '56px 24px', fontSize: 13.5, color: 'var(--ink-faint)' }}
      >
        {empty ?? 'Нет данных'}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: d.fontSize }}
      >
        <caption style={srOnly}>{caption}</caption>
        <thead>
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
                      className="dt-sort-btn inline-flex items-center gap-1.5 transition-colors"
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
                <tr key={i} className="dt-row" aria-hidden="true">
                  {columns.map(col => (
                    <td key={col.key} style={{ padding: d.cellPad }}>
                      <div className="dt-skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map(row => {
                const key = rowKey(row)
                const expanded = !!renderExpanded && !!expandedKeys?.has(key)
                return (
                  <Fragment key={key}>
                    <tr
                      className="dt-row"
                      onClick={clickable ? () => onRowClick!(row) : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      role={clickable ? 'button' : undefined}
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
                      <tr className="dt-expanded-row">
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
          Всего: {totalCount}
        </div>
      )}

      <style>{`
        .dt-row td { border-bottom: 1px solid var(--line-soft); }
        .dt-row:last-child td { border-bottom: none; }
        .dt-expanded-row td { background: var(--surface-mute); border-bottom: 1px solid var(--line); }
        ${clickable ? `
        .dt-row { cursor: pointer; transition: background 100ms ease; outline: none; }
        .dt-row:hover td { background: var(--accent-mute); }
        .dt-row:focus-visible td { box-shadow: inset 0 0 0 2px var(--accent); }
        ` : ''}
        .dt-sort-btn:hover { color: var(--ink); }
        .dt-skeleton {
          height: 14px; border-radius: 4px;
          background: linear-gradient(90deg, var(--line-soft) 25%, var(--line) 37%, var(--line-soft) 63%);
          background-size: 400% 100%;
          animation: dt-shimmer 1.4s ease infinite;
        }
        @keyframes dt-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
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
