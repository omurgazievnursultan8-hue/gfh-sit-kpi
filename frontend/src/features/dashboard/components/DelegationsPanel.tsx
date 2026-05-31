import { useTranslation } from 'react-i18next'
import type { Delegation } from '@/features/org'
import { DataTable } from '@/shared/datapanel/DataTable'
import type { Column } from '@/shared/datapanel/DataTable'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

interface DelegationsPanelProps {
  rows: Delegation[]
  loading: boolean
}

// Two delegation tables side by side — active (left) + inactive (right).
// Opens below the dashboard grid when the DELEGATIONS card is hovered.
export function DelegationsPanel({ rows, loading }: DelegationsPanelProps) {
  const { t } = useTranslation()

  const active = rows.filter(d => d.isActive)
  const inactive = rows.filter(d => !d.isActive)

  const columns: Column<Delegation>[] = [
    {
      key: 'evaluatee',
      header: t('dashboard.delegationsPanel.colEmployee'),
      render: d => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{d.evaluateeName}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
            {d.originalEvaluatorName} → {d.delegatedToName}
          </div>
        </div>
      ),
    },
    {
      key: 'period', header: t('dashboard.delegationsPanel.colPeriod'), align: 'right', width: '140px',
      render: d => (
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
          {fmtDate(d.validFrom)} – {fmtDate(d.validTo)}
        </span>
      ),
    },
  ]

  const table = (title: string, data: Delegation[], empty: string) => (
    <section className="dv3-card dv3-col-6">
      <div className="dv3-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv3-card-id">[ {data.length} ]</span>
      </div>
      <DataTable
        columns={columns}
        rows={data}
        rowKey={d => d.id}
        caption={title}
        loading={loading}
        density="compact"
        skeletonRows={4}
        hideHeader
        empty={empty}
      />
    </section>
  )

  return (
    <>
      {table(t('dashboard.delegationsPanel.activeTitle'), active, t('dashboard.delegationsPanel.noActive'))}
      {table(t('dashboard.delegationsPanel.inactiveTitle'), inactive, t('dashboard.delegationsPanel.noInactive'))}
    </>
  )
}
