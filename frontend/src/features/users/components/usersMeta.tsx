// Shared presentation metadata for the Users feature — role labels/accents,
// avatar, status pill, role badge. Single source so table, card grid and
// detail drawer stay visually consistent.

import { useTranslation } from 'react-i18next'

// Lower rank = higher in hierarchy. Drives role-column sorting.
export const ROLE_RANK: Record<string, number> = {
  ADMIN: 0,
  CHAIRMAN: 1,
  DEPUTY_CHAIRMAN: 2,
  ORG_HEAD: 3,
  EMPLOYEE: 4,
}

interface RoleAccent { bg: string; fg: string; border: string }

export const ROLE_ACCENT: Record<string, RoleAccent> = {
  ADMIN:                   { bg: 'var(--gold-soft)',        fg: 'var(--gold)', border: 'color-mix(in srgb,var(--gold) 30%,transparent)' },
  CHAIRMAN:                { bg: 'rgba(120,150,200,0.14)',  fg: '#4a73c7',     border: 'rgba(120,150,200,0.32)' },
  DEPUTY_CHAIRMAN:         { bg: 'rgba(120,150,200,0.14)',  fg: '#4a73c7',     border: 'rgba(120,150,200,0.32)' },
  ORG_HEAD:                { bg: 'rgba(120,150,200,0.14)',  fg: '#4a73c7',     border: 'rgba(120,150,200,0.32)' },
  EMPLOYEE:                { bg: 'rgba(120,200,150,0.14)',  fg: '#2f9e6d',     border: 'rgba(120,200,150,0.32)' },
}

export function roleAccent(role: string): RoleAccent {
  return ROLE_ACCENT[role] ?? ROLE_ACCENT.EMPLOYEE
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || '—'
}

// Round avatar — role-tinted fill, deactivated users render muted.
export function Avatar({ name, role, active, size = 34, src }: {
  name: string; role?: string; active: boolean; size?: number; src?: string | null
}) {
  const a = role ? roleAccent(role) : null
  if (src) {
    return (
      <img src={src} alt={name}
        className="inline-block flex-shrink-0 object-cover"
        style={{
          width: size, height: size, borderRadius: '50%',
          filter: active ? undefined : 'grayscale(1)',
          border: `1px solid ${!active ? 'var(--line)' : a ? a.border : 'var(--accent-soft)'}`,
        }}
      />
    )
  }
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: !active ? 'var(--surface-mute)' : a ? a.bg : 'var(--accent-mute)',
        color: !active ? 'var(--ink-dim)' : a ? a.fg : 'var(--accent)',
        border: `1px solid ${!active ? 'var(--line)' : a ? a.border : 'var(--accent-soft)'}`,
        fontSize: Math.round(size * 0.36), fontWeight: 600, letterSpacing: '0.01em',
      }}
    >
      {initials(name)}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const { t } = useTranslation()
  const a = roleAccent(role)
  return (
    <span
      style={{
        display: 'inline-flex', fontSize: 11.5, fontWeight: 500,
        padding: '3px 9px', borderRadius: 999,
        background: a.bg, color: a.fg, border: `1px solid ${a.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {ROLE_RANK[role] != null ? t(`v2.rolesShort.${role}`) : role}
    </span>
  )
}

export function StatusPill({ active }: { active: boolean }) {
  const { t } = useTranslation()
  const s = active
    ? { bg: 'rgba(120,200,150,0.14)', fg: '#2f9e6d', border: 'rgba(120,200,150,0.32)', text: t('v2.statusActive'), dot: '#2f9e6d' }
    : { bg: 'var(--danger-soft)', fg: 'var(--danger)', border: 'color-mix(in srgb,var(--danger) 30%,transparent)', text: t('v2.statusBlocked'), dot: 'var(--danger)' }
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        fontSize: 11.5, fontWeight: 500, padding: '3px 10px', borderRadius: 999,
        background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot, flexShrink: 0 }} />
      {s.text}
    </span>
  )
}
