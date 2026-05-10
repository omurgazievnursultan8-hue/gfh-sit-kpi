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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

type Urgency = 'urgent' | 'warn' | 'info' | 'neutral'

function urgencyStyle(u: Urgency): { stripe: string; tag: string; tagText: string; tagBorder: string } {
  switch (u) {
    case 'urgent': return {
      stripe: 'var(--danger)',
      tag: 'var(--danger-soft)',
      tagText: 'var(--danger)',
      tagBorder: 'color-mix(in srgb,var(--danger) 30%,transparent)',
    }
    case 'warn': return {
      stripe: 'var(--warn)',
      tag: 'var(--warn-soft)',
      tagText: 'var(--warn)',
      tagBorder: 'color-mix(in srgb,var(--warn) 30%,transparent)',
    }
    case 'info': return {
      stripe: 'var(--info)',
      tag: 'var(--bg-soft,#ebe6db)',
      tagText: 'var(--ink-faint)',
      tagBorder: 'var(--line)',
    }
    default: return {
      stripe: 'var(--line-strong)',
      tag: 'var(--bg-soft,#ebe6db)',
      tagText: 'var(--ink-faint)',
      tagBorder: 'var(--line)',
    }
  }
}

interface ActionCard {
  key: string
  urgency: Urgency
  icon: React.ReactNode
  label: string
  tagText: string
  numContent: React.ReactNode
  footer: React.ReactNode
  onClick: () => void
}

export function DashboardQuickActions({ myTasks, pendingAppeals, activePeriod }: DashboardQuickActionsProps) {
  const navigate = useNavigate()
  const cards: ActionCard[] = []

  // Card 1: Evaluate subordinates
  if (myTasks && activePeriod) {
    const draftCount = myTasks.content.filter(e => e.status === 'DRAFT').length
    if (draftCount > 0) {
      const days = daysUntil(activePeriod.submissionDeadline)
      const urgency: Urgency = days <= 7 ? 'urgent' : days <= 14 ? 'warn' : 'info'
      cards.push({
        key: 'evaluate',
        urgency,
        icon: (
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        ),
        label: 'Оценить сотрудников',
        tagText: `${days} дн.`,
        numContent: (
          <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
            {draftCount}
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-faint)' }}>
              {' / '}{myTasks.totalElements}
            </span>
          </span>
        ),
        footer: (
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
            Финал до <strong style={{ color: 'var(--ink-soft)' }}>{formatDate(activePeriod.submissionDeadline)}</strong>
          </span>
        ),
        onClick: () => navigate('/my-tasks'),
      })
    }
  }

  // Card 2: Pending appeals
  if (pendingAppeals && pendingAppeals.length > 0) {
    const sorted = [...pendingAppeals].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    const nearestDays = daysUntil(sorted[0].deadline)
    const urgency: Urgency = nearestDays <= 3 ? 'urgent' : 'warn'
    const names = sorted.slice(0, 2).map(a => a.evaluateeName.split(' ').slice(0, 2).join(' '))
    const nameStr = names.join(', ') + (pendingAppeals.length > 2 ? '…' : '')

    cards.push({
      key: 'appeals',
      urgency,
      icon: (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      label: 'Апелляции',
      tagText: `${nearestDays} дн.`,
      numContent: (
        <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
          {pendingAppeals.length}
        </span>
      ),
      footer: (
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
          Ждут решения · <strong style={{ color: 'var(--ink-soft)' }}>{nameStr}</strong>
        </span>
      ),
      onClick: () => navigate('/my-tasks'),
    })
  }

  // Card 3: Period deadline (always shown when active period exists)
  if (activePeriod && myTasks) {
    const days = daysUntil(activePeriod.submissionDeadline)
    const total = myTasks.totalElements
    const draftCount = myTasks.content.filter(e => e.status === 'DRAFT').length
    const completed = total - draftCount
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const MINI_CIRC = 2 * Math.PI * 16
    const miniArc = (pct / 100) * MINI_CIRC

    cards.push({
      key: 'deadline',
      urgency: 'info',
      icon: (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      label: `${activePeriod.type === 'QUARTERLY' ? 'Квартал' : activePeriod.type === 'MONTHLY' ? 'Месяц' : 'Год'} · Дедлайн`,
      tagText: 'Информация',
      numContent: (
        <div className="flex items-center gap-3 mb-1">
          <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}>
            <svg viewBox="0 0 40 40" width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={20} cy={20} r={16} stroke="var(--bg-soft,#ebe6db)" strokeWidth={4} fill="none"/>
              <circle
                cx={20} cy={20} r={16}
                stroke="var(--accent-2)" strokeWidth={4} fill="none" strokeLinecap="round"
                strokeDasharray={`${miniArc} ${MINI_CIRC}`}
                strokeDashoffset={0}
              />
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center font-mono font-semibold"
              style={{ fontSize: 10, color: 'var(--accent)' }}
            >
              {pct}%
            </div>
          </div>
          <div>
            <div className="font-display" style={{ fontSize: 26, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {formatDate(activePeriod.submissionDeadline)}
            </div>
            <div className="font-mono uppercase tracking-wider mt-0.5" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              Через {days} дней
            </div>
          </div>
        </div>
      ),
      footer: (
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
          {total > 0
            ? <><strong style={{ color: 'var(--ink-soft)' }}>{completed} из {total}</strong> оценено</>
            : 'Оценки ещё не начаты · период активен'}
        </span>
      ),
      onClick: () => navigate('/my-tasks'),
    })
  }

  if (cards.length === 0) return null

  return (
    <div className="mb-5">
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
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cards.length}, 1fr)` }}
      >
        {cards.map(card => {
          const s = urgencyStyle(card.urgency)
          return (
            <div
              key={card.key}
              className="relative overflow-hidden rounded-lg cursor-pointer transition-all hover:-translate-y-px"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line-soft)',
                padding: '15px 17px',
                boxShadow: 'var(--shadow-sm)',
              }}
              onClick={card.onClick}
            >
              <div
                className="absolute top-0 left-0 right-0"
                style={{ height: 3, background: s.stripe }}
              />
              <div className="flex items-center justify-between gap-2 mb-3">
                <div
                  className="flex items-center gap-1.5 font-medium"
                  style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}
                >
                  <span style={{ color: 'var(--ink-faint)' }}>{card.icon}</span>
                  {card.label}
                </div>
                <span
                  className="font-mono font-semibold uppercase tracking-wide flex-shrink-0"
                  style={{
                    fontSize: 9.5,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: s.tag,
                    color: s.tagText,
                    border: `1px solid ${s.tagBorder}`,
                  }}
                >
                  {card.tagText}
                </span>
              </div>
              <div className="mb-1.5">{card.numContent}</div>
              <div>{card.footer}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
