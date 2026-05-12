// Per-user (when userId known) recents + favorites for the command palette.
// Keys: gfh_nav_recents:<uid>  /  gfh_nav_favs:<uid>  (falls back to :anon)
// favs key holds an explicit user choice; absence means "use role defaults".

const RECENTS_MAX = 8
const RECENTS_PREFIX = 'gfh_nav_recents'
const FAVS_PREFIX = 'gfh_nav_favs'

// Role-default pins shown until the user touches the star toggle.
const DEFAULT_FAVS_BY_ROLE: Record<string, string[]> = {
  ADMIN: ['/admin/users', '/admin/audit', '/admin/monitoring'],
  CHAIRMAN: ['/my-tasks', '/manager-dashboard', '/analytics'],
  DEPUTY_CHAIRMAN: ['/my-tasks', '/manager-dashboard', '/analytics'],
  HEAD_OF_DEPARTMENT: ['/my-tasks', '/manager-dashboard', '/my-evaluations'],
  HEAD_OF_DEPARTMENT_UNIT: ['/my-tasks', '/manager-dashboard', '/my-evaluations'],
  EMPLOYEE: ['/my-kpi', '/my-evaluations'],
}

function suffix(userId: number | null | undefined): string {
  return userId ? `:${userId}` : ':anon'
}

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

function write(key: string, list: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch { /* quota */ }
}

export function getRecents(userId: number | null | undefined): string[] {
  return read(`${RECENTS_PREFIX}${suffix(userId)}`)
}

export function pushRecent(userId: number | null | undefined, to: string): void {
  const key = `${RECENTS_PREFIX}${suffix(userId)}`
  const list = read(key).filter(x => x !== to)
  list.unshift(to)
  write(key, list.slice(0, RECENTS_MAX))
}

/** Raw stored favs. Empty if user has never touched the star. */
export function getFavs(userId: number | null | undefined): string[] {
  return read(`${FAVS_PREFIX}${suffix(userId)}`)
}

/** Has the user ever toggled a pin? (Distinguishes "no pins" from "never set"). */
export function hasFavsSet(userId: number | null | undefined): boolean {
  const key = `${FAVS_PREFIX}${suffix(userId)}`
  // Safari private mode + locked-down profiles throw on localStorage access.
  try { return localStorage.getItem(key) !== null } catch { return false }
}

/** Effective pins: user's list if they've ever set one, else role defaults. */
export function getEffectiveFavs(
  userId: number | null | undefined,
  role: string | null | undefined,
): string[] {
  if (hasFavsSet(userId)) return getFavs(userId)
  return role ? (DEFAULT_FAVS_BY_ROLE[role] ?? []) : []
}

export function isFav(userId: number | null | undefined, to: string): boolean {
  return getFavs(userId).includes(to)
}

export function toggleFav(userId: number | null | undefined, to: string): string[] {
  const key = `${FAVS_PREFIX}${suffix(userId)}`
  const list = read(key)
  const next = list.includes(to) ? list.filter(x => x !== to) : [...list, to]
  write(key, next)
  return next
}

/**
 * Migrate role defaults into an explicit user list, then toggle `to`.
 * Use when the user star-toggles an item for the first time, so defaults
 * become editable instead of disappearing on first edit.
 */
export function toggleFavWithDefaults(
  userId: number | null | undefined,
  role: string | null | undefined,
  to: string,
): string[] {
  if (!hasFavsSet(userId)) {
    const seed = role ? (DEFAULT_FAVS_BY_ROLE[role] ?? []) : []
    write(`${FAVS_PREFIX}${suffix(userId)}`, seed)
  }
  return toggleFav(userId, to)
}
