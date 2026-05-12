import { KpiRing } from './KpiRing'
import type { PersonalAnalytics } from '../analytics/analyticsApi'
import type { Period } from '../periods/periodsApi'

interface DashboardHeroProps {
  analytics: PersonalAnalytics | null
  activePeriod: Period | null
  pendingEvaluations: number
  pendingAppeals: number
}

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatPeriodDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

// Russian plural agreement: returns one/few/many form per count.
function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function periodShortLabel(p: Period): string {
  const start = new Date(p.startDate)
  const year = start.getFullYear()
  if (p.type === 'QUARTERLY') {
    const q = Math.floor(start.getMonth() / 3) + 1
    return `Q${q} ${year}`
  }
  if (p.type === 'MONTHLY') {
    const m = String(start.getMonth() + 1).padStart(2, '0')
    return `${m}.${year}`
  }
  return `${year}`
}

function periodShortBadge(p: Period): string {
  const start = new Date(p.startDate)
  if (p.type === 'QUARTERLY') {
    const q = Math.floor(start.getMonth() / 3) + 1
    return `Q${q}`
  }
  if (p.type === 'MONTHLY') {
    return `M${start.getMonth() + 1}`
  }
  return 'Год'
}

export function DashboardHero({ analytics, activePeriod, pendingEvaluations, pendingAppeals }: DashboardHeroProps) {
  const score = analytics?.currentScore ?? null
  const firstName = analytics?.fullName?.split(' ').pop() ?? analytics?.fullName ?? ''

  const deadlineDays = activePeriod ? daysUntil(activePeriod.submissionDeadline) : null
  const periodLine = activePeriod
    ? `${periodShortLabel(activePeriod)} · ${formatPeriodDate(activePeriod.startDate)} — ${formatPeriodDate(activePeriod.endDate)}`
    : null

  // Build prose subtitle with correct Russian plural agreement.
  // Emphasised tokens (period name, counts) share the same warm-cream bold style.
  const emphasis = { color: '#f5ecd2', fontWeight: 600 } as const
  const sentences: React.ReactNode[] = []
  if (activePeriod && deadlineDays !== null) {
    const dayWord = plural(deadlineDays, ['день', 'дня', 'дней'])
    sentences.push(
      <span key="s1">
        Период оценки <strong style={emphasis}>{periodShortLabel(activePeriod)}</strong>{' '}
        завершается через <strong style={emphasis}>{deadlineDays} {dayWord}</strong>.
      </span>,
    )
  }
  if (pendingEvaluations > 0 && pendingAppeals > 0) {
    const empWord = plural(pendingEvaluations, ['сотрудник', 'сотрудника', 'сотрудников'])
    const empVerb = plural(pendingEvaluations, ['ждёт', 'ждут', 'ждут'])
    const apWord = plural(pendingAppeals, ['апелляция', 'апелляции', 'апелляций'])
    sentences.push(
      <span key="s2">
        У вас <strong style={emphasis}>{pendingEvaluations} {empWord}</strong> {empVerb} оценку и{' '}
        <strong style={emphasis}>{pendingAppeals} {apWord}</strong> на рассмотрение.
      </span>,
    )
  } else if (pendingEvaluations > 0) {
    const empWord = plural(pendingEvaluations, ['сотрудник', 'сотрудника', 'сотрудников'])
    const empVerb = plural(pendingEvaluations, ['ждёт', 'ждут', 'ждут'])
    sentences.push(
      <span key="s2">
        У вас <strong style={emphasis}>{pendingEvaluations} {empWord}</strong> {empVerb} оценку.
      </span>,
    )
  } else if (pendingAppeals > 0) {
    const apWord = plural(pendingAppeals, ['апелляция', 'апелляции', 'апелляций'])
    sentences.push(
      <span key="s2">
        У вас <strong style={emphasis}>{pendingAppeals} {apWord}</strong> на рассмотрение.
      </span>,
    )
  } else if (activePeriod) {
    sentences.push(<span key="s2">Оценка будет доступна после завершения периода.</span>)
  }

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
              {todayLine()}
            </span>
          </div>

          <h1
            className="font-display mb-1.5"
            style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: '#ecf2f0' }}
          >
            {timeGreeting()},{' '}
            <span style={{ color: 'var(--gold)' }}>{firstName}.</span>
          </h1>

          {sentences.length > 0 && (
            <div className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 560, lineHeight: 1.55 }}>
              {sentences.map((s, i) => (
                <p key={i} style={{ margin: 0 }}>{s}</p>
              ))}
            </div>
          )}

          {activePeriod && periodLine && (
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
                Активный
              </span>
              <span>{periodLine}</span>
            </div>
          )}
        </div>

        {/* Right — ring only */}
        <div className="flex items-center justify-end">
          <KpiRing
            score={score}
            periodShort={activePeriod ? periodShortBadge(activePeriod) : null}
          />
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
