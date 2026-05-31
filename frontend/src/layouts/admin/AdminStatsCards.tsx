import { useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import type { AdminStats } from '@/features/admin'

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
  const { t } = useTranslation()

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

  const strongSoft = <strong style={{ color: 'var(--ink-soft)' }} />
  const strongWarn = <strong style={{ color: 'var(--warn)' }} />

  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="font-mono uppercase font-semibold tracking-widest"
          style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
        >
          {t('admin.statCards.systemState')}
        </span>
      </div>

      <div
        className="grid gap-3 admin-stats-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
      >
        {/* Users */}
        <StatCardShell
          title={t('admin.statCards.users.title')}
          pill={{ kind: 'ok', text: t('admin.statCards.users.pillActive') }}
          accent={{ text: `${activeUsers}/${totalUsers}`, color: SAFE }}
          stripe={SAFE}
          to="/admin/users"
          footer={
            <Trans
              i18nKey="admin.statCards.users.footer"
              values={{ total: totalUsers, active: activeUsers }}
              components={[<span />, strongSoft, strongSoft]}
            />
          }
        >
          <ProgressBar
            label={t('admin.statCards.users.progressLabel')}
            percent={activePct}
            caption={`${Math.round(activePct)}%`}
            color={SAFE}
          />
        </StatCardShell>

        {/* Evaluations */}
        <StatCardShell
          title={t('admin.statCards.evaluations.title')}
          pill={{
            kind: pendingEvals > 0 ? 'warn' : 'ok',
            text: pendingEvals > 0
              ? t('admin.statCards.evaluations.pillInProgress')
              : t('admin.statCards.evaluations.pillDone'),
          }}
          accent={{ text: `${completedEvals}/${totalEvals}`, color: pendingEvals > 0 ? WARN : SAFE }}
          stripe={pendingEvals > 0 ? WARN : SAFE}
          footer={
            totalEvals > 0 ? (
              <Trans
                i18nKey="admin.statCards.evaluations.footer"
                values={{ pending: pendingEvals, completed: completedEvals }}
                components={[<span />, strongSoft, strongSoft]}
              />
            ) : (
              <>{t('admin.statCards.evaluations.footerEmpty')}</>
            )
          }
        >
          {totalEvals > 0 ? (
            <ProgressBar
              label={t('admin.statCards.evaluations.progressLabel')}
              percent={completedPct}
              caption={`${Math.round(completedPct)}%`}
              color={completedPct >= 80 ? SAFE : completedPct >= 40 ? WARN : DANGER}
            />
          ) : (
            <div className="font-mono mb-2.5" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              {t('admin.statCards.evaluations.noData')}
            </div>
          )}
        </StatCardShell>

        {/* Periods */}
        <StatCardShell
          title={t('admin.statCards.periods.title')}
          pill={{
            kind: periods > 0 ? 'ok' : 'idle',
            text: periods > 0
              ? t('admin.statCards.periods.pillRunning')
              : t('admin.statCards.periods.pillNone'),
          }}
          accent={{ text: String(periods), color: periods > 0 ? SAFE : 'var(--ink-faint)' }}
          stripe={periods > 0 ? SAFE : 'var(--line-strong)'}
          to="/admin/periods"
          footer={
            periods > 0 ? (
              <Trans
                i18nKey="admin.statCards.periods.footer"
                values={{ count: periods }}
                components={[<span />, strongSoft]}
              />
            ) : (
              <>{t('admin.statCards.periods.footerEmpty')}</>
            )
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {periods}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {t('admin.statCards.periods.subtitle')}
            </span>
          </div>
        </StatCardShell>

        {/* Appeals */}
        <StatCardShell
          title={t('admin.statCards.appeals.title')}
          pill={{
            kind: appeals > 0 ? 'danger' : 'idle',
            text: appeals > 0
              ? t('admin.statCards.appeals.pillOpen')
              : t('admin.statCards.appeals.pillNone'),
          }}
          accent={{ text: String(appeals), color: appeals > 0 ? DANGER : 'var(--ink-faint)' }}
          stripe={appeals > 0 ? DANGER : 'var(--line-strong)'}
          footer={
            appeals > 0 ? (
              <Trans
                i18nKey="admin.statCards.appeals.footer"
                values={{ count: appeals }}
                components={[<span />, strongSoft]}
              />
            ) : (
              <>{t('admin.statCards.appeals.footerEmpty')}</>
            )
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {appeals}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {t('admin.statCards.appeals.subtitle')}
            </span>
          </div>
        </StatCardShell>

        {/* Audit */}
        <StatCardShell
          title={t('admin.statCards.audit.title')}
          pill={{ kind: 'info', text: t('admin.statCards.audit.pill') }}
          accent={{ text: String(audit24), color: INFO }}
          stripe={INFO}
          to="/admin/audit"
          footer={<>{t('admin.statCards.audit.footer')}</>}
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {audit24}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {t('admin.statCards.audit.subtitle')}
            </span>
          </div>
        </StatCardShell>

        {/* Criteria */}
        <StatCardShell
          title={t('admin.statCards.criteria.title')}
          pill={{
            kind: criteria > 0 ? 'ok' : 'idle',
            text: criteria > 0
              ? t('admin.statCards.criteria.pillActive')
              : t('admin.statCards.criteria.pillNone'),
          }}
          accent={{ text: String(criteria), color: criteria > 0 ? SAFE : 'var(--ink-faint)' }}
          stripe={criteria > 0 ? SAFE : 'var(--line-strong)'}
          to="/admin/criteria"
          footer={
            criteria > 0 ? (
              <Trans
                i18nKey="admin.statCards.criteria.footer"
                values={{ count: criteria }}
                components={[<span />, strongSoft]}
              />
            ) : (
              <>{t('admin.statCards.criteria.footerEmpty')}</>
            )
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {criteria}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {t('admin.statCards.criteria.subtitle')}
            </span>
          </div>
        </StatCardShell>

        {/* Delegations */}
        <StatCardShell
          title={t('admin.statCards.delegations.title')}
          pill={{
            kind: delegationsExpiring > 0 ? 'warn' : delegations > 0 ? 'ok' : 'idle',
            text: delegationsExpiring > 0
              ? t('admin.statCards.delegations.pillExpiring')
              : delegations > 0
                ? t('admin.statCards.delegations.pillActive')
                : t('admin.statCards.delegations.pillNone'),
          }}
          accent={{
            text: String(delegations),
            color: delegationsExpiring > 0 ? WARN : delegations > 0 ? SAFE : 'var(--ink-faint)',
          }}
          stripe={delegationsExpiring > 0 ? WARN : delegations > 0 ? SAFE : 'var(--line-strong)'}
          to="/admin/delegations"
          footer={
            delegationsExpiring > 0 ? (
              <Trans
                i18nKey="admin.statCards.delegations.footerExpiring"
                values={{ count: delegationsExpiring }}
                components={[<span />, strongWarn]}
              />
            ) : delegations > 0 ? (
              <Trans
                i18nKey="admin.statCards.delegations.footerActive"
                values={{ count: delegations }}
                components={[<span />, strongSoft]}
              />
            ) : (
              <>{t('admin.statCards.delegations.footerEmpty')}</>
            )
          }
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {delegations}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {t('admin.statCards.delegations.subtitle')}
            </span>
          </div>
        </StatCardShell>

        {/* Org units */}
        <StatCardShell
          title={t('admin.statCards.org.title')}
          pill={{ kind: 'info', text: t('admin.statCards.org.pill') }}
          accent={{ text: String(orgUnits), color: INFO }}
          stripe={INFO}
          to="/admin/org"
          footer={<>{t('admin.statCards.org.footer')}</>}
        >
          <div className="flex items-baseline gap-3">
            <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {orgUnits}
            </span>
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {t('admin.statCards.org.subtitle')}
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
