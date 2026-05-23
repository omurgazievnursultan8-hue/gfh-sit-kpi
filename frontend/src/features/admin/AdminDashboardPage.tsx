import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, AdminStats } from './adminApi'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { useAdminRange } from '../../context/AdminRangeContext'

const PLACEHOLDER = '··'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  const { range } = useAdminRange()

  useEffect(() => {
    setLoading(true)
    adminApi.getStats(range)
      .then(setStats)
      .catch(() => setFailed(true))
      .finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [range])

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

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{STAT_CARD_CSS}</style>

      <div className="dv3-terminal">
        {/* STAT GRID */}
        <div className="dv3-grid">
          <StatCard
            className="dv3-col-3"
            title="USERS" id="U01" loading={loading}
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
            title="PERIODS" id="P01" loading={loading}
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
            title="EVAL.QUEUE" id="E01" loading={loading}
            value={totalEvals} label="оценок"
            delta={{ value: evalsDelta }}
            breakdown={[
              { label: 'в работе',  value: pendingEvals,   tone: 'warn', delta: evalsPendingDelta },
              { label: 'завершено', value: completedEvals, tone: 'up',   delta: evalsCompletedDelta },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="APPEALS" id="X01" loading={loading}
            value={totalAppeals} label="апелляций"
            zoneScore={appeals > 0 ? 40 : 100}
            delta={{ value: appealsDelta }}
            breakdown={[
              { label: 'ждут',    value: appeals,       tone: 'warn', delta: appealsOpenDelta },
              { label: 'закрыты', value: closedAppeals, tone: 'up',   delta: appealsClosedDelta },
            ]}
          />
          <StatCard
            className="dv3-col-3"
            title="ORG.TREE" id="O01" loading={loading}
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
            title="CRITERIA" id="C01" loading={loading}
            value={totalCriteria} label="в каталоге"
            onClick={() => navigate('/admin/criteria')}
            delta={{ value: criteriaDelta }}
            breakdown={[
              { label: 'активны',   value: criteria,                 tone: 'up',      delta: criteriaActiveDelta },
              { label: 'отключены', value: totalCriteria - criteria, tone: 'neutral', delta: criteriaInactiveDelta },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
