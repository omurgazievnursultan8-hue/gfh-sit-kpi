import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { OrgUnit, OrgUnitRequest } from '../api'
import { DASHBOARD_CSS } from '../../dashboard/styles'
import { DV3_FORM_CSS } from '../../dashboard/styles'
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
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{DV3_FORM_CSS}</style>
      <style>{ORG_MODAL_CSS}</style>

      <div className="org-modal-scrim" onClick={onClose}>
        <div
          className="org-modal"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Редактировать подразделение' : 'Новое подразделение'}
          onClick={e => e.stopPropagation()}
        >
          <div className="org-modal-head">
            <div className="org-modal-head-meta">
              <span className="org-modal-kicker">
                {editing ? 'Редактирование' : 'Создание'}
              </span>
              <h3>{editing ? editing.nameRu : 'Новое подразделение'}</h3>
            </div>
            <button className="org-modal-x" onClick={onClose} aria-label="Закрыть" type="button">
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="org-modal-body dv3-form">
            <div className="org-modal-grid">
              <label className="dv3-field">
                <span className="dv3-label">Название (рус) <span className="dv3-req">*</span></span>
                <input
                  className="dv3-input"
                  value={nameRu}
                  onChange={e => setNameRu(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <label className="dv3-field">
                <span className="dv3-label">Название (кыр) <span className="dv3-req">*</span></span>
                <input
                  className="dv3-input"
                  value={nameKg}
                  onChange={e => setNameKg(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="org-modal-grid">
              <label className="dv3-field">
                <span className="dv3-label">Тип <span className="dv3-req">*</span></span>
                <select
                  className="dv3-select"
                  value={type}
                  onChange={e => setType(e.target.value as OrgUnit['type'])}
                >
                  {ORG_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </label>
              <label className="dv3-field">
                <span className="dv3-label">Родитель</span>
                <select
                  className="dv3-select"
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                >
                  <option value="">— корневое —</option>
                  {flat
                    .filter(u => u.id !== editing?.id && ALLOWED_PARENT_TYPES[type].includes(u.type))
                    .map(u => (
                      <option key={u.id} value={u.id}>{u.nameRu}</option>
                    ))}
                </select>
              </label>
            </div>

            <label className="dv3-field">
              <span className="dv3-label">Руководитель</span>
              <select
                className="dv3-select"
                value={headUserId}
                onChange={e => setHeadUserId(e.target.value)}
              >
                <option value="">— не назначен —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </label>

            <div className="org-modal-grid">
              <label className="dv3-field">
                <span className="dv3-label">Код</span>
                <input
                  className="dv3-input"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  maxLength={32}
                  placeholder="напр. DEP-IT"
                />
              </label>
              <label className="dv3-field">
                <span className="dv3-label">Порядок</span>
                <input
                  className="dv3-input dv3-input--num"
                  type="number"
                  value={displayOrder}
                  onChange={e => setDisplayOrder(e.target.value)}
                />
              </label>
            </div>

            <div className="org-modal-grid">
              <label className="dv3-field">
                <span className="dv3-label">Сокр. (рус)</span>
                <input
                  className="dv3-input"
                  value={nameRuShort}
                  onChange={e => setNameRuShort(e.target.value)}
                  maxLength={64}
                  placeholder="напр. ДИТ"
                />
              </label>
              <label className="dv3-field">
                <span className="dv3-label">Сокр. (кыр)</span>
                <input
                  className="dv3-input"
                  value={nameKgShort}
                  onChange={e => setNameKgShort(e.target.value)}
                  maxLength={64}
                />
              </label>
            </div>

            {error && (
              <div className="dv3-banner dv3-banner--error" role="alert">{error}</div>
            )}

            <div className="org-modal-foot">
              <button
                type="button"
                className="dv3-btn"
                onClick={onClose}
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="dv3-btn dv3-btn--primary"
                disabled={loading}
              >
                {loading ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

const ORG_MODAL_CSS = `
.org-modal-scrim {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(4px);
  display: grid; place-items: center; padding: 20px;
  animation: org-modal-fade .18s ease;
}
@keyframes org-modal-fade { from { opacity: 0; } }
.org-modal {
  width: 100%; max-width: 560px; max-height: calc(100vh - 40px);
  display: flex; flex-direction: column;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-top: 2px solid var(--dv3-zone-info);
  color: var(--dv3-text);
  box-shadow: 0 24px 48px -16px rgba(0,0,0,0.35);
  animation: org-modal-pop .18s cubic-bezier(.2,.7,.3,1.2);
  overflow: hidden;
}
@keyframes org-modal-pop { from { transform: translateY(8px) scale(.97); opacity: 0; } }
.org-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--dv3-border);
}
.org-modal-head-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.org-modal-kicker {
  font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--dv3-text3); font-weight: 600;
}
.org-modal-head h3 {
  font-size: 16px; font-weight: 600; margin: 0;
  letter-spacing: -0.005em; color: var(--dv3-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.org-modal-x {
  display: grid; place-items: center;
  width: 30px; height: 30px; flex-shrink: 0;
  border: 1px solid var(--dv3-border2);
  background: var(--dv3-bg3);
  color: var(--dv3-text3);
  cursor: pointer;
  transition: background .14s, color .14s, border-color .14s;
}
.org-modal-x:hover { background: var(--dv3-bg2); color: var(--dv3-text); border-color: var(--dv3-border-hi); }
.org-modal-body {
  padding: 18px 22px 20px;
  overflow-y: auto;
  gap: 14px;
}
.org-modal-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
}
.org-modal-foot {
  display: flex; gap: 10px; justify-content: flex-end;
  margin-top: 6px; padding-top: 14px;
  border-top: 1px solid var(--dv3-border);
}
@media (max-width: 560px) {
  .org-modal-grid { grid-template-columns: 1fr; }
  .org-modal-foot { flex-direction: column-reverse; }
  .org-modal-foot .dv3-btn { width: 100%; }
}
`
