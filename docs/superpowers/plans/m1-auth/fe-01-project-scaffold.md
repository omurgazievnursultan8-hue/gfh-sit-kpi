# M1-FE-01: Frontend Project Scaffold

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the React.js frontend project with Vite, Redux Toolkit, React Router v6, Tailwind CSS, shadcn/ui, and react-i18next. Set up feature-based folder structure, Axios API client with cookie support, and routing skeleton.

**Architecture:** `frontend/` directory at project root. Feature-based structure: `src/features/auth/`, `src/features/users/`, `src/features/org/`, etc. Global state in Redux Toolkit store. Axios instance configured to send cookies and `X-CSRF-TOKEN` header. react-i18next loads translations lazily from `public/locales/{ru,kg}/translation.json`.

**Tech Stack:** Vite 5, React 18, Redux Toolkit 2.x, React Router v6, Tailwind CSS 3, shadcn/ui, Axios, react-i18next.

**Depends on:** m1-auth/be-06-infra-setup.md (all M1 backend tasks done)

---

### Task 1: Vite project + dependencies

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`

- [ ] **Step 1: Initialize Vite React TypeScript project**

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install \
  @reduxjs/toolkit react-redux \
  react-router-dom \
  axios \
  react-i18next i18next i18next-http-backend i18next-browser-languagedetector \
  recharts \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select \
  @radix-ui/react-toast @radix-ui/react-tabs @radix-ui/react-checkbox \
  lucide-react \
  clsx tailwind-merge \
  class-variance-authority

npm install -D tailwindcss postcss autoprefixer @types/react @types/react-dom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

`frontend/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e40af',
          foreground: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Configure Vite proxy for dev**

`frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
})
```

- [ ] **Step 5: Create src/main.tsx**

`frontend/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store'
import App from './App'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
```

- [ ] **Step 6: Create src/index.css with Tailwind directives**

`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts at http://localhost:5173 with no errors.

- [ ] **Step 8: Commit**

```bash
cd frontend
git add package.json vite.config.ts tailwind.config.js postcss.config.js \
        tsconfig.json index.html src/main.tsx src/index.css
git commit -m "chore(fe): initialize Vite + React + Tailwind + shadcn/ui project scaffold"
```

---

### Task 2: Redux store + Axios client

**Files:**
- Create: `frontend/src/app/store.ts`
- Create: `frontend/src/app/api.ts`
- Create: `frontend/src/features/auth/authSlice.ts`

- [ ] **Step 1: Create Redux store**

`frontend/src/app/store.ts`:
```ts
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

- [ ] **Step 2: Create Axios instance**

`frontend/src/app/api.ts`:
```ts
import axios from 'axios'
import { store } from './store'
import { logout } from '../features/auth/authSlice'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

// Attach CSRF token from cookie to every mutating request
api.interceptors.request.use((config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method || '')) {
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1]
    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = decodeURIComponent(csrfToken)
    }
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = []

const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(undefined)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }
      originalRequest._retry = true
      isRefreshing = true
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true })
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        store.dispatch(logout())
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
```

- [ ] **Step 3: Create authSlice**

`frontend/src/features/auth/authSlice.ts`:
```ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '../../app/api'

interface AuthState {
  userId: number | null
  email: string | null
  role: string | null
  isAuthenticated: boolean
  passwordExpired: boolean
  pdpaRequired: boolean
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  userId: null,
  email: null,
  role: null,
  isAuthenticated: false,
  passwordExpired: false,
  pdpaRequired: false,
  loading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials)
      return data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message_ru || 'Ошибка входа')
    }
  }
)

export const logoutAction = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout')
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false
      state.userId = null
      state.email = null
      state.role = null
    },
    setAuthState: (state, action: PayloadAction<Partial<AuthState>>) => {
      Object.assign(state, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.userId = action.payload.userId
        state.email = action.payload.email
        state.role = action.payload.role
        state.passwordExpired = action.payload.passwordExpired
        state.pdpaRequired = action.payload.pdpaRequired
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(logoutAction.fulfilled, (state) => {
        state.isAuthenticated = false
        state.userId = null
        state.email = null
        state.role = null
      })
  },
})

export const { logout, setAuthState } = authSlice.actions
export default authSlice.reducer
```

- [ ] **Step 4: Commit**

```bash
git add src/app/store.ts src/app/api.ts src/features/auth/authSlice.ts
git commit -m "feat(fe): add Redux store, Axios instance with CSRF + refresh token interceptor, authSlice"
```

---

### Task 3: React Router setup + route structure + i18n

**Files:**
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/i18n.ts`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/public/locales/ru/translation.json`
- Create: `frontend/public/locales/kg/translation.json`

- [ ] **Step 1: Create i18n config**

`frontend/src/i18n.ts`:
```ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ru',
    defaultNS: 'translation',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'gfh_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
```

- [ ] **Step 2: Create initial translation files**

`frontend/public/locales/ru/translation.json`:
```json
{
  "login": {
    "title": "Вход в систему",
    "email": "Email",
    "password": "Пароль",
    "submit": "Войти",
    "error": "Неверный email или пароль",
    "forgotPassword": "Забыли пароль?"
  },
  "nav": {
    "dashboard": "Дашборд",
    "users": "Пользователи",
    "orgStructure": "Оргструктура",
    "criteria": "Критерии",
    "evaluations": "Оценки",
    "analytics": "Аналитика",
    "audit": "Аудит",
    "settings": "Настройки",
    "logout": "Выйти"
  },
  "common": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    "edit": "Редактировать",
    "create": "Создать",
    "active": "Активен",
    "inactive": "Неактивен",
    "loading": "Загрузка...",
    "error": "Произошла ошибка",
    "yes": "Да",
    "no": "Нет"
  }
}
```

`frontend/public/locales/kg/translation.json`:
```json
{
  "login": {
    "title": "Системага кирүү",
    "email": "Email",
    "password": "Сырсөз",
    "submit": "Кирүү",
    "error": "Email же сырсөз туура эмес",
    "forgotPassword": "Сырсөзүңүздү унуттуңузбу?"
  },
  "nav": {
    "dashboard": "Башкы бет",
    "users": "Колдонуучулар",
    "orgStructure": "Уюм структурасы",
    "criteria": "Критерийлер",
    "evaluations": "Баалоолор",
    "analytics": "Аналитика",
    "audit": "Аудит",
    "settings": "Жөндөөлөр",
    "logout": "Чыгуу"
  },
  "common": {
    "save": "Сактоо",
    "cancel": "Жокко чыгаруу",
    "delete": "Жок кылуу",
    "edit": "Өзгөртүү",
    "create": "Түзүү",
    "active": "Активдүү",
    "inactive": "Активсиз",
    "loading": "Жүктөлүүдө...",
    "error": "Ката кетти",
    "yes": "Ооба",
    "no": "Жок"
  }
}
```

- [ ] **Step 3: Create ProtectedRoute**

`frontend/src/components/ProtectedRoute.tsx`:
```tsx
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../app/store'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, role, passwordExpired } = useSelector((s: RootState) => s.auth)

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (passwordExpired) return <Navigate to="/change-password" replace />
  if (allowedRoles && role && !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
```

- [ ] **Step 4: Create App.tsx with route tree**

`frontend/src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { ChangePasswordPage } from './features/auth/ChangePasswordPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './features/auth/ResetPasswordPage'
import { PdpaConsentPage } from './features/auth/PdpaConsentPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { UsersPage } from './features/users/UsersPage'
import { OrgPage } from './features/org/OrgPage'
import { DelegationsPage } from './features/org/DelegationsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/pdpa-consent" element={<ProtectedRoute><PdpaConsentPage /></ProtectedRoute>} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
      <Route path="/org" element={<ProtectedRoute allowedRoles={['ADMIN']}><OrgPage /></ProtectedRoute>} />
      <Route path="/org/delegations" element={<ProtectedRoute allowedRoles={['ADMIN']}><DelegationsPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
```

- [ ] **Step 5: Create placeholder page components**

Create these minimal placeholder files (they will be fully implemented in subsequent FE tasks):

`frontend/src/features/dashboard/DashboardPage.tsx`:
```tsx
export function DashboardPage() { return <div>Dashboard</div> }
```

`frontend/src/features/users/UsersPage.tsx`:
```tsx
export function UsersPage() { return <div>Users</div> }
```

`frontend/src/features/org/OrgPage.tsx`:
```tsx
export function OrgPage() { return <div>Org Structure</div> }
```

`frontend/src/features/org/DelegationsPage.tsx`:
```tsx
export function DelegationsPage() { return <div>Delegations</div> }
```

`frontend/src/features/auth/PdpaConsentPage.tsx`:
```tsx
export function PdpaConsentPage() { return <div>PDPA Consent</div> }
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npm run build 2>&1 | tail -10
```

Expected: `built in X.Xs` with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/ public/locales/
git commit -m "feat(fe): add routing skeleton, i18n config, ProtectedRoute, and placeholder pages"
```
