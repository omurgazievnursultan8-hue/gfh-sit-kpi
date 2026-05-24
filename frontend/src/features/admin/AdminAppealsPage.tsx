import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { appealsApi, type AdminAppeal, type AppealStatus } from '../appeals/appealsApi'
import { formatPeriodRange } from '../evaluations/components/periodFormat'
import { periodsApi, type Period } from '../periods/periodsApi'
import { usersApi, type User } from '../users/usersApi'
import { usePageTitle } from '../../context/PageContext'

const PANEL_KEY = 'gfh_admin_appeals'

const STATUS_ORDER: AppealStatus[] = ['PENDING', 'UPHELD', 'OVERTURNED', 'AUTO_AGREED']

const STATUS_TONE: Record<AppealStatus, { bg: string; fg: string; label: string }> = {
  PENDING:     { bg: 'rgba(200,150,40,0.12)',  fg: 'var(--warn, #c89628)',   label: 'Ожидает' },
  UPHELD:      { bg: 'rgba(58,163,122,0.12)',  fg: 'var(--accent-2)',        label: 'Поддержана' },
  OVERTURNED:  { bg: 'rgba(220,80,80,0.12)',   fg: 'var(--danger)',          label: 'Отклонена' },
  AUTO_AGREED: { bg: 'var(--surface)',         fg: 'var(--ink-faint)',       label: 'Авто-согласие' },
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function periodFromAppeal(a: AdminAppeal, byId: Map<number, Period>): string {
  if (a.periodId == null) return '—'
  const p = byId.get(a.periodId)
  if (p) return formatPeriodRange(p, a.periodId)
  // Fallback to inline fields if list endpoint hadn't loaded yet.
  if (a.periodStartDate && a.periodEndDate) {
    return formatPeriodRange(
      {
        id: a.periodId,
        type: a.periodType ?? 'MONTHLY',
        startDate: a.periodStartDate,
        endDate: a.periodEndDate,
        submissionDeadline: '',
        status: 'CLOSED',
        autoCreated: false,
        createdAt: '',
      },
      a.periodId,
    )
  }
  return `Период #${a.periodId}`
}

function AppealStatusBadge({ status }: { status: AppealStatus }) {
  const tone = STATUS_TONE[status]
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: '3px 8px',
        borderRadius: 6,
        background: tone.bg,
        color: tone.fg,
        textTransform: 'uppercase',
        display: 'inline-block',
      }}
    >
      {tone.label}
    </span>
  )
}

export function AdminAppealsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  usePageTitle('admin.appeals')

  const [rows, setRows] = useState<AdminAppeal[]>([])
  const [periodById, setPeriodById] = useState<Map<number, Period>>(new Map())
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      appealsApi.adminList({ page: 0, size: 500, sort: 'createdAt,desc' }),
      periodsApi.list(),
      usersApi.list(0, 500),
    ]).then(([list, periods, usrs]) => {
      if (list.status === 'fulfilled') setRows(list.value.content)
      if (periods.status === 'fulfilled') {
        setPeriodById(new Map(periods.value.map(p => [p.id, p])))
      }
      if (usrs.status === 'fulfilled') setUsers(usrs.value.content)
    }).finally(() => setLoading(false))
  }, [])

  const periodOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Все периоды' }]
    const sorted = [...periodById.values()].sort((a, b) => b.startDate.localeCompare(a.startDate))
    for (const p of sorted) opts.push({ value: String(p.id), label: formatPeriodRange(p, p.id) })
    return opts
  }, [periodById])

  const userOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Все' }]
    const sorted = [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'))
    for (const u of sorted) opts.push({ value: String(u.id), label: u.fullName })
    return opts
  }, [users])

  const FILTERS: FilterDef[] = useMemo(() => [
    { key: 'period',    label: 'Период',    type: 'select', options: periodOptions },
    { key: 'evaluatee', label: 'Сотрудник', type: 'select', options: userOptions },
    { key: 'evaluator', label: 'Оценщик',   type: 'select', options: userOptions },
    {
      key: 'status', label: 'Статус', type: 'select',
      options: [
        { value: '', label: 'Все статусы' },
        ...STATUS_ORDER.map(s => ({ value: s, label: STATUS_TONE[s].label })),
      ],
    },
  ], [periodOptions, userOptions])

  const counts = useMemo(() => {
    const c: Record<AppealStatus, number> = {
      PENDING: 0, UPHELD: 0, OVERTURNED: 0, AUTO_AGREED: 0,
    }
    for (const r of rows) c[r.status] += 1
    return c
  }, [rows])

  const columns: Column<AdminAppeal>[] = [
    {
      key: 'period', header: 'Период', sortable: true,
      render: (a) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {periodFromAppeal(a, periodById)}
        </span>
      ),
    },
    {
      key: 'evaluatee', header: 'Сотрудник', sortable: true,
      render: (a) => <span style={{ fontSize: 13, color: 'var(--ink)' }}>{a.evaluateeName}</span>,
    },
    {
      key: 'evaluator', header: 'Оценщик', sortable: true,
      render: (a) => (
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{a.evaluatorName ?? '—'}</span>
      ),
    },
    {
      key: 'reason', header: 'Причина',
      render: (a) => (
        <span
          style={{
            fontSize: 12,
            color: 'var(--ink-dim)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            maxWidth: 360,
          }}
        >
          {a.reason}
        </span>
      ),
    },
    {
      key: 'createdAt', header: 'Подана', sortable: true,
      render: (a) => (
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {fmtDateShort(a.createdAt)}
        </span>
      ),
    },
    {
      key: 'deadline', header: 'Срок', sortable: true,
      render: (a) => (
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {fmtDateShort(a.deadline)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (a) => <AppealStatusBadge status={a.status} />,
    },
    {
      key: 'finalScore', header: 'Итог', sortable: true, align: 'right',
      render: (a) => (
        <span
          className="font-display tabular-nums"
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}
        >
          {a.finalScore != null ? Number(a.finalScore).toFixed(1) : '—'}
        </span>
      ),
    },
  ]

  const searchText = (a: AdminAppeal) =>
    `${a.evaluateeName} ${a.evaluatorName ?? ''} ${a.reason} ${periodFromAppeal(a, periodById)}`

  const clientFilter = (a: AdminAppeal, v: Record<string, string>) => {
    if (v.period && String(a.periodId ?? '') !== v.period) return false
    if (v.evaluatee && String(a.evaluateeId) !== v.evaluatee) return false
    if (v.evaluator && String(a.evaluatorId ?? '') !== v.evaluator) return false
    if (v.status && a.status !== v.status) return false
    return true
  }

  const comparator = (key: string) => (a: AdminAppeal, b: AdminAppeal): number => {
    switch (key) {
      case 'evaluatee':  return a.evaluateeName.localeCompare(b.evaluateeName, 'ru')
      case 'evaluator':  return (a.evaluatorName ?? '').localeCompare(b.evaluatorName ?? '', 'ru')
      case 'status':     return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      case 'finalScore': return (a.finalScore ?? -1) - (b.finalScore ?? -1)
      case 'deadline':   return (a.deadline ?? '').localeCompare(b.deadline ?? '')
      case 'period': {
        const pa = a.periodId != null ? periodById.get(a.periodId) : undefined
        const pb = b.periodId != null ? periodById.get(b.periodId) : undefined
        if (pa && pb) return pa.startDate.localeCompare(pb.startDate)
        return (a.periodId ?? 0) - (b.periodId ?? 0)
      }
      case 'createdAt':
      default: return a.createdAt.localeCompare(b.createdAt)
    }
  }

  const renderCard = (a: AdminAppeal): ReactNode => (
    <div
      onClick={() => navigate(`/evaluations/${a.evaluationId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          navigate(`/evaluations/${a.evaluationId}`)
        }
      }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 16, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {a.evaluateeName}
          </div>
          <div className="truncate" style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
            {periodFromAppeal(a, periodById)} · {a.evaluatorName ?? '—'}
          </div>
        </div>
        <AppealStatusBadge status={a.status} />
      </div>
      <div style={{
        fontSize: 12, color: 'var(--ink-dim)',
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {a.reason}
      </div>
      <div className="flex items-end justify-between gap-3"
           style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
          {fmtDateShort(a.createdAt)} → {fmtDateShort(a.deadline)}
        </span>
        <span className="font-display tabular-nums"
              style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
          {a.finalScore != null ? Number(a.finalScore).toFixed(1) : '—'}
        </span>
      </div>
    </div>
  )

  const total = rows.length

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <div className="dv3-terminal">
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
          <StatPill label="Всего" value={total} />
          <StatPill label="Ожидают"     value={counts.PENDING}     tone="warn" />
          <StatPill label="Поддержано"  value={counts.UPHELD}      tone="ok" />
          <StatPill label="Отклонено"   value={counts.OVERTURNED}  tone="danger" />
          <StatPill label="Авто"        value={counts.AUTO_AGREED} />
        </div>
        <DataPanel<AdminAppeal>
          mode="client"
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          loading={loading}
          caption={t('admin.appeals')}
          empty="Нет апелляций"
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по сотруднику, оценщику, причине"
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'createdAt', dir: 'desc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          panelStorageKey={PANEL_KEY}
          columnConfig
          onRowClick={(a) => navigate(`/evaluations/${a.evaluationId}`)}
        />
      </div>
    </div>
  )
}

function StatPill({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'danger' | 'ok' }) {
  const color =
    tone === 'warn'   ? 'var(--warn, #c89628)' :
    tone === 'danger' ? 'var(--danger)' :
    tone === 'ok'     ? 'var(--accent-2)' :
                        'var(--ink-soft)'
  return (
    <span
      className="font-mono"
      style={{
        fontSize: 11, padding: '6px 10px', borderRadius: 8,
        background: 'var(--surface)', border: '1px solid var(--line)',
        display: 'inline-flex', alignItems: 'baseline', gap: 6,
      }}
    >
      <span style={{ color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </span>
  )
}
