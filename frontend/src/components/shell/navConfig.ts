import type { ElementType } from 'react'
import {
  Home, BarChart2, Shield,
  LayoutDashboard, Target, FileCheck, CheckSquare,
  ListChecks, TrendingUp, Building2, BarChart3,
  Users, GitBranch, Settings, CalendarDays, ClipboardList, Activity, Calendar,
  AlertTriangle,
} from 'lucide-react'

export type Role =
  | 'ADMIN'
  | 'CHAIRMAN'
  | 'DEPUTY_CHAIRMAN'
  | 'ORG_HEAD'
  | 'EMPLOYEE'

export type SectionKey = 'cabinet' | 'analytics' | 'admin'

export interface NavItem {
  to: string
  labelKey: string
  icon: ElementType
  end?: boolean
  roles: Role[]
  /** Single-char chord triggered after the `g` leader (event.code, KeyX). */
  chord?: string
}

export interface NavGroup {
  groupKey: string
  items: NavItem[]
}

export interface NavSection {
  key: SectionKey
  labelKey: string
  /** Short uppercase label shown under the rail icon. */
  railKey: string
  subKey: string
  icon: ElementType
  roles: Role[]
  groups: NavGroup[]
  /** Section accent color (hex). Drives active-state hue across rail + panel. */
  accent: string
}

const ALL_ROLES: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'ORG_HEAD', 'EMPLOYEE']
const MANAGERS: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'ORG_HEAD']
const TOP: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN']
const ADMIN_ONLY: Role[] = ['ADMIN']

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'cabinet',
    labelKey: 'nav.cabinet',
    railKey: 'nav.railCabinet',
    subKey: 'nav.cabinetSub',
    icon: Home,
    accent: '#3aa37a',
    roles: ALL_ROLES,
    groups: [
      {
        groupKey: 'nav.groupMain',
        items: [
          { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true, roles: ALL_ROLES, chord: 'd' },
          { to: '/dashboard-v1', labelKey: 'nav.dashboardV1', icon: LayoutDashboard, end: true, roles: ALL_ROLES },
          { to: '/my-kpi', labelKey: 'nav.myKpi', icon: Target, roles: ['EMPLOYEE', 'ORG_HEAD', 'DEPUTY_CHAIRMAN', 'CHAIRMAN'], chord: 'm' },
          { to: '/my-evaluations', labelKey: 'nav.myEvaluations', icon: FileCheck, roles: ALL_ROLES, chord: 'e' },
        ],
      },
      {
        groupKey: 'nav.groupTasks',
        items: [
          { to: '/my-tasks', labelKey: 'nav.myTasks', icon: CheckSquare, roles: MANAGERS, chord: 't' },
        ],
      },
    ],
  },
  {
    key: 'analytics',
    labelKey: 'nav.analytics',
    railKey: 'nav.railAnalytics',
    subKey: 'nav.analyticsSub',
    icon: BarChart2,
    accent: '#c9a961',
    roles: MANAGERS,
    groups: [
      {
        groupKey: 'nav.groupAnalytics',
        items: [
          { to: '/criteria', labelKey: 'nav.criteria', icon: ListChecks, roles: MANAGERS },
          { to: '/manager-dashboard', labelKey: 'nav.managerDashboard', icon: TrendingUp, roles: MANAGERS },
          { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart2, end: true, roles: MANAGERS, chord: 'a' },
          { to: '/analytics/hierarchical', labelKey: 'nav.hierarchical', icon: Building2, roles: TOP, chord: 'h' },
          { to: '/analytics/anti-bonus', labelKey: 'nav.antiBonusAnalytics', icon: BarChart3, roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'ORG_HEAD'] },
        ],
      },
    ],
  },
  {
    key: 'admin',
    labelKey: 'nav.adminPanel',
    railKey: 'nav.railAdmin',
    subKey: 'nav.adminSub',
    icon: Shield,
    accent: '#a98fd1',
    roles: ADMIN_ONLY,
    groups: [
      {
        groupKey: 'nav.groupAdmin',
        items: [
          { to: '/admin', labelKey: 'admin.stats', icon: BarChart3, end: true, roles: ADMIN_ONLY },
          { to: '/admin/users', labelKey: 'admin.users', icon: Users, roles: ADMIN_ONLY, chord: 'u' },
          { to: '/admin/org', labelKey: 'admin.orgStructure', icon: Building2, roles: ADMIN_ONLY },
          { to: '/admin/criteria', labelKey: 'admin.criteria', icon: ListChecks, roles: ADMIN_ONLY },
          { to: '/admin/periods', labelKey: 'admin.periods', icon: Calendar, roles: ADMIN_ONLY },
          { to: '/admin/evaluations', labelKey: 'admin.evaluations', icon: FileCheck, roles: ADMIN_ONLY },
          { to: '/admin/appeals', labelKey: 'admin.appeals', icon: AlertTriangle, roles: ADMIN_ONLY },
          { to: '/admin/delegations', labelKey: 'admin.delegations', icon: GitBranch, roles: ADMIN_ONLY },
        ],
      },
      {
        groupKey: 'nav.groupSystem',
        items: [
          { to: '/admin/settings', labelKey: 'admin.settings', icon: Settings, roles: ADMIN_ONLY, chord: 's' },
          { to: '/admin/calendar', labelKey: 'admin.calendar', icon: CalendarDays, roles: ADMIN_ONLY },
          { to: '/admin/audit', labelKey: 'admin.auditLog', icon: ClipboardList, roles: ADMIN_ONLY },
          { to: '/admin/monitoring', labelKey: 'admin.monitoring', icon: Activity, roles: ADMIN_ONLY },
        ],
      },
    ],
  },
]
