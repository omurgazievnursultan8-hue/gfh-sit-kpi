import type { Phase, ScoreEntry } from './useEvaluationForm'
import type { Criteria } from '../../criteria/criteriaApi'
import type { EvaluationFile } from '../evaluationsApi'
import { CriterionStep } from './CriterionStep'
import { PhaseTransition } from './PhaseTransition'
import { ReviewStep } from './ReviewStep'

interface Props {
  phase: Phase; cursor: number
  evaluationId: number
  positive: Criteria[]; antibonus: Criteria[]
  scores: Record<number, ScoreEntry>; files: EvaluationFile[]
  previewScore: number | null
  posFilled: number; negFilled: number
  canSubmit: boolean
  lang: 'ru' | 'kg'
  onScore: (criteriaId: number, v: string) => void
  onNote: (criteriaId: number, v: string) => void
  onAttachFile: (f: EvaluationFile) => void
  onRemoveFile: (id: number) => void
  onJump: (phase: Phase, idx: number) => void
  onSubmit: () => void
  presetRef?: (n: number, fire: () => void) => void
}

const sumValues = (list: Criteria[], scores: Record<number, ScoreEntry>): number =>
  list.reduce((s, c) => s + (parseFloat(scores[c.id]?.value ?? '0') || 0), 0)

export function PhaseRouter(p: Props) {
  if (p.phase === 'transition') {
    return <PhaseTransition
      posFilled={p.posFilled} posTotal={p.positive.length} posSum={sumValues(p.positive, p.scores)}
      antiCount={p.antibonus.length}
      onContinue={() => p.onJump('antibonus', 0)}
      onSkip={() => p.onJump('review', 0)}
    />
  }
  if (p.phase === 'review') {
    return <ReviewStep
      posSum={sumValues(p.positive, p.scores)} negSum={sumValues(p.antibonus, p.scores)}
      previewScore={p.previewScore}
      posFilled={p.posFilled} posTotal={p.positive.length}
      negFilled={p.negFilled} negTotal={p.antibonus.length}
      filesCount={p.files.length}
      onBackToEdit={() => p.onJump(p.antibonus.length ? 'antibonus' : 'positive', (p.antibonus.length ? p.antibonus.length : p.positive.length) - 1)}
      onSubmit={p.onSubmit}
      canSubmit={p.canSubmit}
    />
  }
  const list = p.phase === 'antibonus' ? p.antibonus : p.positive
  const c = list[p.cursor]
  if (!c) return null
  return (
    <CriterionStep
      evaluationId={p.evaluationId}
      criterion={c}
      index={p.cursor}
      total={list.length}
      negative={p.phase === 'antibonus'}
      score={p.scores[c.id]}
      files={p.files}
      lang={p.lang}
      onScore={v => p.onScore(c.id, v)}
      onNote={v => p.onNote(c.id, v)}
      onAttachFile={p.onAttachFile}
      onRemoveFile={p.onRemoveFile}
      presetRef={p.presetRef}
    />
  )
}
