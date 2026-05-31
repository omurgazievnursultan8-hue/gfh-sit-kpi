import api from '../../app/api'
import type { PeriodType } from '@/features/periods/api'

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

export interface AdminAppeal {
  id: number
  evaluationId: number
  periodId: number | null
  periodType: PeriodType | null
  periodStartDate: string | null
  periodEndDate: string | null
  evaluateeId: number
  evaluateeName: string
  evaluatorId: number | null
  evaluatorName: string | null
  reason: string
  status: AppealStatus
  response: string | null
  respondedById: number | null
  respondedByName: string | null
  finalScore: number | null
  deadline: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface AdminAppealsParams {
  periodId?: number
  evaluateeId?: number
  evaluatorId?: number
  respondedById?: number
  status?: AppealStatus
  q?: string
  from?: string
  to?: string
  page?: number
  size?: number
  sort?: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const appealsApi = {
  mine: () => api.get<AppealSummary[]>('/appeals').then(r => r.data),
  adminList: (params: AdminAppealsParams = {}) =>
    api.get<PageResponse<AdminAppeal>>('/appeals/admin', { params }).then(r => r.data),
}
