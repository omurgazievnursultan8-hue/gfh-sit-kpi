import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

// ── helpers ─────────────────────────────────────────────────────────────────
function asciiBar(pct: number, width = 22): { fill: string; empty: string } {
  const clamped = Math.max(0, Math.min(1, pct))
  const filled = Math.round(clamped * width)
  return { fill: '█'.repeat(filled), empty: '░'.repeat(width - filled) }
}

// Maps a 0–100 score to a colour zone. null/undefined → neutral.
export function scoreZone(score: number | null | undefined): {
  numClass: string; tagClass: string; labelKey: string | null
} {
  if (score === null || score === undefined) {
    return { numClass: '', tagClass: '', labelKey: null }
  }
  if (score >= 80) return { numClass: 'zone-up', tagClass: 'up', labelKey: 'dashboard.zoneUp' }
  if (score >= 50) return { numClass: 'zone-warn', tagClass: 'warn', labelKey: 'dashboard.zoneNorm' }
  return { numClass: 'zone-down', tagClass: 'down', labelKey: 'dashboard.zoneDown' }
}

// ── types ───────────────────────────────────────────────────────────────────
export interface StatCardGauge {
  pct: number                    // 0..1, internally clamped
  variant: 'marker' | 'meta'
  left: ReactNode
  right: ReactNode
  center?: ReactNode             // 'meta' variant only
  current?: ReactNode            // 'marker' variant pin value
}

export interface StatCardProps {
  title: string
  id: string                     // rendered as [ id ] in header
  loading?: boolean
  value: number | string | null
  placeholder?: string           // shown while loading; default '··'
  emptyValue?: string            // shown when value === null; default '—'
  unit?: string                  // e.g. '/ 100'
  label?: string                 // inline uppercase label after number
  zoneScore?: number | null      // present → number colour + zone tag
  gauge: StatCardGauge
  onClick?: () => void           // present → clickable div + keydown handler
  onHover?: () => void           // present → opens on mouseenter
  active?: boolean               // onClick cards: marks the card's panel open
  className?: string             // appended to the root element's class
}

// ── component ───────────────────────────────────────────────────────────────
export function StatCard({
  title, id, loading = false, value,
  placeholder = '··', emptyValue = '—',
  unit, label, zoneScore, gauge, onClick, onHover, active, className,
}: StatCardProps) {
  const { t } = useTranslation()
  const zone = scoreZone(zoneScore)
  const bar = asciiBar(gauge.pct)

  const displayValue = loading
    ? placeholder
    : (value !== null && value !== undefined ? value : emptyValue)

  const numClass =
    `dv3-kpi-num${loading ? ' dv3-loading' : ''}` +
    (!loading && zone.numClass ? ` dv3-kpi-num--${zone.numClass}` : '')

  const body = (
    <>
      <div className="dv3-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv3-card-id">[ {id} ]</span>
      </div>
      <div className="dv3-card-body">
        <div className="dv3-kpi">
          <div className={numClass}>
            {displayValue}
            {unit && <span className="dv3-kpi-unit">{unit}</span>}
            {label && <span className="dv3-kpi-label">{label}</span>}
          </div>
          {!loading && zone.labelKey && (
            <span className={`dv3-zone-tag dv3-zone-tag--${zone.tagClass}`}>
              {t(zone.labelKey)}
            </span>
          )}
        </div>
        <div className="dv3-gauge">
          <div className="dv3-gauge-bar dv3-gauge-bar--lg" aria-hidden="true">
            <span className="dv3-fill">{bar.fill}</span>
            <span className="dv3-dim">{bar.empty}</span>
          </div>
          {gauge.variant === 'marker' ? (
            <div className="dv3-gauge-meta dv3-gauge-meta--mark">
              <span>{gauge.left}</span>
              <span
                className="dv3-gauge-cur"
                style={{ left: `${Math.min(100, Math.round(gauge.pct * 100))}%` }}
              >
                <strong>{gauge.current}</strong>
              </span>
              <span>{gauge.right}</span>
            </div>
          ) : (
            <div className="dv3-gauge-meta">
              <span>{gauge.left}</span>
              <span>{gauge.center}</span>
              <span>{gauge.right}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (onClick || onHover) {
    return (
      <div
        className={`dv3-card dv3-card-btn${className ? ` ${className}` : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={active}
        onClick={onClick}
        onMouseEnter={onHover}
        onFocus={onHover}
        onKeyDown={e => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            if (e.key === ' ') e.preventDefault()
            onClick()
          }
        }}
      >
        {body}
      </div>
    )
  }
  return <section className={`dv3-card${className ? ` ${className}` : ''}`}>{body}</section>
}

// ── styles ──────────────────────────────────────────────────────────────────
// Card/KPI/gauge/zone-KPI CSS. Relies on --dv3-* vars and .dv3-loading
// provided by DASHBOARD_CSS; StatCard always renders inside .dv3-root.
export const STAT_CARD_CSS = `
/* CARD */
.dv3-card {
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  position: relative;
  display: flex; flex-direction: column;
  text-align: left;
}
.dv3-card::before, .dv3-card::after {
  content: ""; position: absolute; width: 8px; height: 8px; pointer-events: none;
}
.dv3-card::before { top: -1px; left: -1px; border-top: 1px solid var(--dv3-accent); border-left: 1px solid var(--dv3-accent); }
.dv3-card::after { bottom: -1px; right: -1px; border-bottom: 1px solid var(--dv3-accent); border-right: 1px solid var(--dv3-accent); }
.dv3-card-btn { cursor: pointer; font-family: inherit; color: inherit; }
.dv3-card-btn:hover { border-color: var(--dv3-border-hi); }
.dv3-card-btn:focus-visible { outline: 2px solid var(--dv3-accent); outline-offset: 2px; }
.dv3-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg3);
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--dv3-text3);
}
.dv3-card-head strong { color: var(--dv3-text); font-weight: 600; letter-spacing: 0.14em; }
.dv3-card-id { font-size: 9px; color: var(--dv3-text4); letter-spacing: 0.1em; }
.dv3-card-body { padding: 16px 18px; flex: 1; display: flex; flex-direction: column; }

/* KPI */
.dv3-kpi { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: flex-end; }
.dv3-kpi-num {
  font-weight: 600; font-size: 80px; line-height: 0.9;
  letter-spacing: -0.04em; color: var(--dv3-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dv3-kpi-unit { font-size: 16px; color: var(--dv3-text3); margin-left: 8px; font-weight: 400; }
.dv3-kpi-label { font-size: 11px; color: var(--dv3-text3); margin-left: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
@media (max-width: 640px) {
  .dv3-kpi { grid-template-columns: 1fr; }
  .dv3-kpi-num { font-size: 52px; }
}

/* GAUGE */
.dv3-gauge { align-self: flex-start; margin-top: 12px; font-size: 11px; color: var(--dv3-text3); }
.dv3-gauge-bar { letter-spacing: 0.05em; margin: 6px 0; line-height: 1; white-space: nowrap; }
.dv3-gauge-bar--lg { font-size: 13px; letter-spacing: 0; }
.dv3-fill { color: var(--dv3-accent); }
.dv3-dim { color: var(--dv3-border-hi); }
.dv3-gauge-meta { display: flex; justify-content: space-between; font-size: 10px; color: var(--dv3-text3); }
.dv3-gauge-meta strong { color: var(--dv3-text); font-weight: 600; }
.dv3-gauge-meta--mark { position: relative; }
.dv3-gauge-cur { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }

/* ZONE-COLORED KPI */
.dv3-kpi-num--zone-up   { color: var(--dv3-zone-up); }
.dv3-kpi-num--zone-warn { color: var(--dv3-zone-warn); }
.dv3-kpi-num--zone-down { color: var(--dv3-zone-down); }
.dv3-zone-tag {
  display: inline-block; padding-bottom: 4px; white-space: nowrap;
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600;
}
.dv3-zone-tag--up   { color: var(--dv3-zone-up); }
.dv3-zone-tag--warn { color: var(--dv3-zone-warn); }
.dv3-zone-tag--down { color: var(--dv3-zone-down); }
`
