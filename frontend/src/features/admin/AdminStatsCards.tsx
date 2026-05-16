import { useNavigate } from 'react-router-dom'
import type { AdminStats } from './adminApi'

interface AdminStatsCardsProps {
  stats: AdminStats | null
}

type PillKind = 'ok' | 'info' | 'warn' | 'danger' | 'idle'

function pillStyle(kind: PillKind): { bg: string; fg: string; border: string } {
  switch (kind) {
    case 'ok':     return { bg: 'rgba(120,200,150,0.14)', fg: '#2f9e6d', border: 'rgba(120,200,150,0.32)' }
    case 'info':   return { bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7', border: 'rgba(120,150,200,0.32)' }
    case 'warn':   return { bg: 'var(--warn-soft)',       fg: 'var(--warn)',   border: 'color-mix(in srgb,var(--warn) 30%,transparent)' }
    case 'danger': return { bg: 'var(--danger-soft)',     fg: 'var(--danger)', border: 'color-mix(in srgb,var(--danger) 30%,transparent)' }
    default:       return { bg: 'var(--bg-soft,#ebe6db)', fg: 'var(--ink-faint)', border: 'var(--line)' }
  }
}

function StatusPill({ kind, text }: { kind: PillKind; text: string }) {
  const s = pillStyle(kind)
  return (
    <span
      className="font-mono font-semibold uppercase tracking-widest"
      style={{
        fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
        background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
      }}
    >
      {text}
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

interface StatCardShellProps {
  title: string
  pill: { kind: PillKind; text: string }
  accent: { text: string; color: string }
  stripe: string
  to?: string
  children: React.ReactNode
  footer: React.ReactNode
}

function StatCardShell({ title, pill, accent, stripe, to, children, footer }: StatCardShellProps) {
  const navigate = useNavigate()
  const clickable = !!to
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${clickable ? 'cursor-pointer transition-all hover:-translate-y-px' : ''}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '15px 17px',
        boxShadow: 'var(--shadow-sm)',
      }}
      onClick={clickable ? () => navigate(to!) : undefined}
    >
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: 3, background: stripe }}
      />

      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {title}
          </span>
          <StatusPill kind={pill.kind} text={pill.text} />
        </div>
        <span
          className="font-mono font-semibold"
          style={{ fontSize: 11, color: accent.color }}
        >
          {accent.text}
        </span>
      </div>

      {children}

      <div
        className="font-mono mt-3"
        style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
      >
        {footer}
      </div>
    </div>
  )
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  const totalUsers = stats?.totalUsers ?? 0
  const activeUsers = stats?.activeUsers ?? 0
  const activePct = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0

  const totalEvals = stats?.totalEvaluations ?? 0
  const pendingEvals = stats?.pendingEvaluations ?? 0
  const completedEvals = Math.max(0, totalEvals - pendingEvals)
  const completedPct = totalEvals > 0 ? (completedEvals / totalEvals) * 100 : 0

  const appeals = stats?.openAppeals ?? 0
  const periods = stats?.activeEvaluationPeriods ?? 0
  const audit24 = stats?.auditLogsLast24h ?? 0
  const criteria = stats?.criteriaActive ?? 0
  const delegations = stats?.delegationsActive ?? 0
  const delegationsExpiring = stats?.delegationsExpiringSoon ?? 0
  const orgUnits = stats?.orgUnitsCount ?? 0

  const SAFE = 'var(--accent-2, #2f9e6d)'
  const INFO = '#4a73c7'
  const WARN = 'var(--warn)'
  const DANGER = 'var(--danger)'

  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="font-mono uppercase font-semibold tracking-widest"
          style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
        >
          Состояние системы
        </span>
      </div>

      <div
        className="grid gap-3 admin-stats-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
      >
        {/* Users */}
        <StatCardShell
          title="Пользователи"
          pill={{ kind: 'ok', text: 'Активные' }}
          accent={{ text: `${activeUsers}/${totalUsers}`, color: SAFE }}
          stripe={SAFE}
          to="/admin/users"
          footer={
            <>
              Зарегистрировано <strong style={{ color: 'var(--ink-soft)' }}>{totalUsers}</strong> · активных <strong style={{ color: 'var(--ink-soft)' }}>{activeUsers}</strong>
            </>
          }
        >
          <ProgressBar
            label="Активность"
            percent={activePct}
            caption={`${Math.round(activePct)}%`}
            color={SAFE}
          />
        </StatCardShell>

        {/* Evaluations */}
        <StatCardShell
          title="Оценки"
          pill={{ kind: pendingEvals > 0 ? 'warn' : 'ok', text: pendingEvals > 0 ? 'В работе' : 'Готово' }}
          accent={{ text: `${completedEvals}/${totalEvals}`, color: pendingEvals > 0 ? WARN : SAFE }}
          stripe={pendingEvals > 0 ? WARN : SAFE}
          footer={
            totalEvals > 0 ? (
              <>
                В ожидании <strong style={{ color: 'var(--ink-soft)' }}>{pendingEvals}</strong> · завершено <strong style={{ color: 'var(--ink-soft)' }}>{completedEvals}</strong>
              </>
            ) : (
              <>Оценки ещё не создавались</>
            )
          }
        >
          {totalEvals > 0 ? (
            <ProgressBar
              label="Заполнено"
              percent={completedPct}
              caption={`${Math.round(completedPct)}%`}
              color={completedPct >= 80 ? SAFE : completedPct >= 40 ? WARN : DANGER}
            />
          ) : (
            <div className="font-mono mb-2.5" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              Нет данных по оценкам.
            </div>
          )}
        </StatCardShell>

        {/* Periods */}
        <StatCardShell
          title="Периоды"
          pill={{ kind: periods > 0 ? 'ok' : 'idle', text: periods > 0 ? 'Идут' : 'Нет' }}
          accent={{ text: String(periods), color: periods > 0 ? SAFE : 'var(--ink-faint)' }}
          stripe={periods > 0 ? SAFE : 'var(--line-strong)'}
          to="/admin/periods"
          footer={
            periods > 0 ? (
              <>Активных периодов оценки: <strong style={{ color: 'var(--ink-soft)' }}>{periods}</strong></>
            ) : (
              <>Создайте новый период для запуска оценок.</>
            )
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {periods}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              месячных и квартальных
            </span>
          </div>
        </StatCardShell>

        {/* Appeals */}
        <StatCardShell
          title="Апелляции"
          pill={{ kind: appeals > 0 ? 'danger' : 'idle', text: appeals > 0 ? 'Открыто' : 'Нет' }}
          accent={{ text: String(appeals), color: appeals > 0 ? DANGER : 'var(--ink-faint)' }}
          stripe={appeals > 0 ? DANGER : 'var(--line-strong)'}
          footer={
            appeals > 0 ? (
              <>Требуют решения · <strong style={{ color: 'var(--ink-soft)' }}>{appeals}</strong></>
            ) : (
              <>Открытых апелляций нет.</>
            )
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {appeals}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              ждут рассмотрения
            </span>
          </div>
        </StatCardShell>

        {/* Audit */}
        <StatCardShell
          title="Аудит"
          pill={{ kind: 'info', text: '24ч' }}
          accent={{ text: String(audit24), color: INFO }}
          stripe={INFO}
          to="/admin/audit"
          footer={<>Событий за последние 24 часа</>}
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {audit24}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              записей
            </span>
          </div>
        </StatCardShell>

        {/* Criteria */}
        <StatCardShell
          title="Критерии"
          pill={{ kind: criteria > 0 ? 'ok' : 'idle', text: criteria > 0 ? 'Активные' : 'Нет' }}
          accent={{ text: String(criteria), color: criteria > 0 ? SAFE : 'var(--ink-faint)' }}
          stripe={criteria > 0 ? SAFE : 'var(--line-strong)'}
          to="/admin/criteria"
          footer={
            criteria > 0 ? (
              <>Действующих критериев оценки: <strong style={{ color: 'var(--ink-soft)' }}>{criteria}</strong></>
            ) : (
              <>Добавьте критерии для запуска оценок.</>
            )
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {criteria}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              в каталоге
            </span>
          </div>
        </StatCardShell>

        {/* Delegations */}
        <StatCardShell
          title="Делегирования"
          pill={{
            kind: delegationsExpiring > 0 ? 'warn' : delegations > 0 ? 'ok' : 'idle',
            text: delegationsExpiring > 0 ? 'Истекают' : delegations > 0 ? 'Активные' : 'Нет',
          }}
          accent={{
            text: String(delegations),
            color: delegationsExpiring > 0 ? WARN : delegations > 0 ? SAFE : 'var(--ink-faint)',
          }}
          stripe={delegationsExpiring > 0 ? WARN : delegations > 0 ? SAFE : 'var(--line-strong)'}
          to="/admin/delegations"
          footer={
            delegationsExpiring > 0 ? (
              <>Истекают за 7 дней · <strong style={{ color: 'var(--warn)' }}>{delegationsExpiring}</strong></>
            ) : delegations > 0 ? (
              <>Активных передач полномочий: <strong style={{ color: 'var(--ink-soft)' }}>{delegations}</strong></>
            ) : (
              <>Делегирований нет.</>
            )
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {delegations}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              действуют сейчас
            </span>
          </div>
        </StatCardShell>

        {/* Org units */}
        <StatCardShell
          title="Оргструктура"
          pill={{ kind: 'info', text: 'Узлы' }}
          accent={{ text: String(orgUnits), color: INFO }}
          stripe={INFO}
          to="/admin/org"
          footer={<>Подразделений и должностей в дереве</>}
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {orgUnits}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              узлов структуры
            </span>
          </div>
        </StatCardShell>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .admin-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
