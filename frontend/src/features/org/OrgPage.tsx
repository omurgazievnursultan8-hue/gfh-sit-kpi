import { useEffect, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { Plus } from 'lucide-react'
import { RootState } from '../../app/store'
import { orgApi, OrgUnit, OrgUnitRequest } from './orgApi'
import { OrgTreeNode } from './components/OrgTreeNode'
import { OrgUnitFormModal } from './components/OrgUnitFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Layout } from '../../components/Layout'
import api from '../../app/api'

interface UserOption {
  id: number
  fullName: string
}

interface UsersPage {
  content: UserOption[]
}

export function OrgPage() {
  const role = useSelector((s: RootState) => s.auth.role)
  const isAdmin = role === 'ADMIN'

  const [tree, setTree] = useState<OrgUnit[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OrgUnit | null>(null)
  const [defaultParent, setDefaultParent] = useState<OrgUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null)

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orgApi.getStructure()
      setTree(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTree()
    api.get<UsersPage>('/users', { params: { size: 200 } })
      .then(r => setUsers(r.data.content))
      .catch(() => {})
  }, [loadTree])

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
    try {
      await orgApi.deleteUnit(deleteTarget.id)
      setDeleteTarget(null)
      await loadTree()
    } catch {
      setDeleteTarget(null)
    }
  }

  return (
    <Layout>
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
              onDelete={setDeleteTarget}
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
        onClose={() => { setModalOpen(false); setEditing(null); setDefaultParent(null) }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить подразделение?"
        description={`«${deleteTarget?.nameRu ?? ''}» и все его дочерние подразделения будут удалены.`}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  )
}
