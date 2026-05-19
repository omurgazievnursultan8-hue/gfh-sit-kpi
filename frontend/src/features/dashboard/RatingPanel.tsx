import { useTranslation } from 'react-i18next'
import type { ScorecardResponse, CriteriaScore } from '../analytics/analyticsApi'
import { DataTable } from '../../components/DataTable'
import type { Column } from '../../components/DataTable'

export interface RatingPanelProps {
  card: ScorecardResponse | null
  loading: boolean
}

// Evaluator info strip + two data tables (positive criteria + anti-bonuses)
// side by side. Column headers hidden — data rows only.
export function RatingPanel({ card, loading }: RatingPanelProps) {
  const { t, i18n } = useTranslation()
  const kg = i18n.language === 'kg'

  const columns: Column<CriteriaScore>[] = [
    {
      key: 'name',
      header: t('dashboard.ratingPanel.colCriterion'),
      render: r => (kg ? r.nameKg : r.nameRu),
    },
    {
      key: 'score',
      header: t('dashboard.ratingPanel.colScore'),
      align: 'right',
      width: '80px',
      render: r => r.score.toFixed(2),
    },
  ]

  const table = (title: string, rows: CriteriaScore[]) => (
    <section className="dv3-card dv3-col-6">
      <div className="dv3-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv3-card-id">[ {rows.length} ]</span>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={r => r.criteriaId}
        caption={title}
        loading={loading}
        density="compact"
        skeletonRows={4}
        hideHeader
        empty={t('dashboard.ratingPanel.noItems')}
      />
    </section>
  )

  // Evaluator identity — name · position · unit, joined with the parts present.
  const evaluatorLine = [card?.evaluatorName, card?.evaluatorPosition, card?.evaluatorUnit]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      {evaluatorLine && (
        <section className="dv3-card dv3-col-12">
          <div className="dv3-card-head">
            <span className="dv3-card-id">{t('dashboard.ratingPanel.evaluatedBy')}</span>
            <span><strong>{evaluatorLine}</strong></span>
          </div>
        </section>
      )}
      {table(t('dashboard.ratingPanel.posCardTitle'), card?.criteria ?? [])}
      {table(t('dashboard.ratingPanel.negCardTitle'), card?.antiBonuses ?? [])}
    </>
  )
}
