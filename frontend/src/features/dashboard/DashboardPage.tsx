import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { analyticsApi } from '../analytics/analyticsApi'
import type { PersonalAnalytics, ScorecardResponse, TeamResponse, DashboardEvent, PendingSummary } from '../analytics/analyticsApi'
import { evaluationsApi } from '../evaluations/evaluationsApi'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi } from '../periods/periodsApi'
import type { Period, AppealPending } from '../periods/periodsApi'
import { usePageTitle } from '../../context/PageContext'
import { DashboardHero } from './DashboardHero'
import { DashboardQuickActions } from './DashboardQuickActions'
import { DashboardScorecard } from './DashboardScorecard'
import { DashboardTeam } from './DashboardTeam'
import { DashboardHistoryChart } from './DashboardHistoryChart'
import { DashboardEventFeed } from './DashboardEventFeed'

export function DashboardPage() {
  const { t } = useTranslation()
  usePageTitle('nav.dashboard')

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [myTasks, setMyTasks] = useState<PageResponse<Evaluation> | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null)
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [pendingSummary, setPendingSummary] = useState<PendingSummary | null>(null)
  const [partialFailure, setPartialFailure] = useState(false)

  useEffect(() => {
    // allSettled — render whatever succeeds, surface partial-failure to AT
    // instead of silently leaving panels blank.
    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      evaluationsApi.myTasks(0, 200).then(setMyTasks),
      periodsApi.list().then(setPeriods),
      periodsApi.pendingAppeals().then(setPendingAppeals),
      analyticsApi.scorecard().then(v => { if (v) setScorecard(v) }),
      analyticsApi.team().then(setTeam),
      analyticsApi.events().then(setEvents),
      analyticsApi.pendingSummary().then(setPendingSummary),
    ]
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
    })
  }, [])

  const activePeriod = periods.find(p => p.status === 'ACTIVE') ?? null
  const draftCount = myTasks?.content.filter(e => e.status === 'DRAFT').length ?? 0
  // Hero counts come from the role-aware summary endpoint (admins see system totals).
  // Fallback to user-scoped data while the summary is loading.
  const heroPendingEvaluations = pendingSummary?.pendingEvaluations ?? draftCount
  const heroPendingAppeals = pendingSummary?.pendingAppeals ?? pendingAppeals.length

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Partial-failure announcer — visible only to AT. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {partialFailure ? t('dashboard.partialLoadFailure', 'Часть данных дашборда не загрузилась') : ''}
      </div>
      <DashboardHero
        analytics={analytics}
        activePeriod={activePeriod}
        pendingEvaluations={heroPendingEvaluations}
        pendingAppeals={heroPendingAppeals}
      />
      <DashboardQuickActions
        myTasks={myTasks}
        pendingAppeals={pendingAppeals}
        activePeriod={activePeriod}
      />
      <DashboardScorecard scorecard={scorecard} />
      <DashboardTeam team={team} />
      {analytics && <DashboardHistoryChart history={analytics.history} />}
      <DashboardEventFeed events={events} />
    </div>
  )
}
