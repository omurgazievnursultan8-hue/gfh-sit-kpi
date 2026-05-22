import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { adminApi, QuartzJobInfo } from './adminApi'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { DataTable, type Column } from '../../components/DataTable'
import { TableCard } from '../../components/TableCard'
import { Badge, type BadgeTone } from '../../components/Badge'

const PLACEHOLDER = '··'

type HealthStatus = 'up' | 'down' | 'checking'

const JOB_STATE_TONE: Record<string, BadgeTone> = {
  NORMAL: 'success',
  PAUSED: 'warn',
  BLOCKED: 'danger',
  ERROR: 'danger',
  NONE: 'neutral',
  UNKNOWN: 'neutral',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('ru-RU')
}

export function AdminMonitoringPage() {
  const { t } = useTranslation()

  const [health, setHealth] = useState<HealthStatus>('checking')
  const [jobs, setJobs] = useState<QuartzJobInfo[]>([])
  const [errorLines, setErrorLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  const refresh = useCallback(async () => {
    setLoading(true)
    setHealth('checking')

    const [statsResult, jobsResult, logsResult] = await Promise.allSettled([
      adminApi.getStats(),
      adminApi.getQuartzJobs(),
      adminApi.getErrorLogs(),
    ])

    setHealth(statsResult.status === 'fulfilled' ? 'up' : 'down')
    setJobs(jobsResult.status === 'fulfilled' ? jobsResult.value : [])
    setErrorLines(
      logsResult.status === 'fulfilled' ? logsResult.value.lines : ['Failed to load error log']
    )

    setLoading(false)
    setLoadedAt(new Date())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

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
  const totalJobs = jobs.length
  const healthyJobs = useMemo(() => jobs.filter(j => j.state === 'NORMAL').length, [jobs])
  const troubledJobs = useMemo(
    () => jobs.filter(j => j.state === 'ERROR' || j.state === 'BLOCKED' || j.state === 'PAUSED').length,
    [jobs],
  )
  const errorCount = errorLines.filter(l => l.trim().length > 0).length
  const failed = health === 'down'
  const healthScore = health === 'up' ? 100 : health === 'down' ? 0 : null

  const jobColumns: Column<QuartzJobInfo>[] = [
    {
      key: 'name',
      header: t('monitoring.jobName'),
      render: job => <span className="font-medium" style={{ color: 'var(--ink)' }}>{job.name}</span>,
    },
    {
      key: 'group',
      header: t('monitoring.jobGroup'),
      render: job => <span style={{ color: 'var(--ink-soft)' }}>{job.group}</span>,
    },
    {
      key: 'cronExpression',
      header: t('monitoring.cronExpression'),
      render: job => <span className="font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>{job.cronExpression ?? '—'}</span>,
    },
    {
      key: 'previousFireTime',
      header: t('monitoring.lastFire'),
      render: job => <span style={{ color: 'var(--ink-soft)' }}>{formatDate(job.previousFireTime)}</span>,
    },
    {
      key: 'nextFireTime',
      header: t('monitoring.nextFire'),
      render: job => <span style={{ color: 'var(--ink-soft)' }}>{formatDate(job.nextFireTime)}</span>,
    },
    {
      key: 'state',
      header: t('monitoring.state'),
      render: job => <Badge tone={JOB_STATE_TONE[job.state] ?? 'neutral'}>{job.state}</Badge>,
    },
  ]

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* HERO */}
          <div className="dv3-hero">
            <div className="dv3-hero-meta">
              <span className="dv3-hero-meta-l">MONITORING.OPS</span>
              <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
            </div>
            <div className="dv3-hero-main">
              <div>
                <h1 className="dv3-hero-title">
                  {timeGreeting}. <span className="dv3-accent">{t('admin.monitoring')}</span>
                </h1>
                <p className="dv3-hero-sub">{todayLine}</p>
              </div>
              <div className="dv3-hero-metrics">
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : totalJobs}
                  </span>
                  <span className="dv3-hero-metric-lab">задач</span>
                </div>
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : errorCount}
                  </span>
                  <span className="dv3-hero-metric-lab">ошибок в логе</span>
                </div>
              </div>
            </div>
            <div className="dv3-hero-foot">
              <span className={failed ? 'dv3-hero-foot-warn' : 'dv3-hero-foot-ok'}>
                STATUS · {failed ? 'API недоступен' : 'ок'}
              </span>
              <span>{updatedLabel}</span>
            </div>
          </div>

          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="BACKEND.HEALTH" id="H01" loading={loading}
              value={health === 'up' ? 'UP' : health === 'down' ? 'DOWN' : '…'}
              label={health === 'up' ? 'API доступен' : health === 'down' ? 'API недоступен' : 'проверка'}
              zoneScore={healthScore}
              gauge={{
                pct: health === 'up' ? 1 : 0, variant: 'marker',
                left: 'DOWN', right: 'UP',
                current: health === 'up' ? 'UP' : health === 'down' ? 'DOWN' : '—',
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="JOBS.HEALTHY" id="J01" loading={loading}
              value={healthyJobs} label="задач NORMAL"
              gauge={{
                pct: totalJobs > 0 ? healthyJobs / totalJobs : 0, variant: 'meta',
                left: '0',
                center: <><strong>{totalJobs > 0 ? Math.round((healthyJobs / totalJobs) * 100) : 0}%</strong> всех</>,
                right: totalJobs,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="JOBS.ALERT" id="A01" loading={loading}
              value={troubledJobs} label="paused / error / blocked"
              gauge={{
                pct: totalJobs > 0 ? troubledJobs / totalJobs : 0, variant: 'meta',
                left: '0',
                center: <><strong>{totalJobs > 0 ? Math.round((troubledJobs / totalJobs) * 100) : 0}%</strong> всех</>,
                right: totalJobs,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="ERROR.LOG" id="E01" loading={loading}
              value={errorCount} label="строк в error.log"
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }}>
      <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Backend Health</h2>
        <div className="flex items-center gap-3">
          {health === 'up' ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="font-medium text-green-700">API is reachable</span>
            </>
          ) : health === 'down' ? (
            <>
              <XCircle className="h-6 w-6 text-red-500" />
              <span className="font-medium text-red-700">API is unreachable</span>
            </>
          ) : (
            <span className="text-gray-400">{t('common.loading')}</span>
          )}
        </div>
      </section>

      <TableCard
        header={
          <h2 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
            {t('admin.quartzJobs')}
          </h2>
        }
      >
        <DataTable<QuartzJobInfo>
          caption={t('admin.quartzJobs')}
          rows={jobs}
          rowKey={job => `${job.group}.${job.name}`}
          loading={loading}
          empty={t('common.noData')}
          columns={jobColumns}
          totalCount={jobs.length}
        />
      </TableCard>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">{t('monitoring.errorLog')}</h2>
          <p className="mt-0.5 text-xs text-gray-400">Last 20 lines from error.log</p>
        </div>
        <div className="p-4">
          {errorLines.length === 0 ? (
            <p className="text-sm text-gray-400">{loading ? t('common.loading') : 'No errors found'}</p>
          ) : (
            <pre className="max-h-80 overflow-x-auto overflow-y-auto rounded-md bg-gray-950 p-4 text-xs leading-relaxed text-green-400">
              {errorLines.join('\n')}
            </pre>
          )}
        </div>
      </section>
      </div>
      </div>
    </>
  )
}
