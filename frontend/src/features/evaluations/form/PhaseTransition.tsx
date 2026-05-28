import { useTranslation } from 'react-i18next'

interface Props {
  posFilled: number; posTotal: number; posSum: number; antiCount: number
  onSkip: () => void; onContinue: () => void
}

export function PhaseTransition({ posFilled, posTotal, posSum, antiCount, onContinue, onSkip }: Props) {
  const { t } = useTranslation()
  return (
    <div style={{ textAlign: 'center', padding: '64px 0' }}>
      <div className="efm-phase-tag" style={{ justifyContent: 'center' }}>{t('evaluation.form.transitionPositiveDone')}</div>
      <div style={{ fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic', fontSize: 56, color: 'var(--dv3-text)', lineHeight: 1 }}>
        {posFilled} / {posTotal}
      </div>
      <div style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--dv3-text3)', marginTop: 8 }}>
        сумма {posSum.toFixed(1)} / 100
      </div>
      <h2 style={{ fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic', fontSize: 32, marginTop: 32, marginBottom: 4 }}>
        {t('evaluation.form.transitionAnti')}
      </h2>
      <div style={{ fontSize: 12, color: 'var(--dv3-text3)', marginBottom: 24 }}>{antiCount}</div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="efm-bb-btn efm-bb-btn--primary" onClick={onContinue}>{t('evaluation.form.transitionGo')}</button>
        <button className="efm-bb-btn" onClick={onSkip}>{t('evaluation.form.transitionSkip')}</button>
      </div>
    </div>
  )
}
