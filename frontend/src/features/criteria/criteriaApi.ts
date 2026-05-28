import api from '../../app/api'

export type CriteriaType = 'POSITIVE' | 'ANTI_BONUS'

export interface Criteria {
  id: number
  nameRu: string
  nameKg: string
  descriptionRu: string | null
  descriptionKg: string | null
  type: CriteriaType
  weight: number
  orgUnitId: number | null
  orgUnitNameRu: string | null
  orgUnitNameKg: string | null
  autoCalculated: boolean
  frozen: boolean
  active: boolean
  createdAt: string
}

export interface CriteriaRequest {
  nameRu: string
  nameKg: string
  descriptionRu: string | null
  descriptionKg: string | null
  type: CriteriaType
  weight: number
  orgUnitId: number | null
  autoCalculated: boolean
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const criteriaApi = {
  list: (page = 0, size = 100) =>
    api.get<PageResponse<Criteria>>('/criteria', { params: { page, size } }).then(r => r.data),
  create: (data: CriteriaRequest) =>
    api.post<Criteria>('/criteria', data).then(r => r.data),
  update: (id: number, data: CriteriaRequest) =>
    api.put<Criteria>(`/criteria/${id}`, data).then(r => r.data),
  deactivate: (id: number) =>
    api.delete(`/criteria/${id}`),
  reactivate: (id: number) =>
    api.post<Criteria>(`/criteria/${id}/reactivate`).then(r => r.data),
}
