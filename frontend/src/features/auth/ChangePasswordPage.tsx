import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { AppDispatch, RootState } from '../../app/store'
import { setAuthState } from './authSlice'
import api from '../../app/api'
import type { AxiosError } from 'axios'
import { LangSwitcher } from '../../components/shell/LangSwitcher'
import { BrandPanel } from './components/BrandPanel'
import { PasswordField } from './components/PasswordField'
import { LoginBanner } from './components/LoginBanner'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { t } = useTranslation()
  const passwordExpired = useSelector((s: RootState) => s.auth.passwordExpired)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [confirmBlurred, setConfirmBlurred] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const mismatch = confirmBlurred && confirmPassword.length > 0 && newPassword !== confirmPassword
  const isFormValid =
    currentPassword.length > 0 &&
    newPassword.length >= 10 &&
    confirmPassword.length > 0 &&
    !mismatch

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsMismatch', 'Пароли не совпадают') as string)
      return
    }
    if (!isFormValid || loading || success) return
    setLoading(true)
    try {
      await api.post('/users/password/change', { currentPassword, newPassword })
      dispatch(setAuthState({ passwordExpired: false }))
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 900)
    } catch (err) {
      const axiosErr = err as AxiosError<{ messageRu?: string; message_ru?: string }>
      const data = axiosErr.response?.data
      setError(data?.messageRu ?? data?.message_ru ?? (t('auth.passwordChangeFailed', 'Ошибка при смене пароля') as string))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <LangSwitcher />

      <main className="login-card">
        <BrandPanel />

        <section className="login-form-panel" aria-label={t('auth.changePassword', 'Смена пароля') as string}>
          <div className="login-form-head">
            <h1 className="login-form-title">{t('auth.changePassword', 'Смена пароля')}</h1>
            <div className="login-form-rule" aria-hidden="true"><span>◆</span></div>
          </div>

          {passwordExpired && (
            <LoginBanner
              variant="error"
              title={t('auth.passwordExpiredTitle', 'Требуется обновление пароля') as string}
              body={t('auth.passwordExpiredHint', 'Срок действия вашего пароля истёк. Необходимо установить новый пароль.') as string}
            />
          )}

          {error && (
            <LoginBanner
              id="cp-error"
              variant="error"
              title={t('login.errorTitle')}
              body={error}
            />
          )}

          {success && (
            <LoginBanner
              variant="success"
              title={t('common.saved', 'Сохранено') as string}
              body={t('auth.passwordChanged', 'Пароль обновлён. Перенаправляем…') as string}
            />
          )}

          <form onSubmit={handleSubmit} noValidate autoComplete="on">
            <PasswordField
              id="cp-current"
              label={`01 — ${t('auth.currentPassword', 'Текущий пароль')}`}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              describedBy={error ? 'cp-error' : undefined}
              error={!!error}
            />

            <PasswordField
              id="cp-new"
              label={`02 — ${t('auth.newPassword', 'Новый пароль (минимум 10 символов)')}`}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />

            <PasswordField
              id="cp-confirm"
              label={`03 — ${t('auth.confirmPassword', 'Подтвердите новый пароль')}`}
              value={confirmPassword}
              onChange={setConfirmPassword}
              onBlur={() => setConfirmBlurred(true)}
              autoComplete="new-password"
              error={mismatch}
            />
            {mismatch && (
              <p className="login-field-hint login-field-hint--warn" style={{ marginTop: -8, marginBottom: 12 }}>
                {t('auth.passwordsMismatch', 'Пароли не совпадают')}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || success || !isFormValid}
              className={`login-btn-submit${success ? ' login-btn-submit--success' : ''}`}
            >
              {loading ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="login-spinner">
                  <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : success ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 12 10 17 19 7" />
                </svg>
              ) : (
                <span>{t('auth.changePassword', 'Сменить пароль')}</span>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}
