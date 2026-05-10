import { useState, useEffect, FormEvent } from 'react'
import { User, UserCreateRequest } from '../usersApi'
import axios from 'axios'

const ROLES = [
  { value: 'EMPLOYEE', label: 'Сотрудник' },
  { value: 'HEAD_OF_DEPARTMENT_UNIT', label: 'Нач. отдела' },
  { value: 'HEAD_OF_DEPARTMENT', label: 'Нач. департамента' },
  { value: 'DEPUTY_CHAIRMAN', label: 'Зам. председателя' },
  { value: 'CHAIRMAN', label: 'Председатель' },
  { value: 'ADMIN', label: 'Администратор' },
]

interface Props {
  open: boolean
  user: User | null
  onSave: (data: UserCreateRequest) => Promise<void>
  onClose: () => void
}

export function UserFormModal({ open, user, onSave, onClose }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EMPLOYEE')
  const [position, setPosition] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFullName(user.fullName)
      setEmail(user.email)
      setRole(user.role)
      setPosition(user.position ?? '')
    } else {
      setFullName(''); setEmail(''); setRole('EMPLOYEE'); setPosition('')
    }
    setError('')
  }, [user, open])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSave({ fullName, email, role, position: position || undefined })
      onClose()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? (err.response?.data as { message_ru?: string })?.message_ru : undefined
      setError(msg ?? 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">{user ? 'Редактировать пользователя' : 'Создать пользователя'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
            <input value={position} onChange={e => setPosition(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
