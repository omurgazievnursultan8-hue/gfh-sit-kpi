import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users, CalendarRange, ClipboardCheck, Gavel, Network, ListChecks,
  UserCog, Activity, AlertTriangle, Target, TrendingUp, Clock, ArrowRight,
} from 'lucide-react'
import { RATING_ZONES } from '@/shared/lib/ratingZones'

// ── zone helpers ────────────────────────────────────────────────────────────
type Tone = 'up' | 'warn' | 'down' | 'info' | 'idle'

function zoneFromScore(score: number | null | undefined): Tone {
  if (score === null || score === undefined) return 'idle'
  if (score >= RATING_ZONES.up)   return 'up'
  if (score >= RATING_ZONES.warn) return 'warn'
  return 'down'
}

function toneVars(tone: Tone): { fg: string; soft: string; stripe: string } {
  switch (tone) {
    case 'up':   return { fg: 'var(--accent-2)', soft: 'var(--accent-soft)', stripe: 'var(--accent-2)' }
    case 'warn': return { fg: 'var(--warn)',     soft: 'var(--warn-soft)',   stripe: 'var(--warn)' }
    case 'down': return { fg: 'var(--danger)',   soft: 'var(--danger-soft)', stripe: 'var(--danger)' }
    case 'info': return { fg: 'var(--info)',     soft: 'var(--info-soft)',   stripe: 'var(--info)' }
    default:     return { fg: 'var(--ink-faint)', soft: 'var(--bg-soft)',    stripe: 'var(--line-strong)' }
  }
}

// ── icon mapping by id prefix ───────────────────────────────────────────────
function iconForId(id: string): ReactNode {
  const k = id.charAt(0).toUpperCase()
  const props = { size: 18, strokeWidth: 2 } as const
  switch (k) {
    case 'U': return <Users {...props} />
    case 'P': return <CalendarRange {...props} />
    case 'E': return <ClipboardCheck {...props} />
    case 'X': return <Gavel {...props} />
    case 'O': return <Network {...props} />
    case 'C': return <ListChecks {...props} />
    case 'D': return <UserCog {...props} />
    case 'J': return <Activity {...props} />
    case 'A': {
      if (id === 'A01') return <Target {...props} />
      if (id === 'A02') return <AlertTriangle {...props} />
      if (id === 'A03') return <TrendingUp {...props} />
      if (id === 'A04') return <Clock {...props} />
      return <Target {...props} />
    }
    default: return <Activity {...props} />
  }
}

// ── types ───────────────────────────────────────────────────────────────────
export interface AdminStatCardGauge {
  pct: number
  variant: 'marker' | 'meta'
  left: ReactNode
  right: ReactNode
  center?: ReactNode
  ariaLabel?: string
}

export interface AdminStatCardDelta {
  value: number
  unit?: string
}

export interface AdminStatCardBreakdownItem {
  label: ReactNode
  value: number | string
  tone?: 'up' | 'warn' | 'down' | 'neutral'
  delta?: number
}

export interface AdminStatCardProps {
  title: string
  id: string
  loading?: boolean
  value: number | string | null
  unit?: string
  label?: string
  subtitle?: ReactNode
  emptyNote?: ReactNode
  zoneScore?: number | null
  gauge?: AdminStatCardGauge
  delta?: AdminStatCardDelta
  breakdown?: AdminStatCardBreakdownItem[]
  onClick?: () => void
  className?: string
}

// ── component ───────────────────────────────────────────────────────────────
export function AdminStatCard({
  title, id, loading = false, value, unit, label, subtitle, emptyNote,
  zoneScore, gauge, delta, breakdown, onClick, className,
}: AdminStatCardProps) {
  const { t } = useTranslation()
  const tone: Tone = zoneScore !== undefined ? zoneFromScore(zoneScore) : 'info'
  const v = toneVars(tone)
  const clickable = !!onClick

  const isEmpty = !loading && (value === null || value === undefined)
  const displayValue = loading ? '··' : (isEmpty ? '—' : value)

  const deltaDir = delta && delta.value !== 0 ? (delta.value > 0 ? 'up' : 'down') : null

  const gaugePct = gauge ? Math.max(0, Math.min(1, gauge.pct)) : 0
  const gaugeWidth = Math.round(gaugePct * 100)

  return (
    <article
      className={`asc-card${clickable ? ' asc-card--btn' : ''}${className ? ` ${className}` : ''}`}
      style={{ ['--asc-stripe' as string]: v.stripe }}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable
        ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!() } }
        : undefined}
    >
      <header className="asc-head">
        <div className="asc-ico" style={{ background: v.soft, color: v.fg }} aria-hidden="true">
          {iconForId(id)}
        </div>
        <div className="asc-ht">
          <div className="asc-title">{title}</div>
        </div>
        <span className="asc-tag font-mono">{id}</span>
      </header>

      <div className="asc-num-row">
        {isEmpty && emptyNote ? (
          <div className="asc-empty-wrap">
            <span className="asc-num-empty font-mono">—</span>
            <span className="asc-empty-note">{emptyNote}</span>
          </div>
        ) : (
          <>
            <b className="asc-num font-mono">
              {loading ? <span className="asc-skel" aria-hidden="true">··</span> : displayValue}
              {unit && !loading && !isEmpty && <span className="asc-num-unit">{unit}</span>}
            </b>
            {!loading && (delta || label) && (
              <span className="asc-meta">
                {delta && deltaDir && (
                  <span className={`asc-delta asc-delta--${deltaDir} font-mono`}>
                    {delta.value > 0 ? '+' : ''}{delta.value}{delta.unit ?? ''}
                  </span>
                )}
                {label && <span className="asc-label font-mono">{label}</span>}
              </span>
            )}
          </>
        )}
      </div>

      {subtitle && !isEmpty && (
        <div className="asc-subtitle font-mono">{subtitle}</div>
      )}

      {gauge && !isEmpty && !loading && (
        <div
          className="asc-gauge"
          role="img"
          aria-label={gauge.ariaLabel ?? `${gaugeWidth}%`}
        >
          <div className="asc-gauge-track">
            <i style={{ width: `${gaugeWidth}%`, background: v.stripe }} />
          </div>
          <div className="asc-gauge-meta font-mono">
            <span>{gauge.left}</span>
            {gauge.variant === 'meta' && gauge.center && <span>{gauge.center}</span>}
            <span>{gauge.right}</span>
          </div>
        </div>
      )}

      {breakdown && breakdown.length > 0 && !isEmpty && !loading && (
        <ul className="asc-bd">
          {breakdown.map((item, i) => {
            const itone: Tone =
              item.tone === 'up' ? 'up'
              : item.tone === 'warn' ? 'warn'
              : item.tone === 'down' ? 'down'
              : 'idle'
            const iv = toneVars(itone)
            return (
              <li key={i} className={`asc-bd-row asc-bd-row--${item.tone ?? 'neutral'}`}>
                <span className="asc-bd-dot" style={{ background: iv.stripe }} />
                <span className="asc-bd-lab">{item.label}</span>
                <span className="asc-bd-val font-mono">{item.value}</span>
                {item.delta !== undefined && item.delta !== 0 && (
                  <span
                    className="asc-bd-delta font-mono"
                    style={{ color: item.delta > 0 ? 'var(--accent-2)' : 'var(--danger)' }}
                  >
                    {item.delta > 0 ? '+' : ''}{item.delta}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {clickable && (
        <footer className="asc-foot">
          <span className="asc-cta">
            {t('common.open', 'Открыть')}<ArrowRight size={14} />
          </span>
        </footer>
      )}
    </article>
  )
}

// ── styles ──────────────────────────────────────────────────────────────────
export const ADMIN_STAT_CARD_CSS = `
.asc-card {
  position: relative;
  display: flex; flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line-soft);
  border-top: 3px solid var(--asc-stripe);
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
  padding: 0;
  text-align: left;
  transition: box-shadow .16s ease, transform .16s ease, border-color .16s ease;
  min-height: 168px;
}
.asc-card--btn {
  cursor: pointer; font-family: inherit; color: inherit;
}
.asc-card--btn:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
.asc-card--btn:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px;
}

.asc-head {
  display: flex; align-items: center; gap: 11px;
  padding: 14px 16px 0;
}
.asc-ico {
  width: 34px; height: 34px;
  border-radius: 9px;
  display: grid; place-items: center;
  flex: none;
}
.asc-ht { min-width: 0; flex: 1; }
.asc-title {
  font-size: 12px; font-weight: 600; line-height: 1.2;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink);
}
.asc-sub {
  font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-faint); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.asc-tag {
  font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
  color: var(--ink-faint);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 2px 6px;
  white-space: nowrap;
}

.asc-num-row {
  display: flex; align-items: flex-end; gap: 10px;
  padding: 12px 16px 4px;
  min-height: 60px;
}
.asc-num {
  font-size: 44px; font-weight: 600; line-height: 0.88;
  letter-spacing: -0.02em;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: baseline; gap: 6px;
}
.asc-num-unit {
  font-size: 16px; font-weight: 500; color: var(--ink-faint);
}
.asc-num-empty {
  font-size: 44px; font-weight: 400; color: var(--ink-faint); line-height: 0.88;
}
.asc-meta {
  margin-left: auto;
  display: grid; grid-template-rows: 1fr auto 1fr auto;
  justify-items: start;
  padding: 2px 0 4px;
}
.asc-meta .asc-delta { grid-row: 2; }
.asc-meta .asc-label { grid-row: 4; }
.asc-delta {
  font-size: 11.5px; font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.asc-delta--up   { color: var(--accent-2); }
.asc-delta--down { color: var(--danger); }
.asc-label {
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-faint);
  line-height: 1.2;
}

.asc-empty-wrap {
  display: flex; align-items: baseline; gap: 12px;
}
.asc-empty-note {
  font-size: 11px; color: var(--ink-faint);
  font-style: italic;
}

.asc-subtitle {
  padding: 0 16px 4px;
  font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-faint);
}

.asc-gauge { padding: 6px 16px 4px; }
.asc-gauge-track {
  height: 7px; border-radius: 5px;
  background: var(--bg-soft);
  overflow: hidden;
}
.asc-gauge-track i {
  display: block; height: 100%;
  border-radius: 5px;
  transition: width .7s cubic-bezier(.4,0,.2,1);
}
.asc-gauge-meta {
  display: flex; justify-content: space-between;
  font-size: 10px; color: var(--ink-faint);
  margin-top: 5px; letter-spacing: 0.03em;
}

.asc-bd {
  list-style: none; margin: 0;
  padding: 0 16px;
  border-top: 1px solid transparent;
  display: flex; flex-direction: column; gap: 5px;
  max-height: 0; overflow: hidden;
  opacity: 0;
  transition: max-height .22s ease, opacity .18s ease, padding .22s ease, border-color .22s ease;
}
.asc-card:hover .asc-bd,
.asc-card:focus-within .asc-bd {
  max-height: 240px;
  opacity: 1;
  padding: 8px 16px;
  border-top-color: var(--line-soft);
  margin-top: 6px;
}
.asc-bd-row {
  display: grid; align-items: center;
  grid-template-columns: 8px 1fr auto auto;
  gap: 8px;
  font-size: 12px;
}
.asc-bd-dot {
  width: 7px; height: 7px; border-radius: 50%;
}
.asc-bd-lab {
  font-size: 11px; color: var(--ink-soft);
  letter-spacing: 0.02em;
}
.asc-bd-val {
  font-size: 13px; font-weight: 600; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.asc-bd-delta {
  font-size: 10.5px; font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.asc-foot {
  margin-top: auto;
  padding: 10px 16px 12px;
  border-top: 1px solid var(--line-soft);
  display: flex; justify-content: flex-end;
}
.asc-cta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600;
  color: var(--accent);
}
.asc-cta svg { transition: transform .14s ease; }
.asc-card--btn:hover .asc-cta svg { transform: translateX(2px); }

.asc-skel {
  display: inline-block; color: transparent;
  background: linear-gradient(90deg, var(--bg-soft) 0%, var(--line) 50%, var(--bg-soft) 100%);
  background-size: 200% 100%;
  animation: asc-shimmer 1.4s linear infinite;
  border-radius: 2px;
  min-width: 1.4em; height: 0.7em;
}
@keyframes asc-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

@media (max-width: 720px) {
  .asc-num { font-size: 34px; }
  .asc-num-empty { font-size: 34px; }
}
@media (prefers-reduced-motion: reduce) {
  .asc-card, .asc-gauge-track i, .asc-cta svg, .asc-skel {
    animation: none !important; transition: none !important;
  }
}
`
