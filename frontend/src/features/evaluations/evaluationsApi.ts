import api from '../../app/api'

export type EvaluationStatus = 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'APPEALED' | 'CLOSED'
export type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'

export interface Evaluation {
  id: number
  periodId: number
  periodType: PeriodType
  periodStartDate: string
  periodEndDate: string
  evaluateeId: number
  evaluateeName: string
  evaluatorId: number
  evaluatorName: string
  status: EvaluationStatus
  finalScore: number | null
  version: number
  submittedAt: string | null
  createdAt: string
}

export interface EvaluationScore {
  criteriaId: number
  value: number
  note?: string
}

export interface EvaluationFile {
  id: number
  evaluationId: number
  criteriaId: number | null
  uploadedBy: number
  originalName: string
  storagePath: string
  mimeType: string
  fileSize: number
  uploadedAt: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface AdminListParams {
  periodId?: number
  evaluateeId?: number
  evaluatorId?: number
  status?: EvaluationStatus
  q?: string
  page?: number
  size?: number
  sort?: string
}

export const evaluationsApi = {
  adminList: (params: AdminListParams = {}) =>
    api.get<PageResponse<Evaluation>>('/evaluations', { params }).then(r => r.data),
  myTasks: (page = 0, size = 20) =>
    api.get<PageResponse<Evaluation>>('/evaluations/my-tasks', { params: { page, size } }).then(r => r.data),
  myHistory: (page = 0, size = 20) =>
    api.get<PageResponse<Evaluation>>('/evaluations/my-history', { params: { page, size } }).then(r => r.data),
  asEvaluator: (page = 0, size = 20) =>
    api.get<PageResponse<Evaluation>>('/evaluations/as-evaluator', { params: { page, size } }).then(r => r.data),
  get: (id: number) =>
    api.get<Evaluation>(`/evaluations/${id}`).then(r => r.data),
  saveScores: (id: number, scores: EvaluationScore[]) =>
    api.put<Evaluation>(`/evaluations/${id}/scores`, scores).then(r => r.data),
  preview: (id: number, scores: EvaluationScore[]) =>
    api.post<number>(`/evaluations/${id}/scores/preview`, scores).then(r => r.data),
  submit: (id: number) =>
    api.post<Evaluation>(`/evaluations/${id}/submit`).then(r => r.data),
  reassign: (id: number, newEvaluatorId: number) =>
    api.put<Evaluation>(`/evaluations/${id}/reassign`, null, { params: { newEvaluatorId } }).then(r => r.data),
  listFiles: (id: number) =>
    api.get<EvaluationFile[]>(`/evaluations/${id}/files`).then(r => r.data),
  uploadFile: (id: number, file: File, criteriaId: number | null = null) => {
    const fd = new FormData()
    fd.append('file', file)
    if (criteriaId != null) fd.append('criteriaId', String(criteriaId))
    return api.post<EvaluationFile>(`/evaluations/${id}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  deleteFile: (id: number, fileId: number) =>
    api.delete(`/evaluations/${id}/files/${fileId}`),
}
