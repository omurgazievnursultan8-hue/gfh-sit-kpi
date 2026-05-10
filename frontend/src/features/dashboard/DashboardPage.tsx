import { useEffect, useState } from 'react'
import { analyticsApi } from '../analytics/analyticsApi'
import type { PersonalAnalytics, ScorecardResponse, TeamResponse, DashboardEvent } from '../analytics/analyticsApi'
import { evaluationsApi } from '../evaluations/evaluationsApi'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi } from '../periods/periodsApi'
import type { Period, AppealPending } from '../periods/periodsApi'
import { DashboardHero } from './DashboardHero'
import { DashboardQuickActions } from './DashboardQuickActions'
import { DashboardScorecard } from './DashboardScorecard'
import { DashboardTeam } from './DashboardTeam'
import { DashboardHistoryChart } from './DashboardHistoryChart'
import { DashboardEventFeed } from './DashboardEventFeed'

export function DashboardPage() {
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [myTasks, setMyTasks] = useState<PageResponse<Evaluation> | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null)
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [events, setEvents] = useState<DashboardEvent[]>([])

  useEffect(() => {
    analyticsApi.personal().then(setAnalytics).catch(() => {})
    evaluationsApi.myTasks(0, 200).then(setMyTasks).catch(() => {})
    periodsApi.list().then(setPeriods).catch(() => {})
    periodsApi.pendingAppeals().then(setPendingAppeals).catch(() => {})
    analyticsApi.scorecard().then(v => { if (v) setScorecard(v) }).catch(() => {})
    analyticsApi.team().then(setTeam).catch(() => {})
    analyticsApi.events().then(setEvents).catch(() => {})
  }, [])

  const activePeriod = periods.find(p => p.status === 'ACTIVE') ?? null
  const draftCount = myTasks?.content.filter(e => e.status === 'DRAFT').length ?? 0

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <DashboardHero
        analytics={analytics}
        activePeriod={activePeriod}
        pendingEvaluations={draftCount}
        pendingAppeals={pendingAppeals.length}
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
