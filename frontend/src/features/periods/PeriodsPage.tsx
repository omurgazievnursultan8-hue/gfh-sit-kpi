import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { periodsApi, Period, PeriodProgress, PeriodType, PeriodStatus } from './periodsApi'
import { PeriodFormModal, PeriodFormData } from './components/PeriodFormModal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { usePageTitle } from '../../context/PageContext'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DataPanel, type Column, type FilterDef } from '../../components/datapanel/DataPanel'

const PANEL_KEY = 'gfh_periods'

const TYPE_LABEL: Record<PeriodType, string> = {
  MONTHLY: 'Ежемесячная',
  QUARTERLY: 'Квартальная',
  ANNUAL: 'Годовая',
}

const STATUS_RANK: Record<PeriodStatus, number> = { ACTIVE: 0, DRAFT: 1, CLOSED: 2 }
const TYPE_RANK: Record<PeriodType, number> = { MONTHLY: 0, QUARTERLY: 1, ANNUAL: 2 }

interface StatusVisual { text: string; fg: string; bg: string; border: string }
const STATUS_VISUAL: Record<PeriodStatus, StatusVisual> = {
  ACTIVE: { text: 'Активный', fg: '#2f9e6d', bg: 'rgba(120,200,150,0.14)', border: 'rgba(120,200,150,0.32)' },
  DRAFT:  { text: 'Черновик', fg: '#9c7416', bg: 'rgba(200,150,40,0.14)',  border: 'rgba(200,150,40,0.32)' },
  CLOSED: { text: 'Завершён', fg: '#6b6b6b', bg: 'rgba(120,120,120,0.12)', border: 'rgba(120,120,120,0.32)' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function periodTitle(p: Period): string {
  const d = new Date(p.startDate)
  const y = d.getFullYear()
  if (p.type === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1} ${y}`
  if (p.type === 'MONTHLY') return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return `${y}`
}

function StatusPill({ status }: { status: PeriodStatus }) {
  const v = STATUS_VISUAL[status]
  return (
    <span
      className="font-mono font-semibold uppercase tracking-widest"
      style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: v.bg, color: v.fg, border: `1px solid ${v.border}` }}
    >
      {v.text}
    </span>
  )
}

function ProgressBar({ progress, status }: { progress: PeriodProgress | undefined; status: PeriodStatus }) {
  if (status !== 'ACTIVE' && status !== 'CLOSED') {
    return <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>—</span>
  }
  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const pctColor = pct >= 80 ? 'var(--accent-2,#2f9e6d)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)'
  if (progress === undefined) return <span style={{ fontSize: 12, color: 'var(--ink-dim)' }}>…</span>
  if (total === 0) return <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>нет оценок</span>
  return (
    <div style={{ minWidth: 140 }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
          {completed} / {total}
        </span>
        <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{pct}%</span>
      </div>
      <div className="relative overflow-hidden rounded-full" style={{ height: 5, background: 'var(--bg-soft,#ebe6db)' }}>
        <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: pctColor, borderRadius: 999 }} />
      </div>
    </div>
  )
}

export function PeriodsPage() {
  usePageTitle('Периоды оценки')

  const [periods, setPeriods] = useState<Period[]>([])
  const [progress, setProgress] = useState<Record<number, PeriodProgress>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [closeTarget, setCloseTarget] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await periodsApi.list()
      setPeriods(list)
      const withProgress = list.filter(p => p.status === 'ACTIVE' || p.status === 'CLOSED')
      const entries = await Promise.all(
        withProgress.map(async p => {
          try {
            return [p.id, await periodsApi.progress(p.id)] as const
          } catch {
            return [p.id, { total: 0, completed: 0 }] as const
          }
        }),
      )
      setProgress(Object.fromEntries(entries))
    } catch {
      setLoadError('Не удалось загрузить периоды')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: PeriodFormData) => {
    await periodsApi.create(data)
    await load()
  }

  const handleActivate = async (id: number) => {
    setBusyId(id)
    try {
      await periodsApi.activate(id)
      setActionError(null)
      await load()
    } catch {
      setActionError('Не удалось активировать период')
    } finally {
      setBusyId(null)
    }
  }

  const handleClose = async () => {
    if (closeTarget == null) return
    const id = closeTarget
    setCloseTarget(null)
    setBusyId(id)
    try {
      await periodsApi.close(id)
      setActionError(null)
      await load()
    } catch {
      setActionError('Не удалось закрыть период')
    } finally {
      setBusyId(null)
    }
  }

  const FILTERS: FilterDef[] = useMemo(() => {
    const statusOptions = [
      { value: '',       label: 'Любой статус' },
      { value: 'ACTIVE', label: 'Активные' },
      { value: 'DRAFT',  label: 'Черновики' },
      { value: 'CLOSED', label: 'Завершённые' },
    ]
    const typeOptions = [
      { value: '',          label: 'Все типы' },
      { value: 'MONTHLY',   label: TYPE_LABEL.MONTHLY },
      { value: 'QUARTERLY', label: TYPE_LABEL.QUARTERLY },
      { value: 'ANNUAL',    label: TYPE_LABEL.ANNUAL },
    ]
    return [
      { key: 'status', label: 'Статус', type: 'select', options: statusOptions },
      { key: 'type',   label: 'Тип',    type: 'select', options: typeOptions },
    ]
  }, [])

  const columns: Column<Period>[] = [
    {
      key: 'name', header: 'Период', sortable: true, hideable: false,
      render: (p) => (
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{periodTitle(p)}</span>
          {p.autoCreated && (
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-soft,#ebe6db)', color: 'var(--ink-faint)' }}
            >
              авто
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'type', header: 'Тип', sortable: true,
      render: (p) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{TYPE_LABEL[p.type]}</span>,
    },
    {
      key: 'dates', header: 'Даты',
      render: (p) => (
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {formatDate(p.startDate)} → {formatDate(p.endDate)}
        </span>
      ),
    },
    {
      key: 'deadline', header: 'Дедлайн', sortable: true,
      render: (p) => (
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {formatDate(p.submissionDeadline)}
        </span>
      ),
    },
    {
      key: 'progress', header: 'Прогресс',
      render: (p) => <ProgressBar progress={progress[p.id]} status={p.status} />,
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (p) => <StatusPill status={p.status} />,
    },
    {
      key: 'actions', header: 'Действия', align: 'right', srOnlyHeader: true, hideable: false,
      render: (p) => (
        <div onClick={e => e.stopPropagation()} className="flex justify-end">
          {p.status === 'DRAFT' && (
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => handleActivate(p.id)}
              className="font-mono uppercase tracking-widest disabled:opacity-50"
              style={{ fontSize: 10.5, fontWeight: 600, padding: '5px 12px', borderRadius: 6, background: 'var(--accent-2,#2f9e6d)', color: '#fff' }}
            >
              Активировать
            </button>
          )}
          {p.status === 'ACTIVE' && (
            <button
              type="button"
              disabled={busyId === p.id}
              onClick={() => setCloseTarget(p.id)}
              className="font-mono uppercase tracking-widest disabled:opacity-50"
              style={{ fontSize: 10.5, fontWeight: 600, padding: '5px 12px', borderRadius: 6, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
            >
              Закрыть
            </button>
          )}
        </div>
      ),
    },
  ]

  const searchText = (p: Period) => `${periodTitle(p)} ${TYPE_LABEL[p.type]} ${new Date(p.startDate).getFullYear()}`

  const clientFilter = (p: Period, v: Record<string, string>) => {
    if (v.status && p.status !== v.status) return false
    if (v.type && p.type !== v.type) return false
    return true
  }

  const comparator = (key: string) => (a: Period, b: Period): number => {
    switch (key) {
      case 'type':     return TYPE_RANK[a.type] - TYPE_RANK[b.type]
      case 'deadline': return new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime()
      case 'status':   return STATUS_RANK[a.status] - STATUS_RANK[b.status]
      default:         return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    }
  }

  const renderCard = (p: Period): ReactNode => {
    const total = progress[p.id]?.total ?? 0
    const completed = progress[p.id]?.completed ?? 0
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const showProgress = p.status === 'ACTIVE' || p.status === 'CLOSED'
    return (
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{periodTitle(p)}</span>
              {p.autoCreated && (
                <span
                  className="font-mono uppercase tracking-widest"
                  style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-soft,#ebe6db)', color: 'var(--ink-faint)' }}
                >
                  авто
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{TYPE_LABEL[p.type]}</div>
          </div>
          <StatusPill status={p.status} />
        </div>

        {showProgress && (
          <div>
            <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
              <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>
                Заполнено
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
                {progress[p.id] === undefined ? '…' : total === 0 ? 'нет оценок' : `${completed} / ${total} · ${pct}%`}
              </span>
            </div>
            <div className="relative overflow-hidden rounded-full" style={{ height: 6, background: 'var(--bg-soft,#ebe6db)' }}>
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${pct}%`, borderRadius: 999, background: pct >= 80 ? 'var(--accent-2,#2f9e6d)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)' }}
              />
            </div>
          </div>
        )}

        <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          {formatDate(p.startDate)} → {formatDate(p.endDate)}
          {' · дедлайн '}
          <strong style={{ color: 'var(--ink-soft)' }}>{formatDate(p.submissionDeadline)}</strong>
        </div>

        {p.status === 'DRAFT' && (
          <button
            type="button"
            disabled={busyId === p.id}
            onClick={() => handleActivate(p.id)}
            className="font-mono uppercase tracking-widest disabled:opacity-50"
            style={{ fontSize: 10.5, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: 'var(--accent-2,#2f9e6d)', color: '#fff', alignSelf: 'flex-start' }}
          >
            Активировать
          </button>
        )}
        {p.status === 'ACTIVE' && (
          <button
            type="button"
            disabled={busyId === p.id}
            onClick={() => setCloseTarget(p.id)}
            className="font-mono uppercase tracking-widest disabled:opacity-50"
            style={{ fontSize: 10.5, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', alignSelf: 'flex-start' }}
          >
            Закрыть период
          </button>
        )}
      </div>
    )
  }

  const addButton = (
    <button
      onClick={() => setModalOpen(true)}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'var(--accent)', color: 'var(--surface)',
        border: '1px solid var(--accent-ink)', cursor: 'pointer',
      }}
    >
      <Plus size={15} />
      Создать период
    </button>
  )

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>

        <div className="dv3-terminal">
          {actionError && (
            <div className="font-mono" style={{ fontSize: 12, color: 'var(--dv3-zone-down)', marginBottom: 12 }}>{actionError}</div>
          )}
          {loadError && !loading && (
            <div className="font-mono" style={{ fontSize: 12, color: 'var(--dv3-zone-down)', marginBottom: 12 }}>{loadError}</div>
          )}

          <DataPanel<Period>
            mode="client"
            columns={columns}
            rows={periods}
            rowKey={(p) => p.id}
            loading={loading}
            caption="Периоды оценки"
            empty="Периодов пока нет. Создайте первый."
            searchable
            searchText={searchText}
            searchPlaceholder="Поиск по периоду…"
            filters={FILTERS}
            clientFilter={clientFilter}
            comparator={comparator}
            defaultSort={{ key: 'name', dir: 'asc' }}
            views={['table', 'cards']}
            renderCard={renderCard}
            panelStorageKey={PANEL_KEY}
            columnConfig
            toolbarActions={addButton}
          />
        </div>
      </div>

      <PeriodFormModal
        open={modalOpen}
        onSave={handleCreate}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={closeTarget !== null}
        title="Закрыть период?"
        description="После закрытия период нельзя будет редактировать или активировать заново."
        variant="danger"
        confirmLabel="Закрыть"
        onConfirm={handleClose}
        onCancel={() => setCloseTarget(null)}
      />
    </>
  )
}
