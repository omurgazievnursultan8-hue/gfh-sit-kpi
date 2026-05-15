import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { adminApi, QuartzJobInfo } from './adminApi'
import { Layout } from '../../components/Layout'
import { DataTable, type Column } from '../../components/DataTable'

type HealthStatus = 'up' | 'down' | 'checking'

const JOB_STATE_COLORS: Record<string, string> = {
  NORMAL: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  BLOCKED: 'bg-red-100 text-red-800',
  ERROR: 'bg-red-100 text-red-800',
  NONE: 'bg-gray-100 text-gray-600',
  UNKNOWN: 'bg-gray-100 text-gray-600',
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
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const jobColumns: Column<QuartzJobInfo>[] = [
    {
      key: 'name',
      header: t('monitoring.jobName'),
      render: job => <span className="font-medium text-gray-900">{job.name}</span>,
    },
    {
      key: 'group',
      header: t('monitoring.jobGroup'),
      render: job => <span className="text-gray-500">{job.group}</span>,
    },
    {
      key: 'cronExpression',
      header: t('monitoring.cronExpression'),
      render: job => <span className="font-mono text-xs text-gray-600">{job.cronExpression ?? '—'}</span>,
    },
    {
      key: 'previousFireTime',
      header: t('monitoring.lastFire'),
      render: job => <span className="text-gray-500">{formatDate(job.previousFireTime)}</span>,
    },
    {
      key: 'nextFireTime',
      header: t('monitoring.nextFire'),
      render: job => <span className="text-gray-500">{formatDate(job.nextFireTime)}</span>,
    },
    {
      key: 'state',
      header: t('monitoring.state'),
      render: job => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATE_COLORS[job.state] ?? JOB_STATE_COLORS.UNKNOWN}`}>
          {job.state}
        </span>
      ),
    },
  ]

  return (
    <Layout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('admin.monitoring')}</h1>
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

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">{t('admin.quartzJobs')}</h2>
        </div>
        <DataTable<QuartzJobInfo>
          caption={t('admin.quartzJobs')}
          rows={jobs}
          rowKey={job => `${job.group}.${job.name}`}
          loading={loading}
          empty={t('common.noData')}
          columns={jobColumns}
          totalCount={jobs.length}
        />
      </section>

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
    </Layout>
  )
}
