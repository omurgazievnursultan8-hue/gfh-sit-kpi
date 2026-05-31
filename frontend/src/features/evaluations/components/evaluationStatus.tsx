import type { EvaluationStatus } from '../api'

export const STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Ожидает реакции',
  ACKNOWLEDGED: 'Подтверждено',
  APPEALED: 'Апелляция',
  CLOSED: 'Завершено',
}

export interface StatusVisual { bg: string; fg: string; border: string; stripe: string }

export const STATUS_VISUALS: Record<EvaluationStatus, StatusVisual> = {
  DRAFT:        { bg: 'rgba(120,120,120,0.12)', fg: '#6b6b6b',        border: 'rgba(120,120,120,0.32)', stripe: 'var(--line-strong)' },
  SUBMITTED:    { bg: 'rgba(200,150,40,0.14)',  fg: '#9c7416',        border: 'rgba(200,150,40,0.32)',  stripe: 'var(--warn, #c89628)' },
  ACKNOWLEDGED: { bg: 'rgba(26,117,88,0.14)',   fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.32)',  stripe: 'var(--accent-2)' },
  APPEALED:     { bg: 'rgba(200,80,60,0.14)',   fg: '#b04d3a',        border: 'rgba(200,80,60,0.32)',   stripe: 'var(--danger)' },
  CLOSED:       { bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7',        border: 'rgba(120,150,200,0.32)', stripe: 'var(--info)' },
}

// Filter-chip / sort order for statuses.
export const STATUS_ORDER: EvaluationStatus[] = ['SUBMITTED', 'APPEALED', 'DRAFT', 'ACKNOWLEDGED', 'CLOSED']

export function EvaluationStatusBadge({ status }: { status: EvaluationStatus }) {
  const v = STATUS_VISUALS[status]
  return (
    <span
      className="font-mono font-semibold uppercase tracking-widest"
      style={{
        fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
        background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
