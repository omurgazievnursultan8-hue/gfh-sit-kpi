import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, AdminStats } from './adminApi'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'

const PLACEHOLDER = '··'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => setFailed(true))
      .finally(() => { setLoading(false); setLoadedAt(new Date()) })
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
  const totalEvals = stats?.totalEvaluations ?? 0
  const pendingEvals = stats?.pendingEvaluations ?? 0
  const completedEvals = Math.max(0, totalEvals - pendingEvals)
  const appeals = stats?.openAppeals ?? 0
  const orgUnits = stats?.orgUnitsCount ?? 0
  const criteria = stats?.criteriaActive ?? 0

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{STAT_CARD_CSS}</style>

      <div className="dv3-terminal">
        {/* HERO */}
        <div className="dv3-hero">
          <div className="dv3-hero-meta">
            <span className="dv3-hero-meta-l">ADMIN.OVERVIEW</span>
            <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
          </div>
          <div className="dv3-hero-main">
            <div>
              <h1 className="dv3-hero-title">
                {timeGreeting}. <span className="dv3-accent">Панель администратора</span>
              </h1>
              <p className="dv3-hero-sub">{todayLine}</p>
            </div>
            <div className="dv3-hero-metrics">
              <div className="dv3-hero-metric">
                <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                  {loading ? PLACEHOLDER : activeUsers}
                </span>
                <span className="dv3-hero-metric-lab">активны</span>
              </div>
              <div className="dv3-hero-metric">
                <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                  {loading ? PLACEHOLDER : pendingEvals}
                </span>
                <span className="dv3-hero-metric-lab">оценок в работе</span>
              </div>
            </div>
          </div>
          <div className="dv3-hero-foot">
            <span className={failed ? 'dv3-hero-foot-warn' : 'dv3-hero-foot-ok'}>
              STATUS · {failed ? 'ошибка загрузки' : 'ок'}
            </span>
            <span>{updatedLabel}</span>
          </div>
        </div>

        {/* STAT GRID */}
        <div className="dv3-grid">
          <StatCard
            className="dv3-col-4"
            title="USERS" id="U01" loading={loading}
            value={activeUsers} label="активны"
            onClick={() => navigate('/admin/users')}
            gauge={{
              pct: totalUsers > 0 ? activeUsers / totalUsers : 0, variant: 'meta',
              left: '0',
              center: <><strong>{totalUsers}</strong> всего</>,
              right: totalUsers,
            }}
          />
          <StatCard
            className="dv3-col-4"
            title="PERIODS" id="P01" loading={loading}
            value={periods} label="активных периодов"
            onClick={() => navigate('/admin/periods')}
          />
          <StatCard
            className="dv3-col-4"
            title="EVAL.QUEUE" id="E01" loading={loading}
            value={pendingEvals} label="в работе"
            gauge={{
              pct: totalEvals > 0 ? completedEvals / totalEvals : 0, variant: 'meta',
              left: '0',
              center: <><strong>{completedEvals}</strong> завершено</>,
              right: totalEvals,
            }}
          />
          <StatCard
            className="dv3-col-4"
            title="APPEALS" id="X01" loading={loading}
            value={appeals} label="ждут рассмотрения"
            zoneScore={appeals > 0 ? 40 : 100}
          />
          <StatCard
            className="dv3-col-4"
            title="ORG.TREE" id="O01" loading={loading}
            value={orgUnits} label="узлов структуры"
            onClick={() => navigate('/admin/org')}
          />
          <StatCard
            className="dv3-col-4"
            title="CRITERIA" id="C01" loading={loading}
            value={criteria} label="в каталоге"
            onClick={() => navigate('/admin/criteria')}
          />
        </div>
      </div>
    </div>
  )
}
