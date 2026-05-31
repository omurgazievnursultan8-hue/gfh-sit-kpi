import { useTranslation } from 'react-i18next'
import type { Criteria } from '@/features/criteria/api'
import type { Phase, ScoreEntry } from './useEvaluationForm'

interface Props {
  phase: Phase; cursor: number
  positive: Criteria[]; antibonus: Criteria[]
  scores: Record<number, ScoreEntry>
}

export function StepperHeader({ phase, cursor, positive, antibonus, scores }: Props) {
  const { t } = useTranslation()
  const list = phase === 'antibonus' ? antibonus : positive
  const phaseKey = phase === 'antibonus' ? 'phaseAntibonus' : phase === 'review' ? 'phaseReview' : 'phasePositive'
  return (
    <>
      <div className={`efm-phase-tag ${phase === 'antibonus' ? 'is-anti' : ''}`}>{t(`evaluation.form.${phaseKey}`)}</div>
      <div className="efm-step-dots" role="progressbar" aria-valuenow={cursor + 1} aria-valuemin={1} aria-valuemax={list.length}>
        {list.map((c, i) => {
          const filled = !!scores[c.id]?.value
          return (
            <span
              key={c.id}
              className={`efm-step-dot ${filled ? 'is-done' : ''} ${i === cursor && phase !== 'review' && phase !== 'transition' ? 'is-current' : ''} ${phase === 'antibonus' ? 'is-anti' : ''}`}
            />
          )
        })}
      </div>
    </>
  )
}
