import { useRef, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './DataPanelToolbar.module.css'

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
  /** Columns config dropdown — rendered next to the view switch. */
  columnsMenu?: ReactNode

  views: ViewKind[]
  view: ViewKind
  onView: (v: ViewKind) => void

  /** Page-level actions rendered at the toolbar's trailing edge. */
  toolbarActions?: ReactNode
}

export function DataPanelToolbar({
  searchable, search, onSearch, searchPlaceholder,
  filters, filterValues, onFilter, filterSlot, columnsMenu,
  views, view, onView, toolbarActions,
}: DataPanelToolbarProps) {
  const { t } = useTranslation()
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
            placeholder={searchPlaceholder ?? t('dataPanel.search')}
            aria-label={t('dataPanel.searchAria')}
            className={`${styles.searchInput} w-full outline-none`}
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
            className={`${styles.filterSelect} outline-none`}
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

      {columnsMenu}

      {views.length > 1 && (
        <div
          role="group"
          aria-label={t('dataPanel.viewMode')}
          className="inline-flex items-center"
          style={{
            background: 'var(--surface-mute)', border: '1px solid var(--line)',
            borderRadius: 8, padding: 2, gap: 2,
          }}
        >
          {views.map(v => {
            const selected = view === v
            const label = v === 'table' ? t('dataPanel.viewTable') : t('dataPanel.viewCards')
            return (
              <button
                key={v}
                type="button"
                onClick={() => onView(v)}
                aria-pressed={selected}
                aria-label={label}
                title={label}
                className="inline-flex items-center justify-center transition-colors"
                style={{
                  width: 30, height: 26, borderRadius: 6, margin: -5, padding: 5, boxSizing: 'content-box',
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
