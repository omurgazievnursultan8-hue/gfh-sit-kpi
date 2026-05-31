import { useTranslation } from 'react-i18next'
import type { FilterDef } from './DataPanelToolbar'
import styles from './ActiveFilterChips.module.css'

interface ActiveFilterChipsProps {
  filters: FilterDef[]
  values: Record<string, string>
  onClear: (key: string) => void
  onClearAll: () => void
}

/** Row of removable chips, one per active filter value. Renders nothing when
 *  no filter is active. The filter's option label is resolved from FilterDef. */
export function ActiveFilterChips({ filters, values, onClear, onClearAll }: ActiveFilterChipsProps) {
  const { t } = useTranslation()
  const active = filters.filter(f => values[f.key])
  if (active.length === 0) return null

  const optionLabel = (f: FilterDef, value: string): string => {
    const opt = f.options?.find(o => o.value === value)
    return opt?.label ?? value
  }

  return (
    <div className="flex flex-wrap items-center gap-2" style={{ marginTop: -4, marginBottom: 14 }}>
      {active.map(f => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5"
          style={{
            fontSize: 12, height: 26, padding: '0 6px 0 10px', borderRadius: 999,
            background: 'var(--accent-mute)', color: 'var(--accent)',
            border: '1px solid var(--accent-soft)',
          }}
        >
          <span style={{ color: 'var(--ink-soft)' }}>{f.label}:</span>
          {optionLabel(f, values[f.key])}
          <button
            type="button"
            onClick={() => onClear(f.key)}
            aria-label={t('dataPanel.removeFilter', { label: f.label })}
            className={`${styles.x} inline-flex items-center justify-center`}
            style={{
              width: 16, height: 16, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'transparent', color: 'inherit', padding: 0,
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden style={{ width: 11, height: 11, stroke: 'currentColor', strokeWidth: 2.6, fill: 'none' }}>
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        style={{
          fontSize: 12, height: 26, padding: '0 8px', borderRadius: 8,
          background: 'transparent', color: 'var(--ink-soft)',
          border: 'none', cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        {t('dataPanel.clearAll')}
      </button>
    </div>
  )
}
