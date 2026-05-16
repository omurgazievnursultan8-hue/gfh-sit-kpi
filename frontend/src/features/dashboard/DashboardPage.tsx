import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { analyticsApi } from '../analytics/analyticsApi'
import type { PersonalAnalytics, PendingSummary } from '../analytics/analyticsApi'
import { evaluationsApi } from '../evaluations/evaluationsApi'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi } from '../periods/periodsApi'
import type { Period, AppealPending, PeriodProgress } from '../periods/periodsApi'
import { usePageTitle } from '../../context/PageContext'
import { DashboardHero } from './DashboardHero'
import { DashboardPeriodStrip } from './DashboardPeriodStrip'
import { DashboardQuickActions } from './DashboardQuickActions'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  usePageTitle('nav.dashboard')

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [myTasks, setMyTasks] = useState<PageResponse<Evaluation> | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])
  const [pendingSummary, setPendingSummary] = useState<PendingSummary | null>(null)
  const [progressByPeriod, setProgressByPeriod] = useState<Record<number, PeriodProgress>>({})
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

  // Per-period progress — fetched in parallel once active periods are known.
  // Cancelled flag avoids state writes after unmount or rapid period changes.
  useEffect(() => {
    if (activePeriods.length === 0) return
    let cancelled = false
    Promise.allSettled(
      activePeriods.map(p => periodsApi.progress(p.id).then(r => [p.id, r] as const))
    ).then(results => {
      if (cancelled) return
      const next: Record<number, PeriodProgress> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const [id, prog] = r.value
          next[id] = prog
        }
      }
      setProgressByPeriod(next)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeriods.map(p => p.id).join(',')])
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
        progressByPeriod={progressByPeriod}
      />
      <DashboardQuickActions
        myTasks={myTasks}
        pendingAppeals={pendingAppeals}
        activePeriod={activePeriod}
      />
      <button
        type="button"
        onClick={() => navigate('/my-kpi')}
        className="relative overflow-hidden rounded-lg w-full text-left transition-all hover:-translate-y-px"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line-soft)',
          padding: '14px 18px',
          boxShadow: 'var(--shadow-sm)',
          maxWidth: 760,
          display: 'block',
        }}
      >
        <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: 'var(--info)' }} />
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-display truncate" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
              Мой KPI
            </span>
            <span className="font-mono uppercase tracking-widest" style={{
              fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
              background: 'rgba(120,150,200,0.14)', color: '#4a73c7',
              border: '1px solid rgba(120,150,200,0.32)', fontWeight: 600,
            }}>
              Аналитика
            </span>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
              динамика · критерии · журнал
            </span>
          </div>
          <span className="font-mono font-semibold flex-shrink-0"
                style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.04em' }}>
            Открыть →
          </span>
        </div>
      </button>
    </div>
  )
}
