import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import type { RootState } from '../../app/store'
import { usePageTitle } from '../../context/PageContext'
import { analyticsApi } from '../analytics/analyticsApi'
import type {
  PersonalAnalytics, PendingSummary,
} from '../analytics/analyticsApi'
import { periodsApi } from '../periods/periodsApi'
import type { AppealPending } from '../periods/periodsApi'
import { delegationsApi } from '../org/delegationsApi'
import type { Delegation } from '../org/delegationsApi'
import { DASHBOARD_CSS } from './dashboardStyles'

// ── helpers ─────────────────────────────────────────────────────────────────
function asciiBar(pct: number, width = 22): { fill: string; empty: string } {
  const clamped = Math.max(0, Math.min(1, pct))
  const filled = Math.round(clamped * width)
  return { fill: '█'.repeat(filled), empty: '░'.repeat(width - filled) }
}

// Maps a 0–100 score to a colour zone. null → neutral.
function scoreZone(score: number | null): {
  numClass: string; tagClass: string; labelKey: string | null
} {
  if (score === null) return { numClass: '', tagClass: '', labelKey: null }
  if (score >= 80) return { numClass: 'zone-up', tagClass: 'up', labelKey: 'dashboard.zoneUp' }
  if (score >= 50) return { numClass: 'zone-warn', tagClass: 'warn', labelKey: 'dashboard.zoneNorm' }
  return { numClass: 'zone-down', tagClass: 'down', labelKey: 'dashboard.zoneDown' }
}

// ── card shell ──────────────────────────────────────────────────────────────
function Card({ col, title, id, children }: {
  col: number; title: string; id: string; children: React.ReactNode
}) {
  return (
    <section className={`dv3-card dv3-col-${col}`}>
      <div className="dv3-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv3-card-id">[ {id} ]</span>
      </div>
      <div className="dv3-card-body">{children}</div>
    </section>
  )
}

// ── page ────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  usePageTitle('nav.dashboard')
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount)

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [summary, setSummary] = useState<PendingSummary | null>(null)
  const [appeals, setAppeals] = useState<AppealPending[]>([])
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [partialFailure, setPartialFailure] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  // Fetch all panels — render whatever succeeds, flag partial failure.
  useEffect(() => {
    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      analyticsApi.pendingSummary().then(setSummary),
      periodsApi.pendingAppeals().then(setAppeals),
      delegationsApi.list(0, 50).then(r => setDelegations(r.content)),
    ]
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
      setLoading(false)
      setLoadedAt(new Date())
    })
  }, [])

  // Live tick — re-render every 60s so clock + relative time stay fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── time / clock (derived from `now`) ────────────────────────────────────────
  const hours = now.getHours()
  const timeGreeting = hours < 12
    ? t('dashboard.greetingMorning')
    : hours < 18
      ? t('dashboard.greetingAfternoon')
      : t('dashboard.greetingEvening')

  const datePart = now.toLocaleDateString(
    i18n.language === 'kg' ? 'ky-KG' : 'ru-RU',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  )
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const todayLine = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  // Relative "updated N min ago" string.
  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1
      ? t('dashboard.updatedJustNow')
      : t('dashboard.updatedMinutesAgo', { count: mins })
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const currentScore = analytics?.currentScore ?? null
  const scoreWhole = currentScore !== null ? Math.round(currentScore) : null
  const scorePct = currentScore !== null ? currentScore / 100 : 0
  const scoreBar = asciiBar(scorePct, 22)

  const zone = scoreZone(scoreWhole)

  const activeDelegations = delegations.filter(d => d.isActive)

  const cycleDone = summary?.completedEvaluations ?? 0
  const cycleTotal = summary?.totalEvaluations ?? 0
  const cyclePct = cycleTotal > 0 ? cycleDone / cycleTotal : 0
  const cycleBar = asciiBar(cyclePct, 22)

  // APPEALS — share of open tasks (appeals vs appeals + pending evaluations).
  const appealsPending = summary?.pendingAppeals ?? appeals.length
  const pendingEvals = summary?.pendingEvaluations ?? 0
  const openTasks = appealsPending + pendingEvals
  const appealsPct = openTasks > 0 ? appealsPending / openTasks : 0
  const appealsBar = asciiBar(appealsPct, 22)

  // NOTIFICATIONS — inbox-fill capacity bar (20 unread = full).
  const NOTIF_CAP = 20
  const notifPct = unreadCount / NOTIF_CAP
  const notifBar = asciiBar(notifPct, 22)

  // DELEGATIONS — active share of all delegations.
  const delegTotal = delegations.length
  const delegActive = activeDelegations.length
  const delegPct = delegTotal > 0 ? delegActive / delegTotal : 0
  const delegBar = asciiBar(delegPct, 22)

  // Neutral placeholder while loading; genuine zeros still render as 0.
  const PLACEHOLDER = '··'

  // ── hero ───────────────────────────────────────────────────────────────────
  // Russian ФИО is "Surname Name Patronymic"; greet by Name + Patronymic.
  const nameParts = analytics?.fullName?.trim().split(/\s+/) ?? []
  const greetingName = nameParts.length >= 3
    ? `${nameParts[1]} ${nameParts[2]}`
    : nameParts.slice(1).join(' ') || nameParts[0] || ''

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>

      <div className="dv3-terminal">
        {/* a11y partial-failure announcer */}
        <div className="sr-only" role="status" aria-live="polite">
          {partialFailure ? t('dashboard.partialFailureSr') : ''}
        </div>

        {/* ── HERO ── */}
        <div className="dv3-hero">
          <div className="dv3-hero-meta">
            <span className="dv3-hero-meta-l">{t('dashboard.heroMeta')}</span>
            <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
          </div>
          <div className="dv3-hero-main">
            <div>
              <h1 className="dv3-hero-title">
                {timeGreeting}, <span className="dv3-accent">{greetingName || '—'}.</span>
              </h1>
              <p className="dv3-hero-sub">{todayLine}</p>
            </div>
            <div className="dv3-hero-metrics">
              <div className="dv3-hero-metric">
                <span
                  className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}${
                    !loading && zone.numClass ? ` dv3-hero-metric-num--${zone.numClass}` : ''
                  }`}
                >
                  {loading ? PLACEHOLDER : (scoreWhole !== null ? scoreWhole : '—')}
                </span>
                <span className="dv3-hero-metric-lab">{t('dashboard.kpiOf100')}</span>
              </div>
              <div className="dv3-hero-metric">
                <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                  {loading ? PLACEHOLDER : openTasks}
                </span>
                <span className="dv3-hero-metric-lab">{t('dashboard.openTasks')}</span>
              </div>
            </div>
          </div>
          <div className="dv3-hero-foot">
            <span className={partialFailure ? 'dv3-hero-foot-warn' : 'dv3-hero-foot-ok'}>
              STATUS · {partialFailure ? t('dashboard.statusPartial') : t('dashboard.statusOk')}
            </span>
            <span>{updatedLabel}</span>
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="dv3-grid">

          {/* SELF.RATING */}
          <Card col={4} title="SELF.RATING" id="R01">
            <div className="dv3-kpi">
              <div>
                <div
                  className={`dv3-kpi-num${loading ? ' dv3-loading' : ''}${
                    !loading && zone.numClass ? ` dv3-kpi-num--${zone.numClass}` : ''
                  }`}
                >
                  {loading ? PLACEHOLDER : (scoreWhole !== null ? scoreWhole : '—')}
                  <span className="dv3-kpi-unit">/ 100</span>
                </div>
                {!loading && zone.labelKey && (
                  <span className={`dv3-zone-tag dv3-zone-tag--${zone.tagClass}`}>
                    {t(zone.labelKey)}
                  </span>
                )}
              </div>
            </div>
            <div className="dv3-gauge">
              <div className="dv3-gauge-bar dv3-gauge-bar--lg" aria-hidden="true">
                <span className="dv3-fill">{scoreBar.fill}</span>
                <span className="dv3-dim">{scoreBar.empty}</span>
              </div>
              <div className="dv3-gauge-meta dv3-gauge-meta--mark">
                <span>0</span>
                <span
                  className="dv3-gauge-cur"
                  style={{ left: `${Math.min(100, Math.round(scorePct * 100))}%` }}
                >
                  <strong>{scoreWhole !== null ? scoreWhole : '—'}</strong>
                </span>
                <span>100</span>
              </div>
            </div>
          </Card>

          {/* EVAL.CYCLE.PROGRESS */}
          <Card col={4} title="EVAL.CYCLE.PROGRESS" id="P01">
            <div className="dv3-kpi">
              <div className={`dv3-kpi-num${loading ? ' dv3-loading' : ''}`}>
                {loading ? PLACEHOLDER : cycleDone}
                <span className="dv3-kpi-unit">/ {loading ? PLACEHOLDER : cycleTotal}</span>
                <span className="dv3-kpi-label">{t('dashboard.evaluationsComplete')}</span>
              </div>
            </div>
            <div className="dv3-gauge">
              <div className="dv3-gauge-bar dv3-gauge-bar--lg" aria-hidden="true">
                <span className="dv3-fill">{cycleBar.fill}</span>
                <span className="dv3-dim">{cycleBar.empty}</span>
              </div>
              <div className="dv3-gauge-meta">
                <span>0%</span>
                <span><strong>{Math.round(cyclePct * 100)}%</strong></span>
                <span>100%</span>
              </div>
            </div>
          </Card>

          {/* APPEALS */}
          <div
            className="dv3-card dv3-col-4 dv3-card-btn"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/my-tasks')}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault()
                navigate('/my-tasks')
              }
            }}
          >
            <div className="dv3-card-head">
              <span><strong>APPEALS</strong></span>
              <span className="dv3-card-id">[ A01 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-kpi">
                <div className={`dv3-kpi-num${loading ? ' dv3-loading' : ''}`}>
                  {loading ? PLACEHOLDER : appealsPending}
                  <span className="dv3-kpi-label">{t('dashboard.pendingAppeals')}</span>
                </div>
              </div>
              <div className="dv3-gauge">
                <div className="dv3-gauge-bar dv3-gauge-bar--lg" aria-hidden="true">
                  <span className="dv3-fill">{appealsBar.fill}</span>
                  <span className="dv3-dim">{appealsBar.empty}</span>
                </div>
                <div className="dv3-gauge-meta">
                  <span>0%</span>
                  <span><strong>{Math.round(appealsPct * 100)}%</strong> {t('dashboard.ofOpenTasks')}</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div
            className="dv3-card dv3-col-4 dv3-card-btn"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/notifications')}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                if (e.key === ' ') e.preventDefault()
                navigate('/notifications')
              }
            }}
          >
            <div className="dv3-card-head">
              <span><strong>NOTIFICATIONS</strong></span>
              <span className="dv3-card-id">[ N01 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-kpi">
                <div className="dv3-kpi-num">
                  {unreadCount}
                  <span className="dv3-kpi-label">{t('dashboard.unread')}</span>
                </div>
              </div>
              <div className="dv3-gauge">
                <div className="dv3-gauge-bar dv3-gauge-bar--lg" aria-hidden="true">
                  <span className="dv3-fill">{notifBar.fill}</span>
                  <span className="dv3-dim">{notifBar.empty}</span>
                </div>
                <div className="dv3-gauge-meta">
                  <span>0</span>
                  <span><strong>{unreadCount}</strong> / {NOTIF_CAP} {t('dashboard.inbox')}</span>
                  <span>{NOTIF_CAP}</span>
                </div>
              </div>
            </div>
          </div>

          {/* DELEGATIONS */}
          <div className="dv3-card dv3-col-4">
            <div className="dv3-card-head">
              <span><strong>DELEGATIONS</strong></span>
              <span className="dv3-card-id">[ D01 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-kpi">
                <div className={`dv3-kpi-num${loading ? ' dv3-loading' : ''}`}>
                  {loading ? PLACEHOLDER : delegActive}
                  <span className="dv3-kpi-label">{t('dashboard.activeDelegations')}</span>
                </div>
              </div>
              <div className="dv3-gauge">
                <div className="dv3-gauge-bar dv3-gauge-bar--lg" aria-hidden="true">
                  <span className="dv3-fill">{delegBar.fill}</span>
                  <span className="dv3-dim">{delegBar.empty}</span>
                </div>
                <div className="dv3-gauge-meta">
                  <span>0</span>
                  <span><strong>{delegActive}</strong> / {delegTotal} {t('dashboard.total')}</span>
                  <span>{delegTotal}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
