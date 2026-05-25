import api from '../../app/api'

export interface Position {
  id: number
  nameRu: string
  nameKg: string
  unitId: number
  code: string | null
  displayOrder: number
  isActive: boolean
}

export interface PositionRequest {
  nameRu: string
  nameKg: string
  unitId: number
  code?: string | null
  displayOrder?: number
  isActive?: boolean
}

export const positionsApi = {
  listByUnit: (unitId: number, activeOnly = false) =>
    api.get<Position[]>('/positions', { params: { unitId, activeOnly } }).then(r => r.data),
  listAll: () =>
    api.get<Position[]>('/positions').then(r => r.data),
  create: (req: PositionRequest) =>
    api.post<Position>('/positions', req).then(r => r.data),
  update: (id: number, req: PositionRequest) =>
    api.put<Position>(`/positions/${id}`, req).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/positions/${id}`),
}
