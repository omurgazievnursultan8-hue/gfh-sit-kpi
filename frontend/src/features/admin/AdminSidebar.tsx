import React from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users, Building2, ListChecks, Calendar, GitBranch,
  Settings, CalendarDays, ClipboardList, Activity, BarChart3
} from 'lucide-react'

interface NavItem { to: string; label: string; icon: React.ElementType; end?: boolean }

const NAV_ITEMS: NavItem[] = [
  { to: '/admin',              label: 'admin.stats',        icon: BarChart3,     end: true },
  { to: '/admin/users',        label: 'admin.users',        icon: Users },
  { to: '/admin/org',          label: 'admin.orgStructure', icon: Building2 },
  { to: '/admin/criteria',     label: 'admin.criteria',     icon: ListChecks },
  { to: '/admin/periods',      label: 'admin.periods',      icon: Calendar },
  { to: '/admin/delegations',  label: 'admin.delegations',  icon: GitBranch },
  { to: '/admin/settings',     label: 'admin.settings',     icon: Settings },
  { to: '/admin/calendar',     label: 'admin.calendar',     icon: CalendarDays },
  { to: '/admin/audit',        label: 'admin.auditLog',     icon: ClipboardList },
  { to: '/admin/monitoring',   label: 'admin.monitoring',   icon: Activity },
]

export function AdminSidebar() {
  const { t } = useTranslation()

  return (
    <nav className="w-56 shrink-0 border-r border-gray-200 bg-white h-full py-4">
      <div className="px-4 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('admin.title')}
        </span>
      </div>
      <ul className="space-y-0.5 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
