import { useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { type SavedView, DEFAULT_VIEW_ID } from './panelStorage'
import styles from './SavedViewsTabs.module.css'

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
  /** Overwrite a custom view's state with the current working state. */
  onUpdate: (id: string) => void
  onDelete: (id: string) => void
}

/** Saved views as an underline tab row (matches the users-v1 quick-filter
 *  pattern). The built-in "Все" view is always first; custom views show a ×
 *  on hover; a trailing "+ Сохранить" tab captures the current state. */
export function SavedViewsTabs({ views, activeViewId, modified, count, onApply, onSave, onUpdate, onDelete }: SavedViewsTabsProps) {
  const { t } = useTranslation()
  const [naming, setNaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const tablistRef = useRef<HTMLDivElement>(null)

  // Ordered tab ids for roving-tabindex arrow navigation.
  const tabIds = [DEFAULT_VIEW_ID, ...views.map(v => v.id)]

  const confirmSave = () => {
    const name = draftName.trim()
    if (name) onSave(name)
    setNaming(false)
    setDraftName('')
  }
  const cancelSave = () => {
    setNaming(false)
    setDraftName('')
  }

  // ArrowLeft/ArrowRight move focus between the role="tab" buttons.
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const idx = tabIds.indexOf(id)
    if (idx < 0) return
    const nextIdx = e.key === 'ArrowRight'
      ? (idx + 1) % tabIds.length
      : (idx - 1 + tabIds.length) % tabIds.length
    const btns = tablistRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]')
    btns?.[nextIdx]?.focus()
  }

  const tab = (id: string, label: string, deletable: boolean) => {
    const selected = id === activeViewId
    const n = count(id)
    const canUpdate = deletable && selected && modified
    return (
      <div key={id} className={`${styles.tab} inline-flex items-center`} style={{ marginBottom: -1 }}>
        <button
          type="button"
          role="tab"
          aria-selected={selected}
          tabIndex={selected ? 0 : -1}
          onClick={() => onApply(id)}
          onKeyDown={e => onTabKeyDown(e, id)}
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
          {label}{selected && modified && !deletable ? ' •' : ''}
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
        {canUpdate && (
          <button
            type="button"
            className="svt-update inline-flex items-center justify-center transition-colors"
            onClick={() => onUpdate(id)}
            aria-label={t('dataPanel.updateViewAria', { name: label })}
            title={t('dataPanel.updateViewTitle')}
            style={{
              height: 22, padding: '0 8px', marginRight: 2, borderRadius: 6,
              fontSize: 11, fontWeight: 500, fontFamily: 'inherit',
              background: 'var(--accent-mute)', color: 'var(--accent)',
              border: '1px solid var(--accent-soft)', cursor: 'pointer',
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden style={{ width: 11, height: 11, marginRight: 3, stroke: 'currentColor', strokeWidth: 2.4, fill: 'none' }}>
              <path d="M5 12l5 5L20 7" />
            </svg>
            {t('dataPanel.updateView')}
          </button>
        )}
        {deletable && (
          <button
            type="button"
            className={`${styles.x} inline-flex items-center justify-center transition-opacity`}
            onClick={() => onDelete(id)}
            aria-label={t('dataPanel.deleteViewAria', { name: label })}
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
      ref={tablistRef}
      role="tablist"
      aria-label={t('dataPanel.savedViews')}
      className="flex flex-wrap items-center gap-1 mb-3.5"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {tab(DEFAULT_VIEW_ID, t('dataPanel.viewAll'), false)}
      {views.map(v => tab(v.id, v.name, true))}

      {naming ? (
        <div className="inline-flex items-center gap-1" style={{ marginBottom: -1, padding: '0 4px' }}>
          <input
            autoFocus
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); confirmSave() }
              else if (e.key === 'Escape') { e.preventDefault(); cancelSave() }
            }}
            placeholder={t('dataPanel.viewNamePlaceholder')}
            className="svt-name-input outline-none"
            style={{
              height: 26, padding: '0 8px', borderRadius: 6,
              fontSize: 12.5, fontFamily: 'inherit',
              color: 'var(--ink)', background: 'var(--surface)',
              border: '1px solid var(--line)',
            }}
          />
          <button
            type="button"
            onClick={confirmSave}
            style={{
              height: 26, padding: '0 9px', borderRadius: 6,
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              background: 'var(--accent)', color: 'var(--surface)',
              border: '1px solid var(--accent)',
            }}
          >
            {t('dataPanel.viewNameSave')}
          </button>
          <button
            type="button"
            onClick={cancelSave}
            style={{
              height: 26, padding: '0 9px', borderRadius: 6,
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              background: 'transparent', color: 'var(--ink-soft)',
              border: '1px solid var(--line)',
            }}
          >
            {t('dataPanel.viewNameCancel')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          title={t('dataPanel.saveViewHint')}
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
          {t('dataPanel.saveView')}
        </button>
      )}
    </div>
  )
}
