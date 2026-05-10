import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { auditApi, AuditLogEntry, AuditSearchParams } from './adminApi'

const KNOWN_ACTIONS = [
  'CREATE_USER', 'UPDATE_USER', 'DEACTIVATE_USER',
  'SUBMIT_EVALUATION', 'UPDATE_CRITERIA', 'DELETE_CRITERIA',
  'DOWNLOAD_FILE', 'EXPORT_REPORT',
  'CREATE_ORG_UNIT', 'UPDATE_ORG_UNIT', 'DELETE_ORG_UNIT',
  'CREATE_DELEGATION', 'DELETE_DELEGATION',
]

const KNOWN_ENTITY_TYPES = [
  'USER', 'EVALUATION', 'CRITERIA', 'EVALUATION_FILE',
  'ORG_UNIT', 'DELEGATION', 'PERIOD',
]

const PAGE_SIZE = 20

export function AuditLogPage() {
  const { t } = useTranslation()

  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)

  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const buildParams = useCallback((): AuditSearchParams => ({
    action: action || undefined,
    entityType: entityType || undefined,
    from: from ? `${from}T00:00:00` : undefined,
    to: to ? `${to}T23:59:59` : undefined,
    page,
    size: PAGE_SIZE,
  }), [action, entityType, from, to, page])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await auditApi.search(buildParams())
      setEntries(data.content)
      setTotalElements(data.totalElements)
      setTotalPages(data.totalPages)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterApply = () => setPage(0)

  const handleExport = () => auditApi.export(buildParams())

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('admin.auditLog')}</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Download className="h-4 w-4" />
          {t('audit.exportAudit')}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('audit.action')}</option>
          {KNOWN_ACTIONS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          value={entityType}
          onChange={e => setEntityType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('audit.entityType')}</option>
          {KNOWN_ENTITY_TYPES.map(et => (
            <option key={et} value={et}>{et}</option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('audit.filterFrom')}
        />

        <div className="flex gap-2">
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('audit.filterTo')}
          />
          <button
            onClick={handleFilterApply}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {t('common.filter')}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('audit.actor')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('audit.action')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('audit.entityType')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('audit.entityId')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('audit.ipAddress')}</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">{t('audit.timestamp')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  {t('common.loading')}
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{entry.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.actorEmail}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{entry.entityType ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{entry.entityId ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{entry.ipAddress ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(entry.createdAt).toLocaleString('ru-RU')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>{t('common.total')}: {totalElements}</span>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
          >
            ←
          </button>
          <span>{t('common.page')} {page + 1} {t('common.of')} {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
