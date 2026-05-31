import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { analyticsApi, PersonalAnalytics, ScorecardResponse, PeriodScore, CriteriaScore } from '../api'
import { ExportButtons } from '../components/ExportButtons'
import { usePageTitle } from '@/layouts/shell/PageContext'
import { DASHBOARD_CSS } from '../../dashboard/styles'
import { StatCard, STAT_CARD_CSS, scoreZone } from '@/shared/ui/StatCard'

// "Мой KPI" — rewritten to match the main Dashboard terminal/Swiss-grid aesthetic.

function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(digits)
}

function signedDelta(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) {
    return { txt: '—', tone: 'flat' as const, value: null as number | null }
  }
  const v = Number(n)
  if (Math.abs(v) < 0.05) return { txt: '±0.0', tone: 'flat' as const, value: 0 }
  return {
    txt: `${v > 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}`,
    tone: (v > 0 ? 'up' : 'down') as 'up' | 'down',
    value: v,
  }
}

function deriveGrade(score: number | null): string {
  if (score === null) return '—'
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

function periodTick(periodType: string, startDate: string): string {
  const d = new Date(startDate)
  if (periodType === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1} ${String(d.getFullYear()).slice(2)}`
  if (periodType === 'MONTHLY') return d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')
  return `${d.getFullYear()}`
}

export function PersonalDashboardPage() {
  usePageTitle('nav.myKpi')
  const { t, i18n } = useTranslation()

  const [data, setData] = useState<PersonalAnalytics | null>(null)
  const [card, setCard] = useState<ScorecardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    Promise.all([analyticsApi.personal(), analyticsApi.scorecard()])
      .then(([p, s]) => { setData(p); setCard(s) })
      .finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const sortedHistory = useMemo(() => {
    if (!data) return []
    return [...data.history].sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [data])

  const chartData = useMemo(() => sortedHistory.map(h => ({
    name: periodTick(h.periodType, h.startDate),
    score: Number(Number(h.score).toFixed(2)),
  })), [sortedHistory])

  // Time / clock — Bishkek tz, matches DashboardPage formatting.
  const BISHKEK_TZ = 'Asia/Bishkek'
  const clockParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BISHKEK_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const hh = clockParts.find(p => p.type === 'hour')?.value ?? '00'
  const mm = clockParts.find(p => p.type === 'minute')?.value ?? '00'
  const hours = Number(hh)
  const timeGreeting = hours < 12
    ? t('dashboard.greetingMorning')
    : hours < 18
      ? t('dashboard.greetingAfternoon')
      : t('dashboard.greetingEvening')
  const datePart = now.toLocaleDateString(
    i18n.language === 'kg' ? 'ky-KG' : 'ru-RU',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: BISHKEK_TZ },
  )
  const todayLine = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1
      ? t('dashboard.updatedJustNow')
      : t('dashboard.updatedMinutesAgo', { count: mins })
  }

  const currentScore = data?.currentScore ?? null
  const scoreWhole = currentScore !== null ? Math.round(currentScore) : null
  const scorePct = currentScore !== null ? currentScore / 100 : 0
  const zone = scoreZone(scoreWhole)
  const grade = card?.grade || deriveGrade(currentScore)
  const rank = card?.rank ?? null
  const vsGoal = card?.vsGoal ?? null
  const vsPrev = card?.vsPrevPeriod ?? null
  const periodLabel = card?.periodLabel ?? ''

  const myMinusDept = currentScore !== null && data?.departmentAvg !== null && data?.departmentAvg !== undefined
    ? Number(currentScore) - Number(data.departmentAvg) : null
  const myMinusCo = currentScore !== null && data?.companyAvg !== null && data?.companyAvg !== undefined
    ? Number(currentScore) - Number(data.companyAvg) : null

  // ФИО → Name Patronymic
  const nameParts = data?.fullName?.trim().split(/\s+/) ?? []
  const greetingName = nameParts.length >= 3
    ? `${nameParts[1]} ${nameParts[2]}`
    : nameParts.slice(1).join(' ') || nameParts[0] || ''

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{STAT_CARD_CSS}</style>
      <style>{MYKPI_CSS}</style>

      <div className="dv3-terminal">

        {/* ── STAT GRID ── */}
        <div className="dv3-grid">
          <StatCard
            className="dv3-col-3"
            title={t('analytics.currentRating', { defaultValue: 'Current Rating' })}
            id="K01" loading={loading}
            value={scoreWhole}
            unit={currentScore !== null ? '/ 100' : undefined}
            zoneScore={scoreWhole}
            delta={vsPrev !== null && !Number.isNaN(Number(vsPrev)) ? {
              value: Number(Number(vsPrev).toFixed(1)),
              unit: 'pt',
              label: t('analytics.vsPrev', { defaultValue: 'vs prev' }),
            } : undefined}
            gauge={currentScore !== null ? {
              pct: scorePct, variant: 'marker',
              left: '0', right: '100', current: scoreWhole,
            } : undefined}
          />
          <StatCard
            className="dv3-col-3"
            title={t('analytics.deptAvg', { defaultValue: 'Department Avg' })}
            id="K02" loading={loading}
            value={data?.departmentAvg !== null && data?.departmentAvg !== undefined ? fmt(data.departmentAvg) : null}
            unit={data?.departmentAvg !== null && data?.departmentAvg !== undefined ? '/ 100' : undefined}
            delta={myMinusDept !== null ? {
              value: Number(myMinusDept.toFixed(1)),
              unit: 'pt',
              label: t('analytics.youVsDept', { defaultValue: 'you − dept' }),
            } : undefined}
            gauge={data?.departmentAvg !== null && data?.departmentAvg !== undefined ? {
              pct: Number(data.departmentAvg) / 100, variant: 'meta',
              left: '0%',
              center: <strong>{fmt(data.departmentAvg)}</strong>,
              right: '100',
            } : undefined}
          />
          <StatCard
            className="dv3-col-3"
            title={t('analytics.companyAvg', { defaultValue: 'Company Avg' })}
            id="K03" loading={loading}
            value={data?.companyAvg !== null && data?.companyAvg !== undefined ? fmt(data.companyAvg) : null}
            unit={data?.companyAvg !== null && data?.companyAvg !== undefined ? '/ 100' : undefined}
            delta={myMinusCo !== null ? {
              value: Number(myMinusCo.toFixed(1)),
              unit: 'pt',
              label: t('analytics.youVsCompany', { defaultValue: 'you − co' }),
            } : undefined}
            gauge={data?.companyAvg !== null && data?.companyAvg !== undefined ? {
              pct: Number(data.companyAvg) / 100, variant: 'meta',
              left: '0%',
              center: <strong>{fmt(data.companyAvg)}</strong>,
              right: '100',
            } : undefined}
          />
          <StatCard
            className="dv3-col-3"
            title={t('analytics.vsGoal', { defaultValue: 'vs Goal' })}
            id="K04" loading={loading}
            value={vsGoal !== null && !Number.isNaN(Number(vsGoal))
              ? (vsGoal >= 0 ? '+' : '−') + Math.abs(vsGoal).toFixed(1)
              : null}
            label={vsGoal !== null ? 'pt' : undefined}
            emptyNote={vsGoal === null ? t('analytics.noGoal', { defaultValue: 'no goal for period' }) : undefined}
            delta={rank !== null ? {
              value: 0,
              label: `№${rank}`,
            } : undefined}
          />

          {/* CHART */}
          <section className="dv3-card dv3-col-12 mk-panel">
            <div className="dv3-card-head">
              <span><strong>{t('analytics.dynamics', { defaultValue: 'Rating dynamics' })}</strong></span>
              <span>[ {chartData.length} obs · 0–100 ]</span>
            </div>
            <div className="mk-panel-body">
              {chartData.length > 1 ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 28, bottom: 4, left: -10 }}>
                      <defs>
                        <linearGradient id="kpiAreaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="var(--dv3-zone-info)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--dv3-zone-info)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fontFamily: 'Geist Mono, ui-monospace, monospace', fill: 'var(--dv3-text3)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--dv3-border)' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fontFamily: 'Geist Mono, ui-monospace, monospace', fill: 'var(--dv3-text3)' }}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                      />
                      <Tooltip
                        cursor={{ stroke: 'var(--dv3-border-hi)', strokeDasharray: '2 4' }}
                        contentStyle={{
                          background: 'var(--dv3-bg)',
                          border: '1px solid var(--dv3-border-hi)',
                          borderRadius: 0,
                          padding: '8px 12px',
                          color: 'var(--dv3-text)',
                          fontSize: 11,
                          fontFamily: 'Geist Mono, ui-monospace, monospace',
                        }}
                        labelStyle={{ color: 'var(--dv3-text3)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}
                        itemStyle={{ color: 'var(--dv3-accent)' }}
                        formatter={(v: number) => [v.toFixed(1), t('analytics.score', { defaultValue: 'score' })]}
                      />
                      {data?.departmentAvg !== null && data?.departmentAvg !== undefined && (
                        <ReferenceLine
                          y={Number(data.departmentAvg)}
                          stroke="var(--dv3-zone-up)"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{
                            value: `dept ${fmt(data.departmentAvg)}`,
                            position: 'insideTopRight',
                            fill: 'var(--dv3-zone-up)' as any,
                            fontSize: 9,
                            fontFamily: 'Geist Mono, ui-monospace, monospace',
                          }}
                        />
                      )}
                      {data?.companyAvg !== null && data?.companyAvg !== undefined && (
                        <ReferenceLine
                          y={Number(data.companyAvg)}
                          stroke="var(--dv3-zone-warn)"
                          strokeDasharray="2 6"
                          strokeWidth={1}
                          label={{
                            value: `co ${fmt(data.companyAvg)}`,
                            position: 'insideBottomRight',
                            fill: 'var(--dv3-zone-warn)' as any,
                            fontSize: 9,
                            fontFamily: 'Geist Mono, ui-monospace, monospace',
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="var(--dv3-zone-info)"
                        strokeWidth={2.2}
                        fill="url(#kpiAreaFill)"
                        dot={{ r: 3, fill: 'var(--dv3-bg2)', stroke: 'var(--dv3-zone-info)', strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: 'var(--dv3-zone-info)', stroke: 'var(--dv3-bg2)', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mk-empty">
                  {t('analytics.noChart', { defaultValue: 'No data — no evaluations yet' })}
                </div>
              )}
            </div>
          </section>

          {/* PERIOD LEDGER */}
          <section className="dv3-card dv3-col-6 mk-panel">
            <div className="dv3-card-head">
              <span><strong>{t('analytics.ledger', { defaultValue: 'Period ledger' })}</strong></span>
              <span>[ {data?.history.length ?? 0} ]</span>
            </div>
            <div className="mk-panel-body">
              <PeriodLedger history={data?.history ?? []} loading={loading} />
            </div>
          </section>

          {/* CRITERIA */}
          <section className="dv3-card dv3-col-6 mk-panel">
            <div className="dv3-card-head">
              <span><strong>{t('analytics.criteria', { defaultValue: 'Criteria' })}</strong></span>
              <span>[ {Math.min(5, card?.criteria?.length ?? 0)} ]</span>
            </div>
            <div className="mk-panel-body">
              {card?.criteria && card.criteria.length > 0 ? (
                <CriteriaBars items={card.criteria} kg={i18n.language === 'kg'} />
              ) : (
                <div className="mk-empty">
                  {t('analytics.noCriteria', { defaultValue: 'Criteria breakdown appears after period close.' })}
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

// ── PeriodLedger ─────────────────────────────────────────────────────────────
function PeriodLedger({ history, loading }: { history: PeriodScore[]; loading: boolean }) {
  if (loading) {
    return <div className="mk-empty dv3-loading">··</div>
  }
  if (history.length === 0) {
    return <div className="mk-empty">—</div>
  }
  return (
    <div className="mk-ledger">
      {history.slice(0, 6).map((h, idx) => {
        const next = history[idx + 1]
        const d = signedDelta(next ? Number(h.score) - Number(next.score) : null)
        return (
          <div key={h.periodId} className="mk-ledger-row">
            <span className="mk-ledger-idx">{String(idx + 1).padStart(2, '0')}</span>
            <span className="mk-ledger-range">
              {h.startDate}<span className="mk-ledger-sep"> → </span>{h.endDate}
            </span>
            <span className="mk-ledger-type">
              {h.periodType === 'QUARTERLY' ? 'кв.' : h.periodType === 'MONTHLY' ? 'мес.' : '—'}
            </span>
            <span className="mk-ledger-score">{fmt(h.score)}</span>
            <span className={`mk-ledger-delta mk-ledger-delta--${d.tone}`}>{d.txt}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── CriteriaBars ─────────────────────────────────────────────────────────────
function CriteriaBars({ items, kg }: { items: CriteriaScore[]; kg: boolean }) {
  const sorted = [...items].sort((a, b) => b.score - a.score).slice(0, 5)
  return (
    <div className="mk-crit">
      {sorted.map(c => {
        const pct = Math.max(0, Math.min(100, Number(c.score)))
        const tone = pct >= 80 ? 'up' : pct >= 50 ? 'warn' : 'down'
        const d = signedDelta(c.delta)
        return (
          <div key={c.criteriaId} className="mk-crit-row">
            <div className="mk-crit-head">
              <span className="mk-crit-name">
                {kg ? c.nameKg : c.nameRu}
                <span className="mk-crit-weight">w·{Number(c.weight).toFixed(1)}</span>
              </span>
              <span className="mk-crit-score">
                {fmt(c.score)}
                {c.delta !== null && (
                  <span className={`mk-crit-delta mk-crit-delta--${d.tone}`}> {d.txt}</span>
                )}
              </span>
            </div>
            <div className="mk-crit-bar">
              <div className={`mk-crit-fill mk-crit-fill--${tone}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── page-specific css ────────────────────────────────────────────────────────
const MYKPI_CSS = `
.mk-hero-chips {
  display: flex; flex-wrap: wrap; gap: 8px;
  margin-top: 14px;
}
.mk-chip {
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 3px 9px;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg3);
  color: var(--dv3-text3);
}
.mk-chip strong { color: var(--dv3-accent); font-weight: 700; }
.mk-chip--muted { color: var(--dv3-text4); }
.mk-hero-export { margin-top: 14px; }

.mk-panel { background: var(--dv3-bg2); }
.mk-panel-body { padding: 16px 18px 18px; }

.mk-empty {
  font-size: 11px; color: var(--dv3-text3);
  letter-spacing: 0.06em;
  padding: 24px 0;
  text-align: center;
}

/* LEDGER */
.mk-ledger { display: flex; flex-direction: column; }
.mk-ledger-row {
  display: grid;
  grid-template-columns: 28px 1fr auto 64px 70px;
  align-items: center; gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--dv3-border);
  font-variant-numeric: tabular-nums;
}
.mk-ledger-row:last-child { border-bottom: none; }
.mk-ledger-idx { font-size: 10px; color: var(--dv3-text4); }
.mk-ledger-range { font-size: 11px; color: var(--dv3-text2); }
.mk-ledger-sep { color: var(--dv3-text4); }
.mk-ledger-type {
  font-size: 9.5px; color: var(--dv3-text3);
  letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600;
}
.mk-ledger-score {
  font-size: 16px; font-weight: 600;
  color: var(--dv3-text); text-align: right;
  letter-spacing: -0.01em;
}
.mk-ledger-delta { font-size: 11px; text-align: right; font-weight: 600; }
.mk-ledger-delta--up   { color: var(--dv3-zone-up); }
.mk-ledger-delta--down { color: var(--dv3-zone-down); }
.mk-ledger-delta--flat { color: var(--dv3-text3); }

/* CRITERIA */
.mk-crit { display: flex; flex-direction: column; gap: 12px; }
.mk-crit-head {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 8px; margin-bottom: 5px;
}
.mk-crit-name {
  font-size: 12px; color: var(--dv3-text2); font-weight: 500;
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mk-crit-weight {
  font-size: 9.5px; color: var(--dv3-text4);
  margin-left: 8px; letter-spacing: 0.04em;
}
.mk-crit-score {
  font-size: 11px; color: var(--dv3-text); font-weight: 600;
  white-space: nowrap; font-variant-numeric: tabular-nums;
}
.mk-crit-delta--up   { color: var(--dv3-zone-up); }
.mk-crit-delta--down { color: var(--dv3-zone-down); }
.mk-crit-delta--flat { color: var(--dv3-text3); }
.mk-crit-bar {
  position: relative; height: 4px;
  background: var(--dv3-border);
  overflow: hidden;
}
.mk-crit-fill {
  position: absolute; inset: 0 auto 0 0;
  transition: width 720ms cubic-bezier(0.16, 1, 0.3, 1);
}
.mk-crit-fill--up   { background: var(--dv3-zone-up); }
.mk-crit-fill--warn { background: var(--dv3-zone-warn); }
.mk-crit-fill--down { background: var(--dv3-zone-down); }

@media (max-width: 640px) {
  .mk-ledger-row { grid-template-columns: 24px 1fr 56px 60px; }
  .mk-ledger-type { display: none; }
}
`
