# M5-FE-02: Admin Panel — Unified Navigation to All Admin Sections

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified admin layout with a sidebar that links to every admin section (users, org structure, criteria, evaluation periods, delegations, system settings, production calendar, audit log, monitoring). Add an admin dashboard landing page showing key system stats fetched from `GET /api/v1/admin/stats`.

**Architecture:** `AdminLayout` wraps all `/admin/*` routes with a persistent left sidebar. The sidebar is just nav links — the individual section UIs (user management, criteria, etc.) are already implemented in earlier modules. `AdminDashboardPage` is the `/admin` landing that shows stat cards. Stat cards call `GET /api/v1/admin/stats`. The admin routes are protected by `role === 'ADMIN'` guard in the router.

**Tech Stack:** React 18, React Router v6, react-i18next, Tailwind CSS, shadcn/ui.

**Depends on:** m5-admin/be-02-audit-admin-api.md, m5-admin/fe-01-i18n-language-switcher.md

---

### Task 1: Admin layout + sidebar

**Files:**
- Create: `frontend/src/features/admin/AdminLayout.tsx`
- Create: `frontend/src/features/admin/AdminSidebar.tsx`

- [ ] **Step 1: Create AdminSidebar**

`frontend/src/features/admin/AdminSidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users, Building2, ListChecks, Calendar, GitBranch,
  Settings, CalendarDays, ClipboardList, Activity
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin', label: 'admin.stats',       icon: Activity,      end: true },
  { to: '/admin/users',       label: 'admin.users',       icon: Users },
  { to: '/admin/org',         label: 'admin.orgStructure', icon: Building2 },
  { to: '/admin/criteria',    label: 'admin.criteria',    icon: ListChecks },
  { to: '/admin/periods',     label: 'admin.periods',     icon: Calendar },
  { to: '/admin/delegations', label: 'admin.delegations', icon: GitBranch },
  { to: '/admin/settings',    label: 'admin.settings',    icon: Settings },
  { to: '/admin/calendar',    label: 'admin.calendar',    icon: CalendarDays },
  { to: '/admin/audit',       label: 'admin.auditLog',    icon: ClipboardList },
  { to: '/admin/monitoring',  label: 'admin.monitoring',  icon: Activity },
]

export function AdminSidebar() {
  const { t } = useTranslation()

  return (
    <nav className="w-56 shrink-0 border-r border-gray-200 bg-white h-full py-4">
      <div className="px-4 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('admin.title')}
        </span>
      </div>
      <ul className="space-y-0.5 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: Create AdminLayout**

`frontend/src/features/admin/AdminLayout.tsx`:
```tsx
import { Outlet, Navigate } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'
import { selectCurrentUser } from '../auth/authSlice'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  const user = useAppSelector(selectCurrentUser)

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/admin/AdminLayout.tsx \
        frontend/src/features/admin/AdminSidebar.tsx
git commit -m "feat(admin): add AdminLayout with persistent sidebar and role guard"
```

---

### Task 2: Admin dashboard page with stats

**Files:**
- Create: `frontend/src/features/admin/adminApi.ts`
- Create: `frontend/src/features/admin/AdminDashboardPage.tsx`
- Modify: `frontend/src/app/router.tsx`

- [ ] **Step 1: Create adminApi**

`frontend/src/features/admin/adminApi.ts`:
```ts
import api from '../../app/api'

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  activeEvaluationPeriods: number
  pendingEvaluations: number
  totalEvaluations: number
  openAppeals: number
  auditLogsLast24h: number
}

export interface QuartzJobInfo {
  name: string
  group: string
  description: string | null
  cronExpression: string | null
  previousFireTime: string | null
  nextFireTime: string | null
  state: string
}

export interface ErrorLogsResponse {
  lines: string[]
}

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats').then(r => r.data),
  getQuartzJobs: () => api.get<QuartzJobInfo[]>('/admin/quartz-jobs').then(r => r.data),
  getErrorLogs: () => api.get<ErrorLogsResponse>('/admin/error-logs').then(r => r.data),
}
```

- [ ] **Step 2: Create AdminDashboardPage**

`frontend/src/features/admin/AdminDashboardPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, BarChart3, ClipboardCheck, MessageSquare, Shield, Activity } from 'lucide-react'
import { adminApi, AdminStats } from './adminApi'

interface StatCardProps {
  label: string
  value: number | undefined
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {value ?? '—'}
          </p>
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>
  if (error) return <p className="text-red-500">{error}</p>

  const cards: StatCardProps[] = [
    {
      label: t('user.title'),
      value: stats?.activeUsers,
      icon: <Users className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      label: t('admin.periods'),
      value: stats?.activeEvaluationPeriods,
      icon: <BarChart3 className="h-6 w-6 text-green-600" />,
      color: 'bg-green-50',
    },
    {
      label: t('evaluation.toEvaluate'),
      value: stats?.pendingEvaluations,
      icon: <ClipboardCheck className="h-6 w-6 text-yellow-600" />,
      color: 'bg-yellow-50',
    },
    {
      label: t('appeal.statusOpen'),
      value: stats?.openAppeals,
      icon: <MessageSquare className="h-6 w-6 text-orange-600" />,
      color: 'bg-orange-50',
    },
    {
      label: t('common.total') + ' ' + t('evaluation.title').toLowerCase(),
      value: stats?.totalEvaluations,
      icon: <Activity className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-50',
    },
    {
      label: t('audit.title') + ' (24ч)',
      value: stats?.auditLogsLast24h,
      icon: <Shield className="h-6 w-6 text-gray-600" />,
      color: 'bg-gray-100',
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('admin.stats')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire admin routes into the router**

In `frontend/src/app/router.tsx`, add admin routes as children of `AdminLayout`. The individual pages (UsersPage, OrgPage, etc.) were already created in their respective modules — import and reference them here:

```tsx
import { AdminLayout } from '../features/admin/AdminLayout'
import { AdminDashboardPage } from '../features/admin/AdminDashboardPage'
// Already-created pages from earlier modules:
import { UsersPage } from '../features/users/UsersPage'
import { OrgPage } from '../features/org/OrgPage'
import { DelegationsPage } from '../features/org/DelegationsPage'
import { CriteriaPage } from '../features/criteria/CriteriaPage'
import { PeriodsPage } from '../features/evaluations/PeriodsPage'
import { SystemSettingsPage } from '../features/settings/SystemSettingsPage'
import { ProductionCalendarPage } from '../features/settings/ProductionCalendarPage'
import { AuditLogPage } from '../features/admin/audit/AuditLogPage'
import { AdminMonitoringPage } from '../features/admin/monitoring/AdminMonitoringPage'

// Inside createBrowserRouter routes array, add:
{
  path: 'admin',
  element: <AdminLayout />,
  children: [
    { index: true, element: <AdminDashboardPage /> },
    { path: 'users', element: <UsersPage /> },
    { path: 'org', element: <OrgPage /> },
    { path: 'delegations', element: <DelegationsPage /> },
    { path: 'criteria', element: <CriteriaPage /> },
    { path: 'periods', element: <PeriodsPage /> },
    { path: 'settings', element: <SystemSettingsPage /> },
    { path: 'calendar', element: <ProductionCalendarPage /> },
    { path: 'audit', element: <AuditLogPage /> },
    { path: 'monitoring', element: <AdminMonitoringPage /> },
  ],
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/admin/adminApi.ts \
        frontend/src/features/admin/AdminDashboardPage.tsx \
        frontend/src/app/router.tsx
git commit -m "feat(admin): add AdminDashboardPage with stat cards and wire all admin routes under AdminLayout"
```
