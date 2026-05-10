import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Send, Eye } from 'lucide-react'
import { evaluationsApi, Evaluation, EvaluationScore } from './evaluationsApi'
import { criteriaApi, Criteria } from '../criteria/criteriaApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FileUploadSection } from './components/FileUploadSection'
import api from '../../app/api'

interface ScoreMap { [criteriaId: number]: { value: string; note: string } }

export function EvaluationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [scores, setScores] = useState<ScoreMap>({})
  const [previewScore, setPreviewScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const positiveCriteria = criteria.filter(c => c.type === 'POSITIVE' && c.active)
  const antiBonusCriteria = criteria.filter(c => c.type === 'ANTI_BONUS' && c.active)

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      criteriaApi.list(0, 200),
    ]).then(([eval_, criteriaPage]) => {
      setEvaluation(eval_)
      setCriteria(criteriaPage.content)
      api.get<EvaluationScore[]>(`/evaluations/${evaluationId}/scores`).then(r => {
        const map: ScoreMap = {}
        r.data.forEach(s => {
          map[s.criteriaId] = { value: s.value.toString(), note: s.note ?? '' }
        })
        setScores(map)
      }).catch(() => {})
    }).finally(() => setLoading(false))
  }, [evaluationId])

  const buildScoreList = useCallback((): EvaluationScore[] =>
    Object.entries(scores)
      .filter(([, v]) => v.value !== '')
      .map(([sid, v]) => ({
        criteriaId: Number(sid),
        value: parseFloat(v.value),
        note: v.note || undefined,
      })), [scores])

  const save = useCallback(async () => {
    const list = buildScoreList()
    if (list.length === 0) return
    setSaving(true)
    try {
      await evaluationsApi.saveScores(evaluationId, list)
      setLastSaved(new Date())
    } finally {
      setSaving(false)
    }
  }, [evaluationId, buildScoreList])

  const updatePreview = useCallback(async () => {
    const list = buildScoreList()
    if (list.length === 0) { setPreviewScore(null); return }
    try {
      const score = await evaluationsApi.preview(evaluationId, list)
      setPreviewScore(score)
    } catch {}
  }, [evaluationId, buildScoreList])

  useEffect(() => {
    autosaveRef.current = setInterval(save, 30_000)
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current) }
  }, [save])

  useEffect(() => {
    const t = setTimeout(updatePreview, 800)
    return () => clearTimeout(t)
  }, [scores, updatePreview])

  const handleScoreChange = (criteriaId: number, field: 'value' | 'note', val: string) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: { ...prev[criteriaId] ?? { value: '', note: '' }, [field]: val },
    }))
  }

  const handleSubmit = async () => {
    try {
      await save()
      await evaluationsApi.submit(evaluationId)
      navigate('/my-tasks')
    } finally {
      setSubmitOpen(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>
  if (!evaluation) return <div className="text-center py-12 text-red-500">Оценка не найдена</div>
  if (evaluation.status !== 'DRAFT') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Эта оценка уже отправлена (статус: {evaluation.status})</p>
      </div>
    )
  }

  const renderSection = (sectionCriteria: Criteria[], title: string) => (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">{title}</h2>
      {sectionCriteria.length === 0 ? (
        <p className="text-sm text-gray-400">Нет критериев для этого раздела</p>
      ) : (
        <div className="space-y-4">
          {sectionCriteria.map(c => {
            const score = scores[c.id] ?? { value: '', note: '' }
            return (
              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900">{c.nameRu}</span>
                    <span className="ml-2 text-xs text-gray-400">({c.weight}%)</span>
                    {c.autoCalculated && (
                      <span className="ml-2 text-xs text-blue-500">авто</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Значение"
                    value={score.value}
                    onChange={e => handleScoreChange(c.id, 'value', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Примечание (необязательно)"
                    value={score.note}
                    onChange={e => handleScoreChange(c.id, 'note', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Оценка сотрудника</h1>
          <p className="text-gray-500 mt-1">{evaluation.evaluateeName}</p>
        </div>
        <div className="flex items-center gap-3">
          {previewScore !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              <Eye size={14} />
              <span>Итог: <strong>{previewScore.toFixed(2)}</strong></span>
            </div>
          )}
          {lastSaved && (
            <span className="text-xs text-gray-400">
              Сохранено {lastSaved.toLocaleTimeString('ru-RU')}
            </span>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Save size={14} />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={() => setSubmitOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700">
            <Send size={14} />
            Отправить
          </button>
        </div>
      </div>

      {renderSection(positiveCriteria, 'Положительные критерии')}
      {renderSection(antiBonusCriteria, 'Антибонусы')}

      <FileUploadSection evaluationId={evaluationId} />

      <ConfirmDialog
        open={submitOpen}
        title="Отправить оценку?"
        description="После отправки оценку нельзя будет изменить. Сотрудник получит уведомление."
        variant="default"
        onConfirm={handleSubmit}
        onCancel={() => setSubmitOpen(false)}
      />
    </div>
  )
}
