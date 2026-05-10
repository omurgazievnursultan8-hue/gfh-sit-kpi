import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, Evaluation } from './evaluationsApi'

export function MyTasksPage() {
  const navigate = useNavigate()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    evaluationsApi.myTasks().then(data => {
      setEvaluations(data.content)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мои задачи по оценке</h1>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет ожидающих оценок</div>
      ) : (
        <div className="space-y-3">
          {evaluations.map(e => (
            <div key={e.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm cursor-pointer"
              onClick={() => navigate(`/evaluations/${e.id}`)}>
              <div>
                <div className="font-medium text-gray-900">{e.evaluateeName}</div>
                <div className="text-sm text-gray-500">Период #{e.periodId}</div>
              </div>
              <span className="text-xs px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                Ожидает заполнения
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
