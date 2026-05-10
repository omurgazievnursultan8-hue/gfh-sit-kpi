import api from '../../app/api'

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  activeEvaluationPeriods: number
  pendingEvaluations: number
  totalEvaluations: number
  openAppeals: number
  auditLogsLast24h: number
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
