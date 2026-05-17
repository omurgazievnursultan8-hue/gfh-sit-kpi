import { type SavedView, DEFAULT_VIEW_ID } from './panelStorage'

interface SavedViewsTabsProps {
  /** Custom (user-created) views. The default view is rendered implicitly. */
  views: SavedView[]
  activeViewId: string
  /** Working state diverges from the active view. */
  modified: boolean
  /** Row count matching a view's filters+search, or null to hide the badge. */
  count: (viewId: string) => number | null
  onApply: (id: string) => void
  onSave: (name: string) => void
  onDelete: (id: string) => void
}

/** Saved views as an underline tab row (matches the users-v1 quick-filter
 *  pattern). The built-in "Все" view is always first; custom views show a ×
 *  on hover; a trailing "+ Сохранить" tab captures the current state. */
export function SavedViewsTabs({ views, activeViewId, modified, count, onApply, onSave, onDelete }: SavedViewsTabsProps) {
  const handleSave = () => {
    const name = window.prompt('Название представления:')?.trim()
    if (name) onSave(name)
  }

  const tab = (id: string, label: string, deletable: boolean) => {
    const selected = id === activeViewId
    const n = count(id)
    return (
      <div key={id} className="svt-tab inline-flex items-center" style={{ marginBottom: -1 }}>
        <button
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onApply(id)}
          className="inline-flex items-center gap-2 transition-colors"
          style={{
            height: 33, padding: deletable ? '0 4px 0 11px' : '0 11px',
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            color: selected ? 'var(--ink)' : 'var(--ink-faint)',
            background: 'transparent', border: 'none',
            borderBottom: `2px solid ${selected ? 'var(--accent)' : 'transparent'}`,
            cursor: 'pointer',
          }}
        >
          {label}{selected && modified ? ' •' : ''}
          {n != null && (
            <span
              style={{
                fontSize: 11, fontWeight: 500, padding: '1px 7px', borderRadius: 999,
                fontVariantNumeric: 'tabular-nums',
                background: selected ? 'var(--accent-mute)' : 'var(--surface-mute)',
                color: selected ? 'var(--accent)' : 'var(--ink-faint)',
                border: `1px solid ${selected ? 'var(--accent-soft)' : 'var(--line-soft)'}`,
              }}
            >
              {n}
            </span>
          )}
        </button>
        {deletable && (
          <button
            type="button"
            className="svt-x inline-flex items-center justify-center transition-opacity"
            onClick={() => onDelete(id)}
            aria-label={`Удалить представление: ${label}`}
            style={{
              width: 18, height: 18, marginRight: 4, borderRadius: 999,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--ink-faint)',
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden style={{ width: 11, height: 11, stroke: 'currentColor', strokeWidth: 2.6, fill: 'none' }}>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      aria-label="Сохранённые представления"
      className="flex flex-wrap items-center gap-1 mb-3.5"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {tab(DEFAULT_VIEW_ID, 'Все', false)}
      {views.map(v => tab(v.id, v.name, true))}

      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center gap-1.5 transition-colors"
        style={{
          height: 33, padding: '0 11px', marginBottom: -1,
          fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
          color: 'var(--ink-faint)', background: 'transparent',
          border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer',
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden style={{ width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Сохранить
      </button>

      <style>{`
        .svt-x { opacity: 0; }
        .svt-tab:hover .svt-x, .svt-x:focus-visible { opacity: 1; }
        .svt-x:hover { color: var(--ink); }
      `}</style>
    </div>
  )
}
