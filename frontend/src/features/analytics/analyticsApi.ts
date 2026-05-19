import api from '../../app/api'

export interface PeriodScore {
  periodId: number
  periodType: string
  startDate: string
  endDate: string
  score: number
  departmentAvg: number | null
}

export interface PersonalAnalytics {
  userId: number
  fullName: string
  history: PeriodScore[]
  currentScore: number | null
  departmentAvg: number | null
  companyAvg: number | null
}

export interface CriteriaScore {
  criteriaId: number
  nameRu: string
  nameKg: string
  weight: number
  score: number
  maxScore: number
  delta: number | null
  levelLabel: string
}

export interface ScorecardResponse {
  periodId: number
  periodLabel: string
  totalScore: number
  grade: string
  vsGoal: number
  vsPrevPeriod: number | null
  prevPeriodLabel: string | null
  rank: number | null
  antiBonusTotal: number
  criteria: CriteriaScore[]
  antiBonuses: CriteriaScore[]
  formula: string
  positiveSum: number
  antiBonusSum: number
  evaluatorName: string | null
  evaluatorUnit: string | null
  evaluatorPosition: string | null
}

export interface TeamMemberDto {
  userId: number
  fullName: string
  position: string
  initials: string
  latestScore: number | null
  scoreDelta: number | null
  status: 'appeal' | 'low' | 'unevaluated' | 'best'
  reasonLabel: string
}

export interface TeamResponse {
  attention: TeamMemberDto[]
  bestPerformer: TeamMemberDto | null
  totalCount: number
  teamAvg: number | null
}

export interface DashboardEvent {
  id: number
  action: string
  text: string
  iconType: 'success' | 'warn' | 'info'
  timestamp: string
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

export interface PendingSummary {
  pendingEvaluations: number
  pendingAppeals: number
  totalEvaluations: number
  completedEvaluations: number
}

export const analyticsApi = {
  personal: () =>
    api.get<PersonalAnalytics>('/analytics/personal').then(r => r.data),

  pendingSummary: () =>
    api.get<PendingSummary>('/analytics/pending-summary').then(r => r.data),


  scorecard: () =>
    api.get<ScorecardResponse>('/analytics/personal/scorecard')
      .then(r => r.status === 204 ? null : r.data)
      .catch(() => null),

  team: () =>
    api.get<TeamResponse>('/analytics/team').then(r => r.data),

  events: () =>
    api.get<DashboardEvent[]>('/analytics/events').then(r => r.data),

  hierarchical: (params?: { orgUnitId?: number; periodType?: string; startDate?: string; endDate?: string }) =>
    api.get<HierarchicalNode[]>('/analytics/hierarchical', { params }).then(r => r.data),

  antiBonus: (params?: { orgUnitId?: number; periodType?: string }) =>
    api.get<AntiBonusAnalytics>('/analytics/anti-bonus', { params }).then(r => r.data),
}
