# M5-FE-04: Admin Monitoring UI — Health Status, Quartz Jobs, Last 20 Error Log Lines

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `AdminMonitoringPage` that shows three panels: (1) a simple health status card confirming the backend is reachable, (2) a table of all Quartz scheduled jobs with their cron expression, last/next fire time, and current state, and (3) a scrollable code block showing the last 20 lines from the server error log.

**Architecture:** On mount the page fires three parallel requests: `GET /api/v1/admin/stats` (used to infer health — if it returns 200 the backend is up), `GET /api/v1/admin/quartz-jobs`, and `GET /api/v1/admin/error-logs`. A "Refresh" button re-fires all three. `adminApi` from `fe-02-admin-panel.md` already defines all three calls.

**Tech Stack:** React 18, react-i18next, Tailwind CSS.

**Depends on:** m5-admin/fe-02-admin-panel.md, m5-admin/be-02-audit-admin-api.md

---

### Task 1: AdminMonitoringPage

**Files:**
- Create: `frontend/src/features/admin/monitoring/AdminMonitoringPage.tsx`

- [ ] **Step 1: Create AdminMonitoringPage**

`frontend/src/features/admin/monitoring/AdminMonitoringPage.tsx`:
```tsx
import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { adminApi, QuartzJobInfo } from '../adminApi'

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

  return (
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

      {/* Health Status */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-gray-800">Backend Health</h2>
        <div className="flex items-center gap-3">
          {health === 'up' ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="text-green-700 font-medium">API is reachable</span>
            </>
          ) : health === 'down' ? (
            <>
              <XCircle className="h-6 w-6 text-red-500" />
              <span className="text-red-700 font-medium">API is unreachable</span>
            </>
          ) : (
            <span className="text-gray-400">{t('common.loading')}</span>
          )}
        </div>
      </section>

      {/* Quartz Jobs */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">{t('admin.quartzJobs')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">{t('monitoring.jobName')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">{t('monitoring.jobGroup')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">{t('monitoring.cronExpression')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">{t('monitoring.lastFire')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">{t('monitoring.nextFire')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">{t('monitoring.state')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    {loading ? t('common.loading') : t('common.noData')}
                  </td>
                </tr>
              ) : (
                jobs.map(job => (
                  <tr key={`${job.group}.${job.name}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{job.name}</td>
                    <td className="px-4 py-3 text-gray-500">{job.group}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {job.cronExpression ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(job.previousFireTime)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(job.nextFireTime)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATE_COLORS[job.state] ?? JOB_STATE_COLORS.UNKNOWN}`}>
                        {job.state}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Error Log */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">{t('monitoring.errorLog')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">Last 20 lines from error.log</p>
        </div>
        <div className="p-4">
          {errorLines.length === 0 ? (
            <p className="text-sm text-gray-400">{loading ? t('common.loading') : 'No errors found'}</p>
          ) : (
            <pre className="overflow-x-auto rounded-md bg-gray-950 p-4 text-xs text-green-400 leading-relaxed max-h-80 overflow-y-auto">
              {errorLines.join('\n')}
            </pre>
          )}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/admin/monitoring/AdminMonitoringPage.tsx
git commit -m "feat(admin): add AdminMonitoringPage with health check, Quartz jobs table, and error log viewer"
```
