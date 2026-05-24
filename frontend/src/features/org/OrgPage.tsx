import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import { RootState } from '../../app/store'
import { orgApi, OrgUnit, OrgUnitRequest } from './orgApi'
import { OrgCanvas } from './components/OrgCanvas'
import { OrgUnitFormModal } from './components/OrgUnitFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DV3_FORM_CSS } from '../dashboard/dv3FormStyles'
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

function collectIds(nodes: OrgUnit[], acc: number[] = []): number[] {
  for (const n of nodes) {
    acc.push(n.id)
    if (n.children.length > 0) collectIds(n.children, acc)
  }
  return acc
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
  const [, setFailed] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OrgUnit | null>(null)
  const [defaultParent, setDefaultParent] = useState<OrgUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null)

  const [selectedId, setSelectedId] = useState<number | null>(null)

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const data = await orgApi.getStructure()
      setTree(data)
      if (data.length > 0 && selectedId == null) setSelectedId(data[0].id)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadTree()
    api.get<UsersPage>('/users', { params: { size: 200 } })
      .then(r => setUsers(r.data.content))
      .catch(() => {})
  }, [loadTree])

  const totalUnits = useMemo(() => collectIds(tree).length, [tree])

  const headLookup = useMemo(() => {
    const m = new Map<number, string>()
    for (const u of users) m.set(u.id, u.fullName)
    return m
  }, [users])

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

  const drawerOpen = selected != null
  const drawerRail = selected ? TYPE_RAIL[selected.type] : 'var(--dv3-border2)'

  return (
    <>
      <div className="dv3-root org-scope">
        <style>{DASHBOARD_CSS}</style>
        <style>{DV3_FORM_CSS}</style>
        <style>{ORG_CSS}</style>

        <div className="dv3-terminal">
        <div className="org-canvas-header">
          <span className="org-panel-head-label">Граф · {totalUnits} узлов</span>
          {isAdmin && (
            <button
              className="dv3-btn dv3-btn--primary"
              onClick={() => { setEditing(null); setDefaultParent(null); setModalOpen(true) }}
            >
              <Plus size={14} /> Добавить блок
            </button>
          )}
        </div>

        {/* Canvas + overlaid drawer */}
        <div className="org-stage">
          {loading ? (
            <div className="org-canvas-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="org-placeholder">— Загрузка —</div>
            </div>
          ) : tree.length === 0 ? (
            <div className="org-canvas-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="org-placeholder">— Структура не настроена —</div>
            </div>
          ) : (
            <OrgCanvas
              tree={tree}
              selectedId={selectedId}
              onSelect={setSelectedId}
              headLookup={headLookup}
            />
          )}

          {/* Glass drawer */}
          <aside
            className={`org-drawer ${drawerOpen ? 'org-drawer--open' : ''}`}
            style={{ borderTop: `2px solid ${drawerRail}` }}
            aria-hidden={!drawerOpen}
          >
            {selected && (
              <div className="org-drawer-inner">
                <button
                  className="org-drawer-close"
                  onClick={() => setSelectedId(null)}
                  aria-label="Закрыть"
                >
                  <X size={14} />
                </button>

                <div className="org-spec-kicker">
                  Спецификация · {TYPE_LABELS[selected.type]}
                </div>

                <h2 className="org-spec-title">{selected.nameRu}</h2>

                {selected.nameKg && selected.nameKg !== selected.nameRu && (
                  <div className="org-spec-sub">{selected.nameKg}</div>
                )}

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
                    value={path.length > 1 ? path[path.length - 2].nameRu : null}
                    placeholder="корневой узел"
                  />
                  <SpecRow
                    label="Дочерних"
                    value={selected.children.length === 0 ? 'нет' : `${selected.children.length}`}
                  />
                </div>

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
                          <span className="org-child-dot" style={{ background: TYPE_RAIL[c.type] }} />
                          <span className="org-child-name">{c.nameRu}</span>
                          <span className="org-child-type">{TYPE_LABELS[c.type]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
          </aside>
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
.org-scope { color: var(--dv3-text); }
.org-canvas-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.org-panel-head-label {
  font-size: 11px; letter-spacing: 0.04em;
  color: var(--dv3-text3); font-weight: 500;
}

.org-stage { position: relative; }

/* Flat slide-in drawer (users-page aesthetic) */
.org-drawer {
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 380px;
  max-width: 90vw;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 12px;
  transform: translateX(calc(100% + 12px));
  opacity: 0;
  transition: transform 220ms ease, opacity 180ms ease;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 12px 32px -12px rgba(0,0,0,0.18);
  overflow-y: auto;
  scrollbar-width: thin;
}
.org-drawer::-webkit-scrollbar { width: 6px; }
.org-drawer::-webkit-scrollbar-thumb { background: var(--dv3-border2); border-radius: 3px; }

.org-drawer--open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.org-drawer-inner { padding: 22px 22px 20px; position: relative; }

.org-drawer-close {
  position: absolute;
  top: 14px; right: 14px;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: var(--dv3-bg3);
  border: 1px solid var(--dv3-border);
  border-radius: 8px;
  color: var(--dv3-text3);
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.org-drawer-close:hover { color: var(--dv3-accent); border-color: var(--dv3-border2); }

.org-placeholder {
  padding: 48px 0; text-align: center;
  font-size: 13px;
  color: var(--dv3-text4);
}

.org-spec-kicker {
  font-size: 11px;
  color: var(--dv3-text3); font-weight: 500; margin-bottom: 8px;
}
.org-spec-title {
  font-size: 18px; font-weight: 600; color: var(--dv3-text);
  line-height: 1.25; margin: 0;
}
.org-spec-sub { font-size: 12.5px; color: var(--dv3-text3); margin-top: 4px; }

.org-crumbs {
  margin-top: 10px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
  font-size: 12px; color: var(--dv3-text3);
}
.org-crumb-btn {
  background: transparent; border: none; padding: 0; color: inherit;
  cursor: pointer; font-family: inherit; font-size: inherit;
}
.org-crumb-btn:hover { color: var(--dv3-accent); }
.org-crumb-sep { color: var(--dv3-text4); }
.org-crumb-cur { color: var(--dv3-text2); }

.org-child {
  display: flex; align-items: center; gap: 8px; text-align: left;
  background: var(--dv3-bg2); border: 1px solid var(--dv3-border);
  border-radius: 8px;
  padding: 8px 10px; cursor: pointer;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.org-child:hover { border-color: var(--dv3-border2); box-shadow: 0 4px 12px -6px rgba(0,0,0,0.15); }
.org-child-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.org-child-name { flex: 1; font-size: 13px; color: var(--dv3-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.org-child-type { font-size: 11px; color: var(--dv3-text4); }

@media (max-width: 920px) {
  .org-drawer { width: 100%; border-radius: 12px 12px 0 0; }
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
