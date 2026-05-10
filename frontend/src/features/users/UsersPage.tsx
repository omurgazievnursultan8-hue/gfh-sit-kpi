import { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/Layout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { UserTable } from './components/UserTable'
import { UserFormModal } from './components/UserFormModal'
import { User, usersApi } from './usersApi'

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await usersApi.list(page)
      setUsers(data.content)
      setTotalPages(data.totalPages)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { loadUsers() }, [loadUsers])

  const confirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, description, onConfirm })
  }

  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }))

  const handleDeactivate = (user: User) => {
    confirm(
      'Деактивировать пользователя',
      `Вы уверены, что хотите деактивировать ${user.fullName}? Доступ будет заблокирован немедленно.`,
      async () => {
        try { await usersApi.deactivate(user.id); loadUsers() }
        finally { closeConfirm() }
      }
    )
  }

  const handleReactivate = (user: User) => {
    confirm('Активировать пользователя', `Активировать ${user.fullName}?`,
      async () => {
        try { await usersApi.reactivate(user.id); loadUsers() }
        finally { closeConfirm() }
      }
    )
  }

  const handleResetPassword = (user: User) => {
    confirm(
      'Сбросить пароль',
      `Сбросить пароль для ${user.fullName}? Пользователю будет выдан временный пароль.`,
      async () => {
        try { await usersApi.resetPassword(user.id) }
        finally { closeConfirm() }
      }
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-blue-700"
        >
          + Создать пользователя
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Загрузка...</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <UserTable
            users={users}
            onEdit={setEditingUser}
            onDeactivate={handleDeactivate}
            onReactivate={handleReactivate}
            onResetPassword={handleResetPassword}
          />
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 py-4">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`px-3 py-1 text-sm rounded ${page === i ? 'bg-primary text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <UserFormModal
        open={showCreateModal || !!editingUser}
        user={editingUser}
        onClose={() => { setShowCreateModal(false); setEditingUser(null) }}
        onSave={async (data) => {
          if (editingUser) {
            await usersApi.update(editingUser.id, data)
          } else {
            await usersApi.create(data)
          }
          loadUsers()
        }}
      />

      <ConfirmDialog
        {...confirmDialog}
        onCancel={closeConfirm}
        variant="danger"
      />
    </Layout>
  )
}
