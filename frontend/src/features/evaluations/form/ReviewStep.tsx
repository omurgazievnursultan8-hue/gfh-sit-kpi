import { useTranslation } from 'react-i18next'

interface Props {
  posSum: number; negSum: number
  previewScore?: number | null
  posFilled: number; posTotal: number
  negFilled: number; negTotal: number
  filesCount: number
  onBackToEdit: () => void
  onSubmit: () => void
  canSubmit: boolean
}

export function ReviewStep({ posSum, negSum, posFilled, posTotal, negFilled, negTotal, filesCount, onBackToEdit, onSubmit, canSubmit }: Props) {
  const { t } = useTranslation()
  const total = Math.max(0, posSum - negSum)
  const whole = Math.round(total)
  return (
    <div className="efm-review">
      <div className="efm-review-tag">{t('evaluation.form.reviewTotal')}</div>
      <div className="efm-review-num">{whole}<span>/ 100</span></div>
      <div className="efm-review-rows">
        <div className="r up"><span>{t('evaluation.form.reviewPositive')}</span><b>+{posSum.toFixed(2)}</b></div>
        <div className="r down"><span>{t('evaluation.form.reviewAnti')}</span><b>−{negSum.toFixed(2)}</b></div>
        <div className="r total"><span>{t('evaluation.form.reviewTotal')}</span><b>{whole}</b></div>
      </div>
      <div style={{ fontSize: 11, letterSpacing: '.16em', color: 'var(--dv3-text3)', textTransform: 'uppercase', lineHeight: 1.8 }}>
        ☑ {posFilled}/{posTotal} {t('evaluation.form.reviewPositive')}<br />
        ☑ {negFilled}/{negTotal} {t('evaluation.form.reviewAnti')}<br />
        ☑ {t('evaluation.form.filesLabel')}: {filesCount}
      </div>
      <div className="efm-review-actions">
        <button className="efm-btn" onClick={onBackToEdit}>{t('evaluation.form.reviewBack')}</button>
        <button className="efm-btn is-primary" disabled={!canSubmit} onClick={onSubmit}>{t('evaluation.form.reviewConfirm')}</button>
      </div>
    </div>
  )
}
