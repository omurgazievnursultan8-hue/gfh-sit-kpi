import api from '@/app/api'

export type MyTaskType =
  | 'PENDING_EVALUATION'
  | 'PENDING_SELF_EVAL'
  | 'RESPOND_APPEAL'
  | 'ADMIN_OPEN_APPEAL'
  | 'ADMIN_DRAFT_PERIOD'

export type MyTaskSeverity = 'OVERDUE' | 'DUE_SOON' | 'NORMAL'

export interface MyTask {
  id: string
  type: MyTaskType
  titleRu: string
  titleKg: string
  link: string
  dueAt: string | null
  severity: MyTaskSeverity
  entityType: string
  entityId: number | null
  periodId: number | null
}

export const myTasksApi = {
  list: () => api.get<MyTask[]>('/me/tasks').then(r => r.data),
}
