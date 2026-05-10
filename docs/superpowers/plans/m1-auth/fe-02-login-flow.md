# M1-FE-02: Login Flow + Token Auto-Refresh + Forced Password Change

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the login page, forgot/reset password pages, forced password change page (shown when `passwordExpired=true`), and idle-timeout auto-logout. Token auto-refresh is already handled by the Axios interceptor from fe-01.

**Architecture:** Login page calls `POST /api/v1/auth/login`, stores user state in Redux, then redirects based on `passwordExpired` and `pdpaRequired` flags. Idle timeout is an `useEffect` hook tracking `mousemove`/`keydown` events; after N minutes of no activity it calls `POST /api/v1/auth/logout` and redirects to `/login`. N comes from system settings (fetched on app load, defaults to 30 min).

**Tech Stack:** React 18, Redux Toolkit, react-i18next, Tailwind CSS, shadcn/ui.

**Depends on:** m1-auth/fe-01-project-scaffold.md

---

### Task 1: Login page

**Files:**
- Create: `frontend/src/features/auth/LoginPage.tsx`
- Create: `frontend/src/features/auth/components/LoginForm.tsx`

- [ ] **Step 1: Create LoginForm component**

`frontend/src/features/auth/components/LoginForm.tsx`:
```tsx
import { useState, FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from '../authSlice'
import { AppDispatch, RootState } from '../../../app/store'

export function LoginForm() {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { loading, error } = useSelector((s: RootState) => s.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = await dispatch(login({ email, password }))
    if (login.fulfilled.match(result)) {
      const { passwordExpired, pdpaRequired } = result.payload
      if (passwordExpired) return navigate('/change-password')
      if (pdpaRequired) return navigate('/pdpa-consent')
      navigate('/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('login.email')}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('login.password')}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? t('common.loading') : t('login.submit')}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create LoginPage**

`frontend/src/features/auth/LoginPage.tsx`:
```tsx
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
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/LoginPage.tsx src/features/auth/components/LoginForm.tsx
git commit -m "feat(fe/auth): add login page with form, Redux dispatch, and redirect on password expiry"
```

---

### Task 2: Forgot password + Reset password pages

**Files:**
- Create: `frontend/src/features/auth/ForgotPasswordPage.tsx`
- Create: `frontend/src/features/auth/ResetPasswordPage.tsx`

- [ ] **Step 1: Create ForgotPasswordPage**

`frontend/src/features/auth/ForgotPasswordPage.tsx`:
```tsx
import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import api from '../../app/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/password/forgot', { email })
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p className="text-green-600 font-medium mb-4">
            Если аккаунт с таким email существует, письмо со ссылкой для сброса пароля было отправлено.
          </p>
          <Link to="/login" className="text-primary hover:underline">← Вернуться к входу</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Восстановление пароля</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Отправка...' : 'Отправить ссылку'}
          </button>
        </form>
        <Link to="/login" className="block mt-4 text-center text-sm text-primary hover:underline">
          ← Вернуться к входу
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ResetPasswordPage**

`frontend/src/features/auth/ResetPasswordPage.tsx`:
```tsx
import { useState, FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../app/api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/password/reset', { token, newPassword })
      navigate('/login', { state: { message: 'Пароль успешно изменён. Войдите с новым паролем.' } })
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка. Ссылка недействительна или истекла.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Новый пароль</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Новый пароль (минимум 10 символов)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сохранить пароль'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/ForgotPasswordPage.tsx src/features/auth/ResetPasswordPage.tsx
git commit -m "feat(fe/auth): add forgot password and reset password pages"
```

---

### Task 3: Forced password change page + idle-timeout logout

**Files:**
- Create: `frontend/src/features/auth/ChangePasswordPage.tsx`
- Create: `frontend/src/hooks/useIdleTimeout.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create ChangePasswordPage**

`frontend/src/features/auth/ChangePasswordPage.tsx`:
```tsx
import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setAuthState } from './authSlice'
import api from '../../app/api'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/password/change', { currentPassword, newPassword })
      dispatch(setAuthState({ passwordExpired: false }))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка при смене пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Смена пароля</h2>
        <p className="text-sm text-amber-600 mb-4">
          Срок действия вашего пароля истёк. Необходимо установить новый пароль.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Текущий пароль"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            placeholder="Новый пароль (минимум 10 символов)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            placeholder="Подтвердите новый пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Сменить пароль'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create idle timeout hook**

`frontend/src/hooks/useIdleTimeout.ts`:
```ts
import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logoutAction } from '../features/auth/authSlice'
import { AppDispatch, RootState } from '../app/store'

const DEFAULT_IDLE_MINUTES = 30

export function useIdleTimeout() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector((s: RootState) => s.auth)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const idleMs = DEFAULT_IDLE_MINUTES * 60 * 1000

    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        await dispatch(logoutAction())
        navigate('/login')
      }, idleMs)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach((ev) => window.addEventListener(ev, reset))
    reset()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isAuthenticated, dispatch, navigate])
}
```

- [ ] **Step 3: Add idle timeout to App.tsx**

In `frontend/src/App.tsx`, import and use the hook:
```tsx
// Add at the top of App component body:
import { useIdleTimeout } from './hooks/useIdleTimeout'

export default function App() {
  useIdleTimeout()
  // ... rest of component unchanged
}
```

- [ ] **Step 4: Verify the full login flow manually**

```bash
cd frontend
npm run dev
```

Open http://localhost:5173:
1. Visit `/login` → fill form → submit → should redirect to `/dashboard`
2. Visit `/forgot-password` → enter email → submit → should show success message
3. While logged in, wait (or set timeout to 5s for testing) → should auto-logout

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/ChangePasswordPage.tsx \
        src/hooks/useIdleTimeout.ts \
        src/App.tsx
git commit -m "feat(fe/auth): add forced password change page and idle-timeout auto-logout hook"
```
