# M1-FE-03: User Management UI + PDPA Consent Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ADMIN-only user management page (list with search/filter, create, edit, deactivate, reactivate, reset password) and the PDPA consent page shown to users on first login.

**Architecture:** `UsersPage` uses RTK Query-style async thunks to load paginated users from `GET /api/v1/users`. Create/edit handled in a modal dialog. Status changes (deactivate/reactivate) confirmed via a confirmation dialog. PDPA consent page shown when `pdpaRequired=true` after login.

**Tech Stack:** React 18, Redux Toolkit, Tailwind CSS, react-i18next.

**Depends on:** m1-auth/fe-02-login-flow.md

---

### Task 1: Shared UI components (Layout, Header, Sidebar)

**Files:**
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/Header.tsx`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/LanguageSwitcher.tsx`
- Create: `frontend/src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Create LanguageSwitcher**

`frontend/src/components/LanguageSwitcher.tsx`:
```tsx
import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language

  const toggle = () => {
    const next = current === 'ru' ? 'kg' : 'ru'
    i18n.changeLanguage(next)
    localStorage.setItem('gfh_lang', next)
  }

  return (
    <button
      onClick={toggle}
      className="text-sm font-medium px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      aria-label="Switch language"
    >
      {current === 'ru' ? 'KG' : 'RU'}
    </button>
  )
}
```

- [ ] **Step 2: Create ConfirmDialog**

`frontend/src/components/ConfirmDialog.tsx`:
```tsx
interface Props {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({ open, title, description, onConfirm, onCancel, confirmLabel = 'Подтвердить', variant = 'default' }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm text-white rounded-md ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create Header**

`frontend/src/components/Header.tsx`:
```tsx
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logoutAction } from '../features/auth/authSlice'
import { AppDispatch, RootState } from '../app/store'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Header() {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { email, role } = useSelector((s: RootState) => s.auth)

  const handleLogout = async () => {
    await dispatch(logoutAction())
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-10">
      <span className="text-sm text-gray-500">{role}</span>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <span className="text-sm text-gray-700">{email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 hover:underline"
        >
          {t('nav.logout')}
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Create Sidebar**

`frontend/src/components/Sidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { RootState } from '../app/store'

const navItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'EMPLOYEE'] },
  { to: '/users', labelKey: 'nav.users', roles: ['ADMIN'] },
  { to: '/org', labelKey: 'nav.orgStructure', roles: ['ADMIN'] },
  { to: '/criteria', labelKey: 'nav.criteria', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT'] },
  { to: '/evaluations', labelKey: 'nav.evaluations', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'EMPLOYEE'] },
  { to: '/analytics', labelKey: 'nav.analytics', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT'] },
  { to: '/audit', labelKey: 'nav.audit', roles: ['ADMIN', 'CHAIRMAN'] },
  { to: '/settings', labelKey: 'nav.settings', roles: ['ADMIN'] },
]

export function Sidebar() {
  const { t } = useTranslation()
  const { role } = useSelector((s: RootState) => s.auth)

  const visible = navItems.filter(item => role && item.roles.includes(role))

  return (
    <aside className="w-64 bg-gray-900 text-gray-100 fixed top-0 left-0 h-full flex flex-col">
      <div className="h-14 flex items-center px-6 border-b border-gray-700">
        <span className="text-lg font-bold text-white">ГФХ КПИ</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-6 py-3 text-sm transition-colors ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 5: Create Layout**

`frontend/src/components/Layout.tsx`:
```tsx
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-14 p-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Wrap DashboardPage in Layout**

`frontend/src/features/dashboard/DashboardPage.tsx`:
```tsx
import { Layout } from '../../components/Layout'

export function DashboardPage() {
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
      <p className="text-gray-500 mt-1">Добро пожаловать в систему оценки эффективности ГФХ.</p>
    </Layout>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/features/dashboard/DashboardPage.tsx
git commit -m "feat(fe): add Layout, Header, Sidebar with role-based nav, LanguageSwitcher, ConfirmDialog"
```

---

### Task 2: Users page (list, create, edit, deactivate, reactivate)

**Files:**
- Create: `frontend/src/features/users/usersApi.ts`
- Create: `frontend/src/features/users/usersSlice.ts`
- Create: `frontend/src/features/users/UsersPage.tsx`
- Create: `frontend/src/features/users/components/UserTable.tsx`
- Create: `frontend/src/features/users/components/UserFormModal.tsx`

- [ ] **Step 1: Create usersApi**

`frontend/src/features/users/usersApi.ts`:
```ts
import api from '../../app/api'

export interface User {
  id: number
  fullName: string
  email: string
  role: string
  position: string | null
  unitId: number | null
  managerId: number | null
  isActive: boolean
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface UserCreateRequest {
  fullName: string
  email: string
  role: string
  position?: string
  unitId?: number
  managerId?: number
}

export const usersApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<User>>(`/users?page=${page}&size=${size}`).then(r => r.data),
  create: (req: UserCreateRequest) =>
    api.post<User>('/users', req).then(r => r.data),
  update: (id: number, req: Partial<UserCreateRequest>) =>
    api.put<User>(`/users/${id}`, req).then(r => r.data),
  deactivate: (id: number) =>
    api.put(`/users/${id}/deactivate`),
  reactivate: (id: number) =>
    api.put(`/users/${id}/activate`),
  resetPassword: (id: number) =>
    api.post(`/users/${id}/reset-password`),
}
```

- [ ] **Step 2: Create UserTable**

`frontend/src/features/users/components/UserTable.tsx`:
```tsx
import { User } from '../usersApi'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Администратор',
  CHAIRMAN: 'Председатель',
  DEPUTY_CHAIRMAN: 'Зам. председателя',
  HEAD_OF_DEPARTMENT: 'Нач. департамента',
  HEAD_OF_DEPARTMENT_UNIT: 'Нач. отдела',
  EMPLOYEE: 'Сотрудник',
}

interface Props {
  users: User[]
  onEdit: (user: User) => void
  onDeactivate: (user: User) => void
  onReactivate: (user: User) => void
  onResetPassword: (user: User) => void
}

export function UserTable({ users, onEdit, onDeactivate, onReactivate, onResetPassword }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-medium text-gray-600">ФИО</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Роль</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Должность</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{user.fullName}</td>
              <td className="px-4 py-3 text-gray-600">{user.email}</td>
              <td className="px-4 py-3 text-gray-600">{ROLE_LABELS[user.role] || user.role}</td>
              <td className="px-4 py-3 text-gray-600">{user.position || '—'}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {user.isActive ? 'Активен' : 'Неактивен'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => onEdit(user)} className="text-xs text-primary hover:underline">
                    Изменить
                  </button>
                  {user.isActive ? (
                    <button onClick={() => onDeactivate(user)} className="text-xs text-red-600 hover:underline">
                      Деактивировать
                    </button>
                  ) : (
                    <button onClick={() => onReactivate(user)} className="text-xs text-green-600 hover:underline">
                      Активировать
                    </button>
                  )}
                  <button onClick={() => onResetPassword(user)} className="text-xs text-amber-600 hover:underline">
                    Сбросить пароль
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Create UserFormModal**

`frontend/src/features/users/components/UserFormModal.tsx`:
```tsx
import { useState, useEffect, FormEvent } from 'react'
import { User, UserCreateRequest } from '../usersApi'

const ROLES = [
  { value: 'EMPLOYEE', label: 'Сотрудник' },
  { value: 'HEAD_OF_DEPARTMENT_UNIT', label: 'Нач. отдела' },
  { value: 'HEAD_OF_DEPARTMENT', label: 'Нач. департамента' },
  { value: 'DEPUTY_CHAIRMAN', label: 'Зам. председателя' },
  { value: 'CHAIRMAN', label: 'Председатель' },
  { value: 'ADMIN', label: 'Администратор' },
]

interface Props {
  open: boolean
  user: User | null
  onSave: (data: UserCreateRequest) => Promise<void>
  onClose: () => void
}

export function UserFormModal({ open, user, onSave, onClose }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EMPLOYEE')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.fullName)
      setEmail(user.email)
      setRole(user.role)
      setPosition(user.position || '')
    } else {
      setFullName(''); setEmail(''); setRole('EMPLOYEE'); setPosition('')
    }
    setError('')
  }, [user, open])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave({ fullName, email, role, position: position || undefined })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">{user ? 'Редактировать пользователя' : 'Создать пользователя'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
            <input value={position} onChange={e => setPosition(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create UsersPage**

`frontend/src/features/users/UsersPage.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { Layout } from '../../components/Layout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { UserTable } from './components/UserTable'
import { UserFormModal } from './components/UserFormModal'
import { User, usersApi } from './usersApi'

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await usersApi.list(page)
      setUsers(data.content)
      setTotalPages(data.totalPages)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [page])

  const confirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm })
  }

  const handleDeactivate = (user: User) => {
    confirm(
      'Деактивировать пользователя',
      `Вы уверены, что хотите деактивировать ${user.fullName}? Доступ будет заблокирован немедленно.`,
      async () => {
        await usersApi.deactivate(user.id)
        setConfirmDialog(d => ({ ...d, open: false }))
        loadUsers()
      }
    )
  }

  const handleReactivate = (user: User) => {
    confirm('Активировать пользователя', `Активировать ${user.fullName}?`, async () => {
      await usersApi.reactivate(user.id)
      setConfirmDialog(d => ({ ...d, open: false }))
      loadUsers()
    })
  }

  const handleResetPassword = (user: User) => {
    confirm(
      'Сбросить пароль',
      `Сбросить пароль для ${user.fullName}? Пользователю будет выдан временный пароль.`,
      async () => {
        await usersApi.resetPassword(user.id)
        setConfirmDialog(d => ({ ...d, open: false }))
      }
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-blue-700"
        >
          + Создать пользователя
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Загрузка...</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <UserTable
            users={users}
            onEdit={setEditingUser}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
            onResetPassword={handleResetPassword}
          />
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 py-4">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`px-3 py-1 text-sm rounded ${page === i ? 'bg-primary text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <UserFormModal
        open={showCreateModal || !!editingUser}
        user={editingUser}
        onClose={() => { setShowCreateModal(false); setEditingUser(null) }}
        onSave={async (data) => {
          if (editingUser) {
            await usersApi.update(editingUser.id, data)
          } else {
            await usersApi.create(data)
          }
          loadUsers()
        }}
      />

      <ConfirmDialog
        {...confirmDialog}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
        variant="danger"
      />
    </Layout>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/users/ src/components/
git commit -m "feat(fe/users): add user management page with list, create, edit, deactivate, reactivate"
```

---

### Task 3: PDPA Consent page

**Files:**
- Modify: `frontend/src/features/auth/PdpaConsentPage.tsx`

- [ ] **Step 1: Implement PdpaConsentPage**

`frontend/src/features/auth/PdpaConsentPage.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setAuthState } from './authSlice'
import api from '../../app/api'

export function PdpaConsentPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await api.post('/auth/pdpa/accept?version=1.0')
      dispatch(setAuthState({ pdpaRequired: false }))
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-lg w-full">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Согласие на обработку персональных данных
        </h2>
        <div className="bg-gray-50 rounded-md p-4 mb-6 max-h-64 overflow-y-auto text-sm text-gray-700 leading-relaxed">
          <p className="mb-3">
            В соответствии с Законом Кыргызской Республики «О персональных данных», ОАО «Государственный финансовый холдинг» обрабатывает ваши персональные данные в целях оценки эффективности работы сотрудников.
          </p>
          <p className="mb-3">
            Обрабатываемые данные: ФИО, должность, подразделение, результаты оценки эффективности, история оценок, даты входа в систему.
          </p>
          <p>
            Данные хранятся на серверах ГФХ и не передаются третьим лицам. Вы имеете право на доступ к своим данным и их выгрузку через раздел «Профиль».
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">
            Я ознакомился(-лась) с политикой обработки персональных данных и даю своё согласие на обработку данных в указанных целях.
          </span>
        </label>
        <button
          onClick={handleAccept}
          disabled={!agreed || loading}
          className="w-full py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Сохранение...' : 'Принять и продолжить'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/PdpaConsentPage.tsx
git commit -m "feat(fe/auth): add PDPA consent page with checkbox and API call"
```
