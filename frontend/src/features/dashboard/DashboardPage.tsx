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
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { RATING_ZONES } from '../../lib/ratingZones'
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
  }, [ratingPanelOpen, selectedPeriod])

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
  // Display keeps 1 decimal so the value matches its zone color near boundaries
  // (e.g. 49.6 reads as warn, not down). Raw score drives zone classification.
  const scoreDisplay = periodScore !== null ? periodScore.toFixed(1) : null
  const scorePct = periodScore !== null
    ? Math.min(1, Math.max(0, periodScore / 100))
    : 0
  if (periodScore !== null && (periodScore < 0 || periodScore > 100)) {
    console.warn('[dashboard] score out of 0..100 range:', periodScore)
  }

  // Previous-period score for trend chip — history sorted desc by startDate.
  const prevScore = useMemo(() => {
    const hist = analytics?.history ?? []
    if (hist.length < 2) return null
    const sorted = [...hist].sort((a, b) => b.startDate.localeCompare(a.startDate))
    if (isAllPeriods) return sorted[1]?.score ?? null
    const idx = sorted.findIndex(h => h.periodId === selectedPeriod)
    return idx >= 0 ? sorted[idx + 1]?.score ?? null : null
  }, [analytics, selectedPeriod, isAllPeriods])
  const delta = periodScore !== null && prevScore !== null
    ? Math.round(periodScore - prevScore)
    : null

  // Sparkline points — chronological scores (oldest → newest), capped to last 12
  // so dense histories stay legible at 80×24px.
  const sparkPoints = useMemo(() => {
    const hist = analytics?.history ?? []
    if (hist.length < 2) return null
    const chrono = [...hist].sort((a, b) => a.startDate.localeCompare(b.startDate))
    return chrono.slice(-12).map(h => h.score)
  }, [analytics])

  // Period caption for SELF.RATING — "May 2026" / "all periods".
  const periodLabel = useMemo(() => {
    if (isAllPeriods) return t('dashboard.allPeriods')
    const p = periodById.get(selectedPeriod as number)
    if (!p) return null
    const locale = i18n.language === 'kg' ? 'ky-KG' : 'ru-RU'
    return new Date(p.endDate).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  }, [isAllPeriods, selectedPeriod, periodById, i18n.language, t])

  // SELF.RATING empty-state — distinguish "evaluation in progress, no score
  // yet" from "no evaluation for this period at all".
  const myPeriodEval = isAllPeriods
    ? null
    : myEvaluations.find(e => e.periodId === selectedPeriod) ?? null
  const ratingState: 'scored' | 'pending' | 'none' =
    periodScore !== null ? 'scored' : myPeriodEval ? 'pending' : 'none'

  // Pending-state rich note — evaluator name + draft/submitted status pill.
  const pendingStatusKey = myPeriodEval?.status === 'SUBMITTED'
    ? 'evaluations.statusSubmitted'
    : 'evaluations.statusDraft'
  const pendingNote = ratingState === 'pending' && myPeriodEval ? (
    <div className="dv3-pending">
      <div className="dv3-pending-lead">{t('dashboard.ratingPending')}</div>
      {myPeriodEval.evaluatorName && (
        <div className="dv3-pending-eval">{myPeriodEval.evaluatorName}</div>
      )}
      <span className={`dv3-pending-pill dv3-pending-pill--${myPeriodEval.status.toLowerCase()}`}>
        {t(pendingStatusKey)}
      </span>
    </div>
  ) : null

  // EVAL.CYCLE — completed = submitted or later; total = all in scope.
  const cycleDone = scopedEvals.filter(e => e.status !== 'DRAFT').length
  const cycleTotal = scopedEvals.length
  const cyclePct = cycleTotal > 0 ? cycleDone / cycleTotal : 0

  // APPEALS — pending share of my appeals in scope.
  const appealsPending = scopedAppeals.filter(a => a.status === 'PENDING').length
  const appealsTotal = scopedAppeals.length
  const appealsPct = appealsTotal > 0 ? appealsPending / appealsTotal : 0

  // DELEGATIONS — active share of all delegations (not period-scoped).
  const activeDelegations = delegations.filter(d => d.isActive)
  const delegTotal = delegations.length
  const delegActive = activeDelegations.length
  const delegPct = delegTotal > 0 ? delegActive / delegTotal : 0

  // Neutral placeholder while loading; genuine zeros still render as 0.
  const PLACEHOLDER = '··'

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
            value={scoreDisplay}
            unit={ratingState === 'scored' ? '/ 100' : undefined}
            zoneScore={periodScore}
            subtitle={ratingState === 'scored' ? periodLabel : undefined}
            emptyNote={
              ratingState === 'pending'
                ? pendingNote
                : ratingState === 'none'
                  ? t('dashboard.ratingNone')
                  : undefined
            }
            onClick={openRatingPanel} active={ratingPanelOpen}
            controls="rating-panel"
            gauge={ratingState === 'scored' ? {
              pct: scorePct, variant: 'marker',
              left: '0', right: '100',
              ariaLabel: t('dashboard.ratingAria', { score: scoreDisplay }),
              thresholds: [
                { at: RATING_ZONES.warn, zone: 'warn' },
                { at: RATING_ZONES.up, zone: 'up' },
              ],
              zoneLabels: {
                down: t('dashboard.zoneDown'),
                warn: t('dashboard.zoneNorm'),
                up: t('dashboard.zoneUp'),
              },
            } : undefined}
            delta={ratingState === 'scored' && delta !== null && !isAllPeriods ? {
              value: delta, label: t('dashboard.vsPrev'),
            } : undefined}
            sparkline={ratingState === 'scored' && sparkPoints ? {
              points: sparkPoints,
              ariaLabel: t('dashboard.ratingTrendAria', { count: sparkPoints.length }),
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
              left: '0',
              center: <><strong>{appealsPending}</strong> / {appealsTotal} {t('dashboard.total')}</>,
              right: appealsTotal,
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
            <div
              id="rating-panel"
              role="region"
              aria-label={t('dashboard.cardSelfRating')}
              style={{ display: 'contents' }}
            >
              <RatingPanel card={scorecard} loading={scorecardLoading} />
            </div>
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
