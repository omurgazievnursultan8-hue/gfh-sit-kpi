# M4-FE-02: Manager Operational Dashboard — Progress Bar, Subordinates Table, Top-3/Bottom-3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the manager's operational dashboard showing: completion progress bar for the current period, a table of all subordinates with their current scores, and top-3/bottom-3 highlights.

**Architecture:** `ManagerDashboardPage` calls `GET /api/v1/analytics/hierarchical` (filtered to the manager's org unit) and `GET /api/v1/evaluations/my-tasks/stats` for period progress. Subordinates table shows name, score (color-coded), and status. Top-3 / Bottom-3 extracted from the sorted list.

**Tech Stack:** React 18, Recharts, Tailwind CSS.

**Depends on:** m4-analytics/fe-01-personal-dashboard.md

---

### Task 1: Manager dashboard

**Files:**
- Create: `frontend/src/features/analytics/ManagerDashboardPage.tsx`

- [ ] **Step 1: Create ManagerDashboardPage**

`frontend/src/features/analytics/ManagerDashboardPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Trophy, TrendingDown, Users } from 'lucide-react'
import { RootState } from '../../app/store'
import { analyticsApi } from './analyticsApi'
import { evaluationsApi, Evaluation } from '../evaluations/evaluationsApi'
import api from '../../app/api'

interface SubordinateScore {
  userId: number
  fullName: string
  score: number | null
  rank: number
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">—</span>
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  return <span className={`font-mono font-semibold ${color}`}>{score.toFixed(1)}</span>
}

export function ManagerDashboardPage() {
  const { user } = useSelector((s: RootState) => s.auth)
  const navigate = useNavigate()

  const [subordinates, setSubordinates] = useState<SubordinateScore[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orgUnitId = user?.orgUnitId
    Promise.all([
      // Get subordinate rankings from analytics
      orgUnitId
        ? api.get<Array<[number, string, number, number]>>(
            `/analytics/ranking?orgUnitId=${orgUnitId}&periodId=0`
          ).then(r => r.data).catch(() => [])
        : Promise.resolve([]),
      // Get pending evaluations count
      evaluationsApi.myTasks(0, 200),
    ]).then(([rankingRaw, tasks]) => {
      const scores: SubordinateScore[] = rankingRaw.map((row) => ({
        userId: row[0] as number,
        fullName: row[1] as string,
        score: row[2] as number | null,
        rank: row[3] as number,
      }))
      setSubordinates(scores)
      setPendingCount(tasks.content.filter(e => e.status === 'DRAFT').length)
      setTotalCount(tasks.totalElements)
    }).finally(() => setLoading(false))
  }, [user])

  const pct = totalCount === 0 ? 0 : Math.round(((totalCount - pendingCount) / totalCount) * 100)
  const sorted = [...subordinates].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const top3 = sorted.filter(s => s.score !== null).slice(0, 3)
  const bottom3 = sorted.filter(s => s.score !== null).slice(-3).reverse()

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Операционный дашборд</h1>

      {/* Progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className="font-medium">Прогресс оценок</span>
          <span>{totalCount - pendingCount} / {totalCount} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-yellow-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => navigate('/my-tasks')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Перейти к задачам ({pendingCount} ожидают) →
          </button>
        )}
      </div>

      {/* Top 3 / Bottom 3 */}
      {(top3.length > 0 || bottom3.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {top3.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} className="text-green-600" />
                <span className="font-semibold text-green-800 text-sm">Топ-3</span>
              </div>
              {top3.map((s, i) => (
                <div key={s.userId} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">
                    <span className="font-bold text-green-700 mr-2">#{i + 1}</span>
                    {s.fullName}
                  </span>
                  <ScoreCell score={s.score} />
                </div>
              ))}
            </div>
          )}
          {bottom3.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-red-600" />
                <span className="font-semibold text-red-800 text-sm">Требуют внимания</span>
              </div>
              {bottom3.map((s) => (
                <div key={s.userId} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">{s.fullName}</span>
                  <ScoreCell score={s.score} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full subordinates table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <Users size={16} className="text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">
            Все подчинённые ({subordinates.length})
          </span>
        </div>
        {subordinates.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            Нет данных для текущего периода
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Место</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ФИО</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Рейтинг</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((s, i) => (
                <tr key={s.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-500">#{i + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{s.fullName}</td>
                  <td className="px-4 py-2"><ScoreCell score={s.score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire route**

```tsx
// In App.tsx:
import { ManagerDashboardPage } from './features/analytics/ManagerDashboardPage'

// Replace or add alongside manager todo route:
<Route path="manager-dashboard" element={
  <ProtectedRoute allowedRoles={['HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN']}>
    <ManagerDashboardPage />
  </ProtectedRoute>
} />
```

Add to `Sidebar.tsx`:
```tsx
{ to: '/manager-dashboard', label: t('nav.managerDashboard'), roles: ['HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN'] },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analytics/ManagerDashboardPage.tsx \
        frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat(fe/analytics): add manager dashboard with progress bar, top-3/bottom-3, and subordinates ranking table"
```
