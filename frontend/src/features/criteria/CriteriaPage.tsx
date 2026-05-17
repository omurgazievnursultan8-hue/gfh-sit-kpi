import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Layout } from '../../components/Layout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { StatusPill } from '../users/components/usersMeta'
import { CriteriaFormModal } from './components/CriteriaFormModal'
import { CriteriaRowMenu, type CriteriaActions } from './components/CriteriaRowMenu'
import { Criteria, CriteriaType, criteriaApi } from './criteriaApi'
import { OrgUnit, orgApi } from '../org/orgApi'

const PANEL_KEY = 'gfh_criteria'

const TABS: { value: CriteriaType; label: string }[] = [
  { value: 'POSITIVE',   label: 'Положительные' },
  { value: 'ANTI_BONUS', label: 'Антибонус' },
]

const SCOPE_OPTIONS = [
  { value: '',       label: 'Все области' },
  { value: 'global', label: 'Глобальные' },
  { value: 'local',  label: 'Локальные' },
]
const STATUS_OPTIONS = [
  { value: '',         label: 'Любой статус' },
  { value: 'active',   label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
]

const FILTERS: FilterDef[] = [
  { key: 'scope',  label: 'Область', type: 'select', options: SCOPE_OPTIONS },
  { key: 'status', label: 'Статус',  type: 'select', options: STATUS_OPTIONS },
]

function flattenOrgTree(units: OrgUnit[]): OrgUnit[] {
  return units.flatMap(u => [u, ...flattenOrgTree(u.children || [])])
}

const scopeLabel = (c: Criteria) => (c.orgUnitId == null ? 'Глобальный' : (c.orgUnitNameRu ?? 'Локальный'))

function ScopePill({ c }: { c: Criteria }) {
  const global = c.orgUnitId == null
  const s = global
    ? { bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7', border: 'rgba(120,150,200,0.32)' }
    : { bg: 'var(--surface-mute)', fg: 'var(--ink-soft)', border: 'var(--line)' }
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        fontSize: 11.5, fontWeight: 500, padding: '3px 10px', borderRadius: 999,
        background: s.bg, color: s.fg, border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.fg, flexShrink: 0 }} />
      {scopeLabel(c)}
    </span>
  )
}

export function CriteriaPage() {
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CriteriaType>('POSITIVE')
  const [editing, setEditing] = useState<Criteria | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const loadCriteria = useCallback(async () => {
    setLoading(true)
    try {
      // ~dozens of criteria — fetch wide, DataPanel filters/sorts client-side.
      const data = await criteriaApi.list(0, 500)
      setCriteria(data.content)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCriteria() }, [loadCriteria])
  useEffect(() => { orgApi.getStructure().then(tree => setOrgUnits(flattenOrgTree(tree))) }, [])

  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }))

  const actions: CriteriaActions = {
    onEdit: (c) => setEditing(c),
    onDeactivate: (c) => setConfirmDialog({
      open: true,
      title: 'Деактивировать критерий?',
      description: `«${c.nameRu}» больше не будет применяться к новым оценкам.`,
      onConfirm: async () => {
        try { await criteriaApi.deactivate(c.id); loadCriteria() }
        finally { closeConfirm() }
      },
    }),
    onReactivate: (c) => {
      criteriaApi.reactivate(c.id).then(loadCriteria)
    },
  }

  const columns: Column<Criteria>[] = [
    {
      key: 'name', header: 'Критерий', sortable: true, hideable: false,
      render: (c) => (
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{c.nameRu}</span>
      ),
    },
    {
      key: 'scope', header: 'Область', sortable: true,
      render: (c) => <ScopePill c={c} />,
    },
    {
      key: 'weight', header: 'Вес', sortable: true, align: 'right',
      render: (c) => (
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }} className="tabular-nums">
          {c.weight}%
        </span>
      ),
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (c) => <StatusPill active={c.active} />,
    },
    {
      key: 'actions', header: 'Действия', align: 'right', srOnlyHeader: true, hideable: false,
      render: (c) => (
        <div onClick={e => e.stopPropagation()}>
          <CriteriaRowMenu criterion={c} actions={actions} />
        </div>
      ),
    },
  ]

  const searchText = (c: Criteria) => `${c.nameRu} ${c.nameKg} ${c.orgUnitNameRu ?? ''}`

  const clientFilter = (c: Criteria, v: Record<string, string>) => {
    if (v.scope === 'global' && c.orgUnitId != null) return false
    if (v.scope === 'local' && c.orgUnitId == null) return false
    if (v.status === 'active' && !c.active) return false
    if (v.status === 'inactive' && c.active) return false
    return true
  }

  const comparator = (key: string) => (a: Criteria, b: Criteria): number => {
    switch (key) {
      case 'scope':  return scopeLabel(a).localeCompare(scopeLabel(b), 'ru')
      case 'weight': return a.weight - b.weight
      case 'status': return Number(b.active) - Number(a.active)
      default:       return a.nameRu.localeCompare(b.nameRu, 'ru')
    }
  }

  const renderCard = (c: Criteria): ReactNode => (
    <div
      className="criteria-card"
      onClick={() => { if (!c.frozen) setEditing(c) }}
      tabIndex={c.frozen ? undefined : 0}
      role={c.frozen ? undefined : 'button'}
      aria-label={c.frozen ? undefined : `Редактировать критерий: ${c.nameRu}`}
      onKeyDown={e => {
        if (!c.frozen && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setEditing(c) }
      }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: c.frozen ? 'default' : 'pointer',
        outline: 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            {c.nameRu}
          </div>
          <div className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {c.nameKg}
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <CriteriaRowMenu criterion={c} actions={actions} />
        </div>
      </div>
      <div className="flex flex-col gap-2.5" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
        <CardMetaRow k="Область"><ScopePill c={c} /></CardMetaRow>
        <CardMetaRow k="Вес"><span className="tabular-nums">{c.weight}%</span></CardMetaRow>
        <CardMetaRow k="Статус"><StatusPill active={c.active} /></CardMetaRow>
      </div>
      <style>{`
        .criteria-card { transition: border-color 120ms ease, box-shadow 120ms ease; }
        .criteria-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-md); }
        .criteria-card:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
      `}</style>
    </div>
  )

  const addButton = (
    <button
      onClick={() => setShowCreate(true)}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'var(--accent)', color: 'var(--surface)',
        border: '1px solid var(--accent-ink)', cursor: 'pointer',
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Добавить
    </button>
  )

  const visibleRows = criteria.filter(c => c.type === activeTab)

  return (
    <Layout>
      <div style={{ padding: '8px 0 32px' }}>
        <div className="mb-5">
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
            Критерии оценки
          </h1>
          <p style={{ marginTop: 5, fontSize: 14, color: 'var(--ink-soft)', maxWidth: 600, lineHeight: 1.5 }}>
            Управление критериями KPI: положительными показателями и антибонусами.
          </p>
        </div>

        <div className="flex gap-1 mb-4" role="tablist">
          {TABS.map(tab => {
            const on = tab.value === activeTab
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={on}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  fontSize: 13.5, fontWeight: 500, height: 36, padding: '0 16px', borderRadius: 8,
                  background: on ? 'var(--accent-mute)' : 'transparent',
                  color: on ? 'var(--accent)' : 'var(--ink-soft)',
                  border: `1px solid ${on ? 'var(--accent-soft)' : 'var(--line)'}`,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <DataPanel<Criteria>
          mode="client"
          columns={columns}
          rows={visibleRows}
          rowKey={(c) => c.id}
          loading={loading}
          caption="Список критериев"
          empty="Совпадений не найдено"
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по названию…"
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'weight', dir: 'desc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          panelStorageKey={PANEL_KEY}
          columnConfig
          onRowClick={(c) => { if (!c.frozen) setEditing(c) }}
          toolbarActions={addButton}
        />
      </div>

      <CriteriaFormModal
        open={showCreate || editing != null}
        editing={editing}
        prefill={null}
        orgUnits={orgUnits}
        onSave={async (data) => {
          if (editing) await criteriaApi.update(editing.id, data)
          else await criteriaApi.create(data)
          loadCriteria()
        }}
        onClose={() => { setShowCreate(false); setEditing(null) }}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </Layout>
  )
}

function CardMetaRow({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ minHeight: 22 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{k}</span>
      <span className="truncate" style={{ fontSize: 13, textAlign: 'right' }}>{children}</span>
    </div>
  )
}
