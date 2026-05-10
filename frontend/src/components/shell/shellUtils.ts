export function getInitials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split('.')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}
