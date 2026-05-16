import { useNavigate } from 'react-router-dom'
import type { PersonalAnalytics, ScorecardResponse } from '../analytics/analyticsApi'

interface DashboardInsightsProps {
  analytics: PersonalAnalytics | null
  scorecard: ScorecardResponse | null
}

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

function fmtScore(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toFixed(1)
}

function periodTick(periodType: string, startDate: string): string {
  const d = new Date(startDate)
  if (periodType === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1}`
  if (periodType === 'MONTHLY') return d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')
  return `${d.getFullYear()}`
}

interface PillSpec { bg: string; fg: string; border: string; text: string }
function Pill({ spec }: { spec: PillSpec }) {
  return (
    <span
      className="font-mono font-semibold uppercase tracking-widest"
      style={{
        fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
        background: spec.bg, color: spec.fg, border: `1px solid ${spec.border}`,
      }}
    >
      {spec.text}
    </span>
  )
}
const PILL_ANALYTICS: PillSpec = {
  bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7', border: 'rgba(120,150,200,0.32)', text: 'Аналитика',
}
const STRIPE_INFO = 'var(--info, #4a73c7)'

interface ProgressBarProps { label: string; percent: number; caption: string; color: string }
function ProgressBar({ label, percent, caption, color }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>{label}</span>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>{caption}</span>
      </div>
      <div className="relative overflow-hidden rounded-full" style={{ height: 6, background: 'var(--bg-soft,#ebe6db)' }}>
        <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${clamped}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  )
}

interface CardShellProps {
  title: string
  rightMetric: { text: string; color: string }
  body: React.ReactNode
  footer: React.ReactNode
  onClick: () => void
}
function CardShell({ title, rightMetric, body, footer, onClick }: CardShellProps) {
  return (
    <div
      className="relative overflow-hidden rounded-lg cursor-pointer transition-all hover:-translate-y-px"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '15px 17px',
        boxShadow: 'var(--shadow-sm)',
      }}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: STRIPE_INFO }} />
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display truncate" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{title}</span>
          <Pill spec={PILL_ANALYTICS} />
        </div>
        <span className="font-mono font-semibold flex-shrink-0" style={{ fontSize: 11, color: rightMetric.color }}>
          {rightMetric.text}
        </span>
      </div>
      {body}
      <div className="font-mono mt-3" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{footer}</div>
    </div>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────
function Sparkline({ values, ticks, current }: { values: number[]; ticks: string[]; current: number | null }) {
  const W = 320, H = 56, PAD_X = 4, PAD_Y = 6
  if (values.length === 0) return null
  const max = Math.max(...values, current ?? 0)
  const min = Math.min(...values, current ?? max)
  const range = Math.max(0.01, max - min)
  const innerW = W - PAD_X * 2
  const innerH = H - PAD_Y * 2
  const step = values.length > 1 ? innerW / (values.length - 1) : 0
  const pts = values.map((v, i) => ({
    x: PAD_X + i * step,
    y: PAD_Y + innerH - ((v - min) / range) * innerH,
  }))
  const path = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
  const areaPath = `${path} L${pts[pts.length - 1].x},${H - PAD_Y} L${pts[0].x},${H - PAD_Y} Z`

  return (
    <div className="mb-2">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a73c7" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4a73c7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#spark-fill)" />
        <path d={path} fill="none" stroke="#4a73c7" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3 : 1.8}
            fill={i === pts.length - 1 ? '#4a73c7' : 'var(--surface)'}
            stroke="#4a73c7" strokeWidth={i === pts.length - 1 ? 0 : 1.4} />
        ))}
      </svg>
      <div className="flex justify-between mt-1 font-mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>
        {ticks.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  )
}

// ─── History card ─────────────────────────────────────────────────────────
function HistoryCard({ analytics, onClick }: { analytics: PersonalAnalytics; onClick: () => void }) {
  const hist = analytics.history.slice(-6)
  const values = hist.map(h => h.score)
  const ticks = hist.map(h => periodTick(h.periodType, h.startDate))
  const current = analytics.currentScore
  const prev = values.length >= 2 ? values[values.length - 2] : null
  const delta = current !== null && prev !== null ? current - prev : null
  const deltaColor = delta === null ? 'var(--ink-faint)' : delta >= 0 ? 'var(--accent-2,#2f9e6d)' : 'var(--danger)'
  const deltaText = delta === null ? '—' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}`

  return (
    <CardShell
      title="История оценок"
      rightMetric={{ text: deltaText, color: deltaColor }}
      body={
        hist.length === 0
          ? <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>Нет закрытых периодов.</div>
          : (
            <>
              <Sparkline values={values} ticks={ticks} current={current} />
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
                  {fmtScore(current)}
                </span>
                <span className="font-mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                  {analytics.departmentAvg !== null && <>отдел {fmtScore(analytics.departmentAvg)} · </>}
                  {analytics.companyAvg !== null && <>компания {fmtScore(analytics.companyAvg)}</>}
                </span>
              </div>
            </>
          )
      }
      footer={
        hist.length > 0
          ? <>За последние <strong style={{ color: 'var(--ink-soft)' }}>{hist.length}</strong> {plural(hist.length, ['период', 'периода', 'периодов'])}</>
          : <>Данные появятся после закрытия первого периода</>
      }
      onClick={onClick}
    />
  )
}

// ─── Scorecard / criterion breakdown card ─────────────────────────────────
function ScorecardCard({ scorecard, onClick }: { scorecard: ScorecardResponse; onClick: () => void }) {
  // Score is normalized 0-100 raw KPI value; weight ≠ max ceiling.
  const sorted = [...scorecard.criteria].sort((a, b) => b.score - a.score)
  const best = sorted[0] ?? null
  const worst = sorted.length > 1 ? sorted[sorted.length - 1] : null
  const bestPct = best ? best.score : 0
  const worstPct = worst ? worst.score : 0
  const fmtDelta = (d: number | null) => d === null ? '' : ` ${d >= 0 ? '▲' : '▼'}${Math.abs(d).toFixed(1)}`

  const deltaVal = scorecard.vsPrevPeriod
  const deltaColor = deltaVal === null ? 'var(--ink-faint)' : deltaVal >= 0 ? 'var(--accent-2,#2f9e6d)' : 'var(--danger)'
  const deltaText = deltaVal === null
    ? scorecard.grade
    : `${deltaVal >= 0 ? '▲' : '▼'} ${Math.abs(deltaVal).toFixed(1)}`

  return (
    <CardShell
      title={`Оценка · ${scorecard.periodLabel}`}
      rightMetric={{ text: deltaText, color: deltaColor }}
      body={
        <>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display" style={{ fontSize: 26, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {fmtScore(scorecard.totalScore)}
            </span>
            <span
              className="font-mono uppercase tracking-widest"
              style={{
                fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
                background: 'rgba(168,133,43,0.14)', color: 'var(--gold,#a8852b)',
                border: '1px solid rgba(168,133,43,0.32)', fontWeight: 600,
              }}
            >
              {scorecard.grade}
            </span>
            {scorecard.rank !== null && (
              <span className="font-mono ml-auto" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                ранг #{scorecard.rank}
              </span>
            )}
          </div>
          {best && (
            <ProgressBar
              label={`▲ ${best.nameRu}`}
              percent={bestPct}
              caption={`${best.score.toFixed(1)}${fmtDelta(best.delta)}`}
              color="var(--accent-2,#2f9e6d)"
            />
          )}
          {worst && worst.criteriaId !== best?.criteriaId && (
            <ProgressBar
              label={`▼ ${worst.nameRu}`}
              percent={worstPct}
              caption={`${worst.score.toFixed(1)}${fmtDelta(worst.delta)}`}
              color={worstPct < 40 ? 'var(--danger)' : 'var(--warn)'}
            />
          )}
        </>
      }
      footer={
        <>
          {scorecard.prevPeriodLabel
            ? <>vs {scorecard.prevPeriodLabel}</>
            : <>Первый закрытый период</>}
          {scorecard.antiBonusTotal !== 0 && (
            <> · антибонус <strong style={{ color: 'var(--danger)' }}>−{Math.abs(scorecard.antiBonusTotal).toFixed(1)}</strong></>
          )}
        </>
      }
      onClick={onClick}
    />
  )
}

export function DashboardInsights({ analytics, scorecard }: DashboardInsightsProps) {
  const navigate = useNavigate()
  const cards: React.ReactNode[] = []
  if (analytics && analytics.history.length > 0) {
    cards.push(<HistoryCard key="history" analytics={analytics} onClick={() => navigate('/my-history')} />)
  }
  if (scorecard) {
    cards.push(<ScorecardCard key="scorecard" scorecard={scorecard} onClick={() => navigate('/my-history')} />)
  }
  if (cards.length === 0) return null

  return (
    <div className="mb-5" style={{ maxWidth: 760 }}>
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="font-mono uppercase font-semibold tracking-widest"
          style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
        >
          Аналитика · {cards.length}
        </span>
        <a
          href="/my-history"
          onClick={e => { e.preventDefault(); navigate('/my-history') }}
          className="font-mono font-semibold"
          style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.04em' }}
        >
          Детали →
        </a>
      </div>
      <div
        className="grid gap-3 insights-grid"
        style={{ gridTemplateColumns: `repeat(${Math.min(2, cards.length)}, minmax(0, 1fr))` }}
      >
        {cards}
      </div>
      <style>{`
        @media (max-width: 720px) { .insights-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
