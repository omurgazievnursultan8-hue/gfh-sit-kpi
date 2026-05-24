import { useEffect, useState, useCallback, useId, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { auditApi, AuditLogEntry, AuditSearchParams } from './adminApi'
import { DataPanel, type Column, type FilterDef, type PanelState } from '../../components/DataPanel'
import { Badge, type BadgeTone } from '../../components/Badge'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'

const PANEL_KEY = 'gfh_audit'

function actionTone(action: string): BadgeTone {
  if (/^(CREATE|SUBMIT)/.test(action)) return 'success'
  if (/^(DELETE|DEACTIVATE)/.test(action)) return 'danger'
  if (/^UPDATE/.test(action)) return 'warn'
  if (/^(DOWNLOAD|EXPORT)/.test(action)) return 'gold'
  return 'neutral'
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase()
}

export function AuditLogPage() {
  const { t, i18n } = useTranslation()

  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [seenActions, setSeenActions] = useState<string[]>([])
  const [seenEntityTypes, setSeenEntityTypes] = useState<string[]>([])

  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [filterValues, setFilterValuesState] = useState<Record<string, string>>({})

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const fromId = useId()
  const toId = useId()

  const dateLocale = i18n.language.startsWith('kg') ? 'ky-KG' : 'ru-RU'

  const FILTERS: FilterDef[] = useMemo(() => [
    {
      key: 'action',
      label: t('audit.action'),
      type: 'select',
      options: [
        { value: '', label: t('audit.allActions', '— все —') },
        ...seenActions.map(a => ({ value: a, label: a })),
      ],
    },
    {
      key: 'entityType',
      label: t('audit.entityType'),
      type: 'select',
      options: [
        { value: '', label: t('audit.allEntityTypes', '— все —') },
        ...seenEntityTypes.map(et => ({ value: et, label: et })),
      ],
    },
  ], [t, seenActions, seenEntityTypes])

  const buildParams = useCallback((): AuditSearchParams => ({
    action: filterValues.action || undefined,
    entityType: filterValues.entityType || undefined,
    from: from ? `${from}T00:00:00` : undefined,
    to: to ? `${to}T23:59:59` : undefined,
    page,
    size: pageSize,
  }), [filterValues, from, to, page, pageSize])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await auditApi.search(buildParams())
      setEntries(data.content)
      setTotalElements(data.totalElements)
      setSeenActions(prev => {
        const set = new Set(prev)
        for (const e of data.content) if (e.action) set.add(e.action)
        return Array.from(set).sort()
      })
      setSeenEntityTypes(prev => {
        const set = new Set(prev)
        for (const e of data.content) if (e.entityType) set.add(e.entityType)
        return Array.from(set).sort()
      })
    } catch {
      setEntries([])
      setTotalElements(0)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => { fetchData() }, [fetchData])

  // Reset to first page when filters or dates change.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    setPage(0)
  }, [filterValues, from, to])

  const handleStateChange = useCallback((s: PanelState) => {
    setPage(s.page)
    setPageSize(s.pageSize)
    setFilterValuesState(s.filters)
  }, [])

  const handleExport = () => auditApi.export(buildParams())

  const dateInputCls =
    'rounded-lg px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
  const dateInputStyle = {
    border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)',
    height: 38,
  }

  const dateSlot = (
    <div className="flex items-center gap-2">
      <label htmlFor={fromId} className="text-xs font-medium" style={{ color: 'var(--ink-faint)' }}>
        {t('audit.filterFrom')}
      </label>
      <input
        id={fromId} type="date" value={from}
        onChange={e => setFrom(e.target.value)}
        className={dateInputCls} style={dateInputStyle}
      />
      <label htmlFor={toId} className="text-xs font-medium" style={{ color: 'var(--ink-faint)' }}>
        {t('audit.filterTo')}
      </label>
      <input
        id={toId} type="date" value={to}
        onChange={e => setTo(e.target.value)}
        className={dateInputCls} style={dateInputStyle}
      />
    </div>
  )

  const exportButton = (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'var(--accent)', color: 'var(--surface)',
        border: '1px solid var(--accent-ink)', cursor: 'pointer',
      }}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {t('audit.exportAudit')}
    </button>
  )

  const columns: Column<AuditLogEntry>[] = [
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

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>

      <div className="dv3-terminal">
        <DataPanel<AuditLogEntry>
          mode="server"
          columns={columns}
          rows={entries}
          rowKey={(e) => e.id}
          loading={loading}
          caption={t('admin.auditLog')}
          empty={t('common.noData')}
          filters={FILTERS}
          filterSlot={dateSlot}
          views={['table']}
          page={page}
          totalElements={totalElements}
          pageSize={pageSize}
          pageSizeOptions={[20, 50, 100]}
          onStateChange={handleStateChange}
          onRowClick={(entry) => setExpanded(expanded === entry.id ? null : entry.id)}
          renderExpanded={renderExpanded}
          expandedKeys={expanded != null ? new Set([expanded]) : undefined}
          panelStorageKey={PANEL_KEY}
          columnConfig
          toolbarActions={exportButton}
        />
      </div>
    </div>
  )
}
