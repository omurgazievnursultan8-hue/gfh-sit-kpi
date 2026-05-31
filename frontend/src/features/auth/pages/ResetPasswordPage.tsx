import { useState, FormEvent, useId } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../../app/api'
import type { AxiosError } from 'axios'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pwdId = useId()

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4" role="alert">
            {t('auth.resetLinkInvalid', 'Недействительная ссылка для сброса пароля.')}
          </p>
          <Link to="/login" className="text-primary hover:underline">
            ← {t('auth.backToLogin', 'Вернуться к входу')}
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/password/reset', { token, newPassword })
      navigate('/login?reset=success')
    } catch (err) {
      const ax = err as AxiosError<{ messageRu?: string; message_ru?: string }>
      const data = ax.response?.data
      setError(data?.messageRu ?? data?.message_ru ?? (t('auth.resetFailed', 'Ошибка. Ссылка недействительна или истекла.') as string))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('auth.newPasswordTitle', 'Новый пароль')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor={pwdId} className="block text-sm text-gray-700 mb-1">
              {t('auth.newPassword', 'Новый пароль (минимум 10 символов)')}
            </label>
            <input
              id={pwdId}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert" aria-live="assertive">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('common.saving', 'Сохранение...') : t('auth.savePassword', 'Сохранить пароль')}
          </button>
        </form>
      </div>
    </div>
  )
}
