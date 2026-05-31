import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { evaluationsApi, Evaluation, EvaluationScore, EvaluationFile } from '../api'
import { criteriaApi, Criteria } from '@/features/criteria/api'
import api from '../../../app/api'

export type Phase = 'positive' | 'transition' | 'antibonus' | 'review'

export interface ScoreEntry { value: string; note: string; dirty: boolean }

interface State {
  evaluation: Evaluation | null
  criteria: Criteria[]
  scores: Record<number, ScoreEntry>
  files: EvaluationFile[]
  phase: Phase
  cursor: number
  previewScore: number | null
  lastSaved: Date | null
  saving: boolean
  loading: boolean
  error: string | null
}

type Action =
  | { type: 'LOAD_OK'; payload: { evaluation: Evaluation; criteria: Criteria[]; scores: EvaluationScore[]; files: EvaluationFile[] } }
  | { type: 'LOAD_ERR'; message: string }
  | { type: 'SET_SCORE'; criteriaId: number; value: string }
  | { type: 'SET_NOTE'; criteriaId: number; note: string }
  | { type: 'CLEAR_DIRTY' }
  | { type: 'SAVING'; saving: boolean }
  | { type: 'SAVED'; at: Date }
  | { type: 'PREVIEW'; value: number | null }
  | { type: 'GO'; phase: Phase; cursor: number }
  | { type: 'ATTACH_FILE'; file: EvaluationFile }
  | { type: 'REMOVE_FILE'; fileId: number }

const initial: State = {
  evaluation: null, criteria: [], scores: {}, files: [],
  phase: 'positive', cursor: 0, previewScore: null, lastSaved: null,
  saving: false, loading: true, error: null,
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'LOAD_OK': {
      const scoreMap: Record<number, ScoreEntry> = {}
      a.payload.scores.forEach(sc => {
        scoreMap[sc.criteriaId] = {
          value: sc.value == null ? '' : sc.value.toString(),
          note: sc.note ?? '',
          dirty: false,
        }
      })
      return {
        ...s,
        evaluation: a.payload.evaluation,
        criteria: a.payload.criteria.filter(c => c.active),
        scores: scoreMap,
        files: a.payload.files,
        loading: false,
      }
    }
    case 'LOAD_ERR': return { ...s, loading: false, error: a.message }
    case 'SET_SCORE': return {
      ...s,
      scores: { ...s.scores, [a.criteriaId]: { ...(s.scores[a.criteriaId] ?? { note: '', value: '', dirty: false }), value: a.value, dirty: true } },
    }
    case 'SET_NOTE': return {
      ...s,
      scores: { ...s.scores, [a.criteriaId]: { ...(s.scores[a.criteriaId] ?? { note: '', value: '', dirty: false }), note: a.note, dirty: true } },
    }
    case 'CLEAR_DIRTY': {
      const cleaned: Record<number, ScoreEntry> = {}
      for (const k in s.scores) cleaned[Number(k)] = { ...s.scores[Number(k)], dirty: false }
      return { ...s, scores: cleaned }
    }
    case 'SAVING': return { ...s, saving: a.saving }
    case 'SAVED': return { ...s, lastSaved: a.at }
    case 'PREVIEW': return { ...s, previewScore: a.value }
    case 'GO': return { ...s, phase: a.phase, cursor: a.cursor }
    case 'ATTACH_FILE': return { ...s, files: [...s.files, a.file] }
    case 'REMOVE_FILE': return { ...s, files: s.files.filter(f => f.id !== a.fileId) }
    default: return s
  }
}

export function useEvaluationForm(evaluationId: number) {
  const [state, dispatch] = useReducer(reducer, initial)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      criteriaApi.list(0, 200),
      api.get<EvaluationScore[]>(`/evaluations/${evaluationId}/scores`).then(r => r.data),
      evaluationsApi.listFiles(evaluationId).catch(() => [] as EvaluationFile[]),
    ]).then(([evaluation, criteriaPage, scores, files]) => {
      dispatch({ type: 'LOAD_OK', payload: { evaluation, criteria: criteriaPage.content, scores, files } })
    }).catch(e => dispatch({ type: 'LOAD_ERR', message: e?.message ?? 'load failed' }))
  }, [evaluationId])

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const p = params.get('p') as Phase | null
    const i = Number(params.get('i') ?? '0')
    if (p && ['positive', 'transition', 'antibonus', 'review'].includes(p)) {
      dispatch({ type: 'GO', phase: p, cursor: isNaN(i) ? 0 : i })
    }
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('p', state.phase); params.set('i', String(state.cursor))
    window.history.replaceState(null, '', `#${params.toString()}`)
  }, [state.phase, state.cursor])

  const positive = useMemo(
    () => state.criteria.filter(c => c.type === 'POSITIVE'),
    [state.criteria]
  )
  const antibonus = useMemo(
    () => state.criteria.filter(c => c.type === 'ANTI_BONUS'),
    [state.criteria]
  )
  const currentCriterion: Criteria | null = useMemo(() => {
    if (state.phase === 'positive') return positive[state.cursor] ?? null
    if (state.phase === 'antibonus') return antibonus[state.cursor] ?? null
    return null
  }, [state.phase, state.cursor, positive, antibonus])

  const isFilled = (c: Criteria): boolean => {
    const sc = state.scores[c.id]
    return !!sc && sc.value !== ''
  }
  const posFilled = positive.filter(isFilled).length
  const negFilled = antibonus.filter(isFilled).length

  const canAdvance = useMemo((): boolean => {
    if (!currentCriterion) return true
    const sc = state.scores[currentCriterion.id]
    if (!sc || sc.value === '') return currentCriterion.autoCalculated
    const v = parseFloat(sc.value)
    if (currentCriterion.type === 'ANTI_BONUS' && v > 0 && (sc.note?.trim().length ?? 0) < 10) return false
    return true
  }, [currentCriterion, state.scores])

  const canSubmit = useMemo((): boolean => {
    if (positive.length === 0) return false
    for (const c of positive) {
      if (c.autoCalculated) continue
      const sc = state.scores[c.id]
      if (!sc || sc.value === '') return false
    }
    for (const c of antibonus) {
      const sc = state.scores[c.id]
      if (!sc || sc.value === '') continue
      const v = parseFloat(sc.value)
      if (v > 0 && (sc.note?.trim().length ?? 0) < 10) return false
    }
    return true
  }, [positive, antibonus, state.scores])

  const setScore = useCallback((criteriaId: number, value: string) =>
    dispatch({ type: 'SET_SCORE', criteriaId, value }), [])
  const setNote = useCallback((criteriaId: number, note: string) =>
    dispatch({ type: 'SET_NOTE', criteriaId, note }), [])

  const goPrev = useCallback(() => {
    const s = stateRef.current
    if (s.phase === 'review') return dispatch({ type: 'GO', phase: antibonus.length ? 'antibonus' : 'positive', cursor: antibonus.length ? antibonus.length - 1 : positive.length - 1 })
    if (s.phase === 'antibonus') {
      if (s.cursor > 0) return dispatch({ type: 'GO', phase: 'antibonus', cursor: s.cursor - 1 })
      return dispatch({ type: 'GO', phase: 'transition', cursor: 0 })
    }
    if (s.phase === 'transition') return dispatch({ type: 'GO', phase: 'positive', cursor: positive.length - 1 })
    if (s.phase === 'positive' && s.cursor > 0) return dispatch({ type: 'GO', phase: 'positive', cursor: s.cursor - 1 })
  }, [positive.length, antibonus.length])

  const goNext = useCallback(() => {
    const s = stateRef.current
    if (s.phase === 'positive') {
      if (s.cursor < positive.length - 1) return dispatch({ type: 'GO', phase: 'positive', cursor: s.cursor + 1 })
      return dispatch({ type: 'GO', phase: antibonus.length ? 'transition' : 'review', cursor: 0 })
    }
    if (s.phase === 'transition') return dispatch({ type: 'GO', phase: 'antibonus', cursor: 0 })
    if (s.phase === 'antibonus') {
      if (s.cursor < antibonus.length - 1) return dispatch({ type: 'GO', phase: 'antibonus', cursor: s.cursor + 1 })
      return dispatch({ type: 'GO', phase: 'review', cursor: 0 })
    }
  }, [positive.length, antibonus.length])

  const goToStep = useCallback((phase: Phase, cursor: number) =>
    dispatch({ type: 'GO', phase, cursor }), [])

  return {
    state,
    positive, antibonus, currentCriterion,
    posFilled, negFilled,
    canAdvance, canSubmit,
    setScore, setNote, goPrev, goNext, goToStep,
    dispatch,
  }
}
