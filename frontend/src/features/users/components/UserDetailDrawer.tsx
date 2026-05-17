import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { User } from '../usersApi'
import { Avatar, RoleBadge, StatusPill } from './usersMeta'
import type { UserActions } from './UserRowMenu'

interface Props {
  user: User | null
  open: boolean
  onClose: () => void
  actions: UserActions
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Right-side detail drawer — full profile + every management action in one place.
export function UserDetailDrawer({ user, open, onClose, actions }: Props) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div aria-hidden={!open} style={{ pointerEvents: open ? 'auto' : 'none' }}>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(8,22,18,0.46)',
          opacity: open ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('v2.users.drawerProfile')}
        tabIndex={-1}
        className="users-drawer"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
          width: 'min(420px, 100vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          boxShadow: 'var(--shadow-lg)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 240ms cubic-bezier(0.32,0.72,0,1)',
          display: 'flex', flexDirection: 'column', outline: 'none',
        }}
      >
        {user && (
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between gap-3"
              style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {t('v2.users.drawerProfile')}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('v2.users.drawerClose')}
                className="inline-flex items-center justify-center transition-colors"
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--surface)', color: 'var(--ink-soft)',
                  border: '1px solid var(--line)', cursor: 'pointer', fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>

            {/* Identity + scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 18px' }}>
              <div className="flex items-center gap-3.5">
                <Avatar name={user.fullName} role={user.role} active={user.isActive} size={56} />
                <div className="min-w-0">
                  <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>
                    {user.fullName}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 7 }}>
                    <RoleBadge role={user.role} />
                    <StatusPill active={user.isActive} />
                  </div>
                </div>
              </div>

              <dl style={{ marginTop: 22, display: 'grid', gap: 0 }}>
                <Field label={t('v2.users.colEmail')}>{user.email}</Field>
                <Field label={t('v2.users.fieldPosition')}>{user.position ?? '—'}</Field>
                <Field label={t('v2.users.fieldOrgUnit')}>{user.unitId != null ? `№${user.unitId}` : '—'}</Field>
                <Field label={t('v2.users.fieldManager')}>{user.managerId != null ? `#${user.managerId}` : '—'}</Field>
                <Field label={t('v2.users.fieldSince')}>{formatDate(user.createdAt)}</Field>
                {/* TODO i18n: "ID" — label kept as-is (no key, technical identifier) */}
                <Field label="ID">{`#${String(user.id).padStart(3, '0')}`}</Field>
              </dl>
            </div>

            {/* Action footer */}
            <div
              style={{
                padding: '14px 18px',
                borderTop: '1px solid var(--line-soft)',
                background: 'var(--surface-mute)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => actions.onEdit(user)}
                className="transition-colors"
                style={{
                  fontSize: 13.5, fontWeight: 600, height: 40, borderRadius: 10,
                  background: 'var(--accent)', color: 'var(--surface)',
                  border: '1px solid var(--accent-ink)', cursor: 'pointer',
                }}
              >
                {t('v2.users.drawerEdit')}
              </button>
              <div className="flex gap-2">
                {user.isActive ? (
                  <DrawerAction tone="danger" onClick={() => actions.onDeactivate(user)}>
                    {t('v2.menuDeactivate')}
                  </DrawerAction>
                ) : (
                  <DrawerAction tone="ok" onClick={() => actions.onReactivate(user)}>
                    {t('v2.menuActivate')}
                  </DrawerAction>
                )}
                <DrawerAction tone="warn" onClick={() => actions.onResetPassword(user)}>
                  {t('v2.menuResetPw')}
                </DrawerAction>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .users-drawer { transition: none !important; }
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4"
      style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}
    >
      <dt style={{ fontSize: 12.5, color: 'var(--ink-faint)', flexShrink: 0 }}>{label}</dt>
      <dd style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'right', wordBreak: 'break-word' }}>
        {children}
      </dd>
    </div>
  )
}

function DrawerAction({
  children, onClick, tone,
}: { children: React.ReactNode; onClick: () => void; tone: 'ok' | 'warn' | 'danger' }) {
  const color =
    tone === 'ok' ? 'var(--accent)' :
    tone === 'warn' ? 'var(--warn)' : 'var(--danger)'
  return (
    <button
      type="button"
      onClick={onClick}
      className="users-drawer-action flex-1 transition-colors"
      style={{
        fontSize: 12.5, fontWeight: 500, height: 38, borderRadius: 10,
        background: 'var(--surface)', color,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
        cursor: 'pointer',
      }}
    >
      {children}
      <style>{`.users-drawer-action:hover { background: color-mix(in srgb, currentColor 8%, var(--surface)); }`}</style>
    </button>
  )
}
