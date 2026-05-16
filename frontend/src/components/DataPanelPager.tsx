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
  /** Current rows-per-page. */
  pageSize: number
  /** Selectable rows-per-page values. */
  pageSizeOptions: number[]
  onPageSize: (n: number) => void
}

/**
 * Page indices to render: first + last always, a 3-wide window around the
 * current page, 'gap' markers where pages are elided. Shows every page when
 * totalPages <= 7 (no elision needed).
 */
function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
  const out: (number | 'gap')[] = [0]
  const start = Math.max(1, page - 1)
  const end = Math.min(totalPages - 2, page + 1)
  if (start > 1) out.push('gap')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < totalPages - 2) out.push('gap')
  out.push(totalPages - 1)
  return out
}

export function DataPanelPager({
  page, totalPages, rangeFrom, rangeTo, total, onPage,
  pageSize, pageSizeOptions, onPageSize,
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
      <div className="flex items-center gap-2.5 flex-wrap">
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          Показано{' '}
          <strong className="font-mono" style={{ color: 'var(--ink)' }}>
            {rangeFrom}–{rangeTo}
          </strong>{' '}
          из{' '}
          <strong className="font-mono" style={{ color: 'var(--ink)' }}>{total}</strong>
        </span>

        <label className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          На странице
          <select
            value={pageSize}
            aria-label="Строк на странице"
            onChange={e => onPageSize(Number(e.target.value))}
            className="font-mono outline-none"
            style={{
              height: 26, padding: '0 22px 0 8px', borderRadius: 6,
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              color: 'var(--ink)', background: 'var(--surface)',
              border: '1px solid var(--line)',
            }}
          >
            {pageSizeOptions.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <PagerButton disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))} ariaLabel="Предыдущая">
            ←
          </PagerButton>
          {pageWindow(page, totalPages).map((item, idx) => {
            if (item === 'gap') {
              return (
                <span
                  key={`gap-${idx}`}
                  aria-hidden
                  className="font-mono"
                  style={{ minWidth: 18, textAlign: 'center', fontSize: 11, color: 'var(--ink-faint)' }}
                >
                  …
                </span>
              )
            }
            const selected = page === item
            return (
              <button
                key={item}
                onClick={() => onPage(item)}
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
                {String(item + 1).padStart(2, '0')}
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
