import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AxiosError } from 'axios'
import api from '../../../app/api'
import { LangSwitcher } from '@/layouts/shell/LangSwitcher'
import { BrandPanel } from '../components/BrandPanel'
import { LoginField } from '../components/LoginField'
import { LoginBanner } from '../components/LoginBanner'

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
)

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isFormValid = email.trim().length > 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isFormValid || loading || sent) return
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/password/forgot', { email })
      setSent(true)
    } catch (err) {
      const ax = err as AxiosError<{ messageRu?: string; message_ru?: string }>
      const data = ax.response?.data
      setError(data?.messageRu ?? data?.message_ru ?? (t('forgot.errorBody') as string))
    } finally {
      setLoading(false)
    }
  }

  const clearErr = () => { if (error) setError('') }
  const isError = !!error && !loading && !sent

  return (
    <div className="login-bg">
      <LangSwitcher />

      <main className="login-card">
        <BrandPanel />

        <section className="login-form-panel" aria-label={t('forgot.title') as string}>
          <div className="login-form-head">
            <h1 className="login-form-title">{t('forgot.title')}</h1>
            <div className="login-form-rule" aria-hidden="true"><span>◆</span></div>
          </div>

          {isError && (
            <LoginBanner
              id="forgot-error"
              variant="error"
              title={t('forgot.errorTitle')}
              body={error}
            />
          )}

          {sent && (
            <LoginBanner
              variant="success"
              title={t('forgot.successTitle')}
              body={t('forgot.successBody')}
            />
          )}

          {!sent && (
            <form onSubmit={handleSubmit} noValidate autoComplete="on">
              <LoginField
                id="fp-email"
                label={`01 — ${t('login.email')}`}
                icon={<MailIcon />}
                type="email"
                placeholder={t('login.emailPh')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={clearErr}
                required
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                autoCapitalize="none"
                aria-required="true"
                aria-describedby={isError ? 'forgot-error' : undefined}
                autoFocus
                error={isError}
              />

              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="login-btn-submit"
              >
                {loading ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="login-spinner">
                    <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <span>{t('forgot.submit')}</span>
                )}
              </button>
            </form>
          )}

          <p className="login-notice">
            <Link to="/login" className="login-notice-link">
              ← {t('forgot.back')}
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}
