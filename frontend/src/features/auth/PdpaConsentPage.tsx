import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../../app/store'
import { setAuthState } from './authSlice'
import api from '../../app/api'
import axios from 'axios'

export function PdpaConsentPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/pdpa/accept?version=1.0')
      dispatch(setAuthState({ pdpaRequired: false }))
      navigate('/dashboard')
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message_ru?: string })?.message_ru : undefined
      setError(msg ?? 'Ошибка при сохранении согласия')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-lg w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Согласие на обработку персональных данных
        </h2>
        <div className="bg-gray-50 rounded-md p-4 mb-6 max-h-64 overflow-y-auto text-sm text-gray-700 leading-relaxed">
          <p className="mb-3">
            В соответствии с Законом Кыргызской Республики «О персональных данных», ОАО «Государственный финансовый холдинг» обрабатывает ваши персональные данные в целях оценки эффективности работы сотрудников.
          </p>
          <p className="mb-3">
            Обрабатываемые данные: ФИО, должность, подразделение, результаты оценки эффективности, история оценок, даты входа в систему.
          </p>
          <p>
            Данные хранятся на серверах ГФХ и не передаются третьим лицам. Вы имеете право на доступ к своим данным и их выгрузку через раздел «Профиль».
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Я ознакомился(-лась) с политикой обработки персональных данных и даю своё согласие на обработку данных в указанных целях.
          </span>
        </label>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <button
          onClick={handleAccept}
          disabled={!agreed || loading}
          className="w-full py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Принять и продолжить'}
        </button>
      </div>
    </div>
  )
}
