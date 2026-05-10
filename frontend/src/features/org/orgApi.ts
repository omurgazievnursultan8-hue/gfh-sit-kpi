import api from '../../app/api'

export interface OrgUnit {
  id: number
  nameRu: string
  nameKg: string
  type: 'BLOCK' | 'DEPARTMENT' | 'UNIT'
  headUserId: number | null
  parentId: number | null
  children: OrgUnit[]
}

export interface OrgUnitRequest {
  nameRu: string
  nameKg: string
  type: 'BLOCK' | 'DEPARTMENT' | 'UNIT'
  headUserId: number | null
  parentId: number | null
}

export const orgApi = {
  getStructure: () => api.get<OrgUnit[]>('/org/structure').then(r => r.data),
  createUnit: (data: OrgUnitRequest) => api.post<OrgUnit>('/org/units', data).then(r => r.data),
  updateUnit: (id: number, data: OrgUnitRequest) => api.put<OrgUnit>(`/org/units/${id}`, data).then(r => r.data),
  deleteUnit: (id: number) => api.delete(`/org/units/${id}`),
}
