import api from '../../app/api'

export interface AuditLogEntry {
  id: number
  actorId: number
  actorEmail: string
  action: string
  entityType: string | null
  entityId: number | null
  details: string | null
  ipAddress: string | null
  createdAt: string
}

export interface AuditLogPage {
  content: AuditLogEntry[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface AuditSearchParams {
  actorId?: number
  action?: string
  entityType?: string
  from?: string
  to?: string
  page?: number
  size?: number
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  activeEvaluationPeriods: number
  pendingEvaluations: number
  totalEvaluations: number
  openAppeals: number
  auditLogsLast24h: number
  criteriaActive: number
  delegationsActive: number
  delegationsExpiringSoon: number
  orgUnitsCount: number
}

export interface QuartzJobInfo {
  name: string
  group: string
  description: string | null
  cronExpression: string | null
  previousFireTime: string | null
  nextFireTime: string | null
  state: string
}

export interface ErrorLogsResponse {
  lines: string[]
}

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats').then(r => r.data),
  getQuartzJobs: () => api.get<QuartzJobInfo[]>('/admin/quartz-jobs').then(r => r.data),
  getErrorLogs: () => api.get<ErrorLogsResponse>('/admin/error-logs').then(r => r.data),
}

export const auditApi = {
  search: (params: AuditSearchParams) =>
    api.get<AuditLogPage>('/admin/audit', { params }).then(r => r.data),

  export: async (params: AuditSearchParams) => {
    const response = await api.get('/admin/audit/export', {
      params,
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'audit-log.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
