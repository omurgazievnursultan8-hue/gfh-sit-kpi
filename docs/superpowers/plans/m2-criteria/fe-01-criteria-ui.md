# M2-FE-01: Criteria Management UI — Positive/Anti-Bonus Tabs, Weight Sum Indicator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the criteria management page with two tabs (Positive / Anti-Bonus), a real-time weight sum progress bar that turns red when approaching 100%, and a form modal for creating/editing criteria with scope selection (global or per org unit).

**Architecture:** `CriteriaPage` fetches all active criteria, splits into positive/anti-bonus tabs. Positive tab shows total weight consumed as a progress bar (green ≤80%, yellow 80–95%, red >95%). ADMIN can open create/edit modals; deactivate shows a confirm dialog. Reactivation available via a "Show inactive" toggle.

**Tech Stack:** React 18, Redux Toolkit, react-i18next, Tailwind CSS, shadcn/ui.

**Depends on:** m1-auth/fe-04-org-delegations-ui.md

---

### Task 1: Criteria API client

**Files:**
- Create: `frontend/src/features/criteria/criteriaApi.ts`

- [ ] **Step 1: Create criteria API client**

`frontend/src/features/criteria/criteriaApi.ts`:
```ts
import api from '../../app/api'

export type CriteriaType = 'POSITIVE' | 'ANTI_BONUS'

export interface Criteria {
  id: number
  nameRu: string
  nameKg: string
  type: CriteriaType
  weight: number
  orgUnitId: number | null
  orgUnitName: string | null
  autoCalculated: boolean
  frozen: boolean
  active: boolean
  createdAt: string
}

export interface CriteriaRequest {
  nameRu: string
  nameKg: string
  type: CriteriaType
  weight: number
  orgUnitId: number | null
  autoCalculated: boolean
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const criteriaApi = {
  list: (page = 0, size = 100) =>
    api.get<PageResponse<Criteria>>('/criteria', { params: { page, size } }).then(r => r.data),
  create: (data: CriteriaRequest) =>
    api.post<Criteria>('/criteria', data).then(r => r.data),
  update: (id: number, data: CriteriaRequest) =>
    api.put<Criteria>(`/criteria/${id}`, data).then(r => r.data),
  deactivate: (id: number) =>
    api.delete(`/criteria/${id}`),
  reactivate: (id: number) =>
    api.post<Criteria>(`/criteria/${id}/reactivate`).then(r => r.data),
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/criteria/criteriaApi.ts
git commit -m "feat(fe/criteria): add criteria API client with CRUD and reactivation"
```

---

### Task 2: WeightBar + CriteriaFormModal components

**Files:**
- Create: `frontend/src/features/criteria/components/WeightBar.tsx`
- Create: `frontend/src/features/criteria/components/CriteriaFormModal.tsx`

- [ ] **Step 1: Create WeightBar component**

`frontend/src/features/criteria/components/WeightBar.tsx`:
```tsx
interface Props {
  used: number  // 0–100
}

export function WeightBar({ used }: Props) {
  const rounded = Math.min(Math.round(used * 100) / 100, 100)

  const colorClass =
    rounded > 95 ? 'bg-red-500' :
    rounded > 80 ? 'bg-yellow-400' :
    'bg-green-500'

  const textClass =
    rounded > 95 ? 'text-red-700' :
    rounded > 80 ? 'text-yellow-700' :
    'text-green-700'

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">Использовано весов</span>
        <span className={`text-sm font-bold ${textClass}`}>{rounded.toFixed(1)}% / 100%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${Math.min(rounded, 100)}%` }}
        />
      </div>
      {rounded > 95 && (
        <p className="text-xs text-red-600 mt-1">
          Внимание: осталось менее 5% для новых критериев
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create CriteriaFormModal**

`frontend/src/features/criteria/components/CriteriaFormModal.tsx`:
```tsx
import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { Criteria, CriteriaRequest, CriteriaType } from '../criteriaApi'

interface OrgUnit {
  id: number
  name: string
}

interface Props {
  open: boolean
  editing: Criteria | null
  orgUnits: OrgUnit[]
  onSave: (data: CriteriaRequest) => Promise<void>
  onClose: () => void
}

export function CriteriaFormModal({ open, editing, orgUnits, onSave, onClose }: Props) {
  const [nameRu, setNameRu] = useState('')
  const [nameKg, setNameKg] = useState('')
  const [type, setType] = useState<CriteriaType>('POSITIVE')
  const [weight, setWeight] = useState('')
  const [orgUnitId, setOrgUnitId] = useState<string>('')
  const [autoCalculated, setAutoCalculated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setNameRu(editing.nameRu)
      setNameKg(editing.nameKg)
      setType(editing.type)
      setWeight(editing.weight.toString())
      setOrgUnitId(editing.orgUnitId?.toString() ?? '')
      setAutoCalculated(editing.autoCalculated)
    } else {
      setNameRu(''); setNameKg(''); setType('POSITIVE')
      setWeight(''); setOrgUnitId(''); setAutoCalculated(false)
    }
    setError('')
  }, [open, editing])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const weightNum = parseFloat(weight)
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 100) {
      setError('Вес должен быть от 0.01 до 100')
      return
    }
    setLoading(true); setError('')
    try {
      await onSave({
        nameRu, nameKg, type,
        weight: weightNum,
        orgUnitId: orgUnitId ? Number(orgUnitId) : null,
        autoCalculated,
      })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editing ? 'Редактировать критерий' : 'Новый критерий'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название (RU)</label>
            <input value={nameRu} onChange={e => setNameRu(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название (KG)</label>
            <input value={nameKg} onChange={e => setNameKg(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
            <select value={type} onChange={e => setType(e.target.value as CriteriaType)}
              disabled={!!editing}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary disabled:bg-gray-50">
              <option value="POSITIVE">Положительный</option>
              <option value="ANTI_BONUS">Антибонус</option>
            </select>
            {editing && <p className="text-xs text-gray-400 mt-1">Тип нельзя изменить после создания</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Вес (%)
              {editing?.frozen && <span className="ml-2 text-xs text-amber-600">заморожен</span>}
            </label>
            <input type="number" step="0.01" min="0.01" max="100"
              value={weight} onChange={e => setWeight(e.target.value)} required
              disabled={editing?.frozen}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary disabled:bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Область применения
            </label>
            <select value={orgUnitId} onChange={e => setOrgUnitId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
              <option value="">Глобальный (все подразделения)</option>
              {orgUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          {type === 'ANTI_BONUS' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={autoCalculated}
                onChange={e => setAutoCalculated(e.target.checked)} className="rounded" />
              Рассчитывается автоматически (из производственного календаря)
            </label>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/criteria/components/
git commit -m "feat(fe/criteria): add WeightBar (color-coded 80/95% thresholds) and CriteriaFormModal"
```

---

### Task 3: CriteriaPage

**Files:**
- Create: `frontend/src/features/criteria/CriteriaPage.tsx`

- [ ] **Step 1: Create CriteriaPage**

`frontend/src/features/criteria/CriteriaPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Plus, RotateCcw } from 'lucide-react'
import { RootState } from '../../app/store'
import { Criteria, criteriaApi, CriteriaRequest } from './criteriaApi'
import { WeightBar } from './components/WeightBar'
import { CriteriaFormModal } from './components/CriteriaFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import api from '../../app/api'

interface OrgUnit { id: number; name: string }

type Tab = 'POSITIVE' | 'ANTI_BONUS'

export function CriteriaPage() {
  const { user } = useSelector((s: RootState) => s.auth)
  const isAdmin = user?.role === 'ADMIN'

  const [allCriteria, setAllCriteria] = useState<Criteria[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('POSITIVE')
  const [showInactive, setShowInactive] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Criteria | null>(null)

  const [deactivateTarget, setDeactivateTarget] = useState<Criteria | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  const loadCriteria = async () => {
    setLoading(true)
    try {
      const data = await criteriaApi.list(0, 200)
      setAllCriteria(data.content)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCriteria()
    api.get<{ content: OrgUnit[] }>('/org/tree').then(r => {
      // Flatten org tree to a simple list for the scope select
      const flatten = (units: any[]): OrgUnit[] =>
        units.flatMap(u => [{ id: u.id, name: u.name }, ...flatten(u.children || [])])
      setOrgUnits(flatten(r.data as any))
    })
  }, [])

  const visibleCriteria = allCriteria.filter(c =>
    c.type === tab && (showInactive ? true : c.active)
  )

  const positiveWeightUsed = allCriteria
    .filter(c => c.type === 'POSITIVE' && c.active && c.orgUnitId === null)
    .reduce((sum, c) => sum + c.weight, 0)

  const handleSave = async (data: CriteriaRequest) => {
    if (editing) {
      await criteriaApi.update(editing.id, data)
    } else {
      await criteriaApi.create(data)
    }
    await loadCriteria()
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivateLoading(true)
    try {
      await criteriaApi.deactivate(deactivateTarget.id)
      setDeactivateTarget(null)
      await loadCriteria()
    } finally {
      setDeactivateLoading(false)
    }
  }

  const handleReactivate = async (c: Criteria) => {
    try {
      await criteriaApi.reactivate(c.id)
      await loadCriteria()
    } catch (err: any) {
      alert(err.response?.data?.message_ru || 'Ошибка при реактивации')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Критерии оценки</h1>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            Добавить критерий
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['POSITIVE', 'ANTI_BONUS'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'POSITIVE' ? 'Положительные' : 'Антибонусы'}
          </button>
        ))}
      </div>

      {/* Weight bar — only for positive tab */}
      {tab === 'POSITIVE' && <WeightBar used={positiveWeightUsed} />}

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{visibleCriteria.length} критериев</p>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)} className="rounded" />
            Показать неактивные
          </label>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Вес %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Область</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleCriteria.map(c => (
                <tr key={c.id} className={`hover:bg-gray-50 ${!c.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.nameRu}</div>
                    <div className="text-xs text-gray-400">{c.nameKg}</div>
                    {c.autoCalculated && (
                      <span className="text-xs text-blue-600">авто</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {c.weight.toFixed(2)}%
                    {c.frozen && <span className="ml-1 text-xs text-amber-600">🔒</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.orgUnitName || <span className="text-gray-400">Глобальный</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {c.active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {c.active ? (
                          <>
                            <button onClick={() => { setEditing(c); setModalOpen(true) }}
                              className="text-sm text-blue-600 hover:underline">
                              Изменить
                            </button>
                            <button onClick={() => setDeactivateTarget(c)}
                              className="text-sm text-red-600 hover:underline">
                              Деактивировать
                            </button>
                          </>
                        ) : (
                          <button onClick={() => handleReactivate(c)}
                            className="flex items-center gap-1 text-sm text-green-600 hover:underline">
                            <RotateCcw size={12} />
                            Реактивировать
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {visibleCriteria.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Критерии не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CriteriaFormModal
        open={modalOpen}
        editing={editing}
        orgUnits={orgUnits}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Деактивировать критерий?"
        message={`«${deactivateTarget?.nameRu}» больше не будет применяться к новым оценкам.`}
        variant="danger"
        loading={deactivateLoading}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Wire route in App.tsx**

In `frontend/src/App.tsx`, add inside the Layout wrapper:
```tsx
import { CriteriaPage } from './features/criteria/CriteriaPage'

<Route path="criteria" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'CHAIRMAN']}>
    <CriteriaPage />
  </ProtectedRoute>
} />
```

Add to `Sidebar.tsx`:
```tsx
{ to: '/criteria', label: t('nav.criteria'), roles: ['ADMIN', 'CHAIRMAN'] },
```

Add to translation files:
```json
{ "nav": { "criteria": "Критерии" } }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/criteria/CriteriaPage.tsx \
        frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat(fe/criteria): add criteria management page with tabs, weight bar, and CRUD modals"
```
