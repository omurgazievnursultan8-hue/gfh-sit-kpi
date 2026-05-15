import { useState, useEffect, useCallback, useMemo } from 'react'
import { Layout } from '../../components/Layout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { UserTable, type SortKey, type SortDir } from './components/UserTable'
import { UserCardGrid } from './components/UserCardGrid'
import { UserFormModal } from './components/UserFormModal'
import { UsersSavedViews } from './components/UsersSavedViews'
import { UsersFilters, type StatusFilter, type ViewMode, type Density } from './components/UsersFilters'
import { UserDetailDrawer } from './components/UserDetailDrawer'
import type { UserActions } from './components/UserRowMenu'
import { ROLE_RANK } from './components/usersMeta'
import { User, usersApi } from './usersApi'

const VIEW_KEY = 'gfh_users_view'
const DENSITY_KEY = 'gfh_users_density'
const PAGE_SIZE = 25

function loadView(): ViewMode {
  return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'table'
}
function loadDensity(): Density {
  return localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable'
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)

  const [view, setView] = useState<ViewMode>(loadView)
  const [density, setDensity] = useState<Density>(loadDensity)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      // ~100 employees expected — fetch wide and filter/sort client-side for snappy UX.
      const data = await usersApi.list(0, 500)
      setUsers(data.content)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])
  useEffect(() => { localStorage.setItem(DENSITY_KEY, density) }, [density])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => {
      if (role && u.role !== role) return false
      if (status === 'active' && !u.isActive) return false
      if (status === 'inactive' && u.isActive) return false
      if (q && !u.fullName.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      return true
    })
  }, [users, search, role, status])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const cmp = (a: User, b: User): number => {
      switch (sortKey) {
        case 'email':  return a.email.localeCompare(b.email)
        case 'role':   return (ROLE_RANK[a.role] ?? 99) - (ROLE_RANK[b.role] ?? 99)
        case 'status': return Number(b.isActive) - Number(a.isActive)
        default:       return a.fullName.localeCompare(b.fullName, 'ru')
      }
    }
    return [...filtered].sort((a, b) => {
      const primary = cmp(a, b)
      // Stable tiebreaker keeps rows from jumping when the key has equal values.
      return (primary !== 0 ? primary : a.fullName.localeCompare(b.fullName, 'ru')) * dir
    })
  }, [filtered, sortKey, sortDir])

  useEffect(() => { setPage(0) }, [search, role, status, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageStart = page * PAGE_SIZE
  const visible = sorted.slice(pageStart, pageStart + PAGE_SIZE)
  const rangeFrom = sorted.length === 0 ? 0 : pageStart + 1
  const rangeTo = Math.min(pageStart + PAGE_SIZE, sorted.length)

  const drawerUser = useMemo(
    () => (drawerId != null ? users.find(u => u.id === drawerId) ?? null : null),
    [users, drawerId],
  )

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const applyView = (nextRole: string, nextStatus: StatusFilter) => {
    setRole(nextRole)
    setStatus(nextStatus)
  }

  const openDrawer = (user: User) => { setDrawerId(user.id); setDrawerOpen(true) }
  const closeDrawer = () => setDrawerOpen(false)

  const confirm = (title: string, description: string, onConfirm: () => void) => {
    // ConfirmDialog renders at z-50 — below the drawer. Close the drawer so the
    // dialog is never occluded when an action is launched from the drawer footer.
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

  return (
    <Layout>
      <div style={{ padding: '8px 0 32px' }}>
        {/* Page header */}
        <div className="flex items-start justify-between gap-5 mb-5 flex-wrap">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
              Сотрудники
            </h1>
            <p style={{ marginTop: 5, fontSize: 14, color: 'var(--ink-soft)', maxWidth: 600, lineHeight: 1.5 }}>
              Управление учётными записями, ролями и доступом сотрудников.
            </p>
          </div>

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
            Добавить пользователя
          </button>
        </div>

        {/* Saved-view tabs */}
        <UsersSavedViews users={users} role={role} status={status} onApply={applyView} />

        {/* Toolbar — search + filters + density + view switch */}
        <UsersFilters
          search={search}
          onSearch={setSearch}
          role={role}
          onRole={setRole}
          status={status}
          onStatus={setStatus}
          density={density}
          onDensity={setDensity}
          view={view}
          onView={setView}
          matchedCount={sorted.length}
          totalCount={users.length}
        />

        {/* Content surface */}
        {loading ? (
          <div
            className="text-center"
            style={{
              padding: '56px 24px', fontSize: 13.5, color: 'var(--ink-faint)',
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
            }}
          >
            Загрузка…
          </div>
        ) : view === 'cards' ? (
          <UserCardGrid users={visible} onCardClick={openDrawer} actions={actions} />
        ) : (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-sm)',
              overflow: 'hidden',
            }}
          >
            <UserTable
              users={visible}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              onRowClick={openDrawer}
              actions={actions}
              density={density}
            />
          </div>
        )}

        {/* Pager */}
        {!loading && sorted.length > 0 && (
          <div
            className="flex items-center justify-between gap-3 mt-3 flex-wrap"
            style={{
              padding: '11px 16px', borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--surface-mute)',
            }}
          >
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Показано{' '}
              <strong className="font-mono" style={{ color: 'var(--ink)' }}>
                {rangeFrom}–{rangeTo}
              </strong>{' '}
              из{' '}
              <strong className="font-mono" style={{ color: 'var(--ink)' }}>{sorted.length}</strong>
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <PagerButton disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} ariaLabel="Предыдущая">
                  ←
                </PagerButton>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const selected = page === i
                  return (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      aria-current={selected ? 'page' : undefined}
                      className="font-mono transition-colors"
                      style={{
                        minWidth: 28, height: 28, padding: '0 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 600,
                        background: selected ? 'var(--accent)' : 'var(--surface)',
                        color: selected ? 'var(--surface)' : 'var(--ink-soft)',
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </button>
                  )
                })}
                <PagerButton
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  ariaLabel="Следующая"
                >
                  →
                </PagerButton>
              </div>
            )}
          </div>
        )}
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
          if (editingUser) {
            await usersApi.update(editingUser.id, data)
          } else {
            await usersApi.create(data)
          }
          loadUsers()
        }}
      />

      <ConfirmDialog {...confirmDialog} onCancel={closeConfirm} variant="danger" />
    </Layout>
  )
}

function PagerButton({
  children, disabled, onClick, ariaLabel,
}: {
  children: React.ReactNode; disabled?: boolean; onClick: () => void; ariaLabel: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="font-mono transition-colors"
      style={{
        width: 28, height: 28, borderRadius: 4, fontSize: 12, fontWeight: 700,
        background: 'var(--surface)',
        color: disabled ? 'var(--ink-dim)' : 'var(--ink-soft)',
        border: '1px solid var(--line)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}
