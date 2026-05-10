import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { delegationsApi, Delegation, DelegationRequest } from './delegationsApi'
import { DelegationFormModal } from './components/DelegationFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Layout } from '../../components/Layout'
import api from '../../app/api'

interface User {
  id: number
  fullName: string
  email: string
}

interface UsersPage {
  content: User[]
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

  const loadDelegations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await delegationsApi.list(page, 20, activeOnly)
      setDelegations(data.content)
      setTotalPages(data.totalPages)
    } finally {
      setLoading(false)
    }
  }, [page, activeOnly])

  useEffect(() => { loadDelegations() }, [loadDelegations])

  useEffect(() => {
    api.get<UsersPage>('/users', { params: { size: 200 } })
      .then(r => setUsers(r.data.content))
      .catch(() => {})
  }, [])

  const handleSave = async (data: DelegationRequest) => {
    await delegationsApi.create(data)
    await loadDelegations()
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await delegationsApi.deactivate(deactivateTarget.id)
      setDeactivateTarget(null)
      await loadDelegations()
    } catch {
      setDeactivateTarget(null)
    }
  }

  const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU')

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Делегирования оценки</h1>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700">
          <Plus size={16} />
          Новое делегирование
        </button>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={activeOnly}
            onChange={e => { setActiveOnly(e.target.checked); setPage(0) }}
            className="rounded" />
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
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(d.startDate)} — {formatDate(d.endDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      d.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {d.isActive ? 'Активно' : 'Завершено'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.isActive && (
                      <button onClick={() => setDeactivateTarget(d)}
                        className="text-sm text-red-600 hover:underline">
                        Деактивировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {delegations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Делегирований не найдено</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`w-8 h-8 rounded text-sm ${
                i === page ? 'bg-primary text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <DelegationFormModal open={modalOpen} users={users} onSave={handleSave} onClose={() => setModalOpen(false)} />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Деактивировать делегирование?"
        description={`Делегирование от «${deactivateTarget?.evaluateeName ?? ''}» к «${deactivateTarget?.evaluatorName ?? ''}» будет деактивировано.`}
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </Layout>
  )
}
