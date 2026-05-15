import { useEffect, useState, useCallback, useId } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download, Search, RotateCcw, ChevronLeft, ChevronRight,
  ChevronDown, FileSearch, ShieldCheck,
} from 'lucide-react'
import { auditApi, AuditLogEntry, AuditSearchParams } from './adminApi'
import { Layout } from '../../components/Layout'
import { DataTable, type Column } from '../../components/DataTable'
import { TableCard } from '../../components/TableCard'
import { Badge, type BadgeTone } from '../../components/Badge'

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

/** Map an action verb prefix to a semantic Badge tone. */
function actionTone(action: string): BadgeTone {
  if (/^(CREATE|SUBMIT)/.test(action)) return 'success'
  if (/^(DELETE|DEACTIVATE)/.test(action)) return 'danger'
  if (/^UPDATE/.test(action)) return 'warn'
  if (/^(DOWNLOAD|EXPORT)/.test(action)) return 'gold'
  return 'neutral'
}

/** Initials avatar fallback for an actor email. */
function initials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

export function AuditLogPage() {
  const { t, i18n } = useTranslation()

  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const actionId = useId()
  const entityTypeId = useId()
  const fromId = useId()
  const toId = useId()

  const dateLocale = i18n.language.startsWith('kg') ? 'ky-KG' : 'ru-RU'
  const hasFilters = Boolean(action || entityType || from || to)

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
      setTotalElements(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilterApply = () => setPage(0)

  const handleReset = () => {
    setAction('')
    setEntityType('')
    setFrom('')
    setTo('')
    setPage(0)
  }

  const handleExport = () => auditApi.export(buildParams())

  const selectCls =
    'w-full rounded-lg px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
  const selectStyle = {
    border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)',
  }

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'toggle',
      header: t('audit.details'),
      srOnlyHeader: true,
      width: '40px',
      render: entry => {
        const isOpen = expanded === entry.id
        return (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={t('audit.details') as string}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--accent-mute)]"
            style={{ color: 'var(--ink-faint)' }}
            onClick={e => { e.stopPropagation(); setExpanded(isOpen ? null : entry.id) }}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        )
      },
    },
    {
      key: 'actor',
      header: t('audit.actor'),
      render: entry => (
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ background: 'var(--surface-mute)', color: 'var(--ink-soft)' }}
          >
            {initials(entry.actorEmail)}
          </span>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>{entry.actorEmail}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: t('audit.action'),
      render: entry => <Badge tone={actionTone(entry.action)}>{entry.action}</Badge>,
    },
    {
      key: 'entityType',
      header: t('audit.entityType'),
      render: entry => <span style={{ color: 'var(--ink-soft)' }}>{entry.entityType ?? '—'}</span>,
    },
    {
      key: 'entityId',
      header: t('audit.entityId'),
      render: entry => <span className="tabular-nums" style={{ color: 'var(--ink-soft)' }}>{entry.entityId ?? '—'}</span>,
    },
    {
      key: 'ipAddress',
      header: t('audit.ipAddress'),
      render: entry => <span className="font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>{entry.ipAddress ?? '—'}</span>,
    },
    {
      key: 'timestamp',
      header: t('audit.timestamp'),
      render: entry => (
        <time dateTime={entry.createdAt} className="whitespace-nowrap tabular-nums" style={{ color: 'var(--ink-faint)' }}>
          {new Date(entry.createdAt).toLocaleString(dateLocale)}
        </time>
      ),
    },
  ]

  const renderExpanded = (entry: AuditLogEntry) => (
    <div className="px-12 py-3">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="font-medium" style={{ color: 'var(--ink-faint)' }}>ID:</dt>
          <dd className="tabular-nums" style={{ color: 'var(--ink-soft)' }}>{entry.id}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium" style={{ color: 'var(--ink-faint)' }}>{t('audit.details')}:</dt>
          <dd className="break-all" style={{ color: 'var(--ink-soft)' }}>{entry.details ?? '—'}</dd>
        </div>
      </dl>
    </div>
  )

  const emptyState = (
    <div>
      <FileSearch className="mx-auto h-10 w-10" style={{ color: 'var(--ink-faint)' }} aria-hidden="true" />
      <p className="mt-3 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>{t('common.noData')}</p>
      {hasFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="mt-2 text-sm font-medium hover:underline"
          style={{ color: 'var(--accent-2)' }}
        >
          {t('common.reset', 'Сбросить')}
        </button>
      )}
    </div>
  )

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{t('admin.auditLog')}</h1>
              <p className="text-sm text-slate-500">
                {t('common.total')}: <span className="font-medium text-slate-700">{totalElements}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('audit.exportAudit')}
          </button>
        </div>

        {/* Filters */}
        <div
          className="rounded-xl p-4 shadow-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}
          role="search"
          aria-label={t('audit.filters', 'Фильтры журнала аудита') as string}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor={actionId} className="mb-1 block text-xs font-medium" style={{ color: 'var(--ink-faint)' }}>
                {t('audit.action')}
              </label>
              <select id={actionId} value={action} onChange={e => setAction(e.target.value)} className={selectCls} style={selectStyle}>
                <option value="">{t('audit.allActions', '— все —')}</option>
                {KNOWN_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor={entityTypeId} className="mb-1 block text-xs font-medium" style={{ color: 'var(--ink-faint)' }}>
                {t('audit.entityType')}
              </label>
              <select id={entityTypeId} value={entityType} onChange={e => setEntityType(e.target.value)} className={selectCls} style={selectStyle}>
                <option value="">{t('audit.allEntityTypes', '— все —')}</option>
                {KNOWN_ENTITY_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor={fromId} className="mb-1 block text-xs font-medium" style={{ color: 'var(--ink-faint)' }}>
                {t('audit.filterFrom')}
              </label>
              <input id={fromId} type="date" value={from} onChange={e => setFrom(e.target.value)} className={selectCls} style={selectStyle} />
            </div>

            <div>
              <label htmlFor={toId} className="mb-1 block text-xs font-medium" style={{ color: 'var(--ink-faint)' }}>
                {t('audit.filterTo')}
              </label>
              <input id={toId} type="date" value={to} onChange={e => setTo(e.target.value)} className={selectCls} style={selectStyle} />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleFilterApply}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t('common.filter')}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasFilters}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-[var(--accent-mute)] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('common.reset', 'Сбросить')}
            </button>
          </div>
        </div>

        {/* Table */}
        <TableCard
          footer={
            <div
              className="flex items-center justify-between text-sm"
              style={{ color: 'var(--ink-soft)' }}
              role="navigation"
              aria-label={t('common.pagination', 'Пагинация') as string}
            >
              <span aria-live="polite">
                {t('common.page')} <span className="font-medium" style={{ color: 'var(--ink)' }}>{page + 1}</span>{' '}
                {t('common.of')} {Math.max(totalPages, 1)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  aria-label={t('common.prevPage', 'Предыдущая страница') as string}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition hover:bg-[var(--accent-mute)] disabled:opacity-40"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  aria-label={t('common.nextPage', 'Следующая страница') as string}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition hover:bg-[var(--accent-mute)] disabled:opacity-40"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          }
        >
          <DataTable<AuditLogEntry>
            columns={columns}
            rows={entries}
            rowKey={entry => entry.id}
            caption={t('admin.auditLog')}
            loading={loading}
            onRowClick={entry => setExpanded(expanded === entry.id ? null : entry.id)}
            renderExpanded={renderExpanded}
            expandedKeys={expanded != null ? new Set([expanded]) : undefined}
            empty={emptyState}
            totalCount={totalElements}
          />
        </TableCard>
      </div>
    </Layout>
  )
}
