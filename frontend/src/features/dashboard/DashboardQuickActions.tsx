import { useNavigate } from 'react-router-dom'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import type { AppealPending, Period } from '../periods/periodsApi'

interface DashboardQuickActionsProps {
  myTasks: PageResponse<Evaluation> | null
  pendingAppeals: AppealPending[] | null
  activePeriod: Period | null
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
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

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

type Urgency = 'safe' | 'warn' | 'danger' | 'info'

function urgencyColor(u: Urgency): string {
  if (u === 'danger') return 'var(--danger)'
  if (u === 'warn') return 'var(--warn)'
  if (u === 'info') return 'var(--info, #4a73c7)'
  return 'var(--accent-2, #2f9e6d)'
}

function urgencyFromDays(d: number): Urgency {
  if (d <= 3) return 'danger'
  if (d <= 7) return 'warn'
  return 'safe'
}

interface PillSpec {
  bg: string; fg: string; border: string; text: string
}
function pillFor(kind: 'action' | 'decision'): PillSpec {
  if (kind === 'action') return {
    bg: 'rgba(200,140,90,0.14)', fg: '#b06a2c', border: 'rgba(200,140,90,0.32)', text: 'К действию',
  }
  return {
    bg: 'rgba(200,100,100,0.14)', fg: '#b04a4a', border: 'rgba(200,100,100,0.32)', text: 'Решение',
  }
}

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
        <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>
          {label}
        </span>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
          {caption}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-full" style={{ height: 6, background: 'var(--bg-soft,#ebe6db)' }}>
        <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${clamped}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  )
}

interface ActionCard {
  key: string
  stripeColor: string
  title: string
  pill: PillSpec
  rightMetric: { text: string; color: string }
  body: React.ReactNode
  footer: React.ReactNode
  onClick: () => void
}

function CardShell({ card }: { card: ActionCard }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg cursor-pointer transition-all hover:-translate-y-px"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '15px 17px',
        boxShadow: 'var(--shadow-sm)',
      }}
      onClick={card.onClick}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: card.stripeColor }} />

      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display truncate" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {card.title}
          </span>
          <Pill spec={card.pill} />
        </div>
        <span className="font-mono font-semibold flex-shrink-0" style={{ fontSize: 11, color: card.rightMetric.color }}>
          {card.rightMetric.text}
        </span>
      </div>

      {card.body}

      <div className="font-mono mt-3" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
        {card.footer}
      </div>
    </div>
  )
}

export function DashboardQuickActions({ myTasks, pendingAppeals, activePeriod }: DashboardQuickActionsProps) {
  const navigate = useNavigate()
  const cards: ActionCard[] = []

  // ─── Card 1 · Evaluate subordinates ────────────────────────────────────
  if (myTasks && activePeriod) {
    const total = myTasks.totalElements
    const drafts = myTasks.content.filter(e => e.status === 'DRAFT').length
    if (drafts > 0) {
      const completed = total - drafts
      const fillPct = total > 0 ? (completed / total) * 100 : 0
      const fillColor = fillPct >= 80 ? 'var(--accent-2, #2f9e6d)' : fillPct >= 40 ? 'var(--warn)' : 'var(--danger)'

      const start = new Date(activePeriod.startDate)
      const deadline = new Date(activePeriod.submissionDeadline)
      const span = Math.max(1, daysBetween(start, deadline))
      const elapsed = Math.max(0, Math.min(span, daysBetween(start, new Date())))
      const timePct = (elapsed / span) * 100

      const days = daysUntil(activePeriod.submissionDeadline)
      const urgency = urgencyFromDays(days)
      const stripe = urgencyColor(urgency)
      const dayWord = plural(days, ['день', 'дня', 'дней'])

      cards.push({
        key: 'evaluate',
        stripeColor: stripe,
        title: `Оценить · ${periodLabel(activePeriod)}`,
        pill: pillFor('action'),
        rightMetric: { text: `${days} ${dayWord}`, color: stripe },
        body: (
          <>
            <ProgressBar label="Заполнено" percent={fillPct} caption={`${completed} / ${total}`} color={fillColor} />
            <ProgressBar label="До дедлайна" percent={timePct} caption={`${Math.round(timePct)}%`} color={stripe} />
          </>
        ),
        footer: (
          <>
            Осталось <strong style={{ color: 'var(--ink-soft)' }}>{drafts}</strong>
            {' · дедлайн '}
            <strong style={{ color: 'var(--ink-soft)' }}>{formatDate(activePeriod.submissionDeadline)}</strong>
          </>
        ),
        onClick: () => navigate('/my-tasks'),
      })
    }
  }

  // ─── Card 2 · Pending appeals ──────────────────────────────────────────
  if (pendingAppeals && pendingAppeals.length > 0) {
    const sorted = [...pendingAppeals].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    const nearestDays = daysUntil(sorted[0].deadline)
    const urgency: Urgency = nearestDays <= 3 ? 'danger' : 'warn'
    const stripe = urgencyColor(urgency)
    const dayWord = plural(nearestDays, ['день', 'дня', 'дней'])

    const total = sorted.length
    const urgent = sorted.filter(a => daysUntil(a.deadline) <= 3).length
    const urgentPct = total > 0 ? (urgent / total) * 100 : 0
    const urgentColor = urgent > 0 ? 'var(--danger)' : 'var(--accent-2, #2f9e6d)'

    const preview = sorted.slice(0, 2)
    const overflow = total - preview.length

    cards.push({
      key: 'appeals',
      stripeColor: stripe,
      title: 'Апелляции',
      pill: pillFor('decision'),
      rightMetric: { text: `${nearestDays} ${dayWord}`, color: stripe },
      body: (
        <>
          <ProgressBar
            label="Срочные"
            percent={urgentPct}
            caption={`${urgent} / ${total}`}
            color={urgentColor}
          />
          <ul className="mt-2 mb-0 p-0 list-none">
            {preview.map(a => {
              const d = daysUntil(a.deadline)
              const dotColor = d <= 3 ? 'var(--danger)' : d <= 7 ? 'var(--warn)' : 'var(--accent-2, #2f9e6d)'
              return (
                <li key={a.id} className="flex items-center gap-2 mb-1 last:mb-0" style={{ fontSize: 11.5 }}>
                  <span className="inline-block rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: dotColor }} />
                  <span className="truncate" style={{ color: 'var(--ink-soft)' }}>{a.evaluateeName}</span>
                  <span className="font-mono ml-auto flex-shrink-0" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                    {formatDate(a.deadline)}
                  </span>
                </li>
              )
            })}
            {overflow > 0 && (
              <li className="font-mono mt-1" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                + ещё {overflow}
              </li>
            )}
          </ul>
        </>
      ),
      footer: (
        <>
          {urgent > 0
            ? <>Срочных <strong style={{ color: 'var(--danger)' }}>{urgent}</strong> · всего {total}</>
            : <>Все апелляции в зелёной зоне</>}
        </>
      ),
      onClick: () => navigate('/my-tasks'),
    })
  }

  if (cards.length === 0) return null

  return (
    <div className="mb-5" style={{ maxWidth: 760 }}>
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="font-mono uppercase font-semibold tracking-widest"
          style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
        >
          К действию · {cards.length}
        </span>
        <a
          href="/my-tasks"
          onClick={e => { e.preventDefault(); navigate('/my-tasks') }}
          className="font-mono font-semibold"
          style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.04em' }}
        >
          Все задачи →
        </a>
      </div>

      <div
        className="grid gap-3 quick-actions-grid"
        style={{ gridTemplateColumns: `repeat(${Math.min(2, cards.length)}, minmax(0, 1fr))` }}
      >
        {cards.map(c => <CardShell key={c.key} card={c} />)}
      </div>

      <style>{`
        @media (max-width: 900px) { .quick-actions-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; } }
        @media (max-width: 600px) { .quick-actions-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
