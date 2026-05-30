import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { adminApi, QuartzJobInfo } from './adminApi'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import type { ReactNode } from 'react'
import { DataPanel, type Column, type FilterDef } from '../../components/datapanel/DataPanel'
import { Badge, type BadgeTone } from '../../components/Badge'

const PANEL_KEY = 'gfh_monitoring_jobs'

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

  useEffect(() => { refresh() }, [refresh])

  const FILTERS: FilterDef[] = useMemo(() => {
    const stateOptions = [
      { value: '',        label: t('common.all', 'Все') },
      { value: 'NORMAL',  label: 'NORMAL' },
      { value: 'PAUSED',  label: 'PAUSED' },
      { value: 'BLOCKED', label: 'BLOCKED' },
      { value: 'ERROR',   label: 'ERROR' },
      { value: 'NONE',    label: 'NONE' },
    ]
    return [
      { key: 'state', label: t('monitoring.state'), type: 'select', options: stateOptions },
    ]
  }, [t])

  const columns: Column<QuartzJobInfo>[] = [
    {
      key: 'name', header: t('monitoring.jobName'), sortable: true, hideable: false,
      render: job => <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{job.name}</span>,
    },
    {
      key: 'group', header: t('monitoring.jobGroup'), sortable: true,
      render: job => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{job.group}</span>,
    },
    {
      key: 'cronExpression', header: t('monitoring.cronExpression'),
      render: job => (
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {job.cronExpression ?? '—'}
        </span>
      ),
    },
    {
      key: 'previousFireTime', header: t('monitoring.lastFire'), sortable: true,
      render: job => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{formatDate(job.previousFireTime)}</span>,
    },
    {
      key: 'nextFireTime', header: t('monitoring.nextFire'), sortable: true,
      render: job => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{formatDate(job.nextFireTime)}</span>,
    },
    {
      key: 'state', header: t('monitoring.state'), sortable: true,
      render: job => <Badge tone={JOB_STATE_TONE[job.state] ?? 'neutral'}>{job.state}</Badge>,
    },
  ]

  const searchText = (j: QuartzJobInfo) => `${j.name} ${j.group} ${j.cronExpression ?? ''}`

  const clientFilter = (j: QuartzJobInfo, v: Record<string, string>) => {
    if (v.state && j.state !== v.state) return false
    return true
  }

  const comparator = (key: string) => (a: QuartzJobInfo, b: QuartzJobInfo): number => {
    switch (key) {
      case 'group': return a.group.localeCompare(b.group)
      case 'state': return a.state.localeCompare(b.state)
      case 'previousFireTime': return (a.previousFireTime ?? '').localeCompare(b.previousFireTime ?? '')
      case 'nextFireTime':     return (a.nextFireTime ?? '').localeCompare(b.nextFireTime ?? '')
      default: return a.name.localeCompare(b.name)
    }
  }

  const healthChip = (
    <div
      className="inline-flex items-center gap-2"
      style={{
        height: 38, padding: '0 12px', borderRadius: 10,
        border: '1px solid var(--line)', background: 'var(--surface)',
        fontSize: 13, fontWeight: 500,
      }}
    >
      {health === 'up' ? (
        <><CheckCircle className="h-4 w-4" style={{ color: '#10b981' }} /><span style={{ color: 'var(--ink)' }}>API UP</span></>
      ) : health === 'down' ? (
        <><XCircle className="h-4 w-4" style={{ color: '#ef4444' }} /><span style={{ color: 'var(--ink)' }}>API DOWN</span></>
      ) : (
        <span style={{ color: 'var(--ink-faint)' }}>{t('common.loading')}</span>
      )}
    </div>
  )

  const refreshButton = (
    <button
      onClick={refresh}
      disabled={loading}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'var(--accent)', color: 'var(--surface)',
        border: '1px solid var(--accent-ink)', cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {t('common.refresh', 'Обновить')}
    </button>
  )

  const renderJobCard = (j: QuartzJobInfo): ReactNode => (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            {j.name}
          </div>
          <div className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {j.group}
          </div>
        </div>
        <Badge tone={JOB_STATE_TONE[j.state] ?? 'neutral'}>{j.state}</Badge>
      </div>
      <div className="flex flex-col gap-2.5" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
        <JobMetaRow k={t('monitoring.cronExpression')}>
          <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink)' }}>
            {j.cronExpression ?? '—'}
          </span>
        </JobMetaRow>
        <JobMetaRow k={t('monitoring.lastFire')}>
          <span style={{ color: 'var(--ink)' }}>{formatDate(j.previousFireTime)}</span>
        </JobMetaRow>
        <JobMetaRow k={t('monitoring.nextFire')}>
          <span style={{ color: 'var(--ink)' }}>{formatDate(j.nextFireTime)}</span>
        </JobMetaRow>
      </div>
    </div>
  )

  const toolbarActions = (
    <div className="inline-flex items-center gap-2">
      {healthChip}
      {refreshButton}
    </div>
  )

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>

      <div className="dv3-terminal">
        <DataPanel<QuartzJobInfo>
          mode="client"
          columns={columns}
          rows={jobs}
          rowKey={j => `${j.group}.${j.name}`}
          loading={loading}
          caption={t('admin.quartzJobs')}
          empty={t('common.noData')}
          searchable
          searchText={searchText}
          searchPlaceholder={t('monitoring.jobName')}
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'name', dir: 'asc' }}
          panelStorageKey={PANEL_KEY}
          columnConfig
          views={['table', 'cards']}
          renderCard={renderJobCard}
          toolbarActions={toolbarActions}
        />

        <section
          style={{
            marginTop: 24, background: 'var(--surface)',
            border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--line)', padding: '14px 18px' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {t('monitoring.errorLog')}
            </h2>
            <p style={{ marginTop: 2, fontSize: 12, color: 'var(--ink-faint)' }}>
              Last 20 lines from error.log
            </p>
          </div>
          <div style={{ padding: 16 }}>
            {errorLines.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                {loading ? t('common.loading') : 'No errors found'}
              </p>
            ) : (
              <pre
                style={{
                  maxHeight: 320, overflow: 'auto', borderRadius: 8,
                  background: '#0a0a0a', color: '#4ade80',
                  padding: 16, fontSize: 12, lineHeight: 1.6,
                }}
              >
                {errorLines.join('\n')}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function JobMetaRow({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ minHeight: 22 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{k}</span>
      <span className="truncate" style={{ fontSize: 13, textAlign: 'right' }}>{children}</span>
    </div>
  )
}
