import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, AdminStats, QuartzJobInfo } from './adminApi'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { useAdminRange } from '../../context/AdminRangeContext'

const PLACEHOLDER = '··'

type DashTab = 'inventory' | 'system' | 'attention'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [jobs, setJobs] = useState<QuartzJobInfo[] | null>(null)
  const [errorLines, setErrorLines] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())
  const [tab, setTab] = useState<DashTab>('inventory')

  const { range } = useAdminRange()

  useEffect(() => {
    setLoading(true)
    adminApi.getStats(range)
      .then(setStats)
      .catch(() => setFailed(true))
      .finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [range])

  useEffect(() => {
    adminApi.getQuartzJobs().then(setJobs).catch(() => setJobs([]))
    adminApi.getErrorLogs()
      .then(r => setErrorLines(r.lines.filter(l => l.trim().length > 0).length))
      .catch(() => setErrorLines(0))
  }, [])

  // Live tick — refresh clock + relative time each minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── time / clock ──────────────────────────────────────────────────────── */
  const hours = now.getHours()
  const timeGreeting = hours < 12 ? 'Доброе утро' : hours < 18 ? 'Добрый день' : 'Добрый вечер'
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const todayLine = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1 ? 'обновлено только что' : `обновлено ${mins} мин назад`
  }

  /* ── derived stats ─────────────────────────────────────────────────────── */
  const totalUsers = stats?.totalUsers ?? 0
  const activeUsers = stats?.activeUsers ?? 0
  const periods = stats?.activeEvaluationPeriods ?? 0
  const totalPeriods = stats?.totalEvaluationPeriods ?? 0
  const totalEvals = stats?.totalEvaluations ?? 0
  const pendingEvals = stats?.pendingEvaluations ?? 0
  const completedEvals = Math.max(0, totalEvals - pendingEvals)
  const appeals = stats?.openAppeals ?? 0
  const totalAppeals = stats?.totalAppeals ?? 0
  const closedAppeals = Math.max(0, totalAppeals - appeals)
  const orgUnits = stats?.orgUnitsCount ?? 0
  const orgBlocks = stats?.orgUnitsBlocks ?? 0
  const orgDepartments = stats?.orgUnitsDepartments ?? 0
  const orgUnitsLeaf = stats?.orgUnitsUnits ?? 0
  const criteria = stats?.criteriaActive ?? 0
  const totalCriteria = stats?.totalCriteria ?? 0
  const delegationsActive = stats?.delegationsActive ?? 0
  const delegationsExpiring = stats?.delegationsExpiringSoon ?? 0

  /* ── system health ─────────────────────────────────────────────────────── */
  const jobsTotal    = jobs?.length ?? 0
  const jobsRunning  = jobs?.filter(j => j.state === 'NORMAL').length ?? 0
  const jobsPaused   = jobs?.filter(j => j.state === 'PAUSED').length ?? 0
  const jobsBroken   = jobs?.filter(j => j.state === 'ERROR' || j.state === 'BLOCKED').length ?? 0
  const jobsZone     = jobsBroken > 0 ? 20 : jobsPaused > 0 ? 60 : 100
  const errorsCount  = errorLines ?? 0
  const errorsZone   = errorsCount === 0 ? 100 : errorsCount < 10 ? 60 : 20
  const jobsLoading  = jobs === null
  const errorsLoading = errorLines === null

  const usersDelta            = stats?.usersDelta ?? 0
  const periodsDelta          = stats?.evaluationPeriodsDelta ?? 0
  const evalsDelta            = stats?.evaluationsDelta ?? 0
  const appealsDelta          = stats?.appealsDelta ?? 0
  const orgUnitsDelta         = stats?.orgUnitsDelta ?? 0
  const criteriaDelta         = stats?.criteriaDelta ?? 0

  const usersActiveDelta      = stats?.usersActiveDelta ?? 0
  const usersInactiveDelta    = stats?.usersInactiveDelta ?? 0
  const periodsActiveDelta    = stats?.periodsActiveDelta ?? 0
  const periodsInactiveDelta  = stats?.periodsInactiveDelta ?? 0
  const evalsPendingDelta     = stats?.evalsPendingDelta ?? 0
  const evalsCompletedDelta   = stats?.evalsCompletedDelta ?? 0
  const appealsOpenDelta      = stats?.appealsOpenDelta ?? 0
  const appealsClosedDelta    = stats?.appealsClosedDelta ?? 0
  const criteriaActiveDelta   = stats?.criteriaActiveDelta ?? 0
  const criteriaInactiveDelta = stats?.criteriaInactiveDelta ?? 0
  const orgBlocksDelta        = stats?.orgBlocksDelta ?? 0
  const orgDepartmentsDelta   = stats?.orgDepartmentsDelta ?? 0
  const orgUnitsLeafDelta     = stats?.orgUnitsLeafDelta ?? 0

  /* ── attention metrics ─────────────────────────────────────────────────── */
  const completionRate    = stats?.completionRate ?? 0
  const overdueEvals      = stats?.overdueEvaluations ?? 0
  const avgRating         = stats?.avgRatingCurrentPeriod ?? 0
  const ratedCount        = stats?.ratedEvaluationsCurrentPeriod ?? 0
  const daysUntilNext     = stats?.daysUntilNextDeadline ?? 0
  const nextDeadlineLabel = stats?.nextDeadlinePeriodLabel ?? null
  const nextDeadlineDate  = stats?.nextDeadlineDate ?? null

  const completionPct = Math.round(completionRate)
  const completionZone = completionPct >= 80 ? 100 : completionPct >= 50 ? 60 : 30
  const overdueZone    = overdueEvals === 0 ? 100 : overdueEvals < 5 ? 40 : 20
  const deadlineZone   = nextDeadlineDate == null ? null
                         : daysUntilNext > 7 ? 100
                         : daysUntilNext > 3 ? 60
                         : 30
  const avgRatingRounded = avgRating > 0 ? Math.round(avgRating * 10) / 10 : null

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{STAT_CARD_CSS}</style>

      <div className="dv3-terminal" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="flex gap-1" role="tablist" aria-label="Разделы дашборда">
          {([
            { key: 'inventory', label: 'ОБЗОР' },
            { key: 'system',    label: 'СИСТЕМА' },
            { key: 'attention', label: 'ВНИМАНИЕ' },
          ] as Array<{ key: DashTab; label: string }>).map(it => {
            const active = tab === it.key
            return (
              <button
                key={it.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(it.key)}
                className="font-mono uppercase tracking-widest transition-all"
                style={{
                  fontSize: 10,
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: active ? 'var(--ink)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--ink-soft)',
                  border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
                }}
              >
                {it.label}
              </button>
            )
          })}
        </div>

        {tab === 'inventory' && (
        /* INVENTORY GRID */
        <div className="dv3-grid">
          <StatCard
            className="dv3-col-3"
            title="СОТРУДНИКИ" id="U01" loading={loading}
            value={totalUsers} label="сотрудников"
            onClick={() => navigate('/admin/users')}
            delta={{ value: usersDelta }}
            breakdown={[
              { label: 'активны',   value: activeUsers,              tone: 'up',      delta: usersActiveDelta },
              { label: 'неактивны', value: totalUsers - activeUsers, tone: 'neutral', delta: usersInactiveDelta },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="ПЕРИОДЫ" id="P01" loading={loading}
            value={totalPeriods} label="периодов"
            onClick={() => navigate('/admin/periods')}
            delta={{ value: periodsDelta }}
            breakdown={[
              { label: 'активны',   value: periods,                 tone: 'up',      delta: periodsActiveDelta },
              { label: 'неактивны', value: totalPeriods - periods,  tone: 'neutral', delta: periodsInactiveDelta },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="ОЦЕНКИ" id="E01" loading={loading}
            value={totalEvals} label="оценок"
            onClick={() => navigate('/admin/evaluations')}
            delta={{ value: evalsDelta }}
            breakdown={[
              { label: 'в работе',  value: pendingEvals,   tone: 'warn', delta: evalsPendingDelta },
              { label: 'завершено', value: completedEvals, tone: 'up',   delta: evalsCompletedDelta },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="АПЕЛЛЯЦИИ" id="X01" loading={loading}
            value={totalAppeals} label="апелляций"
            zoneScore={appeals > 0 ? 40 : 100}
            onClick={() => navigate('/admin/appeals')}
            delta={{ value: appealsDelta }}
            breakdown={[
              { label: 'ждут',    value: appeals,       tone: 'warn', delta: appealsOpenDelta },
              { label: 'закрыты', value: closedAppeals, tone: 'up',   delta: appealsClosedDelta },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="СТРУКТУРА" id="O01" loading={loading}
            value={orgUnits} label="узлов структуры"
            onClick={() => navigate('/admin/org')}
            delta={{ value: orgUnitsDelta }}
            breakdown={[
              { label: 'блоки',        value: orgBlocks,      tone: 'up',      delta: orgBlocksDelta },
              { label: 'департаменты', value: orgDepartments, tone: 'warn',    delta: orgDepartmentsDelta },
              { label: 'отделы',       value: orgUnitsLeaf,   tone: 'neutral', delta: orgUnitsLeafDelta },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="КРИТЕРИИ" id="C01" loading={loading}
            value={totalCriteria} label="в каталоге"
            onClick={() => navigate('/admin/criteria')}
            delta={{ value: criteriaDelta }}
            breakdown={[
              { label: 'активны',   value: criteria,                 tone: 'up',      delta: criteriaActiveDelta },
              { label: 'отключены', value: totalCriteria - criteria, tone: 'neutral', delta: criteriaInactiveDelta },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="ДЕЛЕГИРОВАНИЯ" id="D01" loading={loading}
            value={delegationsActive} label="делегирований"
            zoneScore={delegationsExpiring > 0 ? 60 : 100}
            onClick={() => navigate('/admin/delegations')}
            breakdown={[
              { label: 'активны',     value: delegationsActive,   tone: 'up' },
              { label: 'истекают ≤7д', value: delegationsExpiring, tone: 'warn' },
            ]}
          />
        </div>
        )}

        {tab === 'system' && (
        /* SYSTEM HEALTH GRID */
        <div className="dv3-grid">
          <StatCard
            className="dv3-col-3"
            title="ЗАДАЧИ" id="J01" loading={jobsLoading}
            value={jobsTotal} label="фоновых задач"
            zoneScore={jobsZone}
            onClick={() => navigate('/admin/monitoring')}
            breakdown={[
              { label: 'работают', value: jobsRunning, tone: 'up' },
              { label: 'на паузе', value: jobsPaused,  tone: 'warn' },
              { label: 'ошибки',   value: jobsBroken,  tone: 'down' },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="ОШИБКИ" id="J02" loading={errorsLoading}
            value={errorsCount} label="строк в логе ошибок"
            zoneScore={errorsZone}
            onClick={() => navigate('/admin/monitoring')}
            emptyNote={errorsCount === 0 ? 'нет ошибок' : undefined}
          />
        </div>
        )}

        {tab === 'attention' && (
        /* ATTENTION GRID — actionable signal */
        <div className="dv3-grid">
          <StatCard
            className="dv3-col-3"
            title="ЗАВЕРШЕНО" id="A01" loading={loading}
            value={completionPct} unit="%" label="оценок завершено"
            zoneScore={completionZone}
            onClick={() => navigate('/admin/evaluations')}
            gauge={{
              pct: completionRate / 100,
              variant: 'meta',
              left: '0%',
              center: `${completionPct}%`,
              right: '100%',
              ariaLabel: `${completionPct}% завершено`,
            }}
          />
          <StatCard
            className="dv3-col-3"
            title="ПРОСРОЧЕНО" id="A02" loading={loading}
            value={overdueEvals} label="просрочены"
            zoneScore={overdueZone}
            onClick={() => navigate('/admin/evaluations')}
            emptyNote={overdueEvals === 0 ? 'нет просроченных' : undefined}
          />
          <StatCard
            className="dv3-col-3"
            title="СР.РЕЙТИНГ" id="A03" loading={loading}
            value={avgRatingRounded}
            label={`из ${ratedCount} оценок`}
            zoneScore={avgRatingRounded ?? null}
            emptyNote={avgRatingRounded == null ? 'нет данных' : undefined}
            onClick={() => navigate('/admin/evaluations')}
          />
          <StatCard
            className="dv3-col-3"
            title="СРОК" id="A04" loading={loading}
            value={nextDeadlineDate ? daysUntilNext : null}
            label={nextDeadlineDate ? 'дней до конца периода' : undefined}
            subtitle={nextDeadlineLabel ?? undefined}
            zoneScore={deadlineZone}
            emptyNote={nextDeadlineDate ? undefined : 'нет активных периодов'}
            onClick={() => navigate('/admin/periods')}
          />
        </div>
        )}
      </div>
    </div>
  )
}
