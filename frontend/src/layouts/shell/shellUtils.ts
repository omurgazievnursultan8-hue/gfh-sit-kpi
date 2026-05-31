/**
 * Returns up to two uppercase initials from a display name or email.
 * Prefer passing the user's full name; falls back to email local-part splitting
 * on '.', '_', '-' when no name is available.
 */
export function getInitials(source: string | null | undefined): string {
  if (!source) return '?'
  const trimmed = source.trim()
  if (!trimmed) return '?'

  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0]
    const parts = local.split(/[._-]+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return local.slice(0, 2).toUpperCase()
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (tokens.length >= 2) return (tokens[0][0] + tokens[1][0]).toUpperCase()
  return tokens[0].slice(0, 2).toUpperCase()
}
