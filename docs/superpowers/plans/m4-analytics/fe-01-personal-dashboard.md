# M4-FE-01: Personal Dashboard — Color-Coded Rating, Positive/Anti-Bonus Breakdown, Dynamics Chart

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the personal dashboard showing an employee's current rating (color-coded: green ≥80, yellow 60–79, red <60), a breakdown bar showing positive vs anti-bonus contribution, a line chart of rating dynamics over the last 12 periods, and comparison with department/company averages.

**Architecture:** `PersonalDashboardPage` calls `GET /api/v1/analytics/personal`. Rating badge color is computed from `currentScore`. Recharts `LineChart` renders `history` (last 12 periods). Department and company averages displayed as reference lines on the chart.

**Tech Stack:** React 18, Recharts, react-i18next, Tailwind CSS.

**Depends on:** m3-workflow/fe-04-manager-todo.md

---

### Task 1: Personal dashboard

**Files:**
- Create: `frontend/src/features/analytics/analyticsApi.ts`
- Create: `frontend/src/features/analytics/PersonalDashboardPage.tsx`

- [ ] **Step 1: Create analytics API client**

`frontend/src/features/analytics/analyticsApi.ts`:
```ts
import api from '../../app/api'

export interface PeriodScore {
  periodId: number
  periodType: string
  startDate: string
  endDate: string
  score: number
}

export interface PersonalAnalytics {
  userId: number
  fullName: string
  history: PeriodScore[]
  currentScore: number | null
  departmentAvg: number | null
  companyAvg: number | null
}

export interface HierarchicalNode {
  orgUnitId: number
  orgUnitName: string
  type: string
  avgScore: number | null
  minScore: number | null
  maxScore: number | null
  employeeCount: number
  submittedCount: number
  children: HierarchicalNode[]
}

export interface AntiBonusAnalytics {
  top10: Array<{
    userId: number
    fullName: string
    orgUnitName: string | null
    incidentCount: number
    totalDeduction: number
  }>
  distribution: Array<{
    label: string
    rangeFrom: number
    rangeTo: number
    employeeCount: number
  }>
  dynamics: Array<{
    periodId: number
    periodStart: string
    criteriaNameRu: string
    avgRawValue: number
    incidentCount: number
  }>
}

export const analyticsApi = {
  personal: () => api.get<PersonalAnalytics>('/analytics/personal').then(r => r.data),
  hierarchical: (params?: { orgUnitId?: number; periodType?: string; startDate?: string; endDate?: string }) =>
    api.get<HierarchicalNode[]>('/analytics/hierarchical', { params }).then(r => r.data),
  antiBonus: (params?: { orgUnitId?: number; periodType?: string }) =>
    api.get<AntiBonusAnalytics>('/analytics/anti-bonus', { params }).then(r => r.data),
}
```

- [ ] **Step 2: Create PersonalDashboardPage**

`frontend/src/features/analytics/PersonalDashboardPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'
import { analyticsApi, PersonalAnalytics } from './analyticsApi'

function RatingBadge({ score }: { score: number | null }) {
  if (score === null) return <div className="text-4xl font-bold text-gray-400">—</div>

  const colorClass =
    score >= 80 ? 'text-green-600' :
    score >= 60 ? 'text-yellow-500' :
    'text-red-600'

  const bgClass =
    score >= 80 ? 'bg-green-50 border-green-200' :
    score >= 60 ? 'bg-yellow-50 border-yellow-200' :
    'bg-red-50 border-red-200'

  return (
    <div className={`inline-block rounded-2xl border-2 px-8 py-4 text-center ${bgClass}`}>
      <div className={`text-6xl font-bold ${colorClass}`}>{score.toFixed(1)}</div>
      <div className="text-sm text-gray-500 mt-1">текущий рейтинг</div>
    </div>
  )
}

function ComparisonCard({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>
        {value !== null ? value.toFixed(1) : '—'}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

export function PersonalDashboardPage() {
  const [data, setData] = useState<PersonalAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.personal()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>
  if (!data) return <div className="text-center py-12 text-red-500">Ошибка загрузки</div>

  const chartData = [...data.history].reverse().map(h => ({
    name: h.startDate.slice(0, 7), // YYYY-MM
    score: Number(h.score.toFixed(2)),
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мой KPI</h1>

      {/* Current score */}
      <div className="flex flex-col items-center mb-8">
        <RatingBadge score={data.currentScore} />
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <ComparisonCard
          label="Средний по отделу"
          value={data.departmentAvg}
          color="text-blue-600"
        />
        <ComparisonCard
          label="Средний по компании"
          value={data.companyAvg}
          color="text-purple-600"
        />
      </div>

      {/* Dynamics chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Динамика рейтинга</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {data.departmentAvg !== null && (
                <ReferenceLine y={Number(data.departmentAvg.toFixed(1))}
                  stroke="#3b82f6" strokeDasharray="5 5"
                  label={{ value: 'Отдел', position: 'right', fontSize: 10 }} />
              )}
              {data.companyAvg !== null && (
                <ReferenceLine y={Number(data.companyAvg.toFixed(1))}
                  stroke="#8b5cf6" strokeDasharray="5 5"
                  label={{ value: 'Компания', position: 'right', fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="score" stroke="#1e40af" strokeWidth={2}
                dot={{ r: 3 }} name="Мой рейтинг" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length === 0 && (
        <div className="text-center py-8 text-gray-400 bg-white rounded-lg border border-gray-200">
          Нет данных для отображения — оценки ещё не проводились
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire route**

```tsx
// In App.tsx:
import { PersonalDashboardPage } from './features/analytics/PersonalDashboardPage'
<Route path="my-kpi" element={<PersonalDashboardPage />} />
```

```tsx
// In Sidebar.tsx:
{ to: '/my-kpi', label: t('nav.myKpi'), roles: ['EMPLOYEE', 'HEAD_OF_DEPARTMENT_UNIT', 'HEAD_OF_DEPARTMENT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN'] },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/analytics/analyticsApi.ts \
        frontend/src/features/analytics/PersonalDashboardPage.tsx \
        frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat(fe/analytics): add personal KPI dashboard with color-coded rating, comparisons, and Recharts dynamics"
```
