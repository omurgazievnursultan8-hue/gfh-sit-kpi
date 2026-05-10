import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { Criteria, CriteriaRequest, CriteriaType } from '../criteriaApi'
import { OrgUnit } from '../../org/orgApi'

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Область применения</label>
            <select value={orgUnitId} onChange={e => setOrgUnitId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
              <option value="">Глобальный (все подразделения)</option>
              {orgUnits.map(u => (
                <option key={u.id} value={u.id}>{u.nameRu}</option>
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
