# M1-FE-04: Org Structure UI (Tree + CRUD) + Delegations Management UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the org structure tree page (expandable tree with CRUD for blocks/departments/units) and the delegations management page (list, create with evaluatee/evaluator selection and date range, deactivate).

**Architecture:** OrgTreePage calls `GET /api/v1/org/tree` which returns a nested structure; rendered as a recursive tree component. ADMIN can open create/edit modals that call `POST/PUT /api/v1/org/units`. DelegationsPage lists all delegations paginated, filtered by active status; ADMIN creates via modal and deactivates via confirm dialog.

**Tech Stack:** React 18, Redux Toolkit, react-i18next, Tailwind CSS, shadcn/ui.

**Depends on:** m1-auth/fe-03-user-management-ui.md

---

### Task 1: Org structure API client + tree page

**Files:**
- Create: `frontend/src/features/org/orgApi.ts`
- Create: `frontend/src/features/org/components/OrgTreeNode.tsx`
- Create: `frontend/src/features/org/components/OrgUnitFormModal.tsx`
- Create: `frontend/src/features/org/OrgTreePage.tsx`

- [ ] **Step 1: Create org API client**

`frontend/src/features/org/orgApi.ts`:
```ts
import api from '../../app/api'

export interface OrgUnit {
  id: number
  name: string
  type: 'BLOCK' | 'DEPARTMENT' | 'UNIT'
  managerId: number | null
  managerName: string | null
  parentId: number | null
  children: OrgUnit[]
}

export interface OrgUnitRequest {
  name: string
  type: 'BLOCK' | 'DEPARTMENT' | 'UNIT'
  managerId: number | null
  parentId: number | null
}

export const orgApi = {
  getTree: () => api.get<OrgUnit[]>('/org/tree').then(r => r.data),
  createUnit: (data: OrgUnitRequest) => api.post<OrgUnit>('/org/units', data).then(r => r.data),
  updateUnit: (id: number, data: OrgUnitRequest) => api.put<OrgUnit>(`/org/units/${id}`, data).then(r => r.data),
  deleteUnit: (id: number) => api.delete(`/org/units/${id}`),
}
```

- [ ] **Step 2: Create recursive OrgTreeNode component**

`frontend/src/features/org/components/OrgTreeNode.tsx`:
```tsx
import { useState } from 'react'
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react'
import { OrgUnit } from '../orgApi'

const TYPE_LABELS: Record<OrgUnit['type'], string> = {
  BLOCK: 'Блок',
  DEPARTMENT: 'Отдел',
  UNIT: 'Подразделение',
}

const TYPE_COLORS: Record<OrgUnit['type'], string> = {
  BLOCK: 'bg-blue-100 text-blue-800',
  DEPARTMENT: 'bg-green-100 text-green-800',
  UNIT: 'bg-gray-100 text-gray-700',
}

interface Props {
  node: OrgUnit
  isAdmin: boolean
  onEdit: (node: OrgUnit) => void
  onDelete: (node: OrgUnit) => void
  onAddChild: (parent: OrgUnit) => void
  depth?: number
}

export function OrgTreeNode({ node, isAdmin, onEdit, onDelete, onAddChild, depth = 0 }: Props) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-gray-200 pl-4' : ''}>
      <div className="flex items-center gap-2 py-2 group">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <span className="w-4" />
          )}
        </button>

        <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[node.type]}`}>
          {TYPE_LABELS[node.type]}
        </span>

        <span className="font-medium text-gray-900">{node.name}</span>

        {node.managerName && (
          <span className="text-sm text-gray-500">— {node.managerName}</span>
        )}

        {isAdmin && (
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onAddChild(node)}
              title="Добавить дочернее подразделение"
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => onEdit(node)}
              title="Редактировать"
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(node)}
              title="Удалить"
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <OrgTreeNode
              key={child.id}
              node={child}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create OrgUnitFormModal**

`frontend/src/features/org/components/OrgUnitFormModal.tsx`:
```tsx
import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { OrgUnit, OrgUnitRequest } from '../orgApi'

interface User {
  id: number
  fullName: string
}

interface Props {
  open: boolean
  editing: OrgUnit | null
  defaultParent: OrgUnit | null
  users: User[]
  allUnits: OrgUnit[]
  onSave: (data: OrgUnitRequest) => Promise<void>
  onClose: () => void
}

const FLAT_TYPES: OrgUnit['type'][] = ['BLOCK', 'DEPARTMENT', 'UNIT']
const TYPE_LABELS: Record<OrgUnit['type'], string> = {
  BLOCK: 'Блок',
  DEPARTMENT: 'Отдел',
  UNIT: 'Подразделение',
}

function flattenUnits(units: OrgUnit[]): OrgUnit[] {
  const result: OrgUnit[] = []
  const visit = (u: OrgUnit) => { result.push(u); u.children.forEach(visit) }
  units.forEach(visit)
  return result
}

export function OrgUnitFormModal({ open, editing, defaultParent, users, allUnits, onSave, onClose }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<OrgUnit['type']>('BLOCK')
  const [managerId, setManagerId] = useState<string>('')
  const [parentId, setParentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const flat = flattenUnits(allUnits)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setType(editing.type)
      setManagerId(editing.managerId?.toString() ?? '')
      setParentId(editing.parentId?.toString() ?? '')
    } else {
      setName('')
      setType('BLOCK')
      setManagerId('')
      setParentId(defaultParent?.id.toString() ?? '')
    }
    setError('')
  }, [open, editing, defaultParent])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave({
        name,
        type,
        managerId: managerId ? Number(managerId) : null,
        parentId: parentId ? Number(parentId) : null,
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
            {editing ? 'Редактировать подразделение' : 'Новое подразделение'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as OrgUnit['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            >
              {FLAT_TYPES.map(t => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Родительское подразделение (оставьте пустым для корневого)
            </label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="">— нет (корневое) —</option>
              {flat
                .filter(u => u.id !== editing?.id)
                .map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Руководитель</label>
            <select
              value={managerId}
              onChange={e => setManagerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="">— не назначен —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create OrgTreePage**

`frontend/src/features/org/OrgTreePage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Plus } from 'lucide-react'
import { RootState } from '../../app/store'
import { orgApi, OrgUnit, OrgUnitRequest } from './orgApi'
import { OrgTreeNode } from './components/OrgTreeNode'
import { OrgUnitFormModal } from './components/OrgUnitFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import api from '../../app/api'

interface UserOption {
  id: number
  fullName: string
}

export function OrgTreePage() {
  const { user } = useSelector((s: RootState) => s.auth)
  const isAdmin = user?.role === 'ADMIN'

  const [tree, setTree] = useState<OrgUnit[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OrgUnit | null>(null)
  const [defaultParent, setDefaultParent] = useState<OrgUnit | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadTree = async () => {
    setLoading(true)
    try {
      const data = await orgApi.getTree()
      setTree(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTree()
    api.get<{ content: UserOption[] }>('/users?size=200').then(r => setUsers(r.data.content))
  }, [])

  const handleSave = async (data: OrgUnitRequest) => {
    if (editing) {
      await orgApi.updateUnit(editing.id, data)
    } else {
      await orgApi.createUnit(data)
    }
    await loadTree()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await orgApi.deleteUnit(deleteTarget.id)
      setDeleteTarget(null)
      await loadTree()
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Организационная структура</h1>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setDefaultParent(null); setModalOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
          >
            <Plus size={16} />
            Добавить блок
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : tree.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Структура не настроена</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {tree.map(node => (
            <OrgTreeNode
              key={node.id}
              node={node}
              isAdmin={isAdmin}
              onEdit={n => { setEditing(n); setDefaultParent(null); setModalOpen(true) }}
              onDelete={n => setDeleteTarget(n)}
              onAddChild={n => { setEditing(null); setDefaultParent(n); setModalOpen(true) }}
            />
          ))}
        </div>
      )}

      <OrgUnitFormModal
        open={modalOpen}
        editing={editing}
        defaultParent={defaultParent}
        users={users}
        allUnits={tree}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить подразделение?"
        message={`«${deleteTarget?.name}» и все его дочерние подразделения будут удалены.`}
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/org/
git commit -m "feat(fe/org): add org structure tree page with CRUD modals and acyclism-safe parent selection"
```

---

### Task 2: Delegations API client + delegations page

**Files:**
- Create: `frontend/src/features/delegations/delegationsApi.ts`
- Create: `frontend/src/features/delegations/components/DelegationFormModal.tsx`
- Create: `frontend/src/features/delegations/DelegationsPage.tsx`

- [ ] **Step 1: Create delegations API client**

`frontend/src/features/delegations/delegationsApi.ts`:
```ts
import api from '../../app/api'

export interface Delegation {
  id: number
  evaluateeId: number
  evaluateeName: string
  evaluatorId: number
  evaluatorName: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export interface DelegationRequest {
  evaluateeId: number
  evaluatorId: number
  startDate: string
  endDate: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const delegationsApi = {
  list: (page = 0, size = 20, activeOnly = false) =>
    api.get<PageResponse<Delegation>>('/delegations', { params: { page, size, activeOnly } }).then(r => r.data),
  create: (data: DelegationRequest) =>
    api.post<Delegation>('/delegations', data).then(r => r.data),
  deactivate: (id: number) =>
    api.delete(`/delegations/${id}`),
}
```

- [ ] **Step 2: Create DelegationFormModal**

`frontend/src/features/delegations/components/DelegationFormModal.tsx`:
```tsx
import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { DelegationRequest } from '../delegationsApi'

interface User {
  id: number
  fullName: string
  email: string
}

interface Props {
  open: boolean
  users: User[]
  onSave: (data: DelegationRequest) => Promise<void>
  onClose: () => void
}

export function DelegationFormModal({ open, users, onSave, onClose }: Props) {
  const [evaluateeId, setEvaluateeId] = useState('')
  const [evaluatorId, setEvaluatorId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setEvaluateeId('')
    setEvaluatorId('')
    setStartDate('')
    setEndDate('')
    setError('')
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (evaluateeId === evaluatorId) {
      setError('Оцениваемый и делегат не могут быть одним лицом')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSave({
        evaluateeId: Number(evaluateeId),
        evaluatorId: Number(evaluatorId),
        startDate,
        endDate,
      })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка при создании делегирования')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Новое делегирование</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Оцениваемый сотрудник
            </label>
            <select
              value={evaluateeId}
              onChange={e => setEvaluateeId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="">— выберите —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Делегированный оценщик
            </label>
            <select
              value={evaluatorId}
              onChange={e => setEvaluatorId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
            >
              <option value="">— выберите —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата окончания</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                min={startDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Сохранение...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create DelegationsPage**

`frontend/src/features/delegations/DelegationsPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { delegationsApi, Delegation } from './delegationsApi'
import { DelegationFormModal } from './components/DelegationFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import api from '../../app/api'

interface User {
  id: number
  fullName: string
  email: string
}

export function DelegationsPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [activeOnly, setActiveOnly] = useState(false)
  const [loading, setLoading] = useState(true)

  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  const [deactivateTarget, setDeactivateTarget] = useState<Delegation | null>(null)
  const [deactivateLoading, setDeactivateLoading] = useState(false)

  const loadDelegations = async () => {
    setLoading(true)
    try {
      const data = await delegationsApi.list(page, 20, activeOnly)
      setDelegations(data.content)
      setTotalPages(data.totalPages)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDelegations()
  }, [page, activeOnly])

  useEffect(() => {
    api.get<{ content: User[] }>('/users?size=200').then(r => setUsers(r.data.content))
  }, [])

  const handleSave = async (data: Parameters<typeof delegationsApi.create>[0]) => {
    await delegationsApi.create(data)
    await loadDelegations()
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivateLoading(true)
    try {
      await delegationsApi.deactivate(deactivateTarget.id)
      setDeactivateTarget(null)
      await loadDelegations()
    } finally {
      setDeactivateLoading(false)
    }
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Делегирования оценки</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
        >
          <Plus size={16} />
          Новое делегирование
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={e => { setActiveOnly(e.target.checked); setPage(0) }}
            className="rounded"
          />
          Только активные
        </label>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Оцениваемый</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Делегат</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Период</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {delegations.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{d.evaluateeName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{d.evaluatorName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(d.startDate)} — {formatDate(d.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      d.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {d.isActive ? 'Активно' : 'Завершено'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.isActive && (
                      <button
                        onClick={() => setDeactivateTarget(d)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Деактивировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {delegations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Делегирований не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-8 h-8 rounded text-sm ${
                i === page
                  ? 'bg-primary text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <DelegationFormModal
        open={modalOpen}
        users={users}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Деактивировать делегирование?"
        message={`Делегирование от «${deactivateTarget?.evaluateeName}» к «${deactivateTarget?.evaluatorName}» будет деактивировано.`}
        variant="danger"
        loading={deactivateLoading}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 4: Wire routes in App.tsx**

In `frontend/src/App.tsx`, add imports and routes inside the `<Layout>` wrapper:
```tsx
import { OrgTreePage } from './features/org/OrgTreePage'
import { DelegationsPage } from './features/delegations/DelegationsPage'

// Inside the Layout wrapper routes:
<Route path="org" element={
  <ProtectedRoute allowedRoles={['ADMIN', 'CHAIRMAN']}>
    <OrgTreePage />
  </ProtectedRoute>
} />
<Route path="delegations" element={
  <ProtectedRoute allowedRoles={['ADMIN']}>
    <DelegationsPage />
  </ProtectedRoute>
} />
```

Also add to `Sidebar.tsx` nav items:
```tsx
{ to: '/org', label: t('nav.org'), roles: ['ADMIN', 'CHAIRMAN'] },
{ to: '/delegations', label: t('nav.delegations'), roles: ['ADMIN'] },
```

And add translation keys to `public/locales/ru/translation.json`:
```json
{
  "nav": {
    "org": "Структура",
    "delegations": "Делегирования"
  }
}
```

- [ ] **Step 5: Manual verification**

```bash
cd frontend && npm run dev
```

1. Log in as ADMIN
2. Visit `/org` → tree should render (empty state if no data yet)
3. Click "Добавить блок" → modal opens, fill form, save → tree updates
4. Hover over a node → edit/delete/add-child buttons appear
5. Visit `/delegations` → empty table shown
6. Click "Новое делегирование" → modal opens with user selects and date pickers
7. Toggle "Только активные" checkbox → filters list

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/delegations/ frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat(fe/org): add delegations management page with create/deactivate and active filter"
```
