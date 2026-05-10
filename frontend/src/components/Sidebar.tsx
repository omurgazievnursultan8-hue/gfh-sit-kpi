import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { RootState } from '../app/store'

const navItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'EMPLOYEE'] },
  { to: '/users', labelKey: 'nav.users', roles: ['ADMIN'] },
  { to: '/org', labelKey: 'nav.orgStructure', roles: ['ADMIN'] },
  { to: '/criteria', labelKey: 'nav.criteria', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT'] },
  { to: '/analytics/hierarchical', labelKey: 'nav.hierarchical', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN'] },
  { to: '/manager-dashboard', labelKey: 'nav.managerDashboard', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT'] },
  { to: '/manager-tasks', labelKey: 'nav.managerTasks', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT'] },
  { to: '/my-tasks', labelKey: 'nav.myTasks', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT'] },
  { to: '/my-kpi', labelKey: 'nav.myKpi', roles: ['EMPLOYEE', 'HEAD_OF_DEPARTMENT_UNIT', 'HEAD_OF_DEPARTMENT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN'] },
  { to: '/my-evaluations', labelKey: 'nav.myEvaluations', roles: ['EMPLOYEE', 'HEAD_OF_DEPARTMENT_UNIT', 'HEAD_OF_DEPARTMENT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN'] },
  { to: '/evaluations', labelKey: 'nav.evaluations', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'EMPLOYEE'] },
  { to: '/analytics', labelKey: 'nav.analytics', roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT'] },
  { to: '/audit', labelKey: 'nav.audit', roles: ['ADMIN', 'CHAIRMAN'] },
  { to: '/settings', labelKey: 'nav.settings', roles: ['ADMIN'] },
  { to: '/calendar', labelKey: 'nav.calendar', roles: ['ADMIN'] },
]

export function Sidebar() {
  const { t } = useTranslation()
  const { role } = useSelector((s: RootState) => s.auth)

  const visible = navItems.filter(item => role && item.roles.includes(role))

  return (
    <aside className="w-64 bg-gray-900 text-gray-100 fixed top-0 left-0 h-full flex flex-col">
      <div className="h-14 flex items-center px-6 border-b border-gray-700">
        <span className="text-lg font-bold text-white">ГФХ КПИ</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-6 py-3 text-sm transition-colors ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
