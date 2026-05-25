import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { OrgUnit, OrgUnitRequest } from '../orgApi'
import axios from 'axios'

interface UserOption {
  id: number
  fullName: string
}

interface Props {
  open: boolean
  editing: OrgUnit | null
  defaultParent: OrgUnit | null
  users: UserOption[]
  allUnits: OrgUnit[]
  onSave: (data: OrgUnitRequest) => Promise<void>
  onClose: () => void
}

const ORG_TYPES: OrgUnit['type'][] = ['BLOCK', 'DEPARTMENT', 'SLUZHBA', 'OTDEL', 'SEKTOR']
const TYPE_LABELS: Record<OrgUnit['type'], string> = {
  BLOCK: 'Блок', DEPARTMENT: 'Департамент', SLUZHBA: 'Служба', OTDEL: 'Отдел', SEKTOR: 'Сектор',
}

const ALLOWED_PARENT_TYPES: Record<OrgUnit['type'], OrgUnit['type'][]> = {
  BLOCK: [],
  DEPARTMENT: ['BLOCK'],
  SLUZHBA: ['BLOCK'],
  OTDEL: ['BLOCK', 'DEPARTMENT', 'SLUZHBA'],
  SEKTOR: ['BLOCK', 'DEPARTMENT', 'SLUZHBA'],
}

function flattenUnits(units: OrgUnit[]): OrgUnit[] {
  const result: OrgUnit[] = []
  const visit = (u: OrgUnit) => { result.push(u); u.children.forEach(visit) }
  units.forEach(visit)
  return result
}

export function OrgUnitFormModal({ open, editing, defaultParent, users, allUnits, onSave, onClose }: Props) {
  const [nameRu, setNameRu] = useState('')
  const [nameKg, setNameKg] = useState('')
  const [type, setType] = useState<OrgUnit['type']>('BLOCK')
  const [headUserId, setHeadUserId] = useState('')
  const [parentId, setParentId] = useState('')
  const [code, setCode] = useState('')
  const [nameRuShort, setNameRuShort] = useState('')
  const [nameKgShort, setNameKgShort] = useState('')
  const [displayOrder, setDisplayOrder] = useState('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const flat = flattenUnits(allUnits)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setNameRu(editing.nameRu)
      setNameKg(editing.nameKg)
      setType(editing.type)
      setHeadUserId(editing.headUserId?.toString() ?? '')
      setParentId(editing.parentId?.toString() ?? '')
      setCode(editing.code ?? '')
      setNameRuShort(editing.nameRuShort ?? '')
      setNameKgShort(editing.nameKgShort ?? '')
      setDisplayOrder(String(editing.displayOrder ?? 0))
    } else {
      setNameRu(''); setNameKg(''); setType('BLOCK'); setHeadUserId('')
      setParentId(defaultParent?.id.toString() ?? '')
      setCode(''); setNameRuShort(''); setNameKgShort(''); setDisplayOrder('0')
    }
    setError('')
  }, [open, editing, defaultParent])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave({
        nameRu,
        nameKg,
        type,
        headUserId: headUserId ? Number(headUserId) : null,
        parentId: parentId ? Number(parentId) : null,
        code: code.trim() ? code.trim() : null,
        nameRuShort: nameRuShort.trim() ? nameRuShort.trim() : null,
        nameKgShort: nameKgShort.trim() ? nameKgShort.trim() : null,
        displayOrder: displayOrder ? Number(displayOrder) : 0,
      })
      onClose()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message_ru?: string })?.message_ru : undefined
      setError(msg ?? 'Ошибка при сохранении')
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название (рус) *</label>
            <input value={nameRu} onChange={e => setNameRu(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название (кыр) *</label>
            <input value={nameKg} onChange={e => setNameKg(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип *</label>
            <select value={type} onChange={e => setType(e.target.value as OrgUnit['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
              {ORG_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Родительское подразделение</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
              <option value="">— нет (корневое) —</option>
              {flat
                .filter(u => u.id !== editing?.id && ALLOWED_PARENT_TYPES[type].includes(u.type))
                .map(u => (
                  <option key={u.id} value={u.id}>{u.nameRu}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Руководитель</label>
            <select value={headUserId} onChange={e => setHeadUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
              <option value="">— не назначен —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Код</label>
              <input value={code} onChange={e => setCode(e.target.value)} maxLength={32}
                placeholder="напр. DEP-IT"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Порядок</label>
              <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сокр. (рус)</label>
              <input value={nameRuShort} onChange={e => setNameRuShort(e.target.value)} maxLength={64}
                placeholder="напр. ДИТ"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сокр. (кыр)</label>
              <input value={nameKgShort} onChange={e => setNameKgShort(e.target.value)} maxLength={64}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
            </div>
          </div>
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
