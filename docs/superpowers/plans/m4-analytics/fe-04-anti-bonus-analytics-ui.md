# M4-FE-04: Anti-Bonus Analytics Page — Top-10, Distribution Chart, Dynamics, Filters

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the anti-bonus analytics page with an org unit filter, period type selector, a top-10 employee table by anti-bonus deductions, a score distribution bar chart, and a 12-period dynamics line chart per criteria.

**Architecture:** `AntiBonusAnalyticsPage` fetches `GET /api/v1/analytics/anti-bonus` with org unit and period type filters. Renders three sections: top-10 table, Recharts `BarChart` for distribution, and Recharts `LineChart` for dynamics. Tabs switch between distribution and dynamics views.

**Tech Stack:** React 18, Recharts, Tailwind CSS.

**Depends on:** m4-analytics/fe-03-hierarchical-analytics-ui.md

---

### Task 1: Anti-bonus analytics page

**Files:**
- Create: `frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx`

- [ ] **Step 1: Create AntiBonusAnalyticsPage**

`frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { analyticsApi, AntiBonusAnalytics } from './analyticsApi'
import api from '../../app/api'

interface OrgUnitOption { id: number; name: string }

type Tab = 'distribution' | 'dynamics'

export function AntiBonusAnalyticsPage() {
  const [data, setData] = useState<AntiBonusAnalytics | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [periodType, setPeriodType] = useState<string>('MONTHLY')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('distribution')

  useEffect(() => {
    api.get<any[]>('/org/tree').then(r => {
      const flatten = (units: any[]): OrgUnitOption[] =>
        units.flatMap(u => [{ id: u.id, name: u.name }, ...flatten(u.children || [])])
      setOrgUnits(flatten(r.data))
    })
  }, [])

  const loadData = () => {
    setLoading(true)
    analyticsApi.antiBonus({
      orgUnitId: selectedUnit ? Number(selectedUnit) : undefined,
      periodType,
    }).then(setData).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [selectedUnit, periodType])

  // Group dynamics by criteria for multi-line chart
  const dynamicsLines = data ? [...new Set(data.dynamics.map(d => d.criteriaNameRu))] : []
  const dynamicsData = data
    ? [...new Set(data.dynamics.map(d => d.periodStart))].sort().map(period => {
        const row: Record<string, any> = { period }
        data.dynamics.filter(d => d.periodStart === period)
          .forEach(d => { row[d.criteriaNameRu] = Number(d.avgRawValue.toFixed(2)) })
        return row
      })
    : []

  const LINE_COLORS = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#0284c7', '#7c3aed']

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Аналитика антибонусов</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Подразделение</label>
          <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary">
            <option value="">Все подразделения</option>
            {orgUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Тип периода</label>
          <select value={periodType} onChange={e => setPeriodType(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary">
            <option value="MONTHLY">Ежемесячный</option>
            <option value="QUARTERLY">Квартальный</option>
            <option value="ANNUAL">Годовой</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : !data ? (
        <div className="text-center py-12 text-red-500">Ошибка загрузки</div>
      ) : (
        <div className="space-y-6">
          {/* Top-10 table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">
                Топ-10 по антибонусным удержаниям
              </h2>
            </div>
            {data.top10.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-sm">Нет данных</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Сотрудник</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Подразделение</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Инциденты</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Удержание</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.top10.map((e, i) => (
                    <tr key={e.userId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm font-bold text-gray-500">#{i + 1}</td>
                      <td className="px-3 py-2 text-sm text-gray-900">{e.fullName}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{e.orgUnitName ?? '—'}</td>
                      <td className="px-3 py-2 text-sm font-mono text-orange-600">{e.incidentCount}</td>
                      <td className="px-3 py-2 text-sm font-mono font-bold text-red-600">
                        -{e.totalDeduction.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Tabs */}
          <div>
            <div className="flex gap-1 mb-4 border-b border-gray-200">
              {([['distribution', 'Распределение'], ['dynamics', 'Динамика по периодам']] as [Tab, string][]).map(
                ([key, label]) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      tab === key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}>
                    {label}
                  </button>
                )
              )}
            </div>

            {/* Distribution bar chart */}
            {tab === 'distribution' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-4">
                  Распределение итоговых баллов
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.distribution}
                    margin={{ left: 10, right: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="employeeCount" name="Сотрудников" fill="#1e40af" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Dynamics line chart */}
            {tab === 'dynamics' && dynamicsData.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-4">
                  Динамика антибонусов (последние 12 периодов)
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dynamicsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {dynamicsLines.map((name, i) => (
                      <Line key={name} type="monotone" dataKey={name}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire route**

```tsx
// In App.tsx:
import { AntiBonusAnalyticsPage } from './features/analytics/AntiBonusAnalyticsPage'
<Route path="analytics/anti-bonus" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT']}>
    <AntiBonusAnalyticsPage />
  </ProtectedRoute>
} />
```

Add to `Sidebar.tsx`:
```tsx
{ to: '/analytics/anti-bonus', label: t('nav.antiBonusAnalytics'), roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT'] },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx \
        frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat(fe/analytics): add anti-bonus analytics page with top-10, distribution chart, and dynamics"
```
