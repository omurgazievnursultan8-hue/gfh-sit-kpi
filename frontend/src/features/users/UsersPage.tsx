import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { UserFormModal } from './components/UserFormModal'
import { UserDetailDrawer } from './components/UserDetailDrawer'
import { UserRowMenu, type UserActions } from './components/UserRowMenu'
import { Avatar, RoleBadge, StatusPill, ROLE_RANK } from './components/usersMeta'
import { User, usersApi } from './usersApi'

const PANEL_KEY = 'gfh_users'

export function UsersPage() {
  const { t } = useTranslation()

  const FILTERS: FilterDef[] = useMemo(() => {
    const roleOptions = [
      { value: '',                        label: t('v2.users.allRoles') },
      { value: 'ADMIN',                   label: t('v2.rolesShort.ADMIN') },
      { value: 'CHAIRMAN',                label: t('v2.rolesShort.CHAIRMAN') },
      { value: 'DEPUTY_CHAIRMAN',         label: t('v2.rolesShort.DEPUTY_CHAIRMAN') },
      { value: 'HEAD_OF_DEPARTMENT',      label: t('v2.rolesShort.HEAD_OF_DEPARTMENT') },
      { value: 'HEAD_OF_DEPARTMENT_UNIT', label: t('v2.rolesShort.HEAD_OF_DEPARTMENT_UNIT') },
      { value: 'EMPLOYEE',                label: t('v2.rolesShort.EMPLOYEE') },
    ]
    const statusOptions = [
      { value: '',         label: t('v2.users.anyStatus') },
      { value: 'active',   label: t('v2.users.statusActive') },
      { value: 'inactive', label: t('v2.users.statusInactive') },
    ]
    return [
      { key: 'role',   label: t('v2.users.filterRole'),   type: 'select', options: roleOptions },
      { key: 'status', label: t('v2.users.filterStatus'), type: 'select', options: statusOptions },
    ]
  }, [t])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      // ~100 employees — fetch wide, DataPanel filters/sorts client-side.
      const data = await usersApi.list(0, 500)
      setUsers(data.content)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
      setLoadedAt(new Date())
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  // Live tick — refresh clock + relative time each minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── time / clock ──────────────────────────────────────────────────────── */
  const hours = now.getHours()
  const timeGreeting = hours < 12 ? 'Доброе утро' : hours < 18 ? 'Добрый день' : 'Добрый вечер'
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const todayLine = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1 ? 'обновлено только что' : `обновлено ${mins} мин назад`
  }

  /* ── derived stats ─────────────────────────────────────────────────────── */
  const PLACEHOLDER = '··'
  const total = users.length
  const activeCount = useMemo(() => users.filter(u => u.isActive).length, [users])
  const inactiveCount = total - activeCount
  const privilegedCount = useMemo(
    () => users.filter(u => ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT'].includes(u.role)).length,
    [users],
  )

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
      t('v2.users.deactivateTitle'),
      t('v2.users.deactivateMsg', { name: user.fullName }),
      async () => {
        try { await usersApi.deactivate(user.id); loadUsers() }
        finally { closeConfirm() }
      },
    ),
    onReactivate: (user) => confirm(
      t('v2.users.activateTitle'),
      t('v2.users.activateMsg', { name: user.fullName }),
      async () => {
        try { await usersApi.reactivate(user.id); loadUsers() }
        finally { closeConfirm() }
      },
    ),
    onResetPassword: (user) => confirm(
      t('v2.users.resetPwTitle'),
      t('v2.users.resetPwMsg', { name: user.fullName }),
      async () => {
        try { await usersApi.resetPassword(user.id) }
        finally { closeConfirm() }
      },
    ),
  }

  const columns: Column<User>[] = [
    {
      key: 'name', header: t('v2.users.colName'), sortable: true, hideable: false,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} role={u.role} active={u.isActive} size={34} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{u.fullName}</span>
        </div>
      ),
    },
    {
      key: 'email', header: t('v2.users.colEmail'), sortable: true,
      render: (u) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{u.email}</span>,
    },
    {
      key: 'role', header: t('v2.users.colRole'), sortable: true,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'position', header: t('v2.users.colPosition'),
      render: (u) => (
        <span style={{ fontSize: 13, color: u.position ? 'var(--ink-soft)' : 'var(--ink-dim)' }}>
          {u.position ?? '—'}
        </span>
      ),
    },
    {
      key: 'status', header: t('v2.users.colStatus'), sortable: true,
      render: (u) => <StatusPill active={u.isActive} />,
    },
    {
      key: 'actions', header: t('v2.menuActions'), align: 'right', srOnlyHeader: true, hideable: false,
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
      aria-label={t('v2.users.openProfile', { name: u.fullName })}
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
        <CardMetaRow k={t('v2.users.colPosition')}>
          <span style={{ color: u.position ? 'var(--ink)' : 'var(--ink-dim)' }}>{u.position ?? '—'}</span>
        </CardMetaRow>
        <CardMetaRow k={t('v2.users.colRole')}><RoleBadge role={u.role} /></CardMetaRow>
        <CardMetaRow k={t('v2.users.colStatus')}><StatusPill active={u.isActive} /></CardMetaRow>
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
      {t('v2.users.add')}
    </button>
  )

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* HERO */}
          <div className="dv3-hero">
            <div className="dv3-hero-meta">
              <span className="dv3-hero-meta-l">USERS.DIRECTORY</span>
              <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
            </div>
            <div className="dv3-hero-main">
              <div>
                <h1 className="dv3-hero-title">
                  {timeGreeting}. <span className="dv3-accent">{t('v2.users.title')}</span>
                </h1>
                <p className="dv3-hero-sub">{todayLine}</p>
              </div>
              <div className="dv3-hero-metrics">
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : total}
                  </span>
                  <span className="dv3-hero-metric-lab">всего</span>
                </div>
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : activeCount}
                  </span>
                  <span className="dv3-hero-metric-lab">активны</span>
                </div>
              </div>
            </div>
            <div className="dv3-hero-foot">
              <span className={failed ? 'dv3-hero-foot-warn' : 'dv3-hero-foot-ok'}>
                STATUS · {failed ? 'ошибка загрузки' : 'ок'}
              </span>
              <span>{updatedLabel}</span>
            </div>
          </div>

          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="USERS.TOTAL" id="U01" loading={loading}
              value={total} label="сотрудников"
            />
            <StatCard
              className="dv3-col-3"
              title="ACTIVE" id="A01" loading={loading}
              value={activeCount} label="активны"
              gauge={{
                pct: total > 0 ? activeCount / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((activeCount / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="PRIVILEGED" id="R01" loading={loading}
              value={privilegedCount} label="админы / руководители"
              gauge={{
                pct: total > 0 ? privilegedCount / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((privilegedCount / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="INACTIVE" id="X01" loading={loading}
              value={inactiveCount} label="неактивны"
              gauge={{
                pct: total > 0 ? inactiveCount / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((inactiveCount / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }}>
        <DataPanel<User>
          mode="client"
          columns={columns}
          rows={users}
          rowKey={(u) => u.id}
          loading={loading}
          caption={t('v2.users.caption')}
          empty={t('v2.noMatches')}
          searchable
          searchText={searchText}
          searchPlaceholder={t('v2.users.searchPlaceholder')}
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
    </>
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
