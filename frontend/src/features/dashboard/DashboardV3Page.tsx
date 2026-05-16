import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
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
import { DASHBOARD_V3_CSS } from './dashboardV3Styles'

// ── helpers ─────────────────────────────────────────────────────────────────
function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
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

function asciiBar(pct: number, width = 20): { fill: string; empty: string } {
  const clamped = Math.max(0, Math.min(1, pct))
  const filled = Math.round(clamped * width)
  return { fill: '█'.repeat(filled), empty: '█'.repeat(width - filled) }
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
export function DashboardV3Page() {
  usePageTitle('nav.dashboard')
  const navigate = useNavigate()
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount)

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [summary, setSummary] = useState<PendingSummary | null>(null)
  const [appeals, setAppeals] = useState<AppealPending[]>([])
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [partialFailure, setPartialFailure] = useState(false)

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
    })
  }, [])

  // ── derived ────────────────────────────────────────────────────────────────
  const currentScore = analytics?.currentScore ?? null
  const scoreWhole = currentScore !== null ? Math.round(currentScore) : null
  const scorePct = currentScore !== null ? currentScore / 100 : 0
  const scoreBar = asciiBar(scorePct, 22)

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

  // ── hero ───────────────────────────────────────────────────────────────────
  // Russian ФИО is "Surname Name Patronymic"; greet by Name + Patronymic.
  const nameParts = analytics?.fullName?.trim().split(/\s+/) ?? []
  const greetingName = nameParts.length >= 3
    ? `${nameParts[1]} ${nameParts[2]}`
    : nameParts.slice(1).join(' ') || nameParts[0] || ''

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_V3_CSS}</style>

      <div className="dv3-terminal">
        {/* a11y partial-failure announcer */}
        <div className="sr-only" role="status" aria-live="polite">
          {partialFailure ? 'Часть данных дашборда не загрузилась' : ''}
        </div>

        {/* ── HERO ── */}
        <div className="dv3-hero">
          <div>
            <div className="dv3-hero-stamp">
              <span className="dv3-hero-dot" />
              <span>{todayLine()}</span>
            </div>
            <h1 className="dv3-hero-greet">
              {timeGreeting()}, <span className="dv3-accent">{greetingName || '—'}.</span>
            </h1>
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="dv3-grid">

          {/* SELF.RATING */}
          <Card col={4} title="SELF.RATING" id="R01">
            <div className="dv3-kpi">
              <div className="dv3-kpi-num">
                {scoreWhole !== null ? scoreWhole : '—'}
                <span className="dv3-kpi-unit">/ 100</span>
              </div>
            </div>
            <div className="dv3-gauge">
              <div className="dv3-gauge-bar dv3-gauge-bar--lg">
                <span className="dv3-fill">{scoreBar.fill}</span>
                <span className="dv3-dim">{scoreBar.empty}</span>
              </div>
              <div className="dv3-gauge-meta dv3-gauge-meta--mark">
                <span>0</span>
                <span
                  className="dv3-gauge-cur"
                  style={{ left: `${Math.round(scorePct * 100)}%` }}
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
              <div className="dv3-kpi-num">
                {cycleDone}
                <span className="dv3-kpi-unit">/ {cycleTotal}</span>
                <span className="dv3-kpi-label">EVALUATIONS COMPLETE</span>
              </div>
            </div>
            <div className="dv3-gauge">
              <div className="dv3-gauge-bar dv3-gauge-bar--lg">
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
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate('/my-tasks') }}
          >
            <div className="dv3-card-head">
              <span><strong>APPEALS</strong></span>
              <span className="dv3-card-id">[ A01 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-kpi">
                <div className="dv3-kpi-num">
                  {appealsPending}
                  <span className="dv3-kpi-label">PENDING APPEALS</span>
                </div>
              </div>
              <div className="dv3-gauge">
                <div className="dv3-gauge-bar dv3-gauge-bar--lg">
                  <span className="dv3-fill">{appealsBar.fill}</span>
                  <span className="dv3-dim">{appealsBar.empty}</span>
                </div>
                <div className="dv3-gauge-meta">
                  <span>0%</span>
                  <span><strong>{Math.round(appealsPct * 100)}%</strong> OF OPEN TASKS</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div className="dv3-card dv3-col-4">
            <div className="dv3-card-head">
              <span><strong>NOTIFICATIONS</strong></span>
              <span className="dv3-card-id">[ N01 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-kpi">
                <div className="dv3-kpi-num">
                  {unreadCount}
                  <span className="dv3-kpi-label">UNREAD</span>
                </div>
              </div>
              <div className="dv3-gauge">
                <div className="dv3-gauge-bar dv3-gauge-bar--lg">
                  <span className="dv3-fill">{notifBar.fill}</span>
                  <span className="dv3-dim">{notifBar.empty}</span>
                </div>
                <div className="dv3-gauge-meta">
                  <span>0</span>
                  <span><strong>{unreadCount}</strong> / {NOTIF_CAP} INBOX</span>
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
                <div className="dv3-kpi-num">
                  {delegActive}
                  <span className="dv3-kpi-label">ACTIVE DELEGATIONS</span>
                </div>
              </div>
              <div className="dv3-gauge">
                <div className="dv3-gauge-bar dv3-gauge-bar--lg">
                  <span className="dv3-fill">{delegBar.fill}</span>
                  <span className="dv3-dim">{delegBar.empty}</span>
                </div>
                <div className="dv3-gauge-meta">
                  <span>0</span>
                  <span><strong>{delegActive}</strong> / {delegTotal} TOTAL</span>
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
