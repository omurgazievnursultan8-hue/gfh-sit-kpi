import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LoginForm } from './components/LoginForm'

export function LoginPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">ГФХ</h1>
            <p className="text-gray-500 mt-1">{t('login.title')}</p>
          </div>
          <LoginForm />
          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              {t('login.forgotPassword')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
