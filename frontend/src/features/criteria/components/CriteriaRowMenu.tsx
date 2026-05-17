import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { Criteria } from '../criteriaApi'

export interface CriteriaActions {
  onEdit: (c: Criteria) => void
  onDeactivate: (c: Criteria) => void
  onReactivate: (c: Criteria) => void
}

// Compact `⋯` overflow menu — quick row actions.
export function CriteriaRowMenu({ criterion, actions }: { criterion: Criteria; actions: CriteriaActions }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

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

  const run = (fn: () => void) => { setOpen(false); fn() }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        aria-label={t('v2.menuActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="font-mono inline-flex items-center justify-center transition-colors"
        style={{
          width: 28, height: 28, borderRadius: 4,
          background: open ? 'var(--surface-mute)' : 'transparent',
          color: 'var(--ink-faint)',
          border: `1px solid ${open ? 'var(--line)' : 'transparent'}`,
          cursor: 'pointer', fontSize: 15, lineHeight: 1, fontWeight: 700,
        }}
      >
        ⋯
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 overflow-hidden rounded-lg"
          style={{
            top: 'calc(100% + 4px)', right: 0, minWidth: 180,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <MenuItem
            tone="ink"
            disabled={criterion.frozen}
            onClick={() => run(() => actions.onEdit(criterion))}
          >
            {t('v2.menuEdit')}
          </MenuItem>
          {criterion.active ? (
            <MenuItem tone="danger" onClick={() => run(() => actions.onDeactivate(criterion))}>
              {t('v2.menuDeactivate')}
            </MenuItem>
          ) : (
            <MenuItem tone="ok" onClick={() => run(() => actions.onReactivate(criterion))}>
              {t('v2.menuActivate')}
            </MenuItem>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  children, onClick, tone, disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  tone: 'ink' | 'ok' | 'danger'
  disabled?: boolean
}) {
  const color =
    tone === 'ok' ? 'var(--accent)' :
    tone === 'danger' ? 'var(--danger)' : 'var(--ink-soft)'
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={e => { e.stopPropagation(); if (!disabled) onClick() }}
      className="criteria-menu-item w-full text-left transition-colors"
      style={{
        display: 'block', padding: '8px 12px', fontSize: 13, fontWeight: 500,
        fontFamily: 'inherit',
        color: disabled ? 'var(--ink-dim)' : color,
        background: 'transparent', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
      <style>{`.criteria-menu-item:not(:disabled):hover { background: var(--surface-mute); }`}</style>
    </button>
  )
}
