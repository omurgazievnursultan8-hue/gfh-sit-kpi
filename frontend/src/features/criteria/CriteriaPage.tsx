import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { StatusPill } from '../users/components/usersMeta'
import { CriteriaFormModal } from './components/CriteriaFormModal'
import { CriteriaRowMenu, type CriteriaActions } from './components/CriteriaRowMenu'
import { Criteria, CriteriaType, criteriaApi } from './criteriaApi'
import { OrgUnit, orgApi } from '../org/orgApi'

const PANEL_KEY = 'gfh_criteria'
const PLACEHOLDER = '··'

function flattenOrgTree(units: OrgUnit[]): OrgUnit[] {
  return units.flatMap(u => [u, ...flattenOrgTree(u.children || [])])
}

const scopeLabel = (c: Criteria, t: TFunction) =>
  (c.orgUnitId == null ? t('v2.criteria.scopeGlobal') : (c.orgUnitNameRu ?? t('v2.criteria.scopeLocal')))

function ScopePill({ c }: { c: Criteria }) {
  const { t } = useTranslation()
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
      {scopeLabel(c, t)}
    </span>
  )
}

export function CriteriaPage() {
  const { t } = useTranslation()
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())
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
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
      setLoadedAt(new Date())
    }
  }, [])

  useEffect(() => { loadCriteria() }, [loadCriteria])
  useEffect(() => { orgApi.getStructure().then(tree => setOrgUnits(flattenOrgTree(tree))) }, [])

  // Live tick — refresh clock + relative time each minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── time / clock ──────────────────────────────────────────────────────── */
  const hours = now.getHours()
  const timeGreeting = hours < 12 ? 'Доброе утро' : hours < 18 ? 'Добрый день' : 'Добрый вечер'
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const todayLine = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1 ? 'обновлено только что' : `обновлено ${mins} мин назад`
  }

  /* ── derived stats ─────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = criteria.length
    const active = criteria.filter(c => c.active).length
    const global = criteria.filter(c => c.orgUnitId == null).length
    const positive = criteria.filter(c => c.type === 'POSITIVE').length
    const antiBonus = criteria.filter(c => c.type === 'ANTI_BONUS').length
    const totalWeight = criteria
      .filter(c => c.active && c.type === 'POSITIVE')
      .reduce((s, c) => s + (Number(c.weight) || 0), 0)
    return { total, active, global, positive, antiBonus, totalWeight }
  }, [criteria])

  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }))

  const TABS: { value: CriteriaType; label: string }[] = useMemo(() => [
    { value: 'POSITIVE',   label: t('v2.criteria.tabPositive') },
    { value: 'ANTI_BONUS', label: t('v2.criteria.tabAntiBonus') },
  ], [t])

  const FILTERS: FilterDef[] = useMemo(() => [
    { key: 'scope', label: t('v2.criteria.filterScope'), type: 'select', options: [
      { value: '',       label: t('v2.criteria.allScopes') },
      { value: 'global', label: t('v2.criteria.scopeGlobalFilter') },
      { value: 'local',  label: t('v2.criteria.scopeLocalFilter') },
    ] },
    { key: 'status', label: t('v2.criteria.filterStatus'), type: 'select', options: [
      { value: '',         label: t('v2.criteria.anyStatus') },
      { value: 'active',   label: t('v2.criteria.statusActive') },
      { value: 'inactive', label: t('v2.criteria.statusInactive') },
    ] },
  ], [t])

  const actions: CriteriaActions = {
    onEdit: (c) => setEditing(c),
    onDeactivate: (c) => setConfirmDialog({
      open: true,
      title: t('v2.criteria.deactivateTitle'),
      description: t('v2.criteria.deactivateMsg', { name: c.nameRu }),
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
      key: 'name', header: t('v2.criteria.colName'), sortable: true, hideable: false,
      render: (c) => (
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{c.nameRu}</span>
      ),
    },
    {
      key: 'scope', header: t('v2.criteria.colScope'), sortable: true,
      render: (c) => <ScopePill c={c} />,
    },
    {
      key: 'weight', header: t('v2.criteria.colWeight'), sortable: true, align: 'right',
      render: (c) => (
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }} className="tabular-nums">
          {c.weight}%
        </span>
      ),
    },
    {
      key: 'status', header: t('v2.criteria.colStatus'), sortable: true,
      render: (c) => <StatusPill active={c.active} />,
    },
    {
      key: 'actions', header: t('v2.menuActions'), align: 'right', srOnlyHeader: true, hideable: false,
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
      case 'scope':  return scopeLabel(a, t).localeCompare(scopeLabel(b, t), 'ru')
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
      aria-label={c.frozen ? undefined : t('v2.criteria.editAria', { name: c.nameRu })}
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
        <CardMetaRow k={t('v2.criteria.colScope')}><ScopePill c={c} /></CardMetaRow>
        <CardMetaRow k={t('v2.criteria.colWeight')}><span className="tabular-nums">{c.weight}%</span></CardMetaRow>
        <CardMetaRow k={t('v2.criteria.colStatus')}><StatusPill active={c.active} /></CardMetaRow>
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
      {t('v2.criteria.add')}
    </button>
  )

  const visibleRows = criteria.filter(c => c.type === activeTab)

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* HERO */}
          <div className="dv3-hero">
            <div className="dv3-hero-meta">
              <span className="dv3-hero-meta-l">CRITERIA.LIB</span>
              <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
            </div>
            <div className="dv3-hero-main">
              <div>
                <h1 className="dv3-hero-title">
                  {timeGreeting}. <span className="dv3-accent">{t('v2.criteria.title')}</span>
                </h1>
                <p className="dv3-hero-sub">{todayLine}</p>
              </div>
              <div className="dv3-hero-metrics">
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : stats.total}
                  </span>
                  <span className="dv3-hero-metric-lab">критериев</span>
                </div>
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : stats.active}
                  </span>
                  <span className="dv3-hero-metric-lab">активных</span>
                </div>
              </div>
            </div>
            <div className="dv3-hero-foot">
              <span className={failed ? 'dv3-hero-foot-warn' : 'dv3-hero-foot-ok'}>
                STATUS · {failed ? 'ошибка загрузки' : 'ок'}
              </span>
              <span>{updatedLabel}</span>
            </div>
          </div>

          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="CRIT.TOTAL" id="C01" loading={loading}
              value={stats.total} label="критериев"
              gauge={{
                pct: stats.total > 0 ? stats.active / stats.total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{stats.active}</strong> активных</>,
                right: stats.total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="ACTIVE" id="A01" loading={loading}
              value={stats.active} label="активных"
              gauge={{
                pct: stats.total > 0 ? stats.active / stats.total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%</strong> всех</>,
                right: stats.total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="SCOPE.GLOBAL" id="G01" loading={loading}
              value={stats.global} label="глобальных"
              gauge={{
                pct: stats.total > 0 ? stats.global / stats.total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{stats.total - stats.global}</strong> локальных</>,
                right: stats.total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="WEIGHT.SUM" id="W01" loading={loading}
              value={Math.round(stats.totalWeight)} unit="%"
              zoneScore={Math.round(stats.totalWeight)}
              gauge={{
                pct: Math.min(1, stats.totalWeight / 100), variant: 'marker',
                left: '0', right: '100',
                current: `${Math.round(stats.totalWeight)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }}>
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
          caption={t('v2.criteria.caption')}
          empty={t('v2.noMatches')}
          searchable
          searchText={searchText}
          searchPlaceholder={t('v2.criteria.searchPlaceholder')}
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
    </>
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
