import { useState, FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import api from '../../app/api'

export function AppealPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const evaluationId = searchParams.get('evaluationId')

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) { setError('Укажите причину апелляции'); return }
    if (!evaluationId) { setError('Не указан ID оценки'); return }

    setLoading(true); setError('')
    try {
      await api.post('/appeals', { evaluationId: Number(evaluationId), reason })
      navigate('/my-evaluations', { state: { message: 'Апелляция успешно подана' } })
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка при подаче апелляции')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle size={24} className="text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Подать апелляцию</h1>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-orange-800">
          Вы не согласны с результатами оценки. Укажите причину — оценщик получит уведомление
          и должен ответить в установленные сроки.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Причина апелляции <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
            rows={6}
            placeholder="Опишите, с чем именно вы не согласны и почему..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-gray-400 mt-1">{reason.length} символов</p>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Отмена
          </button>
          <button type="submit" disabled={loading || !reason.trim()}
            className="flex-1 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50">
            {loading ? 'Отправка...' : 'Подать апелляцию'}
          </button>
        </div>
      </form>
    </div>
  )
}
