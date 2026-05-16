import api from '../../app/api'

export interface Delegation {
  id: number
  evaluateeId: number
  evaluateeName: string
  originalEvaluatorId: number
  originalEvaluatorName: string
  delegatedToId: number
  delegatedToName: string
  validFrom: string
  validTo: string
  reason?: string | null
  isActive: boolean
  createdAt: string
}

export interface DelegationRequest {
  evaluateeId: number
  delegatedToId: number
  validFrom: string
  validTo: string
  reason?: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const delegationsApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<Delegation>>('/delegations', { params: { page, size } }).then(r => r.data),
  create: (data: DelegationRequest) =>
    api.post<Delegation>('/delegations', data).then(r => r.data),
  deactivate: (id: number) =>
    api.delete(`/delegations/${id}`),
}
