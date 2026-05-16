import { useState, useRef, useEffect } from 'react'

export interface FilterOption {
  value: string
  label: string
}

interface Props {
  label: string
  value: string          // '' = no filter
  options: FilterOption[] // first option is the "all/clear" entry
  onChange: (value: string) => void
}

// Popover filter button — mirrors the reference toolbar's dropdown filters.
// Inactive: plain bordered chip. Active: accent fill + leading dot.
export function FilterDropdown({ label, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const active = value !== ''
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 transition-colors"
        style={{
          height: 34, padding: '0 11px', borderRadius: 8,
          fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
          background: active ? 'var(--accent-mute)' : 'var(--surface)',
          color: active ? 'var(--accent)' : 'var(--ink-soft)',
          border: `1px solid ${active ? 'var(--accent-soft)' : 'var(--line)'}`,
        }}
      >
        {active && (
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />
        )}
        <span style={{ fontWeight: active ? 600 : 500 }}>
          {active ? `${label}: ${selected?.label}` : label}
        </span>
        <span style={{ fontSize: 9, color: active ? 'var(--accent)' : 'var(--ink-dim)' }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 overflow-hidden rounded-lg"
          style={{
            top: 'calc(100% + 5px)', left: 0, minWidth: 200,
            background: 'var(--surface)', border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-lg)', padding: 5,
          }}
        >
          {options.map(o => {
            const isSel = o.value === value
            return (
              <button
                key={o.value || '__all'}
                type="button"
                role="option"
                aria-selected={isSel}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className="users-fd-item w-full text-left transition-colors flex items-center justify-between gap-3"
                style={{
                  padding: '8px 10px', borderRadius: 5, fontSize: 13,
                  fontFamily: 'inherit', cursor: 'pointer', border: 'none',
                  background: isSel ? 'var(--accent-mute)' : 'transparent',
                  color: isSel ? 'var(--accent)' : 'var(--ink)',
                  fontWeight: isSel ? 600 : 400,
                }}
              >
                {o.label}
                {isSel && <span style={{ fontSize: 11 }}>✓</span>}
              </button>
            )
          })}
          <style>{`.users-fd-item:hover { background: var(--surface-mute); }`}</style>
        </div>
      )}
    </div>
  )
}
