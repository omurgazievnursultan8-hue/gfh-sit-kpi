import { useState, FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login, clearError } from '../authSlice'
import { AppDispatch, RootState } from '../../../app/store'
import { LoginField } from './LoginField'
import { PasswordField } from './PasswordField'
import { LoginBanner } from './LoginBanner'

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
  </svg>
)

export function LoginForm() {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error } = useSelector((s: RootState) => s.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [success, setSuccess] = useState(false)

  const isFormValid = email.trim().length > 0 && password.length > 0
  const isError = !!error && !loading && !success

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isFormValid || loading || success) return
    const result = await dispatch(login({ email, password }))
    if (login.fulfilled.match(result)) {
      setSuccess(true)
      const { passwordExpired, pdpaRequired } = result.payload
      setTimeout(() => {
        if (passwordExpired) navigate('/change-password')
        else if (pdpaRequired) navigate('/pdpa-consent')
        else navigate('/dashboard')
      }, 900)
    }
  }

  const clearErr = () => { if (error) dispatch(clearError()) }

  return (
    <div>
      {isError && (
        <LoginBanner
          variant="error"
          title={t('login.errorTitle')}
          body={t('login.errorBody')}
        />
      )}

      {success && (
        <LoginBanner
          variant="success"
          title={t('login.successTitle')}
          body={t('login.successBody')}
        />
      )}

      <p className="login-all-required">{t('login.allRequired')}</p>

      <form onSubmit={handleSubmit} noValidate autoComplete="on">
        <LoginField
          id="lf-email"
          label={t('login.email')}
          icon={<UserIcon />}
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearErr() }}
          required
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          autoCapitalize="none"
          aria-required="true"
          error={isError}
        />

        <PasswordField
          id="lf-password"
          label={t('login.password')}
          value={password}
          onChange={(v) => { setPassword(v); clearErr() }}
          error={isError}
        />

        <div className="login-row-between">
          <label className="login-checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            <span className={`login-checkbox-box${remember ? ' login-checkbox-box--checked' : ''}`}>
              {remember && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 12 10 17 19 7" />
                </svg>
              )}
            </span>
            {t('login.remember')}
          </label>
          <Link to="/forgot-password" className="login-forgot">
            {t('login.forgotPassword')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || loading || success}
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
            <>
              <span>{t('login.submit')}</span>
              <span className="login-btn-arrow" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" />
                </svg>
              </span>
            </>
          )}
        </button>

        <p className="login-notice">
          {t('login.noticePre')}{' '}
          <a href="#" className="login-notice-link">{t('login.noticeLink')}</a>.
        </p>
      </form>
    </div>
  )
}
