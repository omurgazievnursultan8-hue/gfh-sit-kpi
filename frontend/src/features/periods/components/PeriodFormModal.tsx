import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import type { PeriodType } from '../api'

export interface PeriodFormData {
  type: PeriodType
  startDate: string
  endDate: string
  submissionDeadline: string
}

interface Props {
  open: boolean
  onSave: (data: PeriodFormData) => Promise<void>
  onClose: () => void
}

const TYPE_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'MONTHLY', label: 'Ежемесячная' },
  { value: 'QUARTERLY', label: 'Квартальная' },
  { value: 'ANNUAL', label: 'Годовая' },
]

export function PeriodFormModal({ open, onSave, onClose }: Props) {
  const [type, setType] = useState<PeriodType>('MONTHLY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submissionDeadline, setSubmissionDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setType('MONTHLY')
    setStartDate('')
    setEndDate('')
    setSubmissionDeadline('')
    setError('')
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate || !submissionDeadline) {
      setError('Заполните все даты')
      return
    }
    if (endDate < startDate) {
      setError('Дата окончания не может быть раньше начала')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSave({ type, startDate, endDate, submissionDeadline })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.messageRu || 'Ошибка при создании периода')
    } finally {
      setLoading(false)
    }
  }

  const labelCls = 'font-mono uppercase tracking-wider'
  const labelStyle = { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 } as const
  const inputCls = 'w-full mt-1'
  const inputStyle = {
    fontSize: 13, padding: '8px 10px', borderRadius: 6,
    border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)',
  } as const

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg"
        style={{ background: 'var(--surface)', width: 'min(420px, 92vw)', padding: '22px 24px', boxShadow: 'var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.25))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            Новый период оценки
          </span>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X size={18} color="var(--ink-faint)" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className={labelCls} style={labelStyle}>Тип</label>
            <select
              className={inputCls}
              style={inputStyle}
              value={type}
              onChange={e => setType(e.target.value as PeriodType)}
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className={labelCls} style={labelStyle}>Дата начала</label>
            <input type="date" className={inputCls} style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className={labelCls} style={labelStyle}>Дата окончания</label>
            <input type="date" className={inputCls} style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className={labelCls} style={labelStyle}>Дедлайн подачи</label>
            <input type="date" className={inputCls} style={inputStyle} value={submissionDeadline} onChange={e => setSubmissionDeadline(e.target.value)} />
          </div>

          {error && (
            <div className="mb-3 font-mono" style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 10.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6, background: 'transparent', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="font-mono uppercase tracking-widest disabled:opacity-50"
              style={{ fontSize: 10.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6, background: 'var(--accent-2,#2f9e6d)', color: '#fff' }}
            >
              {loading ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
