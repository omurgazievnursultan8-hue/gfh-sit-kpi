import api from '../../app/api'

export type EmploymentType = 'PERMANENT' | 'CONTRACT' | 'INTERN' | 'ACTING'

export interface User {
  id: number
  fullName: string
  firstName: string | null
  lastName: string | null
  middleName: string | null
  employeeNumber: string | null
  email: string
  phone: string | null
  avatarUrl: string | null
  hireDate: string | null
  terminationDate: string | null
  employmentType: EmploymentType | null
  role: string
  position: string | null
  positionId: number | null
  unitId: number | null
  managerId: number | null
  isActive: boolean
  createdAt: string
  tempPassword?: string | null
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface UserCreateRequest {
  fullName: string
  firstName?: string
  lastName?: string
  middleName?: string
  employeeNumber?: string
  email: string
  phone?: string
  avatarUrl?: string
  hireDate?: string
  terminationDate?: string
  employmentType?: EmploymentType
  role: string
  position?: string
  positionId?: number | null
  unitId?: number
  managerId?: number
}

export const usersApi = {
  list: (page = 0, size = 20) =>
    api.get<PageResponse<User>>('/users', { params: { page, size } }).then(r => r.data),
  create: (req: UserCreateRequest) =>
    api.post<User>('/users', req).then(r => r.data),
  update: (id: number, req: Partial<UserCreateRequest>) =>
    api.put<User>(`/users/${id}`, req).then(r => r.data),
  deactivate: (id: number) =>
    api.put(`/users/${id}/deactivate`),
  reactivate: (id: number) =>
    api.put(`/users/${id}/activate`),
  resetPassword: (id: number) =>
    api.post<User>(`/users/${id}/reset-password`).then(r => r.data),
  uploadAvatar: (id: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<User>(`/users/${id}/avatar`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
}

export type EvaluationStatus = 'DRAFT' | 'SUBMITTED' | 'CANCELLED'

export interface EvaluationListItem {
  id: number
  periodId: number
  evaluateeId: number
  evaluateeName: string
  evaluatorId: number
  evaluatorName: string
  status: EvaluationStatus
  finalScore: number | null
  submittedAt: string | null
  createdAt: string
}

export interface ScoreItem {
  criteriaId: number
  value: number
  note: string | null
}

export type CriteriaType = 'POSITIVE' | 'ANTI_BONUS'

export interface CriteriaItem {
  id: number
  nameRu: string
  nameKg: string
  type: CriteriaType
  weight: number
  orgUnitId: number | null
  orgUnitNameRu: string | null
  active: boolean
}

export interface PeriodItem {
  id: number
  type: string
  startDate: string
  endDate: string
  submissionDeadline: string | null
  status: string
  autoCreated: boolean
  createdAt: string
}

export const userDetailApi = {
  listEvaluations: (evaluateeId: number) =>
    api.get<PageResponse<EvaluationListItem>>('/evaluations', {
      params: { evaluateeId, page: 0, size: 100, sort: 'createdAt,desc' },
    }).then(r => r.data),
  getScores: (evaluationId: number) =>
    api.get<ScoreItem[]>(`/evaluations/${evaluationId}/scores`).then(r => r.data),
  listCriteria: () =>
    api.get<PageResponse<CriteriaItem> | CriteriaItem[]>('/criteria', { params: { page: 0, size: 500 } })
      .then(r => Array.isArray(r.data) ? r.data : r.data.content),
  listPeriods: () =>
    api.get<PeriodItem[]>('/periods').then(r => r.data),
}
