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

export function DashboardHero({ analytics, activePeriod, pendingEvaluations, pendingAppeals }: DashboardHeroProps) {
  const score = analytics?.currentScore ?? null
  const deptAvg = analytics?.departmentAvg ?? null
  const history = analytics?.history ?? []
  const firstName = analytics?.fullName?.split(' ').pop() ?? analytics?.fullName ?? ''

  const vsDepart = score !== null && deptAvg !== null
    ? Math.round((score - deptAvg) * 10) / 10
    : null

  const prevPeriod = history.length >= 2 ? history[history.length - 2] : null
  const prevScore = prevPeriod !== null ? prevPeriod.score : null
  const vsPrev = score !== null && prevScore !== null
    ? Math.round((score - prevScore) * 10) / 10
    : null

  function prevPeriodLabel(p: typeof prevPeriod): string {
    if (!p) return 'пред.'
    if (p.periodType === 'QUARTERLY') {
      const month = new Date(p.startDate).getMonth() // 0-based
      const q = Math.floor(month / 3) + 1
      return `Q${q}`
    }
    if (p.periodType === 'MONTHLY') {
      const m = new Date(p.startDate).getMonth() + 1
      return `M${m}`
    }
    return 'Год'
  }

  const deadlineDays = activePeriod ? daysUntil(activePeriod.submissionDeadline) : null
  const periodName = activePeriod
    ? `${activePeriod.type.replace('QUARTERLY', 'Q').replace('MONTHLY', 'M').replace('ANNUAL', 'Год')} · ${formatPeriodDate(activePeriod.startDate)} — ${formatPeriodDate(activePeriod.endDate)}`
    : null

  const subtitleParts: string[] = []
  if (activePeriod && deadlineDays !== null) {
    subtitleParts.push(`Период оценки завершается через ${deadlineDays} дн.`)
  }
  if (pendingEvaluations > 0) {
    subtitleParts.push(`${pendingEvaluations} сотрудников ждут оценку`)
  }
  if (pendingAppeals > 0) {
    subtitleParts.push(`${pendingAppeals} апелляций на рассмотрении`)
  }
  if (subtitleParts.length === 0 && activePeriod) {
    subtitleParts.push('Оценка будет доступна после завершения периода.')
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl mb-5"
      style={{
        background: 'linear-gradient(135deg, #0e2724 0%, #0d4d3f 55%, #1a7558 100%)',
        color: '#ecf2f0',
        padding: '22px 28px',
        border: '1px solid #06120f',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0 1px,transparent 1px 5px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,.008) 0 1px,transparent 1px 5px)',
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

      <div className="relative grid gap-6" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'center' }}>
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

          {subtitleParts.length > 0 && (
            <p className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 420, lineHeight: 1.5 }}>
              {subtitleParts.join(' · ')}
            </p>
          )}

          {activePeriod && periodName && (
            <div className="flex items-center gap-2 font-mono" style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.65)' }}>
              <span
                className="font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{
                  fontSize: 10,
                  background: 'rgba(168,133,43,0.18)',
                  color: 'var(--gold)',
                  border: '1px solid rgba(168,133,43,0.30)',
                }}
              >
                Активный
              </span>
              <span>{periodName}</span>
            </div>
          )}
        </div>

        {/* Right — ring + side stats */}
        <div className="flex items-center gap-4">
          <KpiRing score={score} />

          <div className="flex flex-col gap-2.5 min-w-0">
            {/* vs dept avg */}
            <div
              className="px-3 py-2 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="font-mono uppercase tracking-widest mb-0.5"
                style={{ fontSize: 9.5, color: 'rgba(245,236,210,0.6)' }}
              >
                vs Ср. отдел
              </div>
              <div className="font-display flex items-baseline gap-1.5" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold-soft)' }}>
                {vsDepart !== null ? (
                  <>
                    {vsDepart > 0 ? '+' : ''}{vsDepart}
                    <span
                      className="font-mono"
                      style={{ fontSize: 10.5, color: vsDepart >= 0 ? '#9bdfb5' : '#d97f7f' }}
                    >
                      {vsDepart >= 0 ? 'лучше' : 'ниже'}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'rgba(245,236,210,0.35)' }}>—</span>
                )}
              </div>
            </div>

            {/* vs prev period */}
            <div
              className="px-3 py-2 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="font-mono uppercase tracking-widest mb-0.5"
                style={{ fontSize: 9.5, color: 'rgba(245,236,210,0.6)' }}
              >
                Динамика
              </div>
              <div className="font-display flex items-baseline gap-1.5" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold-soft)' }}>
                {vsPrev !== null ? (
                  <>
                    {vsPrev > 0 ? '+' : ''}{vsPrev}
                    <span
                      className="font-mono"
                      style={{ fontSize: 10.5, color: vsPrev >= 0 ? '#9bdfb5' : '#d97f7f' }}
                    >
                      vs {prevPeriodLabel(prevPeriod)}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'rgba(245,236,210,0.35)' }}>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
