import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../context/PageContext'
import { usePeriod } from '../../context/PeriodContext'
import { analyticsApi } from '../analytics/analyticsApi'
import type { PersonalAnalytics, ScorecardResponse } from '../analytics/analyticsApi'
import { delegationsApi } from '../org/delegationsApi'
import type { Delegation } from '../org/delegationsApi'
import { evaluationsApi, type Evaluation } from '../evaluations/evaluationsApi'
import { appealsApi, type AppealSummary } from '../appeals/appealsApi'
import { DASHBOARD_CSS } from './dashboardStyles'
import { StatCard, STAT_CARD_CSS, scoreZone } from '../../components/StatCard'
import { RatingPanel } from './RatingPanel'
import { EvalCyclePanel } from './EvalCyclePanel'
import { AppealsPanel } from './AppealsPanel'
import { DelegationsPanel } from './DelegationsPanel'

// ── page ────────────────────────────────────────────────────────────────────
export function DashboardPage() {
  usePageTitle('nav.dashboard')
  const { t, i18n } = useTranslation()

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  // Evaluations OF the current user (as evaluatee) — drives the SELF.RATING
  // empty states: "pending" (eval exists, no score yet) vs "none" (no eval).
  const [myEvaluations, setMyEvaluations] = useState<Evaluation[]>([])
  const [appeals, setAppeals] = useState<AppealSummary[]>([])
  const [partialFailure, setPartialFailure] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  // Selected period scopes every card + panel — sourced from the app-wide
  // topbar selector (PeriodContext).
  const { selectedPeriod, isAllPeriods, periodById } = usePeriod()

  // Rating-calculation panel — opens below the grid when R01 card is clicked.
  // Active by default so the rating tables show on initial load.
  const [ratingPanelOpen, setRatingPanelOpen] = useState(true)
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)

  // Eval-cycle panel — two evaluation tables open below the grid on P01 click.
  const [evalCyclePanelOpen, setEvalCyclePanelOpen] = useState(false)

  // Appeals panel — two appeal tables (pending + resolved) open on A01 click.
  const [appealsPanelOpen, setAppealsPanelOpen] = useState(false)

  // Delegations panel — active + inactive tables open on D01 click.
  const [delegationsPanelOpen, setDelegationsPanelOpen] = useState(false)

  // Panels are mutually exclusive — opening one closes any other.
  const openRatingPanel = () => {
    setRatingPanelOpen(true)
    setEvalCyclePanelOpen(false)
    setAppealsPanelOpen(false)
    setDelegationsPanelOpen(false)
  }
  const openEvalCyclePanel = () => {
    setEvalCyclePanelOpen(true)
    setRatingPanelOpen(false)
    setAppealsPanelOpen(false)
    setDelegationsPanelOpen(false)
  }
  const openAppealsPanel = () => {
    setAppealsPanelOpen(true)
    setRatingPanelOpen(false)
    setEvalCyclePanelOpen(false)
    setDelegationsPanelOpen(false)
  }
  const openDelegationsPanel = () => {
    setDelegationsPanelOpen(true)
    setRatingPanelOpen(false)
    setEvalCyclePanelOpen(false)
    setAppealsPanelOpen(false)
  }

  // Fetch everything — render whatever succeeds, flag partial failure.
  useEffect(() => {
    // Fetch all delegations: page once, refetch full if more rows exist.
    const loadDelegations = delegationsApi.list(0, 100)
      .then(first =>
        first.totalElements > first.content.length
          ? delegationsApi.list(0, first.totalElements)
          : first,
      )
      .then(r => setDelegations(r.content))

    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      loadDelegations,
      evaluationsApi.asEvaluator(0, 200).then(r => setEvaluations(r.content)),
      evaluationsApi.myHistory(0, 50).then(r => setMyEvaluations(r.content)),
      appealsApi.mine().then(setAppeals),
    ]
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
      setLoading(false)
      setLoadedAt(new Date())
    })
  }, [])

  // Scorecard is period-scoped — (re)fetch when the rating panel is open or the
  // selected period changes while it is open.
  useEffect(() => {
    if (!ratingPanelOpen) return
    setScorecardLoading(true)
    analyticsApi.scorecard(selectedPeriod === 'ALL' ? undefined : selectedPeriod)
      .then(setScorecard)
      .finally(() => setScorecardLoading(false))
  }, [ratingPanelOpen, selectedPeriod, isAllPeriods])

  // Live tick — re-render every 60s so clock + relative time stay fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // ── time / clock (derived from `now`, fixed to Bishkek tz) ───────────────────
  const BISHKEK_TZ = 'Asia/Bishkek'
  const clockParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BISHKEK_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const hh = clockParts.find(p => p.type === 'hour')?.value ?? '00'
  const mm = clockParts.find(p => p.type === 'minute')?.value ?? '00'
  const hours = Number(hh)
  const timeGreeting = hours < 12
    ? t('dashboard.greetingMorning')
    : hours < 18
      ? t('dashboard.greetingAfternoon')
      : t('dashboard.greetingEvening')

  const datePart = now.toLocaleDateString(
    i18n.language === 'kg' ? 'ky-KG' : 'ru-RU',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: BISHKEK_TZ },
  )
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

  // ── period scoping ──────────────────────────────────────────────────────────
  // evaluationId → periodId, so appeals (which carry no periodId) can be scoped.
  const evalPeriodById = useMemo(
    () => new Map(evaluations.map(e => [e.id, e.periodId])), [evaluations],
  )

  const scopedEvals = isAllPeriods
    ? evaluations
    : evaluations.filter(e => e.periodId === selectedPeriod)
  const scopedAppeals = isAllPeriods
    ? appeals
    : appeals.filter(a => evalPeriodById.get(a.evaluationId) === selectedPeriod)

  // ── derived stats (all scoped to the selected period) ───────────────────────
  // SELF.RATING — overall current score for "all", else that period's score.
  const periodScore = isAllPeriods
    ? (analytics?.currentScore ?? null)
    : (analytics?.history.find(h => h.periodId === selectedPeriod)?.score ?? null)
  const scoreWhole = periodScore !== null ? Math.round(periodScore) : null
  const scorePct = periodScore !== null ? periodScore / 100 : 0
  const zone = scoreZone(scoreWhole)

  // SELF.RATING empty-state — distinguish "evaluation in progress, no score
  // yet" from "no evaluation for this period at all".
  const myPeriodEval = isAllPeriods
    ? null
    : myEvaluations.find(e => e.periodId === selectedPeriod) ?? null
  const ratingState: 'scored' | 'pending' | 'none' =
    periodScore !== null ? 'scored' : myPeriodEval ? 'pending' : 'none'

  // EVAL.CYCLE — completed = submitted or later; total = all in scope.
  const cycleDone = scopedEvals.filter(e => e.status !== 'DRAFT').length
  const cycleTotal = scopedEvals.length
  const cyclePct = cycleTotal > 0 ? cycleDone / cycleTotal : 0
  const pendingEvals = scopedEvals.filter(e => e.status === 'DRAFT').length

  // APPEALS — share of open tasks (appeals vs appeals + pending evaluations).
  const appealsPending = scopedAppeals.filter(a => a.status === 'PENDING').length
  const openTasks = appealsPending + pendingEvals
  const appealsPct = openTasks > 0 ? appealsPending / openTasks : 0

  // DELEGATIONS — active share of all delegations (not period-scoped).
  const activeDelegations = delegations.filter(d => d.isActive)
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

        {/* ── PERIOD SELECTOR ── app-wide, rendered in the topbar (PeriodContext) */}

        {/* ── GRID ── */}
        <div className="dv3-grid">

          {/* SELF.RATING */}
          <StatCard
            className="dv3-col-3"
            title={t('dashboard.cardSelfRating')} id="R01" loading={loading}
            value={scoreWhole}
            unit={ratingState === 'scored' ? '/ 100' : undefined}
            zoneScore={scoreWhole}
            emptyNote={
              ratingState === 'pending'
                ? t('dashboard.ratingPending')
                : ratingState === 'none'
                  ? t('dashboard.ratingNone')
                  : undefined
            }
            onClick={openRatingPanel} active={ratingPanelOpen}
            gauge={ratingState === 'scored' ? {
              pct: scorePct, variant: 'marker',
              left: '0', right: '100',
              current: scoreWhole,
            } : undefined}
          />

          {/* EVAL.CYCLE.PROGRESS */}
          <StatCard
            className="dv3-col-3"
            title={t('dashboard.cardEvalCycle')} id="P01" loading={loading}
            value={cycleDone}
            unit={`/ ${loading ? PLACEHOLDER : cycleTotal}`}
            label={t('dashboard.evaluationsComplete')}
            onClick={openEvalCyclePanel}
            active={evalCyclePanelOpen}
            gauge={{
              pct: cyclePct, variant: 'meta',
              left: '0%',
              center: <strong>{Math.round(cyclePct * 100)}%</strong>,
              right: '100%',
            }}
          />

          {/* APPEALS */}
          <StatCard
            className="dv3-col-3"
            title={t('dashboard.cardAppeals')} id="A01" loading={loading}
            value={appealsPending}
            label={t('dashboard.pendingAppeals')}
            onClick={openAppealsPanel}
            active={appealsPanelOpen}
            gauge={{
              pct: appealsPct, variant: 'meta',
              left: '0%',
              center: <><strong>{Math.round(appealsPct * 100)}%</strong> {t('dashboard.ofOpenTasks')}</>,
              right: '100%',
            }}
          />

          {/* DELEGATIONS */}
          <StatCard
            className="dv3-col-3"
            title={t('dashboard.cardDelegations')} id="D01" loading={loading}
            value={delegActive}
            label={t('dashboard.activeDelegations')}
            onClick={openDelegationsPanel}
            active={delegationsPanelOpen}
            gauge={{
              pct: delegPct, variant: 'meta',
              left: '0',
              center: <><strong>{delegActive}</strong> / {delegTotal} {t('dashboard.total')}</>,
              right: delegTotal,
            }}
          />

          {ratingPanelOpen && (
            <RatingPanel card={scorecard} loading={scorecardLoading} />
          )}

          {evalCyclePanelOpen && (
            <EvalCyclePanel rows={scopedEvals} periodById={periodById} loading={loading} />
          )}

          {appealsPanelOpen && (
            <AppealsPanel rows={scopedAppeals} loading={loading} />
          )}

          {delegationsPanelOpen && (
            <DelegationsPanel rows={delegations} loading={loading} />
          )}

        </div>
      </div>
    </div>
  )
}
