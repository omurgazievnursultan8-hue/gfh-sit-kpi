import type { ElementType } from 'react'
import {
  Home, BarChart2, Shield,
  LayoutDashboard, Target, FileCheck, ClipboardCheck, CheckSquare, ListTodo,
  ListChecks, TrendingUp, Building2, BarChart3,
  Users, GitBranch, Settings, CalendarDays, ClipboardList, Activity, Calendar,
} from 'lucide-react'

export type Role =
  | 'ADMIN'
  | 'CHAIRMAN'
  | 'DEPUTY_CHAIRMAN'
  | 'HEAD_OF_DEPARTMENT'
  | 'HEAD_OF_DEPARTMENT_UNIT'
  | 'EMPLOYEE'

export type SectionKey = 'cabinet' | 'analytics' | 'admin'

export interface NavItem {
  to: string
  labelKey: string
  icon: ElementType
  end?: boolean
  roles: Role[]
}

export interface NavGroup {
  groupKey: string
  items: NavItem[]
}

export interface NavSection {
  key: SectionKey
  labelKey: string
  subKey: string
  icon: ElementType
  roles: Role[]
  groups: NavGroup[]
}

const ALL_ROLES: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'EMPLOYEE']
const MANAGERS: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT']
const TOP: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN']
const ADMIN_ONLY: Role[] = ['ADMIN']

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'cabinet',
    labelKey: 'nav.cabinet',
    subKey: 'nav.cabinetSub',
    icon: Home,
    roles: ALL_ROLES,
    groups: [
      {
        groupKey: 'nav.groupMain',
        items: [
          { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true, roles: ALL_ROLES },
          { to: '/my-kpi', labelKey: 'nav.myKpi', icon: Target, roles: ['EMPLOYEE', 'HEAD_OF_DEPARTMENT_UNIT', 'HEAD_OF_DEPARTMENT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN'] },
          { to: '/my-evaluations', labelKey: 'nav.myEvaluations', icon: FileCheck, roles: ALL_ROLES },
          { to: '/evaluations', labelKey: 'nav.evaluations', icon: ClipboardCheck, roles: ALL_ROLES },
        ],
      },
      {
        groupKey: 'nav.groupTasks',
        items: [
          { to: '/my-tasks', labelKey: 'nav.myTasks', icon: CheckSquare, roles: MANAGERS },
          { to: '/manager-tasks', labelKey: 'nav.managerTasks', icon: ListTodo, roles: MANAGERS },
        ],
      },
    ],
  },
  {
    key: 'analytics',
    labelKey: 'nav.analytics',
    subKey: 'nav.analyticsSub',
    icon: BarChart2,
    roles: MANAGERS,
    groups: [
      {
        groupKey: 'nav.groupAnalytics',
        items: [
          { to: '/criteria', labelKey: 'nav.criteria', icon: ListChecks, roles: MANAGERS },
          { to: '/manager-dashboard', labelKey: 'nav.managerDashboard', icon: TrendingUp, roles: MANAGERS },
          { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart2, end: true, roles: MANAGERS },
          { to: '/analytics/hierarchical', labelKey: 'nav.hierarchical', icon: Building2, roles: TOP },
          { to: '/analytics/anti-bonus', labelKey: 'nav.antiBonusAnalytics', icon: BarChart3, roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT'] },
        ],
      },
    ],
  },
  {
    key: 'admin',
    labelKey: 'nav.adminPanel',
    subKey: 'nav.adminSub',
    icon: Shield,
    roles: ADMIN_ONLY,
    groups: [
      {
        groupKey: 'nav.groupAdmin',
        items: [
          { to: '/admin', labelKey: 'admin.stats', icon: BarChart3, end: true, roles: ADMIN_ONLY },
          { to: '/admin/users', labelKey: 'admin.users', icon: Users, roles: ADMIN_ONLY },
          { to: '/admin/org', labelKey: 'admin.orgStructure', icon: Building2, roles: ADMIN_ONLY },
          { to: '/admin/criteria', labelKey: 'admin.criteria', icon: ListChecks, roles: ADMIN_ONLY },
          { to: '/admin/periods', labelKey: 'admin.periods', icon: Calendar, roles: ADMIN_ONLY },
          { to: '/admin/delegations', labelKey: 'admin.delegations', icon: GitBranch, roles: ADMIN_ONLY },
        ],
      },
      {
        groupKey: 'nav.groupSystem',
        items: [
          { to: '/admin/settings', labelKey: 'admin.settings', icon: Settings, roles: ADMIN_ONLY },
          { to: '/admin/calendar', labelKey: 'admin.calendar', icon: CalendarDays, roles: ADMIN_ONLY },
          { to: '/admin/audit', labelKey: 'admin.auditLog', icon: ClipboardList, roles: ADMIN_ONLY },
          { to: '/admin/monitoring', labelKey: 'admin.monitoring', icon: Activity, roles: ADMIN_ONLY },
        ],
      },
    ],
  },
]
