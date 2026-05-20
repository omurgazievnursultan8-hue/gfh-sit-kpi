import api from '../../app/api'

export type AppealStatus = 'PENDING' | 'UPHELD' | 'OVERTURNED' | 'AUTO_AGREED'

export interface AppealSummary {
  id: number
  evaluationId: number
  evaluateeName: string
  reason: string
  status: AppealStatus
  deadline: string | null
  createdAt: string
  resolvedAt: string | null
}

export const appealsApi = {
  // All appeals routed to the current user as evaluator (pending + resolved).
  mine: () => api.get<AppealSummary[]>('/appeals').then(r => r.data),
}
