import type { DashboardEvent } from '../analytics/analyticsApi'

interface Props {
  events: DashboardEvent[]
}

function relativeTime(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  const diffD = Math.floor(diffMs / 86_400_000)
  if (diffH < 1) return '<1ч'
  if (diffH < 24) return `${diffH}ч`
  if (diffD === 1) return 'вчера'
  const d = new Date(isoStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const iconStyles: Record<string, { bg: string; char: string }> = {
  success: { bg: '#dcfce7', char: '✓' },
  warn:    { bg: '#fef3c7', char: '!' },
  info:    { bg: '#dbeafe', char: '📅' },
}

export function DashboardEventFeed({ events }: Props) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      marginTop: 20, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{
          fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600,
          letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          Лента событий
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '20px', fontSize: 13, color: '#6b7280' }}>
          Событий пока нет
        </div>
      ) : (
        events.map((ev, i) => {
          const icon = iconStyles[ev.iconType] ?? iconStyles.info
          return (
            <div key={ev.id} style={{
              display: 'flex', gap: 14, padding: '11px 20px',
              borderBottom: i < events.length - 1 ? '1px solid #f3f4f6' : 'none',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: icon.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, marginTop: 1,
              }}>
                {icon.char}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink, #1a1a2e)', lineHeight: 1.5, flex: 1 }}>
                {ev.text}
              </div>
              <div style={{
                marginLeft: 'auto', fontSize: 11, color: '#6b7280',
                whiteSpace: 'nowrap', paddingTop: 3,
                fontFamily: 'var(--font-mono, monospace)',
              }}>
                {relativeTime(ev.timestamp)}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
