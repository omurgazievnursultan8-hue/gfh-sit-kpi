import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { Criteria, CriteriaRequest, CriteriaType } from '../criteriaApi'
import { OrgUnit } from '../../org/orgApi'

interface Props {
  open: boolean
  editing: Criteria | null
  prefill?: Partial<CriteriaRequest> | null
  orgUnits: OrgUnit[]
  onSave: (data: CriteriaRequest) => Promise<void>
  onClose: () => void
}

export function CriteriaFormModal({ open, editing, prefill, orgUnits, onSave, onClose }: Props) {
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
    } else if (prefill) {
      setNameRu(prefill.nameRu ?? '')
      setNameKg(prefill.nameKg ?? '')
      setType(prefill.type ?? 'POSITIVE')
      setWeight(prefill.weight != null ? prefill.weight.toString() : '')
      setOrgUnitId(prefill.orgUnitId != null ? prefill.orgUnitId.toString() : '')
      setAutoCalculated(prefill.autoCalculated ?? false)
    } else {
      setNameRu(''); setNameKg(''); setType('POSITIVE')
      setWeight(''); setOrgUnitId(''); setAutoCalculated(false)
    }
    setError('')
  }, [open, editing, prefill])

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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-5">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] p-6 border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
            {editing ? 'Редактировать критерий' : (prefill ? 'Дублировать критерий' : 'Новый критерий')}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Название (RU)</label>
            <input value={nameRu} onChange={e => setNameRu(e.target.value)} required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13.5px] outline-none focus:border-[var(--crit-accent,#0a6b4e)] focus:ring-2 focus:ring-[var(--crit-accent,#0a6b4e)]/15" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Название (KG)</label>
            <input value={nameKg} onChange={e => setNameKg(e.target.value)} required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13.5px] outline-none focus:border-[var(--crit-accent,#0a6b4e)] focus:ring-2 focus:ring-[var(--crit-accent,#0a6b4e)]/15" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Тип</label>
            <select value={type} onChange={e => setType(e.target.value as CriteriaType)}
              disabled={!!editing}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13.5px] outline-none focus:border-[var(--crit-accent,#0a6b4e)] focus:ring-2 focus:ring-[var(--crit-accent,#0a6b4e)]/15 disabled:bg-slate-50 disabled:text-slate-500">
              <option value="POSITIVE">Положительный</option>
              <option value="ANTI_BONUS">Антибонус</option>
            </select>
            {editing && <p className="text-[11.5px] text-slate-400 mt-1">Тип нельзя изменить после создания</p>}
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Вес (%)
              {editing?.frozen && <span className="ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#fbf2dd] text-[#b27b14] border border-[#b27b14]/25">заморожен</span>}
            </label>
            <input type="number" step="0.01" min="0.01" max="100"
              value={weight} onChange={e => setWeight(e.target.value)} required
              disabled={editing?.frozen}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13.5px] outline-none focus:border-[var(--crit-accent,#0a6b4e)] focus:ring-2 focus:ring-[var(--crit-accent,#0a6b4e)]/15 disabled:bg-slate-50 disabled:text-slate-500 tabular-nums" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Область применения</label>
            <select value={orgUnitId} onChange={e => setOrgUnitId(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-[13.5px] outline-none focus:border-[var(--crit-accent,#0a6b4e)] focus:ring-2 focus:ring-[var(--crit-accent,#0a6b4e)]/15">
              <option value="">Глобальный (все подразделения)</option>
              {orgUnits.map(u => (
                <option key={u.id} value={u.id}>{u.nameRu}</option>
              ))}
            </select>
          </div>
          {type === 'ANTI_BONUS' && (
            <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
              <input type="checkbox" checked={autoCalculated}
                onChange={e => setAutoCalculated(e.target.checked)} className="rounded accent-[var(--crit-accent,#0a6b4e)]" />
              Рассчитывается автоматически (из производственного календаря)
            </label>
          )}
          {error && <p className="text-[13px] text-[#b3261e] bg-[#fbeae8] border border-[#b3261e]/25 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-slate-300 rounded-lg text-[13.5px] font-medium text-slate-700 hover:bg-slate-50">
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-10 bg-[var(--crit-accent,#0a6b4e)] text-white rounded-lg text-[13.5px] font-medium hover:bg-[var(--crit-accent-700,#095a42)] disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
