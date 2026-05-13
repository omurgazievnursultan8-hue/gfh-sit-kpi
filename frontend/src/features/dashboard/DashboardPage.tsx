import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { analyticsApi } from '../analytics/analyticsApi'
import type { PersonalAnalytics, PendingSummary } from '../analytics/analyticsApi'
import { evaluationsApi } from '../evaluations/evaluationsApi'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi } from '../periods/periodsApi'
import type { Period, AppealPending } from '../periods/periodsApi'
import { usePageTitle } from '../../context/PageContext'
import { DashboardHero } from './DashboardHero'
import { DashboardPeriodStrip } from './DashboardPeriodStrip'
import { DashboardQuickActions } from './DashboardQuickActions'

export function DashboardPage() {
  const { t } = useTranslation()
  usePageTitle('nav.dashboard')

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [myTasks, setMyTasks] = useState<PageResponse<Evaluation> | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])
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
      analyticsApi.pendingSummary().then(setPendingSummary),
    ]
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
    })
  }, [])

  // All active periods (monthly + quarterly can run concurrently). Earliest end first.
  const activePeriods = periods
    .filter(p => p.status === 'ACTIVE')
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
  const activePeriod = activePeriods[0] ?? null
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
      <DashboardPeriodStrip
        activePeriods={activePeriods}
        pendingSummary={pendingSummary}
      />
      <DashboardQuickActions
        myTasks={myTasks}
        pendingAppeals={pendingAppeals}
        activePeriod={activePeriod}
      />
    </div>
  )
}
