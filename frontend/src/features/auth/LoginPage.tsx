import { useTranslation } from 'react-i18next'
import { LangSwitcher } from '../../shared/layout/LangSwitcher'
import { BrandPanel } from './components/BrandPanel'
import { LoginForm } from './components/LoginForm'

export function LoginPage() {
  const { t } = useTranslation()

  return (
    <div className="login-bg">
      <LangSwitcher />

      <main className="login-card">
        <BrandPanel />

        <section className="login-form-panel" aria-label={t('login.title')}>
          <div className="login-form-head">
            <h1 className="login-form-title">{t('login.title')}</h1>
            <p className="login-form-sub">{t('login.formSub')}</p>
          </div>
          <LoginForm />
        </section>
      </main>
    </div>
  )
}
