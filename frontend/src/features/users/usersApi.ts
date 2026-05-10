import api from '../../app/api'

export interface User {
  id: number
  fullName: string
  email: string
  role: string
  position: string | null
  unitId: number | null
  managerId: number | null
  isActive: boolean
  createdAt: string
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
  email: string
  role: string
  position?: string
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
    api.post(`/users/${id}/reset-password`),
}
