import { useMemo } from 'react'
import type { Criteria } from '@/features/criteria/api'
import type { EvaluationFile } from '../api'
import type { ScoreEntry } from './useEvaluationForm'
import { RubricPanel } from './RubricPanel'
import { ScoreInput } from './ScoreInput'
import { NoteField } from './NoteField'
import { CriterionFiles } from './CriterionFiles'

interface Props {
  evaluationId: number
  criterion: Criteria
  index: number
  total: number
  negative: boolean
  score: ScoreEntry | undefined
  files: EvaluationFile[]
  lang: 'ru' | 'kg'
  onScore: (v: string) => void
  onNote: (v: string) => void
  onAttachFile: (f: EvaluationFile) => void
  onRemoveFile: (id: number) => void
  presetRef?: (n: number, fire: () => void) => void
}

export function CriterionStep({
  evaluationId, criterion, index, total, negative, score, files, lang,
  onScore, onNote, onAttachFile, onRemoveFile, presetRef,
}: Props) {
  const max = Number(criterion.weight)
  const step = max <= 10 ? 0.5 : 1
  const pending = criterion.autoCalculated && (!score || score.value === '')
  const value = score?.value ?? ''
  const note = score?.note ?? ''

  const noteRequired = useMemo(() => {
    if (!negative) return false
    const v = parseFloat(value)
    return !Number.isNaN(v) && v > 0
  }, [negative, value])

  return (
    <>
      <RubricPanel criterion={criterion} index={index} negative={negative} lang={lang} position={index + 1} total={total} />
      <ScoreInput
        value={value}
        max={max}
        step={step}
        disabled={criterion.autoCalculated}
        negative={negative}
        pending={pending}
        onChange={onScore}
        presetRef={presetRef}
      />
      <NoteField value={note} required={noteRequired} onChange={onNote} />
      <CriterionFiles
        evaluationId={evaluationId}
        criteriaId={criterion.id}
        files={files}
        onAttach={onAttachFile}
        onRemove={onRemoveFile}
      />
    </>
  )
}
