import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, BarChart3, ClipboardCheck, MessageSquare, Shield, Activity } from 'lucide-react'
import { adminApi, AdminStats } from './adminApi'

interface StatCardProps {
  label: string
  value: number | undefined
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value ?? '—'}</p>
        </div>
        <div className={`rounded-full p-3 ${color}`}>{icon}</div>
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => setError('Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">{t('common.loading')}</p>
  if (error) return <p className="text-red-500">{error}</p>

  const cards: StatCardProps[] = [
    {
      label: t('user.title'),
      value: stats?.activeUsers,
      icon: <Users className="h-6 w-6 text-blue-600" />,
      color: 'bg-blue-50',
    },
    {
      label: t('admin.periods'),
      value: stats?.activeEvaluationPeriods,
      icon: <BarChart3 className="h-6 w-6 text-green-600" />,
      color: 'bg-green-50',
    },
    {
      label: t('evaluation.toEvaluate'),
      value: stats?.pendingEvaluations,
      icon: <ClipboardCheck className="h-6 w-6 text-yellow-600" />,
      color: 'bg-yellow-50',
    },
    {
      label: t('appeal.statusOpen'),
      value: stats?.openAppeals,
      icon: <MessageSquare className="h-6 w-6 text-orange-600" />,
      color: 'bg-orange-50',
    },
    {
      label: `${t('common.total')} ${t('evaluation.title').toLowerCase()}`,
      value: stats?.totalEvaluations,
      icon: <Activity className="h-6 w-6 text-purple-600" />,
      color: 'bg-purple-50',
    },
    {
      label: `${t('admin.auditLog')} (24ч)`,
      value: stats?.auditLogsLast24h,
      icon: <Shield className="h-6 w-6 text-gray-600" />,
      color: 'bg-gray-100',
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">{t('admin.stats')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>
    </div>
  )
}
