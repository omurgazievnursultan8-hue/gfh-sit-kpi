import api from '../../app/api'

export type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
export type PeriodStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export interface Period {
  id: number
  type: PeriodType
  startDate: string
  endDate: string
  submissionDeadline: string
  status: PeriodStatus
  autoCreated: boolean
  createdAt: string
}

export interface PeriodProgress {
  total: number
  completed: number
}

export interface AppealPending {
  id: number
  evaluationId: number
  evaluateeName: string
  reason: string
  deadline: string
  createdAt: string
}

export const periodsApi = {
  list: () => api.get<Period[]>('/periods').then(r => r.data),
  create: (data: { type: PeriodType; startDate: string; endDate: string; submissionDeadline: string }) =>
    api.post<Period>('/periods', data).then(r => r.data),
  activate: (id: number) => api.post<Period>(`/periods/${id}/activate`).then(r => r.data),
  close: (id: number) => api.post<Period>(`/periods/${id}/close`).then(r => r.data),
  pendingAppeals: () =>
    api.get<AppealPending[]>('/appeals/pending').then(r => r.data),
  progress: (id: number) =>
    api.get<PeriodProgress>(`/periods/${id}/progress`).then(r => r.data),
}
