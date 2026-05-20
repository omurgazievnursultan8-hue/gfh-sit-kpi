import { useMemo } from 'react'
import type { Evaluation } from '../evaluationsApi'
import type { Period } from '../../periods/periodsApi'
import { formatPeriodRange } from './periodFormat'

/* Scoped styles — injected once by MyEvaluationsPage. Uses dv3 vars from .dv3-root. */
export const SCORE_TREND_CSS = `
.evt-panel {
  border: 1px solid var(--dv3-border);
  border-top: 2px solid var(--dv3-zone-info);
  background: var(--dv3-bg2);
  padding: 14px 16px 12px;
}
.evt-meta {
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dv3-zone-info);
}
.evt-plot {
  position: relative;
  height: 130px;
  margin-top: 12px;
}
.evt-gridline {
  position: absolute; left: 0; right: 0; height: 1px;
  background: var(--dv3-border);
}
.evt-bars {
  position: absolute; inset: 0;
  display: flex; align-items: flex-end; gap: 5px;
}
.evt-bar {
  flex: 1; min-width: 4px;
  border-radius: 2px 2px 0 0;
  background: var(--dv3-accent);
  opacity: 0.55;
}
.evt-bar--last { background: var(--dv3-zone-warn); opacity: 1; }
.evt-xaxis {
  display: flex; justify-content: space-between;
  font-size: 9px; color: var(--dv3-text3);
  margin-top: 6px; letter-spacing: 0.04em;
}
.evt-empty {
  margin-top: 12px;
  font-size: 12px; color: var(--dv3-text3);
}
`

interface TrendPoint { periodId: number; score: number; label: string }

interface ScoreTrendProps {
  evaluations: Evaluation[]
  periodById: Map<number, Period>
  loading: boolean
  className?: string
}

function evalTime(e: Evaluation): string {
  return e.submittedAt ?? e.createdAt
}

export function ScoreTrend({ evaluations, periodById, loading, className }: ScoreTrendProps) {
  const points = useMemo<TrendPoint[]>(() => {
    // Latest scored evaluation per period.
    const latest = new Map<number, Evaluation>()
    for (const e of evaluations) {
      if (e.finalScore === null) continue
      const cur = latest.get(e.periodId)
      if (!cur || evalTime(e) > evalTime(cur)) latest.set(e.periodId, e)
    }
    // Chronological by period.startDate, fall back to periodId.
    const ordered = [...latest.values()].sort((a, b) => {
      const pa = periodById.get(a.periodId)
      const pb = periodById.get(b.periodId)
      if (pa && pb) return pa.startDate.localeCompare(pb.startDate)
      return a.periodId - b.periodId
    })
    return ordered.slice(-12).map(e => ({
      periodId: e.periodId,
      score: Number(e.finalScore),
      label: formatPeriodRange(periodById.get(e.periodId), e.periodId),
    }))
  }, [evaluations, periodById])

  const rootClass = className ? `evt-panel ${className}` : 'evt-panel'

  if (loading) {
    return (
      <div className={rootClass}>
        <div className="evt-meta">SCORE.TREND</div>
        <div className="evt-plot dv3-loading" />
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div className={rootClass}>
        <div className="evt-meta">SCORE.TREND</div>
        <div className="evt-empty">Недостаточно данных для графика.</div>
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <div className="evt-meta">SCORE.TREND · {points.length} ПЕРИОДОВ</div>
      <div className="evt-plot">
        <div className="evt-gridline" style={{ top: '25%' }} />
        <div className="evt-gridline" style={{ top: '50%' }} />
        <div className="evt-gridline" style={{ top: '75%' }} />
        <div className="evt-bars">
          {points.map((p, i) => (
            <div
              key={p.periodId}
              className={`evt-bar${i === points.length - 1 ? ' evt-bar--last' : ''}`}
              style={{ height: `${Math.max(0, Math.min(100, p.score))}%` }}
              title={`${p.label}: ${p.score.toFixed(1)}`}
            />
          ))}
        </div>
      </div>
      <div className="evt-xaxis">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  )
}
