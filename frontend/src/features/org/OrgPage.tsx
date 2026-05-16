import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { RootState } from '../../app/store'
import { orgApi, OrgUnit, OrgUnitRequest } from './orgApi'
import { OrgTreeNode } from './components/OrgTreeNode'
import { OrgUnitFormModal } from './components/OrgUnitFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Layout } from '../../components/Layout'
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
  BLOCK: 'var(--gold)',
  DEPARTMENT: '#4a73c7',
  UNIT: '#2f9e6d',
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
    <Layout>
      <div style={{ padding: '8px 0 32px' }}>
        {/* Page strip — kept from redesign DNA. */}
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div
              className="font-mono uppercase tracking-widest mb-1"
              style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}
            >
              Админ · Оргструктура
            </div>
            <h1
              className="font-display"
              style={{
                fontSize: 30, fontWeight: 600, color: 'var(--ink)',
                lineHeight: 1.1, margin: 0, letterSpacing: '-0.01em',
              }}
            >
              Структура<span style={{ color: 'var(--gold)' }}>.</span>
            </h1>
            <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink-soft)', maxWidth: 560, lineHeight: 1.5 }}>
              Дерево слева, спецификация справа. Выберите узел для просмотра и редактирования.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => { setEditing(null); setDefaultParent(null); setModalOpen(true) }}
              className="font-mono uppercase tracking-widest transition-all hover:-translate-y-px"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '10px 18px',
                borderRadius: 6,
                background: 'var(--accent)',
                color: 'var(--surface)',
                border: '1px solid var(--accent-ink)',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                letterSpacing: '0.08em',
              }}
            >
              + Добавить блок
            </button>
          )}
        </div>

        {/* Split layout */}
        <div className="org-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 380px)', gap: 16 }}>
          {/* Tree column */}
          <div
            className="relative overflow-hidden rounded-lg"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-soft)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: 'var(--accent)' }} />

            <div style={{ padding: '14px 16px' }}>
              <div className="flex items-baseline justify-between mb-3">
                <span
                  className="font-mono uppercase tracking-widest"
                  style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}
                >
                  Дерево
                </span>
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                  {collectIds(tree).length} узлов
                </span>
              </div>

              {loading ? (
                <div
                  className="py-12 text-center font-mono uppercase tracking-widest"
                  style={{ fontSize: 11, color: 'var(--ink-faint)' }}
                >
                  — Загрузка —
                </div>
              ) : tree.length === 0 ? (
                <div
                  className="py-12 text-center font-mono uppercase tracking-widest"
                  style={{ fontSize: 11, color: 'var(--ink-faint)' }}
                >
                  — Структура не настроена —
                </div>
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
            className="relative overflow-hidden rounded-lg org-spec"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-soft)',
              boxShadow: 'var(--shadow-sm)',
              alignSelf: 'start',
              position: 'sticky',
              top: 16,
            }}
          >
            <div
              className="absolute top-0 left-0 right-0"
              style={{ height: 3, background: selected ? TYPE_RAIL[selected.type] : 'var(--line-strong)' }}
            />

            {!selected ? (
              <div
                className="py-16 text-center font-mono uppercase tracking-widest"
                style={{ fontSize: 11, color: 'var(--ink-faint)' }}
              >
                — Узел не выбран —
              </div>
            ) : (
              <div style={{ padding: '20px 20px 18px' }}>
                <div
                  className="font-mono uppercase tracking-widest mb-2"
                  style={{ fontSize: 9.5, color: 'var(--ink-faint)', fontWeight: 600 }}
                >
                  Спецификация · {TYPE_LABELS[selected.type]}
                </div>

                <h2
                  className="font-display"
                  style={{
                    fontSize: 22, fontWeight: 600, color: 'var(--ink)',
                    lineHeight: 1.15, margin: 0, letterSpacing: '-0.005em',
                  }}
                >
                  {selected.nameRu}
                </h2>

                {selected.nameKg && selected.nameKg !== selected.nameRu && (
                  <div
                    className="font-display italic mt-1"
                    style={{ fontSize: 13.5, color: 'var(--ink-faint)' }}
                  >
                    {selected.nameKg}
                  </div>
                )}

                {/* Breadcrumb path */}
                {path.length > 1 && (
                  <div
                    className="font-mono mt-3 flex flex-wrap items-center gap-1"
                    style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
                  >
                    {path.slice(0, -1).map((p, i) => (
                      <span key={p.id} className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedId(p.id)}
                          className="hover:underline"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            color: 'inherit',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                          }}
                        >
                          {p.nameRu}
                        </button>
                        <span style={{ color: 'var(--ink-dim)' }}>/</span>
                        {i === path.length - 2 && <span style={{ color: 'var(--ink-soft)' }}>{selected.nameRu}</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Spec rows */}
                <div style={{ marginTop: 18, borderTop: '1px solid var(--line-soft)' }}>
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
                    <div
                      className="font-mono uppercase tracking-widest mb-2"
                      style={{ fontSize: 9.5, color: 'var(--ink-faint)', fontWeight: 600 }}
                    >
                      Содержит
                    </div>
                    <div className="flex flex-col gap-1">
                      {selected.children.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedId(c.id)}
                          className="flex items-center gap-2 hover:opacity-70 transition-opacity text-left"
                          style={{
                            background: 'var(--surface-mute)',
                            border: '1px solid var(--line-soft)',
                            borderRadius: 4,
                            padding: '6px 9px',
                            cursor: 'pointer',
                          }}
                        >
                          <span
                            style={{
                              width: 6, height: 6, borderRadius: 999,
                              background: TYPE_RAIL[c.type], flexShrink: 0,
                            }}
                          />
                          <span
                            className="font-display flex-1 truncate"
                            style={{ fontSize: 12.5, color: 'var(--ink)' }}
                          >
                            {c.nameRu}
                          </span>
                          <span
                            className="font-mono uppercase tracking-widest"
                            style={{ fontSize: 9, color: 'var(--ink-dim)' }}
                          >
                            {TYPE_LABELS[c.type]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isAdmin && (
                  <div
                    className="flex flex-wrap gap-2"
                    style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}
                  >
                    <SpecAction
                      icon={<Plus size={13} />}
                      label="Добавить дочернее"
                      onClick={() => { setEditing(null); setDefaultParent(selected); setModalOpen(true) }}
                      tone="primary"
                    />
                    <SpecAction
                      icon={<Pencil size={12} />}
                      label="Изменить"
                      onClick={() => { setEditing(selected); setDefaultParent(null); setModalOpen(true) }}
                    />
                    <SpecAction
                      icon={<Trash2 size={12} />}
                      label="Удалить"
                      onClick={() => setDeleteTarget(selected)}
                      tone="danger"
                    />
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

      <style>{`
        .org-row:hover { background: var(--surface-mute); }
        @media (max-width: 920px) {
          .org-split { grid-template-columns: 1fr !important; }
          .org-spec { position: static !important; }
        }
      `}</style>
    </Layout>
  )
}

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
    ? (tone === 'warn' ? 'var(--warn)' : 'var(--ink-dim)')
    : 'var(--ink)'
  return (
    <div
      className="flex items-baseline justify-between gap-3"
      style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}
    >
      <span
        className="font-mono uppercase tracking-widest"
        style={{ fontSize: 9.5, color: 'var(--ink-faint)', fontWeight: 600, flexShrink: 0 }}
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

function SpecAction({
  icon, label, onClick, tone,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  tone?: 'primary' | 'danger'
}) {
  const style: React.CSSProperties = tone === 'primary'
    ? {
        background: 'var(--accent)',
        color: 'var(--surface)',
        border: '1px solid var(--accent-ink)',
      }
    : tone === 'danger'
      ? {
          background: 'transparent',
          color: 'var(--danger)',
          border: '1px solid color-mix(in srgb,var(--danger) 30%,transparent)',
        }
      : {
          background: 'var(--surface-mute)',
          color: 'var(--ink-soft)',
          border: '1px solid var(--line)',
        }
  return (
    <button
      onClick={onClick}
      className="font-mono uppercase tracking-widest flex items-center gap-1.5 transition-all hover:-translate-y-px"
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '6px 11px',
        borderRadius: 4,
        cursor: 'pointer',
        letterSpacing: '0.06em',
        ...style,
      }}
    >
      {icon}
      {label}
    </button>
  )
}
