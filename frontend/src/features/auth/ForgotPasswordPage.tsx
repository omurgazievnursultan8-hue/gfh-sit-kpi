import { useState, FormEvent, useId } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../app/api'
import type { AxiosError } from 'axios'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const emailId = useId()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/password/forgot', { email })
      setSent(true)
    } catch (err) {
      const ax = err as AxiosError<{ messageRu?: string; message_ru?: string }>
      const data = ax.response?.data
      setError(data?.messageRu ?? data?.message_ru ?? (t('auth.forgotFailed', 'Не удалось отправить письмо. Попробуйте позже.') as string))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p
            className="text-green-600 font-medium mb-4"
            role="status"
            aria-live="polite"
          >
            {t('auth.forgotSent', 'Если аккаунт с таким email существует, письмо со ссылкой для сброса пароля было отправлено.')}
          </p>
          <Link to="/login" className="text-primary hover:underline">
            ← {t('auth.backToLogin', 'Вернуться к входу')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {t('auth.forgotTitle', 'Восстановление пароля')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor={emailId} className="block text-sm text-gray-700 mb-1">
              {t('auth.email', 'Email')}
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            {loading ? t('common.sending', 'Отправка...') : t('auth.sendResetLink', 'Отправить ссылку')}
          </button>
        </form>
        <Link to="/login" className="block mt-4 text-center text-sm text-primary hover:underline">
          ← {t('auth.backToLogin', 'Вернуться к входу')}
        </Link>
      </div>
    </div>
  )
}
