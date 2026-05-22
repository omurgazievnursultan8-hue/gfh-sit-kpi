import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { RootState } from '../../app/store'
import { orgApi, OrgUnit, OrgUnitRequest } from './orgApi'
import { OrgTreeNode } from './components/OrgTreeNode'
import { OrgUnitFormModal } from './components/OrgUnitFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DV3_FORM_CSS } from '../dashboard/dv3FormStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import api from '../../app/api'

interface UserOption {
  id: number
  fullName: string
}

interface UsersPage {
  content: UserOption[]
}

const TYPE_LABELS: Record<OrgUnit['type'], string> = {
  BLOCK: 'Блок',
  DEPARTMENT: 'Отдел',
  UNIT: 'Подразделение',
}

const TYPE_RAIL: Record<OrgUnit['type'], string> = {
  BLOCK: 'var(--dv3-zone-warn)',
  DEPARTMENT: 'var(--dv3-zone-info)',
  UNIT: 'var(--dv3-zone-up)',
}

const PLACEHOLDER = '··'

function collectIds(nodes: OrgUnit[], acc: number[] = []): number[] {
  for (const n of nodes) {
    acc.push(n.id)
    if (n.children.length > 0) collectIds(n.children, acc)
  }
  return acc
}

function maxDepth(nodes: OrgUnit[]): number {
  let d = 0
  for (const n of nodes) {
    d = Math.max(d, 1 + (n.children.length > 0 ? maxDepth(n.children) : 0))
  }
  return d
}

function countWithHead(nodes: OrgUnit[]): number {
  let c = 0
  for (const n of nodes) {
    if (n.headUserId) c += 1
    if (n.children.length > 0) c += countWithHead(n.children)
  }
  return c
}

function findById(nodes: OrgUnit[], id: number): OrgUnit | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children.length > 0) {
      const found = findById(n.children, id)
      if (found) return found
    }
  }
  return null
}

function findPath(nodes: OrgUnit[], id: number, path: OrgUnit[] = []): OrgUnit[] | null {
  for (const n of nodes) {
    const next = [...path, n]
    if (n.id === id) return next
    if (n.children.length > 0) {
      const sub = findPath(n.children, id, next)
      if (sub) return sub
    }
  }
  return null
}

export function OrgPage() {
  const role = useSelector((s: RootState) => s.auth.role)
  const isAdmin = role === 'ADMIN'

  const [tree, setTree] = useState<OrgUnit[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OrgUnit | null>(null)
  const [defaultParent, setDefaultParent] = useState<OrgUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null)

  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orgApi.getStructure()
      setTree(data)
      setExpanded(new Set(collectIds(data)))
      if (data.length > 0 && selectedId == null) setSelectedId(data[0].id)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
      setLoadedAt(new Date())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadTree()
    api.get<UsersPage>('/users', { params: { size: 200 } })
      .then(r => setUsers(r.data.content))
      .catch(() => {})
  }, [loadTree])

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
  const totalUnits = useMemo(() => collectIds(tree).length, [tree])
  const levels = useMemo(() => maxDepth(tree), [tree])
  const withHead = useMemo(() => countWithHead(tree), [tree])

  const headLookup = useMemo(() => {
    const m = new Map<number, string>()
    for (const u of users) m.set(u.id, u.fullName)
    return m
  }, [users])

  const toggleExpanded = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selected = selectedId != null ? findById(tree, selectedId) : null
  const path = selected ? findPath(tree, selected.id) ?? [] : []

  const handleSave = async (data: OrgUnitRequest) => {
    if (editing) {
      await orgApi.updateUnit(editing.id, data)
    } else {
      await orgApi.createUnit(data)
    }
    await loadTree()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await orgApi.deleteUnit(deleteTarget.id)
      setDeleteTarget(null)
      if (selectedId === deleteTarget.id) setSelectedId(null)
      await loadTree()
    } catch {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>
        <style>{DV3_FORM_CSS}</style>
        <style>{ORG_CSS}</style>

        <div className="dv3-terminal">
          {/* HERO */}
          <div className="dv3-hero">
            <div className="dv3-hero-meta">
              <span className="dv3-hero-meta-l">ORG.TREE</span>
              <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
            </div>
            <div className="dv3-hero-main">
              <div>
                <h1 className="dv3-hero-title">
                  {timeGreeting}. <span className="dv3-accent">Структура</span>
                </h1>
                <p className="dv3-hero-sub">{todayLine}</p>
              </div>
              <div className="dv3-hero-metrics">
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : totalUnits}
                  </span>
                  <span className="dv3-hero-metric-lab">узлов</span>
                </div>
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : levels}
                  </span>
                  <span className="dv3-hero-metric-lab">уровней</span>
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
              className="dv3-col-4"
              title="ORG.UNITS" id="O01" loading={loading}
              value={totalUnits} label="узлов структуры"
            />
            <StatCard
              className="dv3-col-4"
              title="DEPTH" id="D01" loading={loading}
              value={levels} label="уровней вложенности"
            />
            <StatCard
              className="dv3-col-4"
              title="HEADS" id="H01" loading={loading}
              value={withHead} label="с руководителем"
              gauge={{
                pct: totalUnits > 0 ? withHead / totalUnits : 0, variant: 'meta',
                left: '0',
                center: <><strong>{totalUnits > 0 ? Math.round((withHead / totalUnits) * 100) : 0}%</strong> узлов</>,
                right: totalUnits,
              }}
            />
          </div>
        </div>
      </div>

      {/* TREE + SPEC */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }} className="dv3-root org-scope">
        <style>{DASHBOARD_CSS}</style>
        <style>{DV3_FORM_CSS}</style>
        <style>{ORG_CSS}</style>

        {isAdmin && (
          <div className="org-toolbar">
            <button
              className="dv3-btn dv3-btn--primary"
              onClick={() => { setEditing(null); setDefaultParent(null); setModalOpen(true) }}
            >
              <Plus size={14} /> Добавить блок
            </button>
          </div>
        )}

        {/* Split layout */}
        <div className="org-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', gap: 16 }}>
          {/* Tree column */}
          <div className="org-panel org-panel--accent">
            <div style={{ padding: '14px 16px' }}>
              <div className="org-panel-head">
                <span>Дерево</span>
                <span className="org-panel-count">{totalUnits} узлов</span>
              </div>

              {loading ? (
                <div className="org-placeholder">— Загрузка —</div>
              ) : tree.length === 0 ? (
                <div className="org-placeholder">— Структура не настроена —</div>
              ) : (
                tree.map((node, i) => (
                  <OrgTreeNode
                    key={node.id}
                    node={node}
                    isAdmin={isAdmin}
                    outline={String(i + 1)}
                    expanded={expanded}
                    selectedId={selectedId}
                    toggleExpanded={toggleExpanded}
                    onSelect={n => setSelectedId(n.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Spec panel */}
          <div
            className="org-panel org-spec"
            style={{
              alignSelf: 'start',
              position: 'sticky',
              top: 16,
              borderTop: `2px solid ${selected ? TYPE_RAIL[selected.type] : 'var(--dv3-border2)'}`,
            }}
          >
            {!selected ? (
              <div className="org-placeholder" style={{ padding: '64px 0' }}>— Узел не выбран —</div>
            ) : (
              <div style={{ padding: '20px 20px 18px' }}>
                <div className="org-spec-kicker">
                  Спецификация · {TYPE_LABELS[selected.type]}
                </div>

                <h2 className="org-spec-title">{selected.nameRu}</h2>

                {selected.nameKg && selected.nameKg !== selected.nameRu && (
                  <div className="org-spec-sub">{selected.nameKg}</div>
                )}

                {/* Breadcrumb path */}
                {path.length > 1 && (
                  <div className="org-crumbs">
                    {path.slice(0, -1).map((p, i) => (
                      <span key={p.id} className="flex items-center gap-1">
                        <button onClick={() => setSelectedId(p.id)} className="org-crumb-btn">
                          {p.nameRu}
                        </button>
                        <span className="org-crumb-sep">/</span>
                        {i === path.length - 2 && <span className="org-crumb-cur">{selected.nameRu}</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Spec rows */}
                <div style={{ marginTop: 18, borderTop: '1px solid var(--dv3-border)' }}>
                  <SpecRow label="Тип" value={TYPE_LABELS[selected.type]} />
                  <SpecRow
                    label="Руководитель"
                    value={selected.headUserId ? (headLookup.get(selected.headUserId) ?? `ID ${selected.headUserId}`) : null}
                    placeholder="не назначен"
                    tone={selected.headUserId ? 'normal' : 'warn'}
                  />
                  <SpecRow
                    label="Родитель"
                    value={
                      path.length > 1
                        ? path[path.length - 2].nameRu
                        : null
                    }
                    placeholder="корневой узел"
                  />
                  <SpecRow
                    label="Дочерних"
                    value={selected.children.length === 0 ? 'нет' : `${selected.children.length}`}
                  />
                </div>

                {/* Children list */}
                {selected.children.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div className="org-spec-kicker" style={{ marginBottom: 8 }}>Содержит</div>
                    <div className="flex flex-col gap-1">
                      {selected.children.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className="org-child"
                        >
                          <span
                            className="org-child-dot"
                            style={{ background: TYPE_RAIL[c.type] }}
                          />
                          <span className="org-child-name">{c.nameRu}</span>
                          <span className="org-child-type">{TYPE_LABELS[c.type]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isAdmin && (
                  <div className="dv3-btn-row" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--dv3-border)' }}>
                    <button
                      className="dv3-btn dv3-btn--primary"
                      onClick={() => { setEditing(null); setDefaultParent(selected); setModalOpen(true) }}
                    >
                      <Plus size={13} /> Добавить дочернее
                    </button>
                    <button
                      className="dv3-btn"
                      onClick={() => { setEditing(selected); setDefaultParent(null); setModalOpen(true) }}
                    >
                      <Pencil size={12} /> Изменить
                    </button>
                    <button
                      className="dv3-btn dv3-btn--danger"
                      onClick={() => setDeleteTarget(selected)}
                    >
                      <Trash2 size={12} /> Удалить
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <OrgUnitFormModal
        open={modalOpen}
        editing={editing}
        defaultParent={defaultParent}
        users={users}
        allUnits={tree}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditing(null); setDefaultParent(null) }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить подразделение?"
        description={`«${deleteTarget?.nameRu ?? ''}» и все его дочерние подразделения будут удалены.`}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}

/* dv3 chrome for the org tree + spec panel. Also remaps the legacy theme vars
 * consumed by the un-editable OrgTreeNode component onto the --dv3-* palette so
 * the tree rows render in the terminal skin. */
const ORG_CSS = `
.org-scope { color: var(--dv3-text); font-family: 'Geist Mono', ui-monospace, Menlo, monospace; }
.org-toolbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }

.org-panel {
  position: relative;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  overflow: hidden;
}
.org-panel--accent { border-top: 2px solid var(--dv3-accent); }

.org-panel-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 12px;
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dv3-text3); font-weight: 600;
}
.org-panel-count { color: var(--dv3-text4); letter-spacing: 0.04em; }

.org-placeholder {
  padding: 48px 0; text-align: center;
  font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dv3-text4);
}

.org-spec-kicker {
  font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dv3-text3); font-weight: 600; margin-bottom: 8px;
}
.org-spec-title {
  font-size: 20px; font-weight: 600; color: var(--dv3-text);
  line-height: 1.15; margin: 0; letter-spacing: -0.005em;
}
.org-spec-sub { font-size: 12.5px; color: var(--dv3-text3); margin-top: 4px; font-style: italic; }

.org-crumbs {
  margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
  font-size: 10.5px; color: var(--dv3-text3);
}
.org-crumb-btn {
  background: transparent; border: none; padding: 0; color: inherit;
  cursor: pointer; font-family: inherit; font-size: inherit;
}
.org-crumb-btn:hover { color: var(--dv3-accent); text-decoration: underline; }
.org-crumb-sep { color: var(--dv3-text4); }
.org-crumb-cur { color: var(--dv3-text2); }

.org-child {
  display: flex; align-items: center; gap: 8px; text-align: left;
  background: var(--dv3-bg3); border: 1px solid var(--dv3-border);
  padding: 6px 9px; cursor: pointer;
  transition: border-color 120ms ease;
}
.org-child:hover { border-color: var(--dv3-accent); }
.org-child-dot { width: 6px; height: 6px; flex-shrink: 0; }
.org-child-name { flex: 1; font-size: 12.5px; color: var(--dv3-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.org-child-type { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dv3-text4); }

/* Remap legacy vars used by OrgTreeNode (un-editable) onto the dv3 palette. */
.org-panel {
  --ink: var(--dv3-text);
  --ink-soft: var(--dv3-text2);
  --ink-dim: var(--dv3-text3);
  --ink-faint: var(--dv3-text4);
  --line-soft: var(--dv3-border);
  --line: var(--dv3-border);
  --line-strong: var(--dv3-border2);
  --accent: var(--dv3-accent);
  --accent-mute: var(--dv3-accent-bg);
  --surface: var(--dv3-bg2);
  --surface-mute: var(--dv3-bg3);
  --gold: var(--dv3-zone-warn);
  --gold-soft: color-mix(in srgb, var(--dv3-zone-warn) 14%, transparent);
}
.org-panel .org-row { border-radius: 0 !important; }
.org-panel .org-row:hover { background: var(--dv3-bg3); }
.org-panel .org-row .font-display { font-family: 'Geist Mono', ui-monospace, Menlo, monospace !important; }

@media (max-width: 920px) {
  .org-split { grid-template-columns: 1fr !important; }
  .org-spec { position: static !important; }
}
`

function SpecRow({
  label, value, placeholder, tone,
}: {
  label: string
  value: string | null
  placeholder?: string
  tone?: 'normal' | 'warn'
}) {
  const empty = !value
  const color = empty
    ? (tone === 'warn' ? 'var(--dv3-zone-warn)' : 'var(--dv3-text3)')
    : 'var(--dv3-text)'
  return (
    <div
      className="flex items-baseline justify-between gap-3"
      style={{ padding: '10px 0', borderBottom: '1px solid var(--dv3-border)' }}
    >
      <span
        style={{
          fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--dv3-text3)', fontWeight: 600, flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        className="text-right"
        style={{
          fontSize: 13,
          color,
          fontStyle: empty ? 'italic' : 'normal',
        }}
      >
        {value ?? placeholder ?? '—'}
      </span>
    </div>
  )
}
