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
import { StatCard, STAT_CARD_CSS, scoreZone } from '../../components/StatCard'

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

  const zone = scoreZone(scoreWhole)

  const activeDelegations = delegations.filter(d => d.isActive)

  const cycleDone = summary?.completedEvaluations ?? 0
  const cycleTotal = summary?.totalEvaluations ?? 0
  const cyclePct = cycleTotal > 0 ? cycleDone / cycleTotal : 0

  // APPEALS — share of open tasks (appeals vs appeals + pending evaluations).
  const appealsPending = summary?.pendingAppeals ?? appeals.length
  const pendingEvals = summary?.pendingEvaluations ?? 0
  const openTasks = appealsPending + pendingEvals
  const appealsPct = openTasks > 0 ? appealsPending / openTasks : 0

  // NOTIFICATIONS — inbox-fill capacity bar (20 unread = full).
  const NOTIF_CAP = 20
  const notifPct = unreadCount / NOTIF_CAP

  // DELEGATIONS — active share of all delegations.
  const delegTotal = delegations.length
  const delegActive = activeDelegations.length
  const delegPct = delegTotal > 0 ? delegActive / delegTotal : 0

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
      <style>{STAT_CARD_CSS}</style>

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
          <div className="dv3-col-4">
            <StatCard
              title="SELF.RATING" id="R01" loading={loading}
              value={scoreWhole} unit="/ 100" zoneScore={scoreWhole}
              gauge={{
                pct: scorePct, variant: 'marker',
                left: '0', right: '100',
                current: scoreWhole !== null ? scoreWhole : '—',
              }}
            />
          </div>

          {/* EVAL.CYCLE.PROGRESS */}
          <div className="dv3-col-4">
            <StatCard
              title="EVAL.CYCLE.PROGRESS" id="P01" loading={loading}
              value={cycleDone}
              unit={`/ ${loading ? PLACEHOLDER : cycleTotal}`}
              label={t('dashboard.evaluationsComplete')}
              gauge={{
                pct: cyclePct, variant: 'meta',
                left: '0%',
                center: <strong>{Math.round(cyclePct * 100)}%</strong>,
                right: '100%',
              }}
            />
          </div>

          {/* APPEALS */}
          <div className="dv3-col-4">
            <StatCard
              title="APPEALS" id="A01" loading={loading}
              value={appealsPending}
              label={t('dashboard.pendingAppeals')}
              onClick={() => navigate('/my-tasks')}
              gauge={{
                pct: appealsPct, variant: 'meta',
                left: '0%',
                center: <><strong>{Math.round(appealsPct * 100)}%</strong> {t('dashboard.ofOpenTasks')}</>,
                right: '100%',
              }}
            />
          </div>

          {/* NOTIFICATIONS */}
          <div className="dv3-col-4">
            <StatCard
              title="NOTIFICATIONS" id="N01"
              value={unreadCount}
              label={t('dashboard.unread')}
              onClick={() => navigate('/notifications')}
              gauge={{
                pct: notifPct, variant: 'meta',
                left: '0',
                center: <><strong>{unreadCount}</strong> / {NOTIF_CAP} {t('dashboard.inbox')}</>,
                right: NOTIF_CAP,
              }}
            />
          </div>

          {/* DELEGATIONS */}
          <div className="dv3-col-4">
            <StatCard
              title="DELEGATIONS" id="D01" loading={loading}
              value={delegActive}
              label={t('dashboard.activeDelegations')}
              gauge={{
                pct: delegPct, variant: 'meta',
                left: '0',
                center: <><strong>{delegActive}</strong> / {delegTotal} {t('dashboard.total')}</>,
                right: delegTotal,
              }}
            />
          </div>

        </div>
      </div>
    </div>
  )
}
