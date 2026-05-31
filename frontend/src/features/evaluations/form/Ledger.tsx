import { useTranslation } from 'react-i18next'
import type { Criteria } from '@/features/criteria/api'
import type { Phase, ScoreEntry } from './useEvaluationForm'

interface Props {
  positive: Criteria[]
  antibonus: Criteria[]
  scores: Record<number, ScoreEntry>
  phase: Phase
  cursor: number
  previewScore: number | null
  lang: 'ru' | 'kg'
  onJump: (phase: Phase, idx: number) => void
}

export function Ledger({ positive, antibonus, scores, phase, cursor, previewScore, lang, onJump }: Props) {
  const { t } = useTranslation()

  const posSum = positive.reduce((s, c) => s + (parseFloat(scores[c.id]?.value ?? '0') || 0), 0)
  const negSum = antibonus.reduce((s, c) => s + (parseFloat(scores[c.id]?.value ?? '0') || 0), 0)
  const total = previewScore ?? Math.max(0, posSum - negSum)
  const totalPct = Math.min(100, Math.max(0, total))

  const row = (c: Criteria, i: number, neg: boolean) => {
    const sc = scores[c.id]
    const val = sc?.value ?? ''
    const filled = val !== ''
    const isHere = phase === (neg ? 'antibonus' : 'positive') && cursor === i
    const name = lang === 'kg' ? c.nameKg : c.nameRu
    const weight = Number(c.weight)
    return (
      <button
        key={c.id}
        type="button"
        className={`efm-cl-item ${isHere ? 'is-active' : ''} ${filled ? 'is-done' : ''} ${neg ? 'is-anti' : ''}`}
        onClick={() => onJump(neg ? 'antibonus' : 'positive', i)}
        title={name}
      >
        <span className="efm-cl-mk" aria-hidden>{filled ? '✓' : ''}</span>
        <span className="efm-cl-txt">{name}</span>
        <span className="efm-cl-w">{neg ? '−' : ''}{weight}%</span>
      </button>
    )
  }

  return (
    <>
      <section className="efm-card" style={{ flex: '1 1 auto' }} aria-label="checklist">
        <header className="efm-card-head">
          <div className="t">{t('evaluation.form.checklist')}</div>
          <div className="s">{t('evaluation.form.checklistHint', { defaultValue: 'нажмите, чтобы перейти' })}</div>
        </header>
        <div className="efm-checklist">
          {positive.length > 0 && (
            <>
              <div className="efm-cl-group">{t('evaluation.form.phasePositive')}</div>
              {positive.map((c, i) => row(c, i, false))}
            </>
          )}
          {antibonus.length > 0 && (
            <>
              <div className="efm-cl-group is-anti">{t('evaluation.form.phaseAntibonus')}</div>
              {antibonus.map((c, i) => row(c, i, true))}
            </>
          )}
        </div>
      </section>

      <section className="efm-card" aria-label="live-rating">
        <header className="efm-card-head">
          <div className="t">{t('evaluation.form.liveRating', { defaultValue: 'Текущий рейтинг' })}</div>
          <div className="s">{t('evaluation.form.liveRatingHint', { defaultValue: 'пересчитывается вживую' })}</div>
        </header>
        <div className="efm-rating-body">
          <div className="efm-bignum">
            <span className="v">{total.toFixed(1)}</span>
            <span className="u">/ 100</span>
          </div>
          <div className="efm-gauge"><i style={{ width: totalPct + '%' }} /></div>
          <div className="efm-rsplit">
            <div className="r"><span>{t('evaluation.form.reviewPositive')}</span><b>+{posSum.toFixed(1)}</b></div>
            <div className="r is-minus"><span>{t('evaluation.form.reviewAnti')}</span><b>−{negSum.toFixed(1)}</b></div>
            <div className="r is-total"><span>{t('evaluation.form.reviewTotal')}</span><b>{total.toFixed(1)}</b></div>
          </div>
        </div>
      </section>
    </>
  )
}
