import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, Evaluation, EvaluationStatus } from './evaluationsApi'

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Ожидает реакции',
  ACKNOWLEDGED: 'Подтверждено',
  APPEALED: 'Апелляция',
  CLOSED: 'Завершено',
}

const STATUS_COLORS: Record<EvaluationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  ACKNOWLEDGED: 'bg-green-100 text-green-700',
  APPEALED: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-blue-100 text-blue-700',
}

export function MyEvaluationsPage() {
  const navigate = useNavigate()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    evaluationsApi.myHistory(page).then(data => {
      setEvaluations(data.content)
      setTotalPages(data.totalPages)
    }).finally(() => setLoading(false))
  }, [page])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мои оценки</h1>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Оценок пока нет</div>
      ) : (
        <>
          <div className="space-y-3">
            {evaluations.map(e => (
              <div
                key={e.id}
                onClick={() => navigate(`/my-evaluations/${e.id}`)}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm cursor-pointer"
              >
                <div>
                  <div className="font-medium text-gray-900">Период #{e.periodId}</div>
                  <div className="text-sm text-gray-500">
                    Оценщик: {e.evaluatorName}
                    {e.finalScore !== null && (
                      <span className="ml-3 font-semibold text-gray-800">
                        Итог: {e.finalScore.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[e.status]}`}>
                  {STATUS_LABELS[e.status]}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded text-sm ${
                    i === page ? 'bg-primary text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
