import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { delegationsApi, Delegation, DelegationRequest } from '../delegationsApi'
import { DelegationFormModal } from '../components/DelegationFormModal'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import api from '../../../app/api'
import { Badge, type BadgeTone } from '@/shared/ui/Badge'
import { DASHBOARD_CSS } from '../../dashboard/styles'
import { DataPanel, type Column, type FilterDef } from '@/shared/datapanel/DataPanel'

const PANEL_KEY = 'gfh_delegations'

interface User {
  id: number
  fullName: string
  email: string
}
interface UsersPage { content: User[] }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function urgency(d: Delegation): { tone: BadgeTone; label: string } {
  if (!d.isActive) return { tone: 'neutral', label: 'завершено' }
  const days = daysUntil(d.validTo)
  if (days < 0)  return { tone: 'danger',  label: `истекло ${Math.abs(days)}д` }
  if (days <= 7) return { tone: 'warn',    label: `${days}д осталось` }
  return { tone: 'success', label: `${days}д` }
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
}

function PersonChip({ name, tone }: { name: string; tone: 'from' | 'to' }) {
  const spec = tone === 'from'
    ? { bg: 'rgba(120,150,200,0.10)', fg: '#4a73c7', border: 'rgba(120,150,200,0.28)' }
    : { bg: 'rgba(26,117,88,0.10)',   fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.24)' }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className="font-mono shrink-0"
        style={{
          width: 24, height: 24, borderRadius: 4,
          background: spec.bg, color: spec.fg,
          border: `1px solid ${spec.border}`,
          fontSize: 9.5, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '0.02em',
        }}
      >
        {initials(name)}
      </span>
      <span className="truncate" style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
        {name}
      </span>
    </div>
  )
}

export function DelegationsPage() {
  const [all, setAll] = useState<Delegation[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Delegation | null>(null)

  const loadDelegations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await delegationsApi.list(0, 500)
      setAll(data.content)
    } catch {
      // swallow — empty list shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDelegations() }, [loadDelegations])

  useEffect(() => {
    api.get<UsersPage>('/users', { params: { size: 200 } })
      .then(r => setUsers(r.data.content))
      .catch(() => {})
  }, [])

  const handleSave = async (data: DelegationRequest) => {
    await delegationsApi.create(data)
    await loadDelegations()
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await delegationsApi.deactivate(deactivateTarget.id)
      setDeactivateTarget(null)
      await loadDelegations()
    } catch {
      setDeactivateTarget(null)
    }
  }

  const FILTERS: FilterDef[] = useMemo(() => {
    const statusOptions = [
      { value: '',         label: 'Любой статус' },
      { value: 'ACTIVE',   label: 'Активные' },
      { value: 'EXPIRING', label: 'Истекают (≤7д)' },
      { value: 'EXPIRED',  label: 'Завершённые' },
    ]
    return [
      { key: 'status', label: 'Статус', type: 'select', options: statusOptions },
    ]
  }, [])

  const columns: Column<Delegation>[] = [
    {
      key: 'evaluatee', header: 'Оцениваемый', sortable: true, hideable: false,
      render: (d) => <PersonChip name={d.evaluateeName ?? '—'} tone="from" />,
    },
    {
      key: 'arrow', header: '', srOnlyHeader: true, width: '32px', align: 'center',
      render: () => (
        <span className="font-mono" style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 600 }}>→</span>
      ),
    },
    {
      key: 'delegate', header: 'Делегат', sortable: true,
      render: (d) => <PersonChip name={d.delegatedToName ?? '—'} tone="to" />,
    },
    {
      key: 'period', header: 'Период',
      render: (d) => (
        <span className="font-mono tabular-nums" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
          {fmtDate(d.validFrom)} — {fmtDate(d.validTo)}
        </span>
      ),
    },
    {
      key: 'window', header: 'Окно', sortable: true,
      render: (d) => {
        const u = urgency(d)
        return <Badge tone={u.tone}>{u.label}</Badge>
      },
    },
    {
      key: 'actions', header: 'Действия', align: 'right', srOnlyHeader: true, hideable: false,
      render: (d) => (
        <div onClick={e => e.stopPropagation()} className="flex justify-end">
          {d.isActive ? (
            <button
              type="button"
              onClick={() => setDeactivateTarget(d)}
              className="font-mono uppercase tracking-widest"
              style={{
                fontSize: 10.5, fontWeight: 600, padding: '5px 12px', borderRadius: 6,
                background: 'transparent', color: 'var(--danger)',
                border: '1px solid var(--danger)', cursor: 'pointer',
              }}
            >
              Снять
            </button>
          ) : (
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 9.5, color: 'var(--ink-dim)', fontWeight: 600 }}
            >
              архив
            </span>
          )}
        </div>
      ),
    },
  ]

  const searchText = (d: Delegation) =>
    `${d.evaluateeName ?? ''} ${d.delegatedToName ?? ''} ${d.originalEvaluatorName ?? ''}`

  const clientFilter = (d: Delegation, v: Record<string, string>) => {
    if (!v.status) return true
    if (v.status === 'ACTIVE')   return d.isActive
    if (v.status === 'EXPIRED')  return !d.isActive
    if (v.status === 'EXPIRING') {
      if (!d.isActive) return false
      const days = daysUntil(d.validTo)
      return days >= 0 && days <= 7
    }
    return true
  }

  const comparator = (key: string) => (a: Delegation, b: Delegation): number => {
    switch (key) {
      case 'delegate': return (a.delegatedToName ?? '').localeCompare(b.delegatedToName ?? '', 'ru')
      case 'window':   return new Date(a.validTo).getTime() - new Date(b.validTo).getTime()
      default:         return (a.evaluateeName ?? '').localeCompare(b.evaluateeName ?? '', 'ru')
    }
  }

  const renderCard = (d: Delegation): ReactNode => {
    const u = urgency(d)
    return (
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          opacity: d.isActive ? 1 : 0.7,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <PersonChip name={d.evaluateeName ?? '—'} tone="from" />
            <span className="font-mono" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600, paddingLeft: 6 }}>↓</span>
            <PersonChip name={d.delegatedToName ?? '—'} tone="to" />
          </div>
          <Badge tone={u.tone}>{u.label}</Badge>
        </div>

        <div className="font-mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', borderTop: '1px dashed var(--line)', paddingTop: 10 }}>
          {fmtDate(d.validFrom)} — {fmtDate(d.validTo)}
        </div>

        {d.isActive && (
          <button
            type="button"
            onClick={() => setDeactivateTarget(d)}
            className="font-mono uppercase tracking-widest"
            style={{
              fontSize: 10.5, fontWeight: 600, padding: '6px 14px', borderRadius: 6,
              background: 'transparent', color: 'var(--danger)',
              border: '1px solid var(--danger)', cursor: 'pointer', alignSelf: 'flex-start',
            }}
          >
            Снять
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
      Новое делегирование
    </button>
  )

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>

        <div className="dv3-terminal">
          <DataPanel<Delegation>
            mode="client"
            columns={columns}
            rows={all}
            rowKey={(d) => d.id}
            loading={loading}
            caption="Реестр делегирований"
            empty="Делегирований пока нет."
            searchable
            searchText={searchText}
            searchPlaceholder="Поиск по ФИО…"
            filters={FILTERS}
            clientFilter={clientFilter}
            comparator={comparator}
            defaultSort={{ key: 'window', dir: 'asc' }}
            views={['table', 'cards']}
            renderCard={renderCard}
            panelStorageKey={PANEL_KEY}
            columnConfig
            toolbarActions={addButton}
          />
        </div>
      </div>

      <DelegationFormModal open={modalOpen} users={users} onSave={handleSave} onClose={() => setModalOpen(false)} />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Деактивировать делегирование?"
        description={`Делегирование от «${deactivateTarget?.evaluateeName ?? ''}» к «${deactivateTarget?.delegatedToName ?? ''}» будет деактивировано.`}
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </>
  )
}
