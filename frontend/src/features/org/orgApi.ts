import api from '../../app/api'

export type OrgUnitType = 'BLOCK' | 'DEPARTMENT' | 'SLUZHBA' | 'OTDEL' | 'SEKTOR'

export interface OrgUnit {
  id: number
  nameRu: string
  nameKg: string
  type: OrgUnitType
  headUserId: number | null
  parentId: number | null
  code: string | null
  nameRuShort: string | null
  nameKgShort: string | null
  displayOrder: number
  archivedAt: string | null
  headcountDirect: number
  headcountTotal: number
  children: OrgUnit[]
}

export interface OrgUnitRequest {
  nameRu: string
  nameKg: string
  type: OrgUnitType
  headUserId: number | null
  parentId: number | null
  code?: string | null
  nameRuShort?: string | null
  nameKgShort?: string | null
  displayOrder?: number
}

export const orgApi = {
  getStructure: () => api.get<OrgUnit[]>('/org/structure').then(r => r.data),
  createUnit: (data: OrgUnitRequest) => api.post<OrgUnit>('/org/units', data).then(r => r.data),
  updateUnit: (id: number, data: OrgUnitRequest) => api.put<OrgUnit>(`/org/units/${id}`, data).then(r => r.data),
  deleteUnit: (id: number) => api.delete(`/org/units/${id}`),
  archiveUnit: (id: number) => api.post<OrgUnit>(`/org/units/${id}/archive`).then(r => r.data),
  restoreUnit: (id: number) => api.post<OrgUnit>(`/org/units/${id}/restore`).then(r => r.data),
  moveUnit: (id: number, direction: 'up' | 'down') =>
    api.post<OrgUnit>(`/org/units/${id}/move`, null, { params: { direction } }).then(r => r.data),
  reparentUnit: (id: number, parentId: number | null) =>
    api.put<OrgUnit>(`/org/units/${id}/parent`, null, {
      params: parentId == null ? {} : { parentId },
    }).then(r => r.data),
}
