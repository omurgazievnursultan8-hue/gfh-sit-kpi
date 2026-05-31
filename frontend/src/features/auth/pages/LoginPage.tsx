import { useTranslation } from 'react-i18next'
import { LangSwitcher } from '@/layouts/shell/LangSwitcher'
import { BrandPanel } from '../components/BrandPanel'
import { LoginForm } from '../components/LoginForm'
import { DevLoginShortcuts } from '../components/DevLoginShortcuts'

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
            <div className="login-form-rule" aria-hidden="true"><span>◆</span></div>
          </div>
          <LoginForm />
        </section>
      </main>

      {/* DEV-ONLY — remove after testing */}
      <DevLoginShortcuts />
    </div>
  )
}
