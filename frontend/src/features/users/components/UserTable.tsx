import type { User } from '../usersApi'
import type { Density } from './UsersFilters'
import { Avatar, RoleBadge, StatusPill } from './usersMeta'
import { UserRowMenu, type UserActions } from './UserRowMenu'

export type SortKey = 'name' | 'email' | 'role' | 'status'
export type SortDir = 'asc' | 'desc'

interface Props {
  users: User[]
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey) => void
  onRowClick: (user: User) => void
  actions: UserActions
  density: Density
}

interface DensityTokens {
  pad: string
  avatar: number
  name: number
}

const DENSITY: Record<Density, DensityTokens> = {
  comfortable: { pad: '11px 16px', avatar: 34, name: 13.5 },
  compact:     { pad: '6px 14px',  avatar: 26, name: 13 },
}

export function UserTable({ users, sortKey, sortDir, onSort, onRowClick, actions, density }: Props) {
  if (users.length === 0) {
    return (
      <div className="text-center" style={{ padding: '56px 24px', fontSize: 13.5, color: 'var(--ink-faint)' }}>
        Совпадений не найдено
      </div>
    )
  }

  const d = DENSITY[density]

  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 13.5 }}>
        <thead>
          <tr>
            <SortableTh col="name"   label="Пользователь" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableTh col="email"  label="Email"        sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortableTh col="role"   label="Роль"         sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <Th>Должность</Th>
            <SortableTh col="status" label="Статус"       sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <Th align="right" srOnly>Действия</Th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr
              key={user.id}
              className="users-row"
              onClick={() => onRowClick(user)}
              tabIndex={0}
              role="button"
              aria-label={`Открыть профиль: ${user.fullName}`}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(user) }
              }}
            >
              <Td pad={d.pad}>
                <div className="flex items-center gap-3">
                  <Avatar name={user.fullName} role={user.role} active={user.isActive} size={d.avatar} />
                  <span style={{ fontSize: d.name, fontWeight: 600, color: 'var(--ink)' }}>
                    {user.fullName}
                  </span>
                </div>
              </Td>
              <Td pad={d.pad}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{user.email}</span>
              </Td>
              <Td pad={d.pad}><RoleBadge role={user.role} /></Td>
              <Td pad={d.pad}>
                <span style={{ fontSize: 13, color: user.position ? 'var(--ink-soft)' : 'var(--ink-dim)' }}>
                  {user.position ?? '—'}
                </span>
              </Td>
              <Td pad={d.pad}><StatusPill active={user.isActive} /></Td>
              <Td pad={d.pad} align="right">
                <UserRowMenu user={user} actions={actions} />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .users-row { cursor: pointer; transition: background 100ms ease; outline: none; }
        .users-row td { border-bottom: 1px solid var(--line-soft); }
        .users-row:nth-child(even) td { background: var(--surface-mute); }
        .users-row:hover td { background: var(--accent-mute); }
        .users-row:focus-visible td { box-shadow: inset 0 0 0 2px var(--accent); }
        .users-row:last-child td { border-bottom: none; }
      `}</style>
    </div>
  )
}

function SortableTh({
  col, label, sortKey, sortDir, onSort,
}: { col: SortKey; label: string; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const active = sortKey === col
  return (
    <th
      aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={{
        textAlign: 'left', padding: 0,
        background: 'var(--surface-mute)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 0, zIndex: 2,
      }}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className="users-sort-btn inline-flex items-center gap-1.5 transition-colors"
        style={{
          width: '100%', textAlign: 'left', padding: '10px 16px',
          fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
          color: active ? 'var(--ink)' : 'var(--ink-soft)',
          background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        {label}
        <SortChevron active={active} dir={sortDir} />
      </button>
      <style>{`.users-sort-btn:hover { color: var(--ink); }`}</style>
    </th>
  )
}

function SortChevron({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      viewBox="0 0 24 24" aria-hidden
      style={{
        width: 12, height: 12, fill: 'none', strokeWidth: 2.4,
        stroke: active ? 'var(--accent)' : 'var(--ink-dim)',
        transform: active && dir === 'desc' ? 'rotate(180deg)' : 'none',
        transition: 'stroke 120ms ease, transform 150ms ease',
      }}
    >
      <polyline points="6 15 12 9 18 15" />
    </svg>
  )
}

function Th({ children, align, srOnly }: { children: React.ReactNode; align?: 'left' | 'right'; srOnly?: boolean }) {
  return (
    <th
      style={{
        textAlign: align ?? 'left', padding: '10px 16px', fontSize: 12, fontWeight: 500,
        color: 'var(--ink-soft)',
        background: 'var(--surface-mute)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky', top: 0, zIndex: 2,
      }}
    >
      <span style={srOnly ? srOnlyStyle : undefined}>{children}</span>
    </th>
  )
}

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
}

function Td({ children, align, pad }: { children: React.ReactNode; align?: 'left' | 'right'; pad: string }) {
  return (
    <td style={{ padding: pad, textAlign: align ?? 'left', verticalAlign: 'middle', color: 'var(--ink)' }}>
      {children}
    </td>
  )
}
