import type { AdminStats } from './adminApi'

interface AdminHeroProps {
  stats: AdminStats | null
}

function todayLine(): string {
  const now = new Date()
  const datePart = now.toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${datePart} · ${hh}:${mm}`
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

export function AdminHero({ stats }: AdminHeroProps) {
  const emphasis = { color: '#f5ecd2', fontWeight: 600 } as const

  const activeUsers = stats?.activeUsers ?? 0
  const periods = stats?.activeEvaluationPeriods ?? 0
  const appeals = stats?.openAppeals ?? 0
  const pending = stats?.pendingEvaluations ?? 0

  const empWord = plural(activeUsers, ['сотрудник', 'сотрудника', 'сотрудников'])
  const perWord = plural(periods, ['активный период', 'активных периода', 'активных периодов'])
  const apWord = plural(appeals, ['апелляция ждёт', 'апелляции ждут', 'апелляций ждут'])

  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6"
      style={{
        background: 'linear-gradient(135deg, #0e2724 0%, #0d4d3f 55%, #1a7558 100%)',
        color: '#ecf2f0',
        padding: '28px 32px',
        border: '1px solid #06120f',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Blueprint grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 24px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,.020) 0 1px,transparent 1px 24px)',
        }}
      />
      {/* Gold radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80, right: -80, width: 280, height: 280,
          background: 'radial-gradient(circle,rgba(168,133,43,.12),transparent 60%)',
        }}
      />

      <div
        className="relative grid items-center gap-8 hero-grid"
        style={{ gridTemplateColumns: '1fr auto' }}
      >
        {/* Left — text */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-block rounded-full flex-shrink-0 animate-pulse"
              style={{ width: 6, height: 6, background: 'var(--gold)' }}
            />
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.7)' }}
            >
              {todayLine()} · SYSTEM OK
            </span>
          </div>

          <h1
            className="font-display mb-1.5"
            style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: '#ecf2f0' }}
          >
            Панель <span style={{ color: 'var(--gold)' }}>администратора.</span>
          </h1>

          <div className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 560, lineHeight: 1.55 }}>
            <p style={{ margin: 0 }}>
              В системе <strong style={emphasis}>{activeUsers} {empWord}</strong>,{' '}
              <strong style={emphasis}>{periods} {perWord}</strong>
              {pending > 0 && (
                <>
                  {' '}
                  и <strong style={emphasis}>{pending}</strong> оценок в работе
                </>
              )}
              .
            </p>
            {appeals > 0 && (
              <p style={{ margin: 0 }}>
                <strong style={emphasis}>{appeals} {apWord}</strong> рассмотрения.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono" style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.65)' }}>
            <span
              className="font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                fontSize: 10,
                background: 'rgba(120,200,150,0.14)',
                color: '#7fd4a3',
                border: '1px solid rgba(120,200,150,0.32)',
              }}
            >
              Live
            </span>
            <span>аудит за 24ч: {stats?.auditLogsLast24h ?? 0} · всего оценок: {stats?.totalEvaluations ?? 0}</span>
          </div>
        </div>

        {/* Right — system pulse medallion (3 stacked metrics) */}
        <div className="flex items-center justify-end">
          <div
            className="relative flex flex-col items-center justify-center rounded-full"
            style={{
              width: 168,
              height: 168,
              background: 'radial-gradient(circle at 30% 30%, rgba(168,133,43,0.18), rgba(14,39,36,0.6) 70%)',
              border: '1px solid rgba(168,133,43,0.35)',
              boxShadow: 'inset 0 0 24px rgba(168,133,43,0.08)',
            }}
          >
            <div
              className="font-display"
              style={{ fontSize: 44, fontWeight: 700, color: 'var(--gold)', lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {activeUsers}
            </div>
            <div
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 9, color: 'rgba(245,236,210,0.6)', marginTop: 4 }}
            >
              Активных
            </div>
            <div
              className="font-mono"
              style={{ fontSize: 10.5, color: 'rgba(236,242,240,0.78)', marginTop: 10 }}
            >
              {periods} <span style={{ color: 'rgba(245,236,210,0.5)' }}>периодов</span>
              {' · '}
              {appeals} <span style={{ color: 'rgba(245,236,210,0.5)' }}>апел.</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </div>
  )
}
