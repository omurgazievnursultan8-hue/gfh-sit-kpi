import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Plus, RotateCcw } from 'lucide-react'
import { RootState } from '../../app/store'
import { Criteria, criteriaApi, CriteriaRequest } from './criteriaApi'
import { OrgUnit, orgApi } from '../org/orgApi'
import { WeightBar } from './components/WeightBar'
import { CriteriaFormModal } from './components/CriteriaFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'

type Tab = 'POSITIVE' | 'ANTI_BONUS'

function flattenOrgTree(units: OrgUnit[]): OrgUnit[] {
  return units.flatMap(u => [u, ...flattenOrgTree(u.children || [])])
}

export function CriteriaPage() {
  const { role } = useSelector((s: RootState) => s.auth)
  const isAdmin = role === 'ADMIN'

  const [allCriteria, setAllCriteria] = useState<Criteria[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('POSITIVE')
  const [showInactive, setShowInactive] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Criteria | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Criteria | null>(null)

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
    orgApi.getStructure().then(tree => setOrgUnits(flattenOrgTree(tree)))
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
    await criteriaApi.deactivate(deactivateTarget.id)
    setDeactivateTarget(null)
    await loadCriteria()
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
                    {c.autoCalculated && <span className="text-xs text-blue-600">авто</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {c.weight.toFixed(2)}%
                    {c.frozen && <span className="ml-1 text-xs text-amber-600">🔒</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.orgUnitNameRu || <span className="text-gray-400">Глобальный</span>}
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
        description={`«${deactivateTarget?.nameRu}» больше не будет применяться к новым оценкам.`}
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  )
}
