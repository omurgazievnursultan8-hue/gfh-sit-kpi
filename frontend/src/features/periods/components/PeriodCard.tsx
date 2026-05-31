import type { Period, PeriodProgress, PeriodType, PeriodStatus } from '../api'

interface PeriodCardProps {
  period: Period
  progress: PeriodProgress | undefined
  busy: boolean
  onActivate: (id: number) => void
  onClose: (id: number) => void
}

const TYPE_LABEL: Record<PeriodType, string> = {
  MONTHLY: 'Ежемесячная',
  QUARTERLY: 'Квартальная',
  ANNUAL: 'Годовая',
}

interface StatusVisual { text: string; fg: string; bg: string; border: string; stripe: string }
const STATUS_VISUAL: Record<PeriodStatus, StatusVisual> = {
  ACTIVE: { text: 'Активный',   fg: '#2f9e6d', bg: 'rgba(120,200,150,0.14)', border: 'rgba(120,200,150,0.32)', stripe: 'var(--accent-2,#2f9e6d)' },
  DRAFT:  { text: 'Черновик',   fg: '#9c7416', bg: 'rgba(200,150,40,0.14)',  border: 'rgba(200,150,40,0.32)',  stripe: 'var(--warn,#c89628)' },
  CLOSED: { text: 'Завершён',   fg: '#6b6b6b', bg: 'rgba(120,120,120,0.12)', border: 'rgba(120,120,120,0.32)', stripe: 'var(--line-strong,#bdb6a6)' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function periodTitle(p: Period): string {
  const d = new Date(p.startDate)
  const y = d.getFullYear()
  if (p.type === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1} ${y}`
  if (p.type === 'MONTHLY') return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return `${y}`
}

export function PeriodCard({ period, progress, busy, onActivate, onClose }: PeriodCardProps) {
  const v = STATUS_VISUAL[period.status]
  const showProgress = period.status === 'ACTIVE' || period.status === 'CLOSED'
  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const pctColor = pct >= 80 ? 'var(--accent-2,#2f9e6d)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)'

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
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: v.stripe }} />

      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {periodTitle(period)}
          </span>
          <span
            className="font-mono font-semibold uppercase tracking-widest"
            style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: v.bg, color: v.fg, border: `1px solid ${v.border}` }}
          >
            {v.text}
          </span>
          {period.autoCreated && (
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-soft,#ebe6db)', color: 'var(--ink-faint)' }}
            >
              авто
            </span>
          )}
        </div>
        <span className="font-mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
          {TYPE_LABEL[period.type]}
        </span>
      </div>

      {showProgress && (
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>
              Заполнено
            </span>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
              {progress === undefined ? '…' : total === 0 ? 'нет оценок' : `${completed} / ${total} · ${pct}%`}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-full" style={{ height: 6, background: 'var(--bg-soft,#ebe6db)' }}>
            <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: pctColor, borderRadius: 999 }} />
          </div>
        </div>
      )}

      <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
        {formatDate(period.startDate)} → {formatDate(period.endDate)}
        {' · дедлайн '}
        <strong style={{ color: 'var(--ink-soft)' }}>{formatDate(period.submissionDeadline)}</strong>
      </div>

      {period.status === 'DRAFT' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onActivate(period.id)}
          className="mt-3 font-mono uppercase tracking-widest disabled:opacity-50"
          style={{ fontSize: 10.5, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: 'var(--accent-2,#2f9e6d)', color: '#fff' }}
        >
          Активировать
        </button>
      )}
      {period.status === 'ACTIVE' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onClose(period.id)}
          className="mt-3 font-mono uppercase tracking-widest disabled:opacity-50"
          style={{ fontSize: 10.5, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
        >
          Закрыть период
        </button>
      )}
    </div>
  )
}
