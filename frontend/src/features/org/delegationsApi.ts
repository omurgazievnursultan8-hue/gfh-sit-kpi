import api from '../../app/api'

export interface Delegation {
  id: number
  evaluateeId: number
  evaluateeName: string
  evaluatorId: number
  evaluatorName: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export interface DelegationRequest {
  evaluateeId: number
  evaluatorId: number
  startDate: string
  endDate: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const delegationsApi = {
  list: (page = 0, size = 20, activeOnly = false) =>
    api.get<PageResponse<Delegation>>('/delegations', { params: { page, size, activeOnly } }).then(r => r.data),
  create: (data: DelegationRequest) =>
    api.post<Delegation>('/delegations', data).then(r => r.data),
  deactivate: (id: number) =>
    api.delete(`/delegations/${id}`),
}
