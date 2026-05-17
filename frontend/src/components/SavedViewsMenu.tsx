import { useRef, useState } from 'react'
import { useOutsideClick } from './useOutsideClick'
import { type SavedView, DEFAULT_VIEW_ID } from './panelStorage'

interface SavedViewsMenuProps {
  views: SavedView[]          // custom views only (default is implicit)
  activeViewId: string
  modified: boolean           // working state diverges from the active view
  onApply: (id: string) => void
  onSave: (name: string) => void
  onDelete: (id: string) => void
}

const BTN_STYLE: React.CSSProperties = {
  height: 34, padding: '0 11px', borderRadius: 8,
  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
  background: 'var(--surface)', color: 'var(--ink-soft)',
  border: '1px solid var(--line)',
  display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 240,
}

/** Toolbar dropdown: pick / save / delete saved views. The built-in default
 *  view ("Все") is always listed first and cannot be deleted. */
export function SavedViewsMenu({ views, activeViewId, modified, onApply, onSave, onDelete }: SavedViewsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, open, () => setOpen(false))

  const activeName = activeViewId === DEFAULT_VIEW_ID
    ? 'Все'
    : (views.find(v => v.id === activeViewId)?.name ?? 'Все')

  const handleSave = () => {
    const name = window.prompt('Название представления:')?.trim()
    if (name) onSave(name)
    setOpen(false)
  }

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '7px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
    background: active ? 'var(--accent-mute)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--ink)',
    border: 'none', textAlign: 'left',
  })

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={BTN_STYLE}>
        <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, flexShrink: 0 }}>
          <polyline points="4 6 9 6" /><polyline points="4 12 9 12" /><polyline points="4 18 9 18" />
          <circle cx="15" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="15" cy="18" r="2" />
        </svg>
        <span className="truncate">{activeName}{modified ? ' • изменено' : ''}</span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30,
            minWidth: 240, padding: 6, borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <button type="button" style={rowStyle(activeViewId === DEFAULT_VIEW_ID)}
            onClick={() => { onApply(DEFAULT_VIEW_ID); setOpen(false) }}>
            <Check on={activeViewId === DEFAULT_VIEW_ID} />
            <span className="flex-1">Все</span>
          </button>

          {views.map(v => (
            <div key={v.id} className="flex items-center" style={{ gap: 2 }}>
              <button type="button" style={{ ...rowStyle(activeViewId === v.id), flex: 1 }}
                onClick={() => { onApply(v.id); setOpen(false) }}>
                <Check on={activeViewId === v.id} />
                <span className="flex-1 truncate">{v.name}</span>
              </button>
              <button type="button" aria-label={`Удалить: ${v.name}`}
                onClick={() => onDelete(v.id)}
                style={{
                  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--ink-faint)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <svg viewBox="0 0 24 24" aria-hidden style={{ width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                  <polyline points="3 6 21 6" />
                  <path d="M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--line)', margin: '4px 4px 2px' }} />
          <button type="button" style={rowStyle(false)} onClick={handleSave}>
            <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Сохранить как…</span>
          </button>
        </div>
      )}
    </div>
  )
}

function Check({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, flexShrink: 0, fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, opacity: on ? 1 : 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
