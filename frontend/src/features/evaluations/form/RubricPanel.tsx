import { useTranslation } from 'react-i18next'
import type { Criteria } from '../../criteria/criteriaApi'

interface Props {
  criterion: Criteria
  index: number
  negative: boolean
  lang: 'ru' | 'kg'
}

export function RubricPanel({ criterion, index, negative, lang }: Props) {
  const { t } = useTranslation()
  const name = lang === 'kg' ? criterion.nameKg : criterion.nameRu
  const desc = lang === 'kg' ? criterion.descriptionKg : criterion.descriptionRu
  const scope = lang === 'kg'
    ? (criterion.orgUnitNameKg ?? t('evaluation.form.scopeGlobal'))
    : (criterion.orgUnitNameRu ?? t('evaluation.form.scopeGlobal'))
  const idxLabel = negative ? `A${index + 1}` : `${index + 1}`

  return (
    <>
      <div className="efm-criterion-tag">
        {t('evaluation.form.criterion')} {idxLabel}
      </div>
      <h1 className="efm-criterion-name">{name}</h1>
      <div className="efm-chips">
        {negative
          ? <span className="efm-chip efm-chip--anti">{t('evaluation.form.antiMax', { value: criterion.weight })}</span>
          : <span className="efm-chip efm-chip--w">{t('evaluation.form.weight', { value: criterion.weight })}</span>}
        <span className="efm-chip">{scope}</span>
        {criterion.autoCalculated && <span className="efm-chip efm-chip--auto">{t('evaluation.form.autoBadge')}</span>}
      </div>
      <div className="efm-rubric">
        {desc ?? <span className="efm-rubric-empty">— описание не задано —</span>}
      </div>
    </>
  )
}
