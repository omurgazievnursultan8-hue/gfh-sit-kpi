import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { analyticsApi, PersonalAnalytics, ScorecardResponse, PeriodScore, CriteriaScore } from './analyticsApi'
import { ExportButtons } from '../../components/ExportButtons'
import { KpiRing } from '../dashboard/KpiRing'

/* ────────────────────────────────────────────────────────────────────────────
 * "Мой KPI" — visual language matched to the main Dashboard:
 *   cream paper bg · deep-green gradient hero w/ blueprint grid + gold ring ·
 *   white surface cards w/ 3px stripe top · JetBrains Mono labels · ▲/▼ deltas.
 * ────────────────────────────────────────────────────────────────────────── */

function useCountUp(target: number | null, duration = 900) {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  useEffect(() => {
    if (target === null || Number.isNaN(target)) { setValue(0); return }
    let raf = 0
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t
      const p = Math.min(1, (t - startRef.current) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); startRef.current = null }
  }, [target, duration])
  return value
}

function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(digits)
}

function signedDelta(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return { txt: '—', tone: 'flat' as const }
  const v = Number(n)
  if (Math.abs(v) < 0.05) return { txt: '±0.0', tone: 'flat' as const }
  return { txt: `${v > 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}`, tone: (v > 0 ? 'up' : 'down') as 'up' | 'down' }
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

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

function todayLine(): string {
  const now = new Date()
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${datePart} · ${hh}:${mm}`
}

function periodTick(periodType: string, startDate: string): string {
  const d = new Date(startDate)
  if (periodType === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1} ${String(d.getFullYear()).slice(2)}`
  if (periodType === 'MONTHLY') return d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')
  return `${d.getFullYear()}`
}

/* ────────────────────────────────────────────────────────────────────────── */

export function PersonalDashboardPage() {
  const [data, setData] = useState<PersonalAnalytics | null>(null)
  const [card, setCard] = useState<ScorecardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([analyticsApi.personal(), analyticsApi.scorecard()])
      .then(([p, s]) => { setData(p); setCard(s) })
      .finally(() => setLoading(false))
  }, [])

  const sortedHistory = useMemo(() => {
    if (!data) return []
    // chronological for chart; data.history seems newest-first from API
    return [...data.history].sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [data])

  const chartData = useMemo(() => sortedHistory.map(h => ({
    name: periodTick(h.periodType, h.startDate),
    score: Number(Number(h.score).toFixed(2)),
  })), [sortedHistory])

  const animatedScore = useCountUp(data?.currentScore ?? null)

  if (loading) {
    return (
      <div style={{ padding: '28px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="font-mono uppercase tracking-widest animate-pulse"
             style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          Загрузка…
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div style={{ padding: '28px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="font-display" style={{ fontSize: 18, color: 'var(--danger)' }}>
          Ошибка загрузки
        </div>
      </div>
    )
  }

  const currentScore = data.currentScore
  const grade = card?.grade || deriveGrade(currentScore)
  const rank = card?.rank ?? null
  const vsGoal = card?.vsGoal ?? null
  const vsPrev = card?.vsPrevPeriod ?? null
  const periodLabel = card?.periodLabel ?? 'Текущий период'

  const myMinusDept = currentScore !== null && data.departmentAvg !== null
    ? Number(currentScore) - Number(data.departmentAvg) : null
  const myMinusCo = currentScore !== null && data.companyAvg !== null
    ? Number(currentScore) - Number(data.companyAvg) : null

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <style>{`
        @keyframes kpi-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .k-rise { opacity: 0; animation: kpi-rise 620ms cubic-bezier(.22,.61,.36,1) forwards }
        @media (max-width: 640px) { .kpi-hero-grid { grid-template-columns: 1fr !important; gap: 20px !important } }
        @media (max-width: 880px) { .kpi-stats-grid { grid-template-columns: 1fr !important } .kpi-bottom-grid { grid-template-columns: 1fr !important } }
      `}</style>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl mb-6 k-rise"
        style={{
          background: 'linear-gradient(135deg, #0e2724 0%, #0d4d3f 55%, #1a7558 100%)',
          color: '#ecf2f0',
          padding: '28px 32px',
          border: '1px solid #06120f',
          boxShadow: 'var(--shadow-md)',
          animationDelay: '0ms',
        }}
      >
        {/* blueprint grid */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 24px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,.020) 0 1px,transparent 1px 24px)',
        }} />
        {/* gold radial */}
        <div className="absolute pointer-events-none" style={{
          top: -80, right: -80, width: 320, height: 320,
          background: 'radial-gradient(circle,rgba(168,133,43,.14),transparent 60%)',
        }} />

        <div className="relative grid items-center gap-8 kpi-hero-grid"
             style={{ gridTemplateColumns: '1fr auto' }}>
          {/* left — text */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block rounded-full animate-pulse"
                    style={{ width: 6, height: 6, background: 'var(--gold)' }} />
              <span className="font-mono uppercase tracking-widest"
                    style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.7)' }}>
                {todayLine()}
              </span>
            </div>

            <h1 className="font-display mb-1.5"
                style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em', color: '#ecf2f0' }}>
              Мой <span style={{ color: 'var(--gold)' }}>KPI</span>
              <span style={{ color: 'rgba(245,236,210,0.55)', fontSize: 18, fontWeight: 400, marginLeft: 10 }}>
                · {data.fullName}
              </span>
            </h1>

            <div className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 620, lineHeight: 1.55 }}>
              <p style={{ margin: 0 }}>
                {timeGreeting()}. Текущий рейтинг —{' '}
                <strong style={{ color: '#f5ecd2', fontWeight: 600 }}>
                  {currentScore === null ? 'нет данных' : `${currentScore.toFixed(1)} / 100`}
                </strong>
                {myMinusDept !== null && (
                  <> · разрыв с отделом{' '}
                    <strong style={{
                      color: myMinusDept >= 0 ? '#9bd6b1' : '#f0a4a4',
                      fontWeight: 600,
                    }}>
                      {myMinusDept >= 0 ? '+' : '−'}{Math.abs(myMinusDept).toFixed(1)} пт
                    </strong>
                  </>
                )}
                {rank !== null && (
                  <> · позиция <strong style={{ color: '#f5ecd2', fontWeight: 600 }}>№{rank}</strong></>
                )}
                .
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono flex-wrap"
                 style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.65)' }}>
              <span className="font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{
                      fontSize: 10,
                      background: 'rgba(120,200,150,0.14)',
                      color: '#7fd4a3',
                      border: '1px solid rgba(120,200,150,0.32)',
                    }}>
                {periodLabel}
              </span>
              <span>Grade <strong style={{ color: 'var(--gold)', fontWeight: 700 }}>{grade}</strong></span>
              <span>·</span>
              <span>{sortedHistory.length} {sortedHistory.length === 1 ? 'период' : 'периодов'} в истории</span>
            </div>

            <div className="mt-4">
              <ExportButtons type="personal" />
            </div>
          </div>

          {/* right — KPI ring */}
          <div className="flex items-center justify-end">
            <KpiRing
              score={currentScore !== null ? Number(animatedScore.toFixed(0)) : null}
              periodShort={card?.periodLabel?.split(' ')[0] || null}
            />
          </div>
        </div>
      </div>

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 mb-5 kpi-stats-grid k-rise"
           style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', animationDelay: '90ms' }}>
        <StatCard
          label="Текущий рейтинг"
          mainText={fmt(currentScore)}
          mainColor="var(--ink)"
          stripe="var(--accent-2)"
          delta={signedDelta(vsPrev)}
          deltaSuffix={vsPrev !== null ? 'vs прошлый' : undefined}
          footer={`из 100 · grade ${grade}`}
        />
        <StatCard
          label="Средний по отделу"
          mainText={fmt(data.departmentAvg)}
          mainColor="var(--ink)"
          stripe="var(--info)"
          delta={signedDelta(myMinusDept)}
          deltaSuffix={myMinusDept !== null ? 'вы — отдел' : undefined}
          footer="средний балл коллег"
        />
        <StatCard
          label="Средний по компании"
          mainText={fmt(data.companyAvg)}
          mainColor="var(--ink)"
          stripe="var(--gold)"
          delta={signedDelta(myMinusCo)}
          deltaSuffix={myMinusCo !== null ? 'вы — компания' : undefined}
          footer="общий уровень"
        />
        <StatCard
          label="vs. цель"
          mainText={vsGoal !== null ? (vsGoal >= 0 ? '+' : '−') + Math.abs(vsGoal).toFixed(1) : '—'}
          mainColor={vsGoal === null ? 'var(--ink-faint)' : vsGoal >= 0 ? 'var(--accent-2)' : 'var(--danger)'}
          stripe={vsGoal === null ? 'var(--line-strong)' : vsGoal >= 0 ? 'var(--accent-2)' : 'var(--danger)'}
          delta={{ txt: rank !== null ? `№${rank}` : '—', tone: 'flat' }}
          deltaSuffix={rank !== null ? 'ранг' : undefined}
          footer={vsGoal === null ? 'нет цели для периода' : 'отклонение от цели'}
        />
      </div>

      {/* ── CHART CARD ─────────────────────────────────────────────────────── */}
      <Card title="Динамика рейтинга"
            pill="Аналитика"
            pillSpec={{ bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7', border: 'rgba(120,150,200,0.32)' }}
            stripe="var(--info)"
            rightMetric={`${chartData.length} обс. · шкала 0–100`}
            className="mb-5 k-rise"
            animationDelay={180}>
        {chartData.length > 1 ? (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 28, bottom: 4, left: -10 }}>
                <defs>
                  <linearGradient id="kpiAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#4a73c7" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#4a73c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'var(--ink-faint)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--line)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: 'var(--ink-faint)' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--ink-soft)', strokeDasharray: '2 4' }}
                  contentStyle={{
                    background: 'var(--ink)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 12px',
                    color: 'var(--bg)',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}
                  itemStyle={{ color: '#f5ecd2' }}
                  formatter={(v: number) => [v.toFixed(1), 'балл']}
                />
                {data.departmentAvg !== null && (
                  <ReferenceLine
                    y={Number(data.departmentAvg)}
                    stroke="var(--accent-2)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{
                      value: `отдел ${fmt(data.departmentAvg)}`,
                      position: 'insideTopRight',
                      fill: 'var(--accent-2)' as any,
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                )}
                {data.companyAvg !== null && (
                  <ReferenceLine
                    y={Number(data.companyAvg)}
                    stroke="var(--gold)"
                    strokeDasharray="2 6"
                    strokeWidth={1}
                    label={{
                      value: `компания ${fmt(data.companyAvg)}`,
                      position: 'insideBottomRight',
                      fill: 'var(--gold)' as any,
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#4a73c7"
                  strokeWidth={2.2}
                  fill="url(#kpiAreaFill)"
                  dot={{ r: 3, fill: 'var(--surface)', stroke: '#4a73c7', strokeWidth: 2 }}
                  activeDot={{ r: 5, fill: '#4a73c7', stroke: 'var(--surface)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="font-mono text-center py-10"
               style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>
            Нет данных — оценки ещё не проводились
          </div>
        )}
      </Card>

      {/* ── BOTTOM ROW — period ledger + criteria ──────────────────────────── */}
      <div className="grid gap-3 kpi-bottom-grid k-rise"
           style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', animationDelay: '280ms' }}>

        <Card title="Журнал периодов"
              pill="История"
              pillSpec={{ bg: 'rgba(168,133,43,0.14)', fg: 'var(--gold)', border: 'rgba(168,133,43,0.32)' }}
              stripe="var(--gold)"
              rightMetric={`${sortedHistory.length} записей`}>
          <PeriodLedger history={data.history} />
        </Card>

        {card?.criteria && card.criteria.length > 0 ? (
          <Card title="Критерии"
                pill="Разбор"
                pillSpec={{ bg: 'rgba(26,117,88,0.14)', fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.32)' }}
                stripe="var(--accent-2)"
                rightMetric={`топ-${Math.min(5, card.criteria.length)}`}>
            <CriteriaBars items={card.criteria} />
          </Card>
        ) : (
          <Card title="Критерии"
                pill="Разбор"
                pillSpec={{ bg: 'rgba(26,117,88,0.14)', fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.32)' }}
                stripe="var(--accent-2)"
                rightMetric="—">
            <div className="font-mono"
                 style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              Разбор по критериям появится после закрытия периода.
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * Reusable card shell — matches DashboardInsights CardShell visual contract.
 * ────────────────────────────────────────────────────────────────────────── */

interface PillSpec { bg: string; fg: string; border: string }

function Card({
  title, pill, pillSpec, stripe, rightMetric, children, className = '', animationDelay,
}: {
  title: string
  pill?: string
  pillSpec?: PillSpec
  stripe: string
  rightMetric?: string
  children: React.ReactNode
  className?: string
  animationDelay?: number
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '16px 18px',
        boxShadow: 'var(--shadow-sm)',
        animationDelay: animationDelay !== undefined ? `${animationDelay}ms` : undefined,
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: stripe }} />
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display truncate"
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {title}
          </span>
          {pill && pillSpec && (
            <span className="font-mono font-semibold uppercase tracking-widest"
                  style={{
                    fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
                    background: pillSpec.bg, color: pillSpec.fg,
                    border: `1px solid ${pillSpec.border}`,
                  }}>
              {pill}
            </span>
          )}
        </div>
        {rightMetric && (
          <span className="font-mono font-semibold"
                style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            {rightMetric}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function StatCard({
  label, mainText, mainColor, stripe, delta, deltaSuffix, footer,
}: {
  label: string
  mainText: string
  mainColor: string
  stripe: string
  delta: { txt: string; tone: 'up' | 'down' | 'flat' }
  deltaSuffix?: string
  footer: string
}) {
  const deltaColor =
    delta.tone === 'up' ? 'var(--accent-2)' :
    delta.tone === 'down' ? 'var(--danger)' :
    'var(--ink-faint)'
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: stripe }} />
      <div className="font-mono uppercase tracking-widest mb-2"
           style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display tabular-nums"
              style={{ fontSize: 30, fontWeight: 600, color: mainColor, lineHeight: 1, letterSpacing: '-0.01em' }}>
          {mainText}
        </span>
        <span className="font-mono tabular-nums" style={{ fontSize: 11, color: deltaColor, fontWeight: 600 }}>
          {delta.txt}
        </span>
      </div>
      {deltaSuffix && (
        <div className="font-mono mt-0.5"
             style={{ fontSize: 9.5, color: 'var(--ink-dim)', letterSpacing: '0.04em' }}>
          {deltaSuffix}
        </div>
      )}
      <div className="font-mono mt-2"
           style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
        {footer}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function PeriodLedger({ history }: { history: PeriodScore[] }) {
  // history newest-first per API; deltas computed against next (older) entry.
  if (history.length === 0) {
    return (
      <div className="font-mono"
           style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
        Нет закрытых периодов.
      </div>
    )
  }
  return (
    <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
      {history.slice(0, 6).map((h, idx) => {
        const next = history[idx + 1]
        const d = signedDelta(next ? Number(h.score) - Number(next.score) : null)
        const deltaColor =
          d.tone === 'up' ? 'var(--accent-2)' :
          d.tone === 'down' ? 'var(--danger)' :
          'var(--ink-faint)'
        return (
          <div key={h.periodId} className="grid grid-cols-12 items-center gap-2 py-2"
               style={{ borderColor: 'var(--line-soft)' }}>
            <div className="col-span-1 font-mono tabular-nums"
                 style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
              {String(idx + 1).padStart(2, '0')}
            </div>
            <div className="col-span-5 font-mono"
                 style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
              {h.startDate}<span style={{ color: 'var(--ink-dim)' }}> → </span>{h.endDate}
            </div>
            <div className="col-span-2 font-mono uppercase tracking-wider"
                 style={{ fontSize: 9.5, color: 'var(--ink-faint)', fontWeight: 600 }}>
              {h.periodType === 'QUARTERLY' ? 'кв.' : h.periodType === 'MONTHLY' ? 'мес.' : '—'}
            </div>
            <div className="col-span-2 font-display tabular-nums text-right"
                 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
              {fmt(h.score)}
            </div>
            <div className="col-span-2 font-mono tabular-nums text-right"
                 style={{ fontSize: 11, color: deltaColor, fontWeight: 600 }}>
              {d.txt}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function CriteriaBars({ items }: { items: CriteriaScore[] }) {
  // sort by score desc, take up to 5 — high impact summary
  const sorted = [...items].sort((a, b) => b.score - a.score).slice(0, 5)
  return (
    <div>
      {sorted.map((c) => {
        const pct = Math.max(0, Math.min(100, Number(c.score)))
        const color = pct >= 80 ? 'var(--accent-2)' : pct >= 60 ? 'var(--gold)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)'
        const d = signedDelta(c.delta)
        const deltaColor =
          d.tone === 'up' ? 'var(--accent-2)' :
          d.tone === 'down' ? 'var(--danger)' :
          'var(--ink-faint)'
        return (
          <div key={c.criteriaId} className="mb-2.5 last:mb-0">
            <div className="flex items-baseline justify-between mb-1 gap-2">
              <span className="truncate"
                    style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>
                {c.nameRu}
                <span className="font-mono ml-2"
                      style={{ fontSize: 9.5, color: 'var(--ink-dim)' }}>
                  w·{Number(c.weight).toFixed(1)}
                </span>
              </span>
              <span className="font-mono tabular-nums whitespace-nowrap"
                    style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
                {fmt(c.score)}
                {c.delta !== null && (
                  <span className="ml-1" style={{ color: deltaColor }}>{d.txt}</span>
                )}
              </span>
            </div>
            <div className="relative overflow-hidden rounded-full"
                 style={{ height: 6, background: 'var(--bg-soft, #ebe6db)' }}>
              <div className="absolute inset-y-0 left-0 transition-all"
                   style={{ width: `${pct}%`, background: color, borderRadius: 999 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
