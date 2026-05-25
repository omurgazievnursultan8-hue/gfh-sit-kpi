import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { UserFormModal } from './components/UserFormModal'
import { Avatar, RoleBadge, StatusPill, ROLE_RANK } from './components/usersMeta'
import { User, usersApi } from './usersApi'

const PANEL_KEY = 'gfh_users'

export function UsersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const FILTERS: FilterDef[] = useMemo(() => {
    const roleOptions = [
      { value: '',                        label: t('v2.users.allRoles') },
      { value: 'ADMIN',                   label: t('v2.rolesShort.ADMIN') },
      { value: 'CHAIRMAN',                label: t('v2.rolesShort.CHAIRMAN') },
      { value: 'DEPUTY_CHAIRMAN',         label: t('v2.rolesShort.DEPUTY_CHAIRMAN') },
      { value: 'ORG_HEAD',                label: t('v2.rolesShort.ORG_HEAD') },
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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [tempPw, setTempPw] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  const openDetail = (user: User) => navigate(`/admin/users/${user.id}`)

  const columns: Column<User>[] = [
    {
      key: 'name', header: t('v2.users.colName'), sortable: true, hideable: false,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} role={u.role} active={u.isActive} size={34} src={u.avatarUrl} />
          <div className="flex flex-col" style={{ minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{u.fullName}</span>
            {u.employeeNumber && (
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>
                #{u.employeeNumber}
              </span>
            )}
          </div>
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
      key: 'employmentType', header: t('v2.users.colEmploymentType', 'Тип'), sortable: true, defaultHidden: true,
      render: (u) => (
        <span style={{ fontSize: 12, color: u.employmentType ? 'var(--ink-soft)' : 'var(--ink-dim)', fontFamily: 'var(--font-mono)' }}>
          {u.employmentType ? t(`v2.users.employmentType.${u.employmentType}`, u.employmentType) : '—'}
        </span>
      ),
    },
    {
      key: 'status', header: t('v2.users.colStatus'), sortable: true,
      render: (u) => <StatusPill active={u.isActive} />,
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
      case 'employmentType': return (a.employmentType ?? '').localeCompare(b.employmentType ?? '')
      case 'status':   return Number(b.isActive) - Number(a.isActive)
      default:         return a.fullName.localeCompare(b.fullName, 'ru')
    }
  }

  const renderCard = (u: User): ReactNode => (
    <div
      className="users-card"
      onClick={() => openDetail(u)}
      tabIndex={0}
      role="button"
      aria-label={t('v2.users.openProfile', { name: u.fullName })}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(u) }
      }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={u.fullName} role={u.role} active={u.isActive} size={44} src={u.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            {u.fullName}
          </div>
          <div className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {u.email}
          </div>
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

        <div className="dv3-terminal">
          <div>
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
          onRowClick={openDetail}
          toolbarActions={addButton}
        />
          </div>
        </div>
      </div>

      <UserFormModal
        open={showCreateModal}
        user={null}
        allUsers={users}
        onClose={() => setShowCreateModal(false)}
        onSave={async (data) => {
          const saved = await usersApi.create(data)
          loadUsers()
          if (saved?.tempPassword) {
            setTempPw(saved.tempPassword)
            setCopied(false)
          }
          return saved
        }}
      />
      {tempPw && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setTempPw(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface, #fff)', borderRadius: 12, padding: 24,
              maxWidth: 440, width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: 16, fontWeight: 600 }}>
              {t('v2.users.tempPwTitle', { defaultValue: 'Временный пароль' })}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
              {t('v2.users.tempPwNote', { defaultValue: 'Скопируйте сейчас — пароль больше не будет показан. Пользователь должен сменить его при первом входе.' })}
            </p>
            <div style={{
              fontFamily: 'monospace', fontSize: 16, padding: '12px 14px',
              background: 'var(--surface-2, #f5f5f7)', borderRadius: 8,
              userSelect: 'all', wordBreak: 'break-all', margin: '12px 0',
            }}>{tempPw}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(tempPw); setCopied(true) } catch { /* noop */ }
                }}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
              >{copied ? t('v2.users.copied', { defaultValue: 'Скопировано' }) : t('v2.users.copy', { defaultValue: 'Копировать' })}</button>
              <button
                type="button"
                onClick={() => setTempPw(null)}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent, #4f46e5)', color: '#fff', cursor: 'pointer' }}
              >{t('common.close', { defaultValue: 'Закрыть' })}</button>
            </div>
          </div>
        </div>
      )}
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
