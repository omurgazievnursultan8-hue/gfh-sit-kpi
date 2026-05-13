import type { Period } from '../periods/periodsApi'
import type { PendingSummary } from '../analytics/analyticsApi'

interface DashboardPeriodStripProps {
  activePeriods: Period[]
  pendingSummary: PendingSummary | null
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function periodLabel(p: Period): string {
  const d = new Date(p.startDate)
  const y = d.getFullYear()
  if (p.type === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1} ${y}`
  if (p.type === 'MONTHLY') return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return `${y}`
}

// Russian plural agreement.
function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

type Urgency = 'safe' | 'warn' | 'danger'

function urgencyColor(u: Urgency): string {
  if (u === 'danger') return 'var(--danger)'
  if (u === 'warn') return 'var(--warn)'
  return 'var(--accent-2, #2f9e6d)'
}

function urgencyFromDays(days: number): Urgency {
  if (days <= 3) return 'danger'
  if (days <= 7) return 'warn'
  return 'safe'
}

interface ProgressBarProps {
  label: string
  percent: number
  caption: string
  color: string
}

function ProgressBar({ label, percent, caption, color }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-baseline justify-between mb-1">
        <span
          className="font-mono uppercase tracking-wider"
          style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}
        >
          {label}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}
        >
          {caption}
        </span>
      </div>
      <div
        className="relative overflow-hidden rounded-full"
        style={{ height: 6, background: 'var(--bg-soft,#ebe6db)' }}
      >
        <div
          className="absolute inset-y-0 left-0 transition-all"
          style={{ width: `${clamped}%`, background: color, borderRadius: 999 }}
        />
      </div>
    </div>
  )
}

function StatusPill({ kind }: { kind: 'active' | 'upcoming' | 'idle' }) {
  const map = {
    active: { bg: 'rgba(120,200,150,0.14)', fg: '#2f9e6d', border: 'rgba(120,200,150,0.32)', text: 'Активный' },
    upcoming: { bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7', border: 'rgba(120,150,200,0.32)', text: 'Запланирован' },
    idle: { bg: 'var(--bg-soft,#ebe6db)', fg: 'var(--ink-faint)', border: 'var(--line)', text: 'Нет периода' },
  }[kind]
  return (
    <span
      className="font-mono font-semibold uppercase tracking-widest"
      style={{
        fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
        background: map.bg, color: map.fg, border: `1px solid ${map.border}`,
      }}
    >
      {map.text}
    </span>
  )
}

function ActivePeriodCard({ period, pendingSummary }: { period: Period; pendingSummary: PendingSummary | null }) {
  const now = new Date()
  const start = new Date(period.startDate)
  const end = new Date(period.endDate)
  const deadline = new Date(period.submissionDeadline)

  const totalSpan = Math.max(1, daysBetween(start, end))
  const elapsed = Math.max(0, Math.min(totalSpan, daysBetween(start, now)))
  const timePct = (elapsed / totalSpan) * 100

  const daysLeft = Math.max(0, daysBetween(now, deadline))
  const urgency = urgencyFromDays(daysLeft)
  const timeColor = urgencyColor(urgency)

  const total = pendingSummary?.totalEvaluations ?? 0
  const completed = pendingSummary?.completedEvaluations ?? 0
  const subPct = total > 0 ? (completed / total) * 100 : 0
  const subColor = subPct >= 80
    ? 'var(--accent-2, #2f9e6d)'
    : subPct >= 40 ? 'var(--warn)' : 'var(--danger)'

  const dayWord = plural(daysLeft, ['день', 'дня', 'дней'])

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '15px 17px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: 3, background: timeColor }}
      />

      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {periodLabel(period)}
          </span>
          <StatusPill kind="active" />
        </div>
        <span
          className="font-mono font-semibold"
          style={{ fontSize: 11, color: timeColor }}
        >
          {daysLeft} {dayWord}
        </span>
      </div>

      <ProgressBar
        label="Время"
        percent={timePct}
        caption={`${Math.round(timePct)}%`}
        color={timeColor}
      />
      {pendingSummary && (
        <ProgressBar
          label="Заполнено"
          percent={subPct}
          caption={total > 0 ? `${completed} / ${total}` : '—'}
          color={subColor}
        />
      )}

      <div
        className="font-mono mt-3"
        style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
      >
        {formatDate(period.startDate)} → {formatDate(period.endDate)}
        {' · дедлайн '}
        <strong style={{ color: 'var(--ink-soft)' }}>{formatDate(period.submissionDeadline)}</strong>
      </div>
    </div>
  )
}

function IdleCard() {
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px dashed var(--line)',
        padding: '15px 17px',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-faint)' }}>
          Активных периодов нет
        </span>
        <StatusPill kind="idle" />
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.55 }}>
        Ожидайте создания нового периода администратором.
      </div>
    </div>
  )
}

export function DashboardPeriodStrip({ activePeriods, pendingSummary }: DashboardPeriodStripProps) {
  // Pending summary is global, not per-period — show only on the first card to avoid duplication.
  const cols = Math.min(2, Math.max(1, activePeriods.length))
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="font-mono uppercase font-semibold tracking-widest"
          style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
        >
          Активные периоды оценки
        </span>
        {activePeriods.length > 0 && (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--ink-faint)' }}
          >
            {activePeriods.length}
          </span>
        )}
      </div>

      {activePeriods.length === 0 ? (
        <IdleCard />
      ) : (
        <div
          className="grid gap-3 period-strip-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {activePeriods.map((p, i) => (
            <ActivePeriodCard
              key={p.id}
              period={p}
              pendingSummary={i === 0 ? pendingSummary : null}
            />
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .period-strip-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
