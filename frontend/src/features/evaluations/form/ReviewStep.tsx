import { useTranslation } from 'react-i18next'

interface Props {
  posSum: number; negSum: number; previewScore: number | null
  posFilled: number; posTotal: number
  negFilled: number; negTotal: number
  filesCount: number
  onBackToEdit: () => void
  onSubmit: () => void
  canSubmit: boolean
}

export function ReviewStep({ posSum, negSum, previewScore, posFilled, posTotal, negFilled, negTotal, filesCount, onBackToEdit, onSubmit, canSubmit }: Props) {
  const { t } = useTranslation()
  const total = previewScore ?? Math.max(0, posSum - negSum)
  const whole = Math.round(total)
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div className="efm-phase-tag" style={{ justifyContent: 'center' }}>{t('evaluation.form.reviewTotal')}</div>
      <div className="efm-readout" style={{ fontSize: 96 }}>
        {whole}<span style={{ fontSize: 16, marginLeft: 12, color: 'var(--dv3-text3)' }}>/ 100</span>
      </div>
      <div style={{ display: 'inline-block', textAlign: 'left', marginTop: 32, fontSize: 13, letterSpacing: '.1em', color: 'var(--dv3-text3)' }}>
        <div>{t('evaluation.form.reviewPositive')} <strong style={{ color: 'var(--dv3-zone-up)', marginLeft: 24 }}>+{posSum.toFixed(2)}</strong></div>
        <div>{t('evaluation.form.reviewAnti')} <strong style={{ color: 'var(--dv3-zone-down)', marginLeft: 24 }}>−{negSum.toFixed(2)}</strong></div>
        <div style={{ borderTop: '1px dashed var(--dv3-border)', paddingTop: 8, marginTop: 8 }}>
          {t('evaluation.form.reviewTotal')} <strong style={{ marginLeft: 24, color: 'var(--dv3-text)' }}>{whole}</strong>
        </div>
      </div>
      <div style={{ marginTop: 32, fontSize: 11, letterSpacing: '.18em', color: 'var(--dv3-text3)', textTransform: 'uppercase' }}>
        ☑ {posFilled}/{posTotal} {t('evaluation.form.reviewPositive')}<br />
        ☑ {negFilled}/{negTotal} {t('evaluation.form.reviewAnti')}<br />
        ☑ файлов: {filesCount}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
        <button className="efm-bb-btn efm-bb-btn--primary" disabled={!canSubmit} onClick={onSubmit}>{t('evaluation.form.reviewConfirm')}</button>
        <button className="efm-bb-btn" onClick={onBackToEdit}>{t('evaluation.form.reviewBack')}</button>
      </div>
    </div>
  )
}
