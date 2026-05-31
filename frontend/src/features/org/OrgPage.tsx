import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2, Plus, X, Table2, Network, Archive, ArchiveRestore, ChevronUp, ChevronDown, Download, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RootState } from '../../app/store'
import { orgApi, OrgUnit, OrgUnitRequest } from './orgApi'
import { OrgCanvas } from './components/OrgCanvas'
import { OrgUnitFormModal } from './components/OrgUnitFormModal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DV3_FORM_CSS } from '../dashboard/dv3FormStyles'
import { DataPanel, type Column, type FilterDef } from '../../components/datapanel/DataPanel'
import api from '../../app/api'

const TYPE_RAIL: Record<OrgUnit['type'], string> = {
  BLOCK: 'var(--dv3-zone-warn)',
  DEPARTMENT: 'var(--dv3-zone-info)',
  SLUZHBA: 'var(--dv3-zone-info)',
  OTDEL: 'var(--dv3-zone-up)',
  SEKTOR: 'var(--dv3-zone-up)',
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

interface UserOption {
  id: number
  fullName: string
}

interface UsersPage {
  content: UserOption[]
}

const PANEL_KEY = 'gfh_org_units'

const CSV_HEADERS = [
  'ID', 'Тип', 'Код', 'Название (рус)', 'Название (кыр)',
  'Сокр. (рус)', 'Сокр. (кыр)', 'Родитель ID', 'Руководитель ID',
  'Уровень', 'Порядок', 'Сотрудников (прямо)', 'Сотрудников (всего)',
  'Архивирован', 'Путь',
]

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

interface CsvRow {
  unit: OrgUnit
  depth: number
  path: string
}

function flattenForCsv(nodes: OrgUnit[], depth: number, parentPath: string, acc: CsvRow[]): void {
  for (const n of nodes) {
    const path = parentPath ? `${parentPath} / ${n.nameRu}` : n.nameRu
    acc.push({ unit: n, depth, path })
    if (n.children.length > 0) flattenForCsv(n.children, depth + 1, path, acc)
  }
}

function buildCsv(tree: OrgUnit[], headLookup: Map<number, string>): string {
  const rows: CsvRow[] = []
  flattenForCsv(tree, 0, '', rows)
  const lines: string[] = [CSV_HEADERS.map(csvEscape).join(',')]
  for (const r of rows) {
    const u = r.unit
    const head = u.headUserId ? (headLookup.get(u.headUserId) ?? `ID ${u.headUserId}`) : ''
    lines.push([
      u.id, u.type, u.code ?? '', u.nameRu, u.nameKg ?? '',
      u.nameRuShort ?? '', u.nameKgShort ?? '',
      u.parentId ?? '', head,
      r.depth, u.displayOrder ?? 0,
      u.headcountDirect, u.headcountTotal,
      u.archivedAt ? 'да' : '', r.path,
    ].map(csvEscape).join(','))
  }
  return lines.join('\r\n')
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const TYPE_LABEL: Record<OrgUnit['type'], string> = {
  BLOCK: 'Блок',
  DEPARTMENT: 'Департамент',
  SLUZHBA: 'Служба',
  OTDEL: 'Отдел',
  SEKTOR: 'Сектор',
}

const TYPE_RANK: Record<OrgUnit['type'], number> = { BLOCK: 0, DEPARTMENT: 1, SLUZHBA: 1, OTDEL: 2, SEKTOR: 2 }

interface TypeVisual { fg: string; bg: string; border: string }
const TYPE_VISUAL: Record<OrgUnit['type'], TypeVisual> = {
  BLOCK:      { fg: '#9c7416', bg: 'rgba(200,150,40,0.14)',  border: 'rgba(200,150,40,0.32)' },
  DEPARTMENT: { fg: '#2c6ea4', bg: 'rgba(80,140,200,0.14)',  border: 'rgba(80,140,200,0.32)' },
  SLUZHBA:    { fg: '#5e4ec2', bg: 'rgba(120,100,220,0.14)', border: 'rgba(120,100,220,0.32)' },
  OTDEL:      { fg: '#2f9e6d', bg: 'rgba(120,200,150,0.14)', border: 'rgba(120,200,150,0.32)' },
  SEKTOR:     { fg: '#a04ea0', bg: 'rgba(180,100,180,0.14)', border: 'rgba(180,100,180,0.32)' },
}

interface FlatUnit {
  id: number
  nameRu: string
  nameKg: string
  type: OrgUnit['type']
  headUserId: number | null
  parentId: number | null
  childCount: number
  archivedAt: string | null
  displayOrder: number
  code: string | null
  headcountDirect: number
  headcountTotal: number
}

function flatten(nodes: OrgUnit[], acc: FlatUnit[] = []): FlatUnit[] {
  for (const n of nodes) {
    acc.push({
      id: n.id,
      nameRu: n.nameRu,
      nameKg: n.nameKg,
      type: n.type,
      headUserId: n.headUserId,
      parentId: n.parentId,
      childCount: n.children.length,
      archivedAt: n.archivedAt,
      displayOrder: n.displayOrder,
      code: n.code,
      headcountDirect: n.headcountDirect,
      headcountTotal: n.headcountTotal,
    })
    if (n.children.length > 0) flatten(n.children, acc)
  }
  return acc
}

function findById(nodes: OrgUnit[], id: number): OrgUnit | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children.length > 0) {
      const f = findById(n.children, id)
      if (f) return f
    }
  }
  return null
}

function TypePill({ type }: { type: OrgUnit['type'] }) {
  const v = TYPE_VISUAL[type]
  return (
    <span
      className="font-mono font-semibold uppercase tracking-widest"
      style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: v.bg, color: v.fg, border: `1px solid ${v.border}` }}
    >
      {TYPE_LABEL[type]}
    </span>
  )
}

export function OrgPage() {
  const role = useSelector((s: RootState) => s.auth.role)
  const isAdmin = role === 'ADMIN'
  const { i18n } = useTranslation()
  const lang = i18n.language?.startsWith('kg') ? 'kg' : 'ru'
  const displayName = (u: { nameRu: string; nameKg: string }) =>
    (lang === 'kg' ? u.nameKg : u.nameRu) || u.nameRu || u.nameKg

  const [tree, setTree] = useState<OrgUnit[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OrgUnit | null>(null)
  const [defaultParent, setDefaultParent] = useState<OrgUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FlatUnit | null>(null)

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<'table' | 'canvas'>(() => {
    const urlView = searchParams.get('view')
    if (urlView === 'canvas' || urlView === 'table') return urlView
    const saved = localStorage.getItem('gfh_org_view_mode')
    return saved === 'canvas' ? 'canvas' : 'table'
  })
  const selectedId = useMemo(() => {
    const raw = searchParams.get('unit')
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }, [searchParams])

  const setSelectedId = useCallback((id: number | null) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (id == null) next.delete('unit')
      else next.set('unit', String(id))
      return next
    }, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    localStorage.setItem('gfh_org_view_mode', viewMode)
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (viewMode === 'table') next.delete('view')
      else next.set('view', viewMode)
      return next
    }, { replace: true })
  }, [viewMode, setSearchParams])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await orgApi.getStructure()
      setTree(data)
    } catch {
      setLoadError('Не удалось загрузить структуру')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api.get<UsersPage>('/users', { params: { size: 200 } })
      .then(r => setUsers(r.data.content))
      .catch(() => {})
  }, [load])

  const headLookup = useMemo(() => {
    const m = new Map<number, string>()
    for (const u of users) m.set(u.id, u.fullName)
    return m
  }, [users])

  const flat = useMemo(() => flatten(tree), [tree])

  const parentLookup = useMemo(() => {
    const m = new Map<number, string>()
    for (const u of flat) m.set(u.id, displayName(u))
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat, lang])

  const handleSave = async (data: OrgUnitRequest) => {
    if (editing) {
      await orgApi.updateUnit(editing.id, data)
    } else {
      await orgApi.createUnit(data)
    }
    await load()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await orgApi.deleteUnit(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch {
      setDeleteTarget(null)
    }
  }

  const handleArchiveToggle = async (u: OrgUnit) => {
    if (u.archivedAt) await orgApi.restoreUnit(u.id)
    else await orgApi.archiveUnit(u.id)
    await load()
  }

  const handleMove = async (id: number, direction: 'up' | 'down') => {
    await orgApi.moveUnit(id, direction)
    await load()
  }

  const handleReparent = async (id: number, parentId: number | null) => {
    try {
      await orgApi.reparentUnit(id, parentId)
      setLoadError(null)
    } catch (e: any) {
      setLoadError(e?.response?.data?.messageRu ?? 'Не удалось переместить')
    } finally {
      await load()
    }
  }

  const openEdit = (u: FlatUnit) => {
    const node = findById(tree, u.id)
    if (!node) return
    setEditing(node); setDefaultParent(null); setModalOpen(true)
  }

  const openAddChild = (u: FlatUnit) => {
    const node = findById(tree, u.id)
    if (!node) return
    setEditing(null); setDefaultParent(node); setModalOpen(true)
  }

  const FILTERS: FilterDef[] = useMemo(() => {
    const typeOptions = [
      { value: '',           label: 'Все типы' },
      { value: 'BLOCK',      label: TYPE_LABEL.BLOCK },
      { value: 'DEPARTMENT', label: TYPE_LABEL.DEPARTMENT },
      { value: 'SLUZHBA',    label: TYPE_LABEL.SLUZHBA },
      { value: 'OTDEL',      label: TYPE_LABEL.OTDEL },
      { value: 'SEKTOR',     label: TYPE_LABEL.SEKTOR },
    ]
    const headOptions = [
      { value: '',        label: 'Любой статус' },
      { value: 'ASSIGNED', label: 'С руководителем' },
      { value: 'VACANT',   label: 'Вакантные' },
    ]
    const stateOptions = [
      { value: '',         label: 'Активные' },
      { value: 'ARCHIVED', label: 'Архив' },
      { value: 'ALL',      label: 'Все' },
    ]
    return [
      { key: 'type',  label: 'Тип',          type: 'select', options: typeOptions },
      { key: 'head',  label: 'Руководитель', type: 'select', options: headOptions },
      { key: 'state', label: 'Состояние',    type: 'select', options: stateOptions },
    ]
  }, [])

  const columns: Column<FlatUnit>[] = [
    {
      key: 'name', header: 'Подразделение', sortable: true, hideable: false,
      render: (u) => (
        <Link
          to={`/admin/org/${u.id}`}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink)')}
        >
          {displayName(u)}
        </Link>
      ),
    },
    {
      key: 'type', header: 'Тип', sortable: true,
      render: (u) => <TypePill type={u.type} />,
    },
    {
      key: 'code', header: 'Код', sortable: true,
      render: (u) => (
        <span className="font-mono" style={{ fontSize: 12, color: u.code ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
          {u.code ?? '—'}
        </span>
      ),
    },
    {
      key: 'order', header: '№', sortable: true,
      render: (u) => (
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{u.displayOrder ?? 0}</span>
      ),
    },
    {
      key: 'parent', header: 'Родитель',
      render: (u) => (
        <span style={{ fontSize: 13, color: u.parentId ? 'var(--ink-soft)' : 'var(--ink-faint)', fontStyle: u.parentId ? 'normal' : 'italic' }}>
          {u.parentId ? (parentLookup.get(u.parentId) ?? `ID ${u.parentId}`) : 'корневой'}
        </span>
      ),
    },
    {
      key: 'head', header: 'Руководитель', sortable: true,
      render: (u) => {
        const name = u.headUserId ? headLookup.get(u.headUserId) ?? `ID ${u.headUserId}` : null
        if (!name) {
          return <span style={{ fontSize: 12.5, color: 'var(--warn)', fontStyle: 'italic' }}>не назначен</span>
        }
        return <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{name}</span>
      },
    },
    {
      key: 'children', header: 'Дочерних', align: 'right', sortable: true,
      render: (u) => (
        <span className="font-mono" style={{ fontSize: 12, color: u.childCount > 0 ? 'var(--ink-soft)' : 'var(--ink-faint)' }}>
          {u.childCount}
        </span>
      ),
    },
    {
      key: 'headcount', header: 'Чел.', align: 'right', sortable: true,
      render: (u) => (
        <span
          className="font-mono"
          style={{ fontSize: 12, color: u.headcountTotal > 0 ? 'var(--ink-soft)' : 'var(--ink-faint)' }}
          title={`Прямо: ${u.headcountDirect}, всего: ${u.headcountTotal}`}
        >
          {u.headcountDirect === u.headcountTotal
            ? u.headcountTotal
            : `${u.headcountDirect} / ${u.headcountTotal}`}
        </span>
      ),
    },
    ...(isAdmin ? [{
      key: 'actions', header: 'Действия', align: 'right' as const, srOnlyHeader: true, hideable: false,
      render: (u: FlatUnit) => (
        <div onClick={e => e.stopPropagation()} className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => openAddChild(u)}
            title="Добавить дочернее"
            className="inline-flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={() => openEdit(u)}
            title="Изменить"
            className="inline-flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(u)}
            title="Удалить"
            className="inline-flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    }] : []),
  ]

  const searchText = (u: FlatUnit) => {
    const head = u.headUserId ? headLookup.get(u.headUserId) ?? '' : ''
    const parent = u.parentId ? parentLookup.get(u.parentId) ?? '' : ''
    return `${displayName(u)} ${TYPE_LABEL[u.type]} ${head} ${parent}`
  }

  const clientFilter = (u: FlatUnit, v: Record<string, string>) => {
    if (v.type && u.type !== v.type) return false
    if (v.head === 'ASSIGNED' && !u.headUserId) return false
    if (v.head === 'VACANT' && u.headUserId) return false
    const state = v.state || ''
    if (state === '' && u.archivedAt) return false
    if (state === 'ARCHIVED' && !u.archivedAt) return false
    return true
  }

  const comparator = (key: string) => (a: FlatUnit, b: FlatUnit): number => {
    switch (key) {
      case 'type':     return TYPE_RANK[a.type] - TYPE_RANK[b.type]
      case 'code':     return (a.code ?? '').localeCompare(b.code ?? '')
      case 'order':    return (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      case 'head': {
        const an = a.headUserId ? headLookup.get(a.headUserId) ?? '' : ''
        const bn = b.headUserId ? headLookup.get(b.headUserId) ?? '' : ''
        return an.localeCompare(bn, 'ru')
      }
      case 'children': return a.childCount - b.childCount
      case 'headcount': return a.headcountTotal - b.headcountTotal
      default:         return displayName(a).localeCompare(displayName(b), lang)
    }
  }

  const renderCard = (u: FlatUnit): ReactNode => {
    const name = u.headUserId ? headLookup.get(u.headUserId) ?? `ID ${u.headUserId}` : null
    const parent = u.parentId ? parentLookup.get(u.parentId) ?? `ID ${u.parentId}` : null
    return (
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to={`/admin/org/${u.id}`}
              style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}
            >
              {displayName(u)}
            </Link>
          </div>
          <TypePill type={u.type} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-3" style={{ fontSize: 12 }}>
            <span className="font-mono uppercase tracking-wider" style={{ color: 'var(--ink-faint)', fontWeight: 600, fontSize: 10 }}>Руководитель</span>
            <span style={{ color: name ? 'var(--ink-soft)' : 'var(--warn)', fontStyle: name ? 'normal' : 'italic', textAlign: 'right' }}>
              {name ?? 'не назначен'}
            </span>
          </div>
          <div className="flex justify-between gap-3" style={{ fontSize: 12 }}>
            <span className="font-mono uppercase tracking-wider" style={{ color: 'var(--ink-faint)', fontWeight: 600, fontSize: 10 }}>Родитель</span>
            <span style={{ color: parent ? 'var(--ink-soft)' : 'var(--ink-faint)', fontStyle: parent ? 'normal' : 'italic', textAlign: 'right' }}>
              {parent ?? 'корневой'}
            </span>
          </div>
          <div className="flex justify-between gap-3" style={{ fontSize: 12 }}>
            <span className="font-mono uppercase tracking-wider" style={{ color: 'var(--ink-faint)', fontWeight: 600, fontSize: 10 }}>Дочерних</span>
            <span className="font-mono" style={{ color: 'var(--ink-soft)' }}>{u.childCount}</span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => openAddChild(u)}
              title="Добавить дочернее"
              className="inline-flex items-center justify-center"
              style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => openEdit(u)}
              title="Изменить"
              className="inline-flex items-center justify-center"
              style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(u)}
              title="Удалить"
              className="inline-flex items-center justify-center"
              style={{ width: 30, height: 30, borderRadius: 6, background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    )
  }

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadCsv(`org-structure-${stamp}.csv`, buildCsv(tree, headLookup))
  }

  const exportButton = (
    <button
      onClick={handleExport}
      disabled={tree.length === 0}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'transparent', color: 'var(--ink-soft)',
        border: '1px solid var(--line)', cursor: tree.length === 0 ? 'not-allowed' : 'pointer',
        opacity: tree.length === 0 ? 0.5 : 1,
      }}
      title="Экспорт CSV"
    >
      <Download size={14} />
      CSV
    </button>
  )

  const addButton = isAdmin ? (
    <button
      onClick={() => { setEditing(null); setDefaultParent(null); setModalOpen(true) }}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'var(--accent)', color: 'var(--surface)',
        border: '1px solid var(--accent-ink)', cursor: 'pointer',
      }}
    >
      <Plus size={15} />
      Добавить подразделение
    </button>
  ) : undefined

  const selectedNode = selectedId != null ? findById(tree, selectedId) : null
  const path = selectedNode ? findPath(tree, selectedNode.id) ?? [] : []
  const drawerRail = selectedNode ? TYPE_RAIL[selectedNode.type] : 'var(--dv3-border2)'

  const viewSwitch = (
    <div className="org-view-toggle" role="tablist" aria-label="Вид">
      <button
        role="tab"
        aria-selected={viewMode === 'table'}
        className={`org-view-btn ${viewMode === 'table' ? 'org-view-btn--on' : ''}`}
        onClick={() => setViewMode('table')}
        title="Таблица"
      >
        <Table2 size={13} /> Таблица
      </button>
      <button
        role="tab"
        aria-selected={viewMode === 'canvas'}
        className={`org-view-btn ${viewMode === 'canvas' ? 'org-view-btn--on' : ''}`}
        onClick={() => setViewMode('canvas')}
        title="Граф"
      >
        <Network size={13} /> Граф
      </button>
    </div>
  )

  return (
    <>
      <div className="dv3-root org-scope">
        <style>{DASHBOARD_CSS}</style>
        <style>{DV3_FORM_CSS}</style>
        <style>{ORG_CSS}</style>

        <div className="dv3-terminal">
          {loadError && !loading && (
            <div className="font-mono" style={{ fontSize: 12, color: 'var(--dv3-zone-down)', marginBottom: 12 }}>{loadError}</div>
          )}

          {viewMode === 'canvas' ? (
            <>
              <div className="org-canvas-header">
                <div className="flex items-center gap-3">
                  <span className="org-panel-head-label">Граф · {flat.length} узлов</span>
                  {viewSwitch}
                </div>
                <div className="flex items-center gap-2">
                  {exportButton}
                  {addButton}
                </div>
              </div>

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
                    onOpenDetail={(uid) => navigate(`/admin/org/${uid}`)}
                    headLookup={headLookup}
                    isAdmin={isAdmin}
                    onReparent={handleReparent}
                  />
                )}

                <aside
                  className={`org-drawer ${selectedNode ? 'org-drawer--open' : ''}`}
                  style={{ borderTop: `2px solid ${drawerRail}` }}
                  aria-hidden={!selectedNode}
                >
                  {selectedNode && (
                    <div className="org-drawer-inner">
                      <button
                        className="org-drawer-close"
                        onClick={() => setSelectedId(null)}
                        aria-label="Закрыть"
                      >
                        <X size={14} />
                      </button>

                      <div className="org-spec-kicker">
                        Спецификация · {TYPE_LABEL[selectedNode.type]}
                      </div>

                      <h2 className="org-spec-title">{selectedNode.nameRu}</h2>

                      {selectedNode.nameKg && selectedNode.nameKg !== selectedNode.nameRu && (
                        <div className="org-spec-sub">{selectedNode.nameKg}</div>
                      )}

                      {path.length > 1 && (
                        <div className="org-crumbs">
                          {path.slice(0, -1).map((p, i) => (
                            <span key={p.id} className="flex items-center gap-1">
                              <button onClick={() => setSelectedId(p.id)} className="org-crumb-btn">
                                {p.nameRu}
                              </button>
                              <span className="org-crumb-sep">/</span>
                              {i === path.length - 2 && <span className="org-crumb-cur">{selectedNode.nameRu}</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: 18, borderTop: '1px solid var(--dv3-border)' }}>
                        <SpecRow label="Тип" value={TYPE_LABEL[selectedNode.type]} />
                        <SpecRow
                          label="Код"
                          value={selectedNode.code}
                          placeholder="—"
                        />
                        <SpecRow
                          label="Сокр. (рус)"
                          value={selectedNode.nameRuShort}
                          placeholder="—"
                        />
                        <SpecRow
                          label="Сокр. (кыр)"
                          value={selectedNode.nameKgShort}
                          placeholder="—"
                        />
                        {(() => {
                          const siblings = (selectedNode.parentId
                            ? (findById(tree, selectedNode.parentId)?.children ?? [])
                            : tree
                          ).filter(s => !s.archivedAt)
                            .slice()
                            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
                              || a.nameRu.localeCompare(b.nameRu))
                          const idx = siblings.findIndex(s => s.id === selectedNode.id)
                          const canUp = idx > 0
                          const canDown = idx >= 0 && idx < siblings.length - 1
                          const disabled = !!selectedNode.archivedAt
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
                                Порядок
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span style={{ fontSize: 12, color: 'var(--dv3-text)', fontVariantNumeric: 'tabular-nums' }}>
                                  {selectedNode.displayOrder ?? 0}
                                </span>
                                {isAdmin && (
                                  <>
                                    <button
                                      className="dv3-btn dv3-btn--icon"
                                      disabled={disabled || !canUp}
                                      onClick={() => handleMove(selectedNode.id, 'up')}
                                      title="Выше"
                                      aria-label="Переместить выше"
                                    >
                                      <ChevronUp size={12} />
                                    </button>
                                    <button
                                      className="dv3-btn dv3-btn--icon"
                                      disabled={disabled || !canDown}
                                      onClick={() => handleMove(selectedNode.id, 'down')}
                                      title="Ниже"
                                      aria-label="Переместить ниже"
                                    >
                                      <ChevronDown size={12} />
                                    </button>
                                  </>
                                )}
                              </span>
                            </div>
                          )
                        })()}
                        <SpecRow
                          label="Руководитель"
                          value={selectedNode.headUserId ? (headLookup.get(selectedNode.headUserId) ?? `ID ${selectedNode.headUserId}`) : null}
                          placeholder="не назначен"
                          tone={selectedNode.headUserId ? 'normal' : 'warn'}
                        />
                        <SpecRow
                          label="Родитель"
                          value={path.length > 1 ? path[path.length - 2].nameRu : null}
                          placeholder="корневой узел"
                        />
                        <SpecRow
                          label="Дочерних"
                          value={selectedNode.children.length === 0 ? 'нет' : `${selectedNode.children.length}`}
                        />
                        <SpecRow
                          label="Сотрудников"
                          value={`${selectedNode.headcountDirect} прямо / ${selectedNode.headcountTotal} всего`}
                        />
                        {selectedNode.archivedAt && (
                          <SpecRow
                            label="Архивировано"
                            value={new Date(selectedNode.archivedAt).toLocaleString('ru-RU')}
                            tone="warn"
                          />
                        )}
                      </div>

                      {selectedNode.children.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div className="org-spec-kicker" style={{ marginBottom: 8 }}>Содержит</div>
                          <div className="flex flex-col gap-1">
                            {selectedNode.children.map(c => (
                              <button
                                key={c.id}
                                onClick={() => setSelectedId(c.id)}
                                className="org-child"
                              >
                                <span className="org-child-dot" style={{ background: TYPE_RAIL[c.type] }} />
                                <span className="org-child-name">{c.nameRu}</span>
                                <span className="org-child-type">{TYPE_LABEL[c.type]}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {isAdmin && (
                        <div className="dv3-btn-row" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--dv3-border)' }}>
                          <Link
                            to={`/admin/org/${selectedNode.id}`}
                            className="dv3-btn"
                            title="Открыть страницу подразделения"
                          >
                            Открыть страницу
                          </Link>
                          <Link
                            to={`/admin/audit?entityType=ORG_UNIT&entityId=${selectedNode.id}`}
                            className="dv3-btn"
                            title="История изменений"
                          >
                            <History size={12} /> История
                          </Link>
                          <button
                            className="dv3-btn dv3-btn--primary"
                            onClick={() => { setEditing(null); setDefaultParent(selectedNode); setModalOpen(true) }}
                          >
                            <Plus size={13} /> Добавить дочернее
                          </button>
                          <button
                            className="dv3-btn"
                            onClick={() => { setEditing(selectedNode); setDefaultParent(null); setModalOpen(true) }}
                          >
                            <Pencil size={12} /> Изменить
                          </button>
                          <button
                            className="dv3-btn"
                            onClick={() => handleArchiveToggle(selectedNode)}
                          >
                            {selectedNode.archivedAt
                              ? (<><ArchiveRestore size={12} /> Восстановить</>)
                              : (<><Archive size={12} /> Архивировать</>)}
                          </button>
                          <button
                            className="dv3-btn dv3-btn--danger"
                            onClick={() => setDeleteTarget({
                              id: selectedNode.id,
                              nameRu: selectedNode.nameRu,
                              nameKg: selectedNode.nameKg,
                              type: selectedNode.type,
                              headUserId: selectedNode.headUserId,
                              parentId: selectedNode.parentId,
                              childCount: selectedNode.children.length,
                              archivedAt: selectedNode.archivedAt,
                              displayOrder: selectedNode.displayOrder,
                              code: selectedNode.code,
                              headcountDirect: selectedNode.headcountDirect,
                              headcountTotal: selectedNode.headcountTotal,
                            })}
                          >
                            <Trash2 size={12} /> Удалить
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </aside>
              </div>
            </>
          ) : (
          <DataPanel<FlatUnit>
            mode="client"
            columns={columns}
            rows={flat}
            rowKey={(u) => u.id}
            loading={loading}
            caption="Подразделения"
            empty="Структура не настроена."
            searchable
            searchText={searchText}
            searchPlaceholder="Поиск по подразделению…"
            filters={FILTERS}
            clientFilter={clientFilter}
            comparator={comparator}
            defaultSort={{ key: 'name', dir: 'asc' }}
            views={['table', 'cards']}
            renderCard={renderCard}
            panelStorageKey={PANEL_KEY}
            columnConfig
            toolbarActions={
              <div className="flex items-center gap-2">
                {viewSwitch}
                {exportButton}
                {addButton}
              </div>
            }
          />
          )}
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
        description={`«${deleteTarget ? displayName(deleteTarget) : ''}» и все его дочерние подразделения будут удалены.`}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
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

.org-view-toggle {
  display: inline-flex;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.org-view-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: transparent; border: none;
  padding: 5px 10px;
  font-family: inherit;
  font-size: 11.5px; font-weight: 500;
  color: var(--dv3-text3);
  border-radius: 6px;
  cursor: pointer;
  transition: color 120ms ease, background 120ms ease;
}
.org-view-btn:hover { color: var(--dv3-text); }
.org-view-btn--on {
  background: var(--dv3-bg3);
  color: var(--dv3-accent);
}

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
