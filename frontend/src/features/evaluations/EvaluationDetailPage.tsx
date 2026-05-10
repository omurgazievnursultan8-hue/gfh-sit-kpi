import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { evaluationsApi, Evaluation } from './evaluationsApi'
import api from '../../app/api'

interface ScoreHistory {
  criteriaId: number
  nameRu: string
  nameKg: string
  type: 'POSITIVE' | 'ANTI_BONUS'
  rawValue: number
  weightedValue: number
  weightSnapshot: number
}

export function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [scores, setScores] = useState<ScoreHistory[]>([])
  const [reacting, setReacting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      api.get<ScoreHistory[]>(`/evaluations/${evaluationId}/score-history`),
    ]).then(([eval_, hist]) => {
      setEvaluation(eval_)
      setScores(hist.data)
    }).finally(() => setLoading(false))
  }, [evaluationId])

  const react = async (reaction: 'AGREE' | 'DISAGREE') => {
    setReacting(true)
    try {
      await api.post(`/evaluations/${evaluationId}/reaction`, { reaction, comment })
      if (reaction === 'AGREE') {
        navigate('/my-evaluations')
      } else {
        navigate(`/appeals/new?evaluationId=${evaluationId}`)
      }
    } catch (err: any) {
      alert(err.response?.data?.message_ru || 'Ошибка')
    } finally {
      setReacting(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>
  if (!evaluation) return <div className="text-center py-12 text-red-500">Оценка не найдена</div>

  const positiveScores = scores.filter(s => s.type === 'POSITIVE')
  const antiBonusScores = scores.filter(s => s.type === 'ANTI_BONUS')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Детали оценки</h1>
        <p className="text-gray-500 mt-1">Оценщик: {evaluation.evaluatorName}</p>
      </div>

      {positiveScores.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Положительные критерии</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {positiveScores.map(s => (
              <div key={s.criteriaId} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 text-sm">{s.nameRu}</span>
                  <span className="text-xs text-gray-400 ml-2">({s.weightSnapshot}%)</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-gray-800">{s.rawValue.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">взвеш: {s.weightedValue.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {antiBonusScores.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Антибонусы</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {antiBonusScores.map(s => (
              <div key={s.criteriaId} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 text-sm">{s.nameRu}</span>
                  <span className="text-xs text-gray-400 ml-2">({s.weightSnapshot}%)</span>
                </div>
                <div className="text-right text-red-600">
                  <div className="text-sm font-mono">{s.rawValue.toFixed(2)}</div>
                  <div className="text-xs text-red-400">взвеш: -{s.weightedValue.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
        <div className="text-sm text-gray-500 mb-1">Итоговый рейтинг</div>
        <div className="text-4xl font-bold text-gray-900">
          {evaluation.finalScore?.toFixed(2) ?? '—'}
        </div>
      </div>

      {evaluation.status === 'SUBMITTED' && (
        <div className="bg-white rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Ваша реакция</h3>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={() => react('AGREE')}
              disabled={reacting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <ThumbsUp size={16} />
              Согласен
            </button>
            <button
              onClick={() => react('DISAGREE')}
              disabled={reacting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <ThumbsDown size={16} />
              Не согласен
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
