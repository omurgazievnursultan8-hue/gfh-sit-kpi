import { useTranslation } from 'react-i18next'
import type { Criteria } from '@/features/criteria/api'

interface Props {
  criterion: Criteria
  index: number
  negative: boolean
  lang: 'ru' | 'kg'
  total?: number
  position?: number
}

export function RubricPanel({ criterion, index, negative, lang, total, position }: Props) {
  const { t } = useTranslation()
  const name = lang === 'kg' ? criterion.nameKg : criterion.nameRu
  const desc = lang === 'kg' ? criterion.descriptionKg : criterion.descriptionRu
  const scope = lang === 'kg'
    ? (criterion.orgUnitNameKg ?? t('evaluation.form.scopeGlobal'))
    : (criterion.orgUnitNameRu ?? t('evaluation.form.scopeGlobal'))

  return (
    <>
      <div className="efm-fmeta">
        <span className="efm-scope-chip">{scope}</span>
        {negative
          ? <span className="efm-wchip is-anti">{t('evaluation.form.antiMax', { value: criterion.weight })}</span>
          : <span className="efm-wchip">{t('evaluation.form.weight', { value: criterion.weight })}</span>}
        {criterion.autoCalculated && <span className="efm-auto-chip">{t('evaluation.form.autoBadge')}</span>}
        {total != null && position != null && (
          <span className="efm-fcount">{position} / {total}</span>
        )}
      </div>

      <h2 className="efm-fname">{name}</h2>
      {desc && <p className="efm-fdesc">{desc}</p>}

      {negative && !criterion.autoCalculated && (
        <div className="efm-pen-banner">
          <span aria-hidden style={{ flex: '0 0 auto' }}>⚠</span>
          <div><b>{t('evaluation.form.antiBannerTitle', { defaultValue: 'Антибонус.' })}</b> {t('evaluation.form.antiBannerBody', { defaultValue: 'Вычитается из итогового рейтинга.' })}</div>
        </div>
      )}
      {criterion.autoCalculated && (
        <div className="efm-pen-banner">
          <span aria-hidden style={{ flex: '0 0 auto' }}>⚙</span>
          <div><b>{t('evaluation.form.autoBannerTitle', { defaultValue: 'Автоматическая оценка.' })}</b> {t('evaluation.form.autoBannerBody', { defaultValue: 'Начислена системой, не редактируется.' })}</div>
        </div>
      )}
    </>
  )
}
