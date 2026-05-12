import { useState, FormEvent, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { AppDispatch } from '../../app/store'
import { setAuthState } from './authSlice'
import api from '../../app/api'
import type { AxiosError } from 'axios'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmBlurred, setConfirmBlurred] = useState(false)
  const [loading, setLoading] = useState(false)

  const curId = useId()
  const newId = useId()
  const confirmId = useId()
  const errId = useId()

  const mismatch = confirmBlurred && confirmPassword.length > 0 && newPassword !== confirmPassword

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsMismatch', 'Пароли не совпадают') as string)
      return
    }
    setLoading(true)
    try {
      await api.post('/users/password/change', { currentPassword, newPassword })
      dispatch(setAuthState({ passwordExpired: false }))
      navigate('/dashboard')
    } catch (err) {
      const axiosErr = err as AxiosError<{ messageRu?: string; message_ru?: string }>
      const data = axiosErr.response?.data
      setError(data?.messageRu ?? data?.message_ru ?? (t('auth.passwordChangeFailed', 'Ошибка при смене пароля') as string))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('auth.changePassword', 'Смена пароля')}</h2>
        <p className="text-sm text-amber-600 mb-4">
          {t('auth.passwordExpiredHint', 'Срок действия вашего пароля истёк. Необходимо установить новый пароль.')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor={curId} className="block text-sm text-gray-700 mb-1">
              {t('auth.currentPassword', 'Текущий пароль')}
            </label>
            <input
              id={curId}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor={newId} className="block text-sm text-gray-700 mb-1">
              {t('auth.newPassword', 'Новый пароль (минимум 10 символов)')}
            </label>
            <input
              id={newId}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor={confirmId} className="block text-sm text-gray-700 mb-1">
              {t('auth.confirmPassword', 'Подтвердите новый пароль')}
            </label>
            <input
              id={confirmId}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setConfirmBlurred(true)}
              required
              aria-invalid={mismatch || undefined}
              aria-describedby={mismatch ? errId : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            />
            {mismatch && (
              <p id={errId} className="text-sm text-red-600 mt-1">
                {t('auth.passwordsMismatch', 'Пароли не совпадают')}
              </p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert" aria-live="assertive">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || mismatch}
            className="w-full py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('common.saving', 'Сохранение...') : t('auth.changePassword', 'Сменить пароль')}
          </button>
        </form>
      </div>
    </div>
  )
}
