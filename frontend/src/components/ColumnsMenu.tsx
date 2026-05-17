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
