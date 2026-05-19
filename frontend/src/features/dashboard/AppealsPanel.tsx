import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { appealsApi, type AppealSummary, type AppealStatus } from '../appeals/appealsApi'
import { DataTable } from '../../components/DataTable'
import type { Column } from '../../components/DataTable'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Anti-bonus colour for resolved-against; neutral for upheld.
const STATUS_TONE: Record<AppealStatus, string> = {
  PENDING: 'var(--ink-soft)',
  UPHELD: 'var(--ink)',
  OVERTURNED: 'var(--ink)',
  AUTO_AGREED: 'var(--ink-dim)',
}

// Two appeal tables side by side — pending (left) + resolved (right).
// Opens below the dashboard grid when the APPEALS card is hovered.
export function AppealsPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [rows, setRows] = useState<AppealSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    appealsApi.mine()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const pending = rows.filter(a => a.status === 'PENDING')
  const completed = rows.filter(a => a.status !== 'PENDING')

  const baseColumns: Column<AppealSummary>[] = [
    {
      key: 'evaluatee',
      header: t('dashboard.appealsPanel.colEmployee'),
      render: a => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{a.evaluateeName}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
            {a.reason}
          </div>
        </div>
      ),
    },
  ]

  const pendingColumns: Column<AppealSummary>[] = [
    ...baseColumns,
    {
      key: 'deadline', header: t('dashboard.appealsPanel.colDeadline'), align: 'right', width: '90px',
      render: a => (
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
          {fmtDate(a.deadline)}
        </span>
      ),
    },
  ]

  const completedColumns: Column<AppealSummary>[] = [
    ...baseColumns,
    {
      key: 'status', header: t('dashboard.appealsPanel.colStatus'), align: 'right', width: '140px',
      render: a => (
        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_TONE[a.status], letterSpacing: '0.04em' }}>
          {t(`dashboard.appealsPanel.status${a.status}`)}
        </span>
      ),
    },
  ]

  const table = (title: string, columns: Column<AppealSummary>[], data: AppealSummary[], empty: string) => (
    <section className="dv3-card dv3-col-6">
      <div className="dv3-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv3-card-id">[ {data.length} ]</span>
      </div>
      <DataTable
        columns={columns}
        rows={data}
        rowKey={a => a.id}
        caption={title}
        loading={loading}
        density="compact"
        skeletonRows={4}
        hideHeader
        empty={empty}
        onRowClick={a => navigate(`/evaluations/${a.evaluationId}`)}
      />
    </section>
  )

  return (
    <>
      {table(
        t('dashboard.appealsPanel.pendingTitle'),
        pendingColumns, pending,
        t('dashboard.appealsPanel.noPending'),
      )}
      {table(
        t('dashboard.appealsPanel.completedTitle'),
        completedColumns, completed,
        t('dashboard.appealsPanel.noCompleted'),
      )}
    </>
  )
}
