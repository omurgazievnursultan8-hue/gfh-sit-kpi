import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminApi, AdminStats } from './adminApi'
import { Layout } from '../../components/Layout'
import { AdminHero } from './AdminHero'
import { AdminStatsCards } from './AdminStatsCards'

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

  return (
    <Layout>
      <div>
        <AdminHero stats={stats} />
        <AdminStatsCards stats={stats} />
      </div>
    </Layout>
  )
}
