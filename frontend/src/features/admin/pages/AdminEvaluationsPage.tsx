import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { DASHBOARD_CSS } from '../../dashboard/styles'
import { DataPanel, type Column, type FilterDef } from '@/shared/datapanel/DataPanel'
import { evaluationsApi, type Evaluation, type EvaluationStatus } from '@/features/evaluations'
import {
  STATUS_LABELS, STATUS_ORDER, EvaluationStatusBadge,
} from '../../evaluations/components/evaluationStatus'
import { formatPeriodRange } from '../../evaluations/components/periodFormat'
import { periodsApi, type Period } from '@/features/periods/api'
import { usersApi, type User } from '@/features/users'
import { usePageTitle } from '@/layouts/shell/PageContext'

const PANEL_KEY = 'gfh_admin_evaluations'

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function rowDate(e: Evaluation): string | null {
  return e.submittedAt ?? e.createdAt
}

export function AdminEvaluationsPage() {
  const navigate = useNavigate()
  usePageTitle('admin.evaluations')

  const [evals, setEvals] = useState<Evaluation[]>([])
  const [periodById, setPeriodById] = useState<Map<number, Period>>(new Map())
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      evaluationsApi.adminList({ page: 0, size: 500, sort: 'createdAt,desc' }),
      periodsApi.list(),
      usersApi.list(0, 500),
    ]).then(([list, periods, usrs]) => {
      if (list.status === 'fulfilled') setEvals(list.value.content)
      if (periods.status === 'fulfilled') {
        setPeriodById(new Map(periods.value.map(p => [p.id, p])))
      }
      if (usrs.status === 'fulfilled') setUsers(usrs.value.content)
    }).finally(() => setLoading(false))
  }, [])

  const periodOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Все периоды' }]
    const sorted = [...periodById.values()].sort((a, b) => b.startDate.localeCompare(a.startDate))
    for (const p of sorted) {
      opts.push({ value: String(p.id), label: formatPeriodRange(p, p.id) })
    }
    return opts
  }, [periodById])

  const userOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Все' }]
    const sorted = [...users].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'))
    for (const u of sorted) opts.push({ value: String(u.id), label: u.fullName })
    return opts
  }, [users])

  const FILTERS: FilterDef[] = useMemo(() => [
    { key: 'period',    label: 'Период',   type: 'select', options: periodOptions },
    { key: 'evaluatee', label: 'Сотрудник', type: 'select', options: userOptions },
    { key: 'evaluator', label: 'Оценщик',   type: 'select', options: userOptions },
    {
      key: 'status', label: 'Статус', type: 'select',
      options: [
        { value: '', label: 'Все статусы' },
        ...STATUS_ORDER.map(s => ({ value: s, label: STATUS_LABELS[s] })),
      ],
    },
  ], [periodOptions, userOptions])

  const counts = useMemo(() => {
    const c: Record<EvaluationStatus, number> = {
      DRAFT: 0, SUBMITTED: 0, ACKNOWLEDGED: 0, APPEALED: 0, CLOSED: 0,
    }
    for (const e of evals) c[e.status] += 1
    return c
  }, [evals])

  const columns: Column<Evaluation>[] = [
    {
      key: 'period', header: 'Период', sortable: true,
      render: (e) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
          {formatPeriodRange(periodById.get(e.periodId), e.periodId)}
        </span>
      ),
    },
    {
      key: 'evaluatee', header: 'Сотрудник', sortable: true,
      render: (e) => <span style={{ fontSize: 13, color: 'var(--ink)' }}>{e.evaluateeName}</span>,
    },
    {
      key: 'evaluator', header: 'Оценщик', sortable: true,
      render: (e) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{e.evaluatorName}</span>,
    },
    {
      key: 'date', header: 'Дата', sortable: true,
      render: (e) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{fmtDateShort(rowDate(e))}</span>,
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (e) => <EvaluationStatusBadge status={e.status} />,
    },
    {
      key: 'finalScore', header: 'Итог', sortable: true, align: 'right',
      render: (e) => (
        <span className="font-display tabular-nums" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
          {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
        </span>
      ),
    },
  ]

  const searchText = (e: Evaluation) =>
    `${e.evaluateeName} ${e.evaluatorName} ${formatPeriodRange(periodById.get(e.periodId), e.periodId)}`

  const clientFilter = (e: Evaluation, v: Record<string, string>) => {
    if (v.period && String(e.periodId) !== v.period) return false
    if (v.evaluatee && String(e.evaluateeId) !== v.evaluatee) return false
    if (v.evaluator && String(e.evaluatorId) !== v.evaluator) return false
    if (v.status && e.status !== v.status) return false
    return true
  }

  const comparator = (key: string) => (a: Evaluation, b: Evaluation): number => {
    switch (key) {
      case 'evaluatee':  return a.evaluateeName.localeCompare(b.evaluateeName, 'ru')
      case 'evaluator':  return a.evaluatorName.localeCompare(b.evaluatorName, 'ru')
      case 'status':     return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      case 'finalScore': return (a.finalScore ?? -1) - (b.finalScore ?? -1)
      case 'period': {
        const pa = periodById.get(a.periodId)
        const pb = periodById.get(b.periodId)
        if (pa && pb) return pa.startDate.localeCompare(pb.startDate)
        return a.periodId - b.periodId
      }
      case 'date':
      default: return (rowDate(a) ?? '').localeCompare(rowDate(b) ?? '')
    }
  }

  const renderCard = (e: Evaluation): ReactNode => (
    <div
      onClick={() => navigate(`/evaluations/${e.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/evaluations/${e.id}`) } }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 16, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            {e.evaluateeName}
          </div>
          <div className="truncate" style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
            {formatPeriodRange(periodById.get(e.periodId), e.periodId)}
          </div>
        </div>
        <EvaluationStatusBadge status={e.status} />
      </div>
      <div className="flex items-end justify-between gap-3" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
        <span className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{e.evaluatorName}</span>
        <span className="font-display tabular-nums" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
          {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
        </span>
      </div>
    </div>
  )

  const total = evals.length

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <div className="dv3-terminal">
        <div className="flex flex-wrap gap-2" style={{ marginBottom: 16 }}>
          <StatPill label="Всего" value={total} />
          <StatPill label="Черновики" value={counts.DRAFT} />
          <StatPill label="Ожидают" value={counts.SUBMITTED} tone="warn" />
          <StatPill label="Апелляции" value={counts.APPEALED} tone="danger" />
          <StatPill label="Подтверждено" value={counts.ACKNOWLEDGED} tone="ok" />
          <StatPill label="Закрыто" value={counts.CLOSED} />
        </div>
        <DataPanel<Evaluation>
          mode="client"
          columns={columns}
          rows={evals}
          rowKey={(e) => e.id}
          loading={loading}
          caption="Журнал оценок"
          empty="Нет оценок"
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по сотруднику, оценщику или периоду"
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'date', dir: 'desc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          panelStorageKey={PANEL_KEY}
          columnConfig
          onRowClick={(e) => navigate(`/evaluations/${e.id}`)}
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
