import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { DelegationRequest } from '../delegationsApi'
import axios from 'axios'

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
  const [delegatedToId, setDelegatedToId] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setEvaluateeId(''); setDelegatedToId(''); setValidFrom(''); setValidTo(''); setReason(''); setError('')
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (evaluateeId === delegatedToId) {
      setError('Оцениваемый и делегат не могут быть одним лицом')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSave({
        evaluateeId: Number(evaluateeId),
        delegatedToId: Number(delegatedToId),
        validFrom,
        validTo,
        reason: reason.trim() || undefined,
      })
      onClose()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message_ru?: string })?.message_ru : undefined
      setError(msg ?? 'Ошибка при создании делегирования')
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Оцениваемый сотрудник</label>
            <select value={evaluateeId} onChange={e => setEvaluateeId(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
              <option value="">— выберите —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Делегированный оценщик</label>
            <select value={delegatedToId} onChange={e => setDelegatedToId(e.target.value)} required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary">
              <option value="">— выберите —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата окончания</label>
              <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} required min={validFrom}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Причина (необязательно)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Напр.: отпуск, командировка"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
