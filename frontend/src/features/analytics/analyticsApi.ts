import api from '../../app/api'

export interface PeriodScore {
  periodId: number
  periodType: string
  startDate: string
  endDate: string
  score: number
}

export interface PersonalAnalytics {
  userId: number
  fullName: string
  history: PeriodScore[]
  currentScore: number | null
  departmentAvg: number | null
  companyAvg: number | null
}

export interface HierarchicalNode {
  orgUnitId: number
  orgUnitNameRu: string
  orgUnitNameKg: string
  type: string
  avgScore: number | null
  minScore: number | null
  maxScore: number | null
  employeeCount: number
  submittedCount: number
  children: HierarchicalNode[]
}

export interface AntiBonusAnalytics {
  top10: Array<{
    userId: number
    fullName: string
    orgUnitName: string | null
    incidentCount: number
    totalDeduction: number
  }>
  distribution: Array<{
    label: string
    rangeFrom: number
    rangeTo: number
    employeeCount: number
  }>
  dynamics: Array<{
    periodId: number
    periodStart: string
    criteriaNameRu: string
    avgRawValue: number
    incidentCount: number
  }>
}

export const analyticsApi = {
  personal: () => api.get<PersonalAnalytics>('/analytics/personal').then(r => r.data),
  hierarchical: (params?: { orgUnitId?: number; periodType?: string; startDate?: string; endDate?: string }) =>
    api.get<HierarchicalNode[]>('/analytics/hierarchical', { params }).then(r => r.data),
  antiBonus: (params?: { orgUnitId?: number; periodType?: string }) =>
    api.get<AntiBonusAnalytics>('/analytics/anti-bonus', { params }).then(r => r.data),
}
