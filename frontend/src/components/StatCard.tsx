import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RATING_ZONES } from '../lib/ratingZones'

// ── helpers ─────────────────────────────────────────────────────────────────
// Maps a 0–100 score to a colour zone. null/undefined → neutral.
export function scoreZone(score: number | null | undefined): {
  numClass: string; tagClass: string; labelKey: string | null
} {
  if (score === null || score === undefined) {
    return { numClass: '', tagClass: '', labelKey: null }
  }
  if (score >= RATING_ZONES.up)   return { numClass: 'zone-up',   tagClass: 'up',   labelKey: 'dashboard.zoneUp' }
  if (score >= RATING_ZONES.warn) return { numClass: 'zone-warn', tagClass: 'warn', labelKey: 'dashboard.zoneNorm' }
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
  ariaLabel?: string             // SR description; defaults to "<pct>%"
  thresholds?: { at: number; zone: 'warn' | 'up' | 'down' }[]  // marker only
  zoneLabels?: { down: ReactNode; warn: ReactNode; up: ReactNode }  // marker only — replaces left/center/right
}

export interface StatCardDelta {
  value: number                  // signed; sign drives direction glyph
  unit?: string                  // e.g. 'pts', '%', defaults to nothing
  label?: string                 // e.g. 'vs Q1' — small caption below chip
}

export interface StatCardProps {
  title: string
  id: string
  loading?: boolean
  value: number | string | null
  placeholder?: string
  emptyValue?: string
  unit?: string
  label?: string
  emptyNote?: ReactNode
  subtitle?: ReactNode
  zoneScore?: number | null
  gauge?: StatCardGauge
  delta?: StatCardDelta          // optional ▲/▼ trend chip
  onClick?: () => void
  onHover?: () => void
  active?: boolean
  className?: string
  controls?: string              // id of the panel this card expands (a11y)
}

// ── component ───────────────────────────────────────────────────────────────
export function StatCard({
  title, id, loading = false, value,
  placeholder = '··', emptyValue = '—',
  unit, label, emptyNote, subtitle, zoneScore, gauge, delta,
  onClick, onHover, active, className, controls,
}: StatCardProps) {
  const { t } = useTranslation()
  const zone = scoreZone(zoneScore)

  const showEmptyNote =
    !loading && (value === null || value === undefined) && emptyNote != null

  const displayValue = loading
    ? null
    : (value !== null && value !== undefined ? value : emptyValue)

  const numClass =
    'dv3-kpi-num' +
    (!loading && zone.numClass ? ` dv3-kpi-num--${zone.numClass}` : '') +
    (showEmptyNote ? ' dv3-kpi-num--empty' : '')

  const rootZoneClass =
    !loading && zone.tagClass ? ` dv3-card--zone-${zone.tagClass}` : ''

  const deltaDir = delta ? (delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat') : null
  const deltaGlyph = deltaDir === 'up' ? '▲' : deltaDir === 'down' ? '▼' : '◆'

  const gaugePct = gauge ? Math.max(0, Math.min(1, gauge.pct)) : 0
  const gaugeWidthPct = Math.round(gaugePct * 100)

  const body = (
    <>
      <span className="dv3-card-tag">[ {id} ]</span>
      <div className="dv3-card-head">
        <span className="dv3-card-title">
          <strong>{title}</strong>
          {onClick && (
            <span
              className={`dv3-card-chev${active ? ' dv3-card-chev--open' : ''}`}
              aria-hidden="true"
            >▸</span>
          )}
        </span>
        <span className="dv3-card-status">
          <i
            className={`dv3-dot${zone.tagClass ? ` dv3-dot--${zone.tagClass}` : ''}`}
            aria-hidden="true"
          />
          {!loading && zone.labelKey && (
            <span className="dv3-sr-only">{t(zone.labelKey)}</span>
          )}
        </span>
      </div>
      <div className="dv3-card-body">
        {showEmptyNote ? (
          <div className="dv3-kpi dv3-kpi--empty">
            <div className={numClass}>—</div>
            <div className="dv3-kpi-empty-note">{emptyNote}</div>
          </div>
        ) : (
          <div className="dv3-kpi">
            <div className={numClass}>
              {loading ? (
                <span className="dv3-skel dv3-skel--num" aria-hidden="true">{placeholder}</span>
              ) : (
                <>
                  {displayValue}
                  {unit && <span className="dv3-kpi-unit">{unit}</span>}
                  {label && <span className="dv3-kpi-label">{label}</span>}
                </>
              )}
            </div>
            <div className="dv3-kpi-side">
              {!loading && zone.labelKey && (
                <span className={`dv3-zone-tag dv3-zone-tag--${zone.tagClass}`}>
                  {t(zone.labelKey)}
                </span>
              )}
              {!loading && delta && deltaDir && (
                <span
                  className={`dv3-delta dv3-delta--${deltaDir}`}
                  aria-label={
                    `${delta.value > 0 ? '+' : ''}${delta.value}` +
                    `${delta.unit ?? ''}${delta.label ? ` ${delta.label}` : ''}`
                  }
                >
                  <span className="dv3-delta-glyph" aria-hidden="true">{deltaGlyph}</span>
                  <span className="dv3-delta-val" aria-hidden="true">
                    {delta.value > 0 ? '+' : ''}{delta.value}
                    {delta.unit && <span className="dv3-delta-unit">{delta.unit}</span>}
                  </span>
                  {delta.label && <span className="dv3-delta-lab" aria-hidden="true">{delta.label}</span>}
                </span>
              )}
            </div>
          </div>
        )}
        {!loading && !showEmptyNote && subtitle && (
          <div className="dv3-kpi-subtitle">{subtitle}</div>
        )}
        {gauge && !showEmptyNote && (
          <div
            className={`dv3-gauge dv3-gauge--${gauge.variant}`}
            role="img"
            aria-label={gauge.ariaLabel ?? `${gaugeWidthPct}%`}
          >
            <svg
              className="dv3-gauge-svg"
              viewBox="0 0 100 4"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect x="0" y="0" width="100" height="4" className="dv3-gauge-track" />
              <rect
                x="0" y="0" height="4"
                width={loading ? 0 : gaugeWidthPct}
                className="dv3-gauge-fill"
              />
              {gauge.variant === 'marker' && !loading && gauge.thresholds?.map(th => (
                <line
                  key={th.at}
                  x1={th.at} x2={th.at}
                  y1="-0.5" y2="4.5"
                  className={`dv3-gauge-tick dv3-gauge-tick--${th.zone}`}
                />
              ))}
              {gauge.variant === 'marker' && !loading && (
                <g transform={`translate(${gaugeWidthPct} 0)`}>
                  <rect x="-0.5" y="-1" width="1" height="6" className="dv3-gauge-pin" />
                </g>
              )}
            </svg>
            {gauge.variant === 'marker' ? (
              <div className="dv3-gauge-meta dv3-gauge-meta--mark">
                {gauge.zoneLabels ? (
                  <div className="dv3-gauge-zones">
                    <span className="dv3-gauge-zone dv3-gauge-zone--down">{gauge.zoneLabels.down}</span>
                    <span className="dv3-gauge-zone dv3-gauge-zone--warn">{gauge.zoneLabels.warn}</span>
                    <span className="dv3-gauge-zone dv3-gauge-zone--up">{gauge.zoneLabels.up}</span>
                  </div>
                ) : (
                  <>
                    <span>{gauge.left}</span>
                    <span>{gauge.right}</span>
                  </>
                )}
                <span
                  className="dv3-gauge-cur"
                  style={{ left: `${gaugeWidthPct}%` }}
                >
                  <strong>{gauge.current}</strong>
                </span>
              </div>
            ) : (
              <div className="dv3-gauge-meta">
                <span>{gauge.left}</span>
                <span>{gauge.center}</span>
                <span>{gauge.right}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )

  const rootCls =
    `dv3-card${rootZoneClass}${active ? ' dv3-card--active' : ''}${loading ? ' dv3-card--loading' : ''}` +
    (className ? ` ${className}` : '')

  if (onClick || onHover) {
    return (
      <div
        className={`${rootCls} dv3-card-btn`}
        role="button"
        tabIndex={0}
        aria-expanded={active !== undefined ? active : undefined}
        aria-controls={controls}
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
  return <section className={rootCls}>{body}</section>
}

// ── styles ──────────────────────────────────────────────────────────────────
export const STAT_CARD_CSS = `
/* screen-reader-only utility */
.dv3-sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

/* CARD */
.dv3-card {
  --dv3-card-zone: var(--dv3-accent);
  --surface: var(--dv3-bg2);
  --surface-mute: var(--dv3-bg3);
  --row-odd: #ffffff;
  --row-zebra: color-mix(in srgb, #000 3%, var(--dv3-bg2));
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  position: relative;
  display: flex; flex-direction: column;
  text-align: left;
  min-height: 220px;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 220ms ease;
}
.dv3-card--zone-up   { --dv3-card-zone: var(--dv3-zone-up); }
.dv3-card--zone-warn { --dv3-card-zone: var(--dv3-zone-warn); }
.dv3-card--zone-down { --dv3-card-zone: var(--dv3-zone-down); }
[data-theme="dark"] .dv3-card {
  --row-odd: var(--dv3-bg);
  --row-zebra: color-mix(in srgb, #fff 3%, var(--dv3-bg));
}

/* corner ticks — zone-aware, fill when active */
.dv3-card::before, .dv3-card::after {
  content: ""; position: absolute; width: 9px; height: 9px; pointer-events: none;
  transition: background 180ms ease, border-color 180ms ease;
}
.dv3-card::before {
  top: -1px; left: -1px;
  border-top: 1px solid var(--dv3-card-zone);
  border-left: 1px solid var(--dv3-card-zone);
}
.dv3-card::after {
  bottom: -1px; right: -1px;
  border-bottom: 1px solid var(--dv3-card-zone);
  border-right: 1px solid var(--dv3-card-zone);
}
.dv3-card--active::before,
.dv3-card--active::after {
  background: var(--dv3-card-zone);
}

/* floating id tag */
.dv3-card-tag {
  position: absolute; top: -8px; right: 10px;
  padding: 2px 7px;
  background: var(--dv3-bg);
  color: var(--dv3-text4);
  font-size: 9px; letter-spacing: 0.14em;
  line-height: 1; z-index: 1;
}

.dv3-card-btn {
  cursor: pointer; font-family: inherit; color: inherit;
}
.dv3-card-btn:hover {
  border-color: var(--dv3-border-hi);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px -10px var(--dv3-card-zone), 0 1px 0 0 var(--dv3-border-hi) inset;
}
.dv3-card-btn:active { transform: translateY(0); }
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
.dv3-card-title { position: relative; padding-left: 0; display: inline-flex; align-items: center; gap: 6px; }
.dv3-card-chev {
  font-size: 10px; color: var(--dv3-text4);
  display: inline-block; transition: transform 180ms ease, color 180ms ease;
}
.dv3-card-btn:hover .dv3-card-chev { color: var(--dv3-card-zone); }
.dv3-card-chev--open { transform: rotate(90deg); color: var(--dv3-card-zone); }
.dv3-card-btn:hover .dv3-card-title strong::after,
.dv3-card-btn:focus-visible .dv3-card-title strong::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -3px; height: 1px;
  background: var(--dv3-card-zone); opacity: 0.8;
  animation: dv3-underline 320ms ease-out;
}
@keyframes dv3-underline { from { transform: scaleX(0); transform-origin: left; } to { transform: scaleX(1); transform-origin: left; } }

.dv3-card-status { display: inline-flex; }
.dv3-dot {
  display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: var(--dv3-text4);
  box-shadow: 0 0 0 0 var(--dv3-card-zone);
}
.dv3-dot--up   { background: var(--dv3-zone-up);   box-shadow: 0 0 6px var(--dv3-zone-up); }
.dv3-dot--warn { background: var(--dv3-zone-warn); box-shadow: 0 0 6px var(--dv3-zone-warn); }
.dv3-dot--down { background: var(--dv3-zone-down); box-shadow: 0 0 6px var(--dv3-zone-down); animation: dv3-pulse-dot 1.6s ease-in-out infinite; }
@keyframes dv3-pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }

.dv3-card-body { padding: 18px 18px 16px; flex: 1; display: flex; flex-direction: column; }

/* KPI */
.dv3-kpi { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: flex-end; }
.dv3-kpi-num {
  font-weight: 600; font-size: 76px; line-height: 0.9;
  letter-spacing: -0.04em; color: var(--dv3-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  animation: dv3-num-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes dv3-num-in {
  from { opacity: 0; transform: translateY(6px); letter-spacing: -0.06em; }
  to   { opacity: 1; transform: translateY(0);   letter-spacing: -0.04em; }
}
.dv3-kpi-num--empty { color: var(--dv3-text4); font-weight: 400; }
.dv3-kpi-unit { font-size: 16px; color: var(--dv3-text3); margin-left: 8px; font-weight: 400; }
.dv3-kpi-label { font-size: 11px; color: var(--dv3-text3); margin-left: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
.dv3-kpi-side {
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
  padding-bottom: 6px;
}
.dv3-kpi--empty { grid-template-columns: auto 1fr; align-items: center; gap: 14px; }
.dv3-kpi-empty-note {
  font-size: 12px; line-height: 1.45;
  font-style: italic; color: var(--dv3-text3);
  letter-spacing: 0.01em;
}
.dv3-kpi-subtitle {
  margin-top: 6px;
  font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--dv3-text4); font-weight: 500;
}

/* zone KPI / tag */
.dv3-kpi-num--zone-up   { color: var(--dv3-zone-up); }
.dv3-kpi-num--zone-warn { color: var(--dv3-zone-warn); }
.dv3-kpi-num--zone-down { color: var(--dv3-zone-down); }
.dv3-zone-tag {
  white-space: nowrap;
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600;
}
.dv3-zone-tag--up   { color: var(--dv3-zone-up); }
.dv3-zone-tag--warn { color: var(--dv3-zone-warn); }
.dv3-zone-tag--down { color: var(--dv3-zone-down); }

/* DELTA chip */
.dv3-delta {
  display: inline-flex; align-items: baseline; gap: 5px;
  padding: 2px 7px;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg);
  font-size: 11px; line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.dv3-delta-glyph { font-size: 9px; }
.dv3-delta-unit { font-size: 9px; color: var(--dv3-text3); margin-left: 1px; }
.dv3-delta-lab { font-size: 9px; color: var(--dv3-text4); letter-spacing: 0.1em; text-transform: uppercase; margin-left: 4px; }
.dv3-delta--up   { color: var(--dv3-zone-up);   border-color: color-mix(in srgb, var(--dv3-zone-up)   40%, var(--dv3-border)); }
.dv3-delta--down { color: var(--dv3-zone-down); border-color: color-mix(in srgb, var(--dv3-zone-down) 40%, var(--dv3-border)); }
.dv3-delta--flat { color: var(--dv3-text3); }

/* SVG GAUGE */
.dv3-gauge { align-self: stretch; margin-top: auto; padding-top: 14px; font-size: 11px; color: var(--dv3-text3); }
.dv3-gauge-svg { display: block; width: 100%; height: 6px; overflow: visible; }
.dv3-gauge-track { fill: var(--dv3-border); }
.dv3-gauge-fill {
  fill: var(--dv3-accent);
  transition: width 720ms cubic-bezier(0.16, 1, 0.3, 1);
}
.dv3-gauge-pin {
  fill: var(--dv3-card-zone);
  stroke: var(--dv3-card-zone); stroke-width: 0.4;
}
.dv3-gauge-tick {
  stroke-width: 0.6;
  vector-effect: non-scaling-stroke;
  opacity: 0.55;
}
.dv3-gauge-tick--warn { stroke: var(--dv3-zone-warn); }
.dv3-gauge-tick--up   { stroke: var(--dv3-zone-up); }
.dv3-gauge-tick--down { stroke: var(--dv3-zone-down); }
.dv3-gauge-meta {
  display: flex; justify-content: space-between;
  font-size: 10px; color: var(--dv3-text3);
  margin-top: 8px;
}
.dv3-gauge-meta strong { color: var(--dv3-text); font-weight: 600; }
.dv3-gauge-meta--mark { position: relative; }
.dv3-gauge-cur {
  position: absolute; top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
  max-width: 60%;
  text-align: center;
}
.dv3-gauge-zones {
  display: grid; width: 100%;
  grid-template-columns: 50% 30% 20%;
  font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;
}
.dv3-gauge-zone { padding: 0 4px; }
.dv3-gauge-zone--down { text-align: left;   color: var(--dv3-zone-down); }
.dv3-gauge-zone--warn { text-align: center; color: var(--dv3-zone-warn); }
.dv3-gauge-zone--up   { text-align: right;  color: var(--dv3-zone-up); }

/* SKELETON shimmer */
.dv3-skel {
  display: inline-block;
  color: transparent;
  background: linear-gradient(
    90deg,
    var(--dv3-bg3) 0%,
    var(--dv3-border-hi) 50%,
    var(--dv3-bg3) 100%
  );
  background-size: 200% 100%;
  animation: dv3-shimmer 1.4s linear infinite;
  border-radius: 2px;
}
.dv3-skel--num { min-width: 1.6em; height: 0.7em; vertical-align: baseline; }
@keyframes dv3-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
.dv3-card--loading .dv3-gauge-fill { transition: none; }

/* MOBILE */
@media (max-width: 640px) {
  .dv3-card { min-height: 180px; }
  .dv3-kpi { grid-template-columns: 1fr; gap: 10px; }
  .dv3-kpi-side { flex-direction: row; align-items: center; align-self: flex-start; }
  .dv3-kpi-num { font-size: 44px; }
  .dv3-kpi-unit { font-size: 13px; }
  .dv3-card-body { padding: 14px 14px 12px; }
  .dv3-card-tag { top: -7px; right: 8px; padding: 2px 6px; font-size: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .dv3-kpi-num, .dv3-card-btn:hover, .dv3-gauge-fill, .dv3-skel, .dv3-dot--down {
    animation: none !important; transition: none !important;
  }
}
`
