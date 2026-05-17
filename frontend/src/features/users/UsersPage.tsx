import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Layout } from '../../components/Layout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { UserFormModal } from './components/UserFormModal'
import { UserDetailDrawer } from './components/UserDetailDrawer'
import { UserRowMenu, type UserActions } from './components/UserRowMenu'
import { Avatar, RoleBadge, StatusPill, ROLE_RANK } from './components/usersMeta'
import { User, usersApi } from './usersApi'

const PANEL_KEY = 'gfh_users'

const ROLE_OPTIONS = [
  { value: '',                        label: 'Все роли' },
  { value: 'ADMIN',                   label: 'Администратор' },
  { value: 'CHAIRMAN',                label: 'Председатель' },
  { value: 'DEPUTY_CHAIRMAN',         label: 'Зам. председателя' },
  { value: 'HEAD_OF_DEPARTMENT',      label: 'Нач. департамента' },
  { value: 'HEAD_OF_DEPARTMENT_UNIT', label: 'Нач. отдела' },
  { value: 'EMPLOYEE',                label: 'Сотрудник' },
]
const STATUS_OPTIONS = [
  { value: '',         label: 'Любой статус' },
  { value: 'active',   label: 'Активные' },
  { value: 'inactive', label: 'Заблокированные' },
]

const FILTERS: FilterDef[] = [
  { key: 'role',   label: 'Роль',   type: 'select', options: ROLE_OPTIONS },
  { key: 'status', label: 'Статус', type: 'select', options: STATUS_OPTIONS },
]

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      // ~100 employees — fetch wide, DataPanel filters/sorts client-side.
      const data = await usersApi.list(0, 500)
      setUsers(data.content)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const drawerUser = drawerId != null ? users.find(u => u.id === drawerId) ?? null : null

  const openDrawer = (user: User) => { setDrawerId(user.id); setDrawerOpen(true) }
  const closeDrawer = () => setDrawerOpen(false)

  const confirm = (title: string, description: string, onConfirm: () => void) => {
    closeDrawer()
    setConfirmDialog({ open: true, title, description, onConfirm })
  }
  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }))

  const actions: UserActions = {
    onEdit: (user) => { closeDrawer(); setEditingUser(user) },
    onDeactivate: (user) => confirm(
      'Деактивировать пользователя',
      `Вы уверены, что хотите деактивировать ${user.fullName}? Доступ будет заблокирован немедленно.`,
      async () => {
        try { await usersApi.deactivate(user.id); loadUsers() }
        finally { closeConfirm() }
      },
    ),
    onReactivate: (user) => confirm(
      'Активировать пользователя',
      `Активировать ${user.fullName}?`,
      async () => {
        try { await usersApi.reactivate(user.id); loadUsers() }
        finally { closeConfirm() }
      },
    ),
    onResetPassword: (user) => confirm(
      'Сбросить пароль',
      `Сбросить пароль для ${user.fullName}? Пользователю будет выдан временный пароль.`,
      async () => {
        try { await usersApi.resetPassword(user.id) }
        finally { closeConfirm() }
      },
    ),
  }

  const columns: Column<User>[] = [
    {
      key: 'name', header: 'Пользователь', sortable: true, hideable: false,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} role={u.role} active={u.isActive} size={34} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{u.fullName}</span>
        </div>
      ),
    },
    {
      key: 'email', header: 'Email', sortable: true,
      render: (u) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{u.email}</span>,
    },
    {
      key: 'role', header: 'Роль', sortable: true,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'position', header: 'Должность',
      render: (u) => (
        <span style={{ fontSize: 13, color: u.position ? 'var(--ink-soft)' : 'var(--ink-dim)' }}>
          {u.position ?? '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (u) => <StatusPill active={u.isActive} />,
    },
    {
      key: 'actions', header: 'Действия', align: 'right', srOnlyHeader: true, hideable: false,
      render: (u) => (
        <div onClick={e => e.stopPropagation()}>
          <UserRowMenu user={u} actions={actions} />
        </div>
      ),
    },
  ]

  const searchText = (u: User) => `${u.fullName} ${u.email}`

  const clientFilter = (u: User, v: Record<string, string>) => {
    if (v.role && u.role !== v.role) return false
    if (v.status === 'active' && !u.isActive) return false
    if (v.status === 'inactive' && u.isActive) return false
    return true
  }

  const comparator = (key: string) => (a: User, b: User): number => {
    switch (key) {
      case 'email':    return a.email.localeCompare(b.email)
      case 'role':     return (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99)
      case 'position': return (a.position ?? '').localeCompare(b.position ?? '', 'ru')
      case 'status':   return Number(b.isActive) - Number(a.isActive)
      default:         return a.fullName.localeCompare(b.fullName, 'ru')
    }
  }

  const renderCard = (u: User): ReactNode => (
    <div
      className="users-card"
      onClick={() => openDrawer(u)}
      tabIndex={0}
      role="button"
      aria-label={`Открыть профиль: ${u.fullName}`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrawer(u) }
      }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={u.fullName} role={u.role} active={u.isActive} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            {u.fullName}
          </div>
          <div className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {u.email}
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <UserRowMenu user={u} actions={actions} />
        </div>
      </div>
      <div className="flex flex-col gap-2.5" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
        <CardMetaRow k="Должность">
          <span style={{ color: u.position ? 'var(--ink)' : 'var(--ink-dim)' }}>{u.position ?? '—'}</span>
        </CardMetaRow>
        <CardMetaRow k="Роль"><RoleBadge role={u.role} /></CardMetaRow>
        <CardMetaRow k="Статус"><StatusPill active={u.isActive} /></CardMetaRow>
      </div>
      <style>{`
        .users-card { cursor: pointer; transition: border-color 120ms ease, box-shadow 120ms ease; outline: none; }
        .users-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-md); }
        .users-card:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
      `}</style>
    </div>
  )

  const addButton = (
    <button
      onClick={() => setShowCreateModal(true)}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'var(--accent)', color: 'var(--surface)',
        border: '1px solid var(--accent-ink)', cursor: 'pointer',
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Добавить
    </button>
  )

  return (
    <Layout>
      <div style={{ padding: '8px 0 32px' }}>
        <div className="mb-5">
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
            Сотрудники
          </h1>
          <p style={{ marginTop: 5, fontSize: 14, color: 'var(--ink-soft)', maxWidth: 600, lineHeight: 1.5 }}>
            Управление учётными записями, ролями и доступом сотрудников.
          </p>
        </div>

        <DataPanel<User>
          mode="client"
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          loading={loading}
          caption="Список сотрудников"
          empty="Совпадений не найдено"
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по ФИО или email…"
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'name', dir: 'asc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          panelStorageKey={PANEL_KEY}
          columnConfig
          onRowClick={openDrawer}
          toolbarActions={addButton}
        />
      </div>

      <UserDetailDrawer
        user={drawerUser}
        open={drawerOpen && drawerUser != null}
        onClose={closeDrawer}
        actions={actions}
      />

      <UserFormModal
        open={showCreateModal || !!editingUser}
        user={editingUser}
        onClose={() => { setShowCreateModal(false); setEditingUser(null) }}
        onSave={async (data) => {
          if (editingUser) await usersApi.update(editingUser.id, data)
          else await usersApi.create(data)
          loadUsers()
        }}
      />

      <ConfirmDialog {...confirmDialog} onCancel={closeConfirm} variant="danger" />
    </Layout>
  )
}

function CardMetaRow({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ minHeight: 22 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{k}</span>
      <span className="truncate" style={{ fontSize: 13, textAlign: 'right' }}>{children}</span>
    </div>
  )
}
