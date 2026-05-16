import type { User } from '../usersApi'
import { Avatar, RoleBadge, StatusPill } from './usersMeta'
import { UserRowMenu, type UserActions } from './UserRowMenu'

interface Props {
  users: User[]
  onCardClick: (user: User) => void
  actions: UserActions
}

export function UserCardGrid({ users, onCardClick, actions }: Props) {
  if (users.length === 0) {
    return (
      <div className="text-center" style={{ padding: '56px 24px', fontSize: 13.5, color: 'var(--ink-faint)' }}>
        Совпадений не найдено
      </div>
    )
  }

  return (
    <div
      className="grid gap-3.5"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(264px, 1fr))' }}
    >
      {users.map(user => (
        <div
          key={user.id}
          className="users-card"
          onClick={() => onCardClick(user)}
          tabIndex={0}
          role="button"
          aria-label={`Открыть профиль: ${user.fullName}`}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(user) }
          }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 12,
            padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          {/* Identity */}
          <div className="flex items-start gap-3">
            <Avatar name={user.fullName} role={user.role} active={user.isActive} size={44} />
            <div className="min-w-0 flex-1">
              <div
                className="truncate"
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}
              >
                {user.fullName}
              </div>
              <div className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
                {user.email}
              </div>
            </div>
            <div onClick={e => e.stopPropagation()}>
              <UserRowMenu user={user} actions={actions} />
            </div>
          </div>

          {/* Meta */}
          <div
            className="flex flex-col gap-2.5"
            style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}
          >
            <MetaRow k="Должность">
              <span style={{ color: user.position ? 'var(--ink)' : 'var(--ink-dim)' }}>
                {user.position ?? '—'}
              </span>
            </MetaRow>
            <MetaRow k="Роль"><RoleBadge role={user.role} /></MetaRow>
            <MetaRow k="Статус"><StatusPill active={user.isActive} /></MetaRow>
          </div>
        </div>
      ))}

      <style>{`
        .users-card { cursor: pointer; transition: border-color 120ms ease, box-shadow 120ms ease; outline: none; }
        .users-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-md); }
        .users-card:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
      `}</style>
    </div>
  )
}

function MetaRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ minHeight: 22 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{k}</span>
      <span className="truncate" style={{ fontSize: 13, textAlign: 'right' }}>{children}</span>
    </div>
  )
}
