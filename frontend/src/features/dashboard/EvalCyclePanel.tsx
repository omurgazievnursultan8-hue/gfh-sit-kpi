import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { evaluationsApi, type Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi, type Period } from '../periods/periodsApi'
import { formatPeriodRange } from '../evaluations/components/periodFormat'
import { EvaluationStatusBadge } from '../evaluations/components/evaluationStatus'
import { DataTable } from '../../components/DataTable'
import type { Column } from '../../components/DataTable'

// Incomplete = evaluator has not submitted yet (still a draft).
// Completed = submitted or any later status.
function isComplete(e: Evaluation): boolean {
  return e.status !== 'DRAFT'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Two evaluation tables side by side — incomplete (left) + completed (right).
// Opens below the dashboard grid when the EVAL.CYCLE.PROGRESS card is clicked.
export function EvalCyclePanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [rows, setRows] = useState<Evaluation[]>([])
  const [periodById, setPeriodById] = useState<Map<number, Period>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      evaluationsApi.asEvaluator(0, 200),
      periodsApi.list(),
    ]).then(([evals, periods]) => {
      if (evals.status === 'fulfilled') setRows(evals.value.content)
      if (periods.status === 'fulfilled') {
        setPeriodById(new Map(periods.value.map(p => [p.id, p])))
      }
    }).finally(() => setLoading(false))
  }, [])

  const incomplete = rows.filter(e => !isComplete(e))
  const completed = rows.filter(isComplete)

  const periodLabel = (e: Evaluation) => formatPeriodRange(periodById.get(e.periodId), e.periodId)

  const baseColumns: Column<Evaluation>[] = [
    {
      key: 'evaluatee',
      header: t('dashboard.evalCyclePanel.colEmployee'),
      render: e => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{e.evaluateeName}</div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{periodLabel(e)}</div>
        </div>
      ),
    },
  ]

  const incompleteColumns: Column<Evaluation>[] = [
    ...baseColumns,
    {
      key: 'status', header: t('dashboard.evalCyclePanel.colStatus'), align: 'right', width: '120px',
      render: e => <EvaluationStatusBadge status={e.status} />,
    },
  ]

  const completedColumns: Column<Evaluation>[] = [
    ...baseColumns,
    {
      key: 'date', header: t('dashboard.evalCyclePanel.colDate'), align: 'right', width: '90px',
      render: e => (
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
          {fmtDate(e.submittedAt ?? e.createdAt)}
        </span>
      ),
    },
    {
      key: 'score', header: t('dashboard.evalCyclePanel.colScore'), align: 'right', width: '64px',
      render: e => (
        <span className="font-display tabular-nums" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
          {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
        </span>
      ),
    },
  ]

  const table = (title: string, columns: Column<Evaluation>[], data: Evaluation[], empty: string) => (
    <section className="dv3-card dv3-col-6">
      <div className="dv3-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv3-card-id">[ {data.length} ]</span>
      </div>
      <DataTable
        columns={columns}
        rows={data}
        rowKey={e => e.id}
        caption={title}
        loading={loading}
        density="compact"
        skeletonRows={4}
        hideHeader
        empty={empty}
        onRowClick={e => navigate(`/evaluations/${e.id}`)}
      />
    </section>
  )

  return (
    <>
      {table(
        t('dashboard.evalCyclePanel.incompleteTitle'),
        incompleteColumns, incomplete,
        t('dashboard.evalCyclePanel.noIncomplete'),
      )}
      {table(
        t('dashboard.evalCyclePanel.completedTitle'),
        completedColumns, completed,
        t('dashboard.evalCyclePanel.noCompleted'),
      )}
    </>
  )
}
