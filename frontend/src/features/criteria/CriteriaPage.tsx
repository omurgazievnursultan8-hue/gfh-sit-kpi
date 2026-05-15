import { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, RotateCcw, Pencil, Trash2, Lock, Zap, Globe2, Building2, Search,
  X, SlidersHorizontal, ChevronDown, Sparkles, Download, Keyboard, TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, Save, Bookmark, Settings2, History, Edit3,
  Copy, Scale, Printer, ArrowRight,
} from 'lucide-react'
import { RootState } from '../../app/store'
import { Criteria, criteriaApi, CriteriaRequest } from './criteriaApi'
import { OrgUnit, orgApi } from '../org/orgApi'
import { CriteriaFormModal } from './components/CriteriaFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataTable, type Column } from '../../components/DataTable'
import { auditApi, AuditLogEntry } from '../admin/adminApi'

type Tab = 'POSITIVE' | 'ANTI_BONUS'
type Scope = 'ALL' | 'GLOBAL' | 'LOCAL'
type SortKey = 'rank' | 'name' | 'scope' | 'weight' | 'status'
type SortDir = 'asc' | 'desc'
type ToastKind = 'success' | 'error' | 'info'
interface Toast { id: string; kind: ToastKind; text: string; duration?: number; action?: { label: string; onClick: () => void } }

type ColKey = 'rank' | 'name' | 'scope' | 'weight' | 'status'
const ALL_COLS: { k: ColKey; label: string; required?: boolean }[] = [
  { k: 'rank',   label: '№',         required: true },
  { k: 'name',   label: 'Название',  required: true },
  { k: 'scope',  label: 'Область' },
  { k: 'weight', label: 'Вес',       required: true },
  { k: 'status', label: 'Статус' },
]

interface SavedView {
  id: string
  name: string
  tab: Tab
  scope: Scope
  showInactive: boolean
  query: string
  sortKey: SortKey
  sortDir: SortDir
  cols: ColKey[]
}
const VIEWS_LS_KEY = 'gfh_criteria_views_v1'
const COLS_LS_KEY = 'gfh_criteria_cols_v1'

function flattenOrgTree(units: OrgUnit[]): OrgUnit[] {
  return units.flatMap(u => [u, ...flattenOrgTree(u.children || [])])
}

export function CriteriaPage() {
  const { role } = useSelector((s: RootState) => s.auth)
  const isAdmin = role === 'ADMIN'

  const [searchParams, setSearchParams] = useSearchParams()

  const [allCriteria, setAllCriteria] = useState<Criteria[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())
  const [tab, setTab] = useState<Tab>(() => (searchParams.get('tab') === 'ANTI_BONUS' ? 'ANTI_BONUS' : 'POSITIVE'))
  const [showInactive, setShowInactive] = useState(() => searchParams.get('arch') === '1')
  const [scope, setScope] = useState<Scope>(() => {
    const s = searchParams.get('scope')
    return s === 'GLOBAL' || s === 'LOCAL' ? s : 'ALL'
  })
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const k = searchParams.get('sort')
    return (['rank', 'name', 'scope', 'weight', 'status'] as const).includes(k as any) ? (k as SortKey) : 'weight'
  })
  const [sortDir, setSortDir] = useState<SortDir>(() => (searchParams.get('dir') === 'asc' ? 'asc' : 'desc'))
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Criteria | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Criteria | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState<null | 'deactivate' | 'reactivate'>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Column visibility — persisted
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(() => {
    try {
      const raw = localStorage.getItem(COLS_LS_KEY)
      if (raw) {
        const arr = JSON.parse(raw) as ColKey[]
        const next = new Set<ColKey>(arr)
        ALL_COLS.filter(c => c.required).forEach(c => next.add(c.k))
        return next
      }
    } catch {}
    return new Set<ColKey>(ALL_COLS.map(c => c.k))
  })
  const [colMenuOpen, setColMenuOpen] = useState(false)

  // Saved views — persisted
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => {
    try {
      const raw = localStorage.getItem(VIEWS_LS_KEY)
      return raw ? (JSON.parse(raw) as SavedView[]) : []
    } catch { return [] }
  })
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false)
  const [viewNameDraft, setViewNameDraft] = useState('')

  // Inline weight edit
  const [inlineEditId, setInlineEditId] = useState<number | null>(null)

  // Bulk edit
  const [bulkEditOpen, setBulkEditOpen] = useState(false)

  // Duplicate
  const [duplicatePrefill, setDuplicatePrefill] = useState<Partial<CriteriaRequest> | null>(null)

  // Rebalance
  const [rebalanceOpen, setRebalanceOpen] = useState(false)

  // Activity drawer
  const [historyTarget, setHistoryTarget] = useState<Criteria | null>(null)
  const [historyEntries, setHistoryEntries] = useState<AuditLogEntry[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => {
      const next = [...prev, { ...t, id }]
      return next.length > 3 ? next.slice(next.length - 3) : next
    })
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), t.duration ?? 4000)
  }, [])

  const loadCriteria = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await criteriaApi.list(0, 200)
      setAllCriteria(data.content)
      setLastUpdated(new Date())
    } catch (err: any) {
      setLoadError(err?.response?.data?.messageRu || err?.message || 'Не удалось загрузить критерии')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCriteria()
    orgApi.getStructure().then(tree => setOrgUnits(flattenOrgTree(tree)))
  }, [loadCriteria])

  // Reset sort+selection on tab change (skip first mount so URL params win)
  const didMountTab = useRef(false)
  useEffect(() => {
    if (!didMountTab.current) { didMountTab.current = true; return }
    setSortKey('weight')
    setSortDir('desc')
    setSelected(new Set())
  }, [tab])

  // Persist column visibility
  useEffect(() => {
    try { localStorage.setItem(COLS_LS_KEY, JSON.stringify(Array.from(visibleCols))) } catch {}
  }, [visibleCols])

  // Persist saved views
  useEffect(() => {
    try { localStorage.setItem(VIEWS_LS_KEY, JSON.stringify(savedViews)) } catch {}
  }, [savedViews])

  // Load history when target changes
  useEffect(() => {
    if (!historyTarget) { setHistoryEntries(null); return }
    let cancelled = false
    setHistoryLoading(true)
    auditApi.search({ entityType: 'CRITERIA', page: 0, size: 100 })
      .then(page => {
        if (cancelled) return
        const filtered = page.content.filter(e => e.entityId === historyTarget.id)
        setHistoryEntries(filtered)
      })
      .catch(() => { if (!cancelled) setHistoryEntries([]) })
      .finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [historyTarget])

  // Sync filter/sort/cols state to URL (replaceState so back button stays useful)
  useEffect(() => {
    const next = new URLSearchParams()
    if (tab !== 'POSITIVE') next.set('tab', tab)
    if (scope !== 'ALL') next.set('scope', scope)
    if (showInactive) next.set('arch', '1')
    if (query) next.set('q', query)
    if (sortKey !== 'weight') next.set('sort', sortKey)
    if (sortDir !== 'desc') next.set('dir', sortDir)
    const colsArr = ALL_COLS.map(c => c.k).filter(k => visibleCols.has(k))
    if (colsArr.length !== ALL_COLS.length) next.set('cols', colsArr.join(','))
    setSearchParams(next, { replace: true })
  }, [tab, scope, showInactive, query, sortKey, sortDir, visibleCols, setSearchParams])

  const positiveActive = allCriteria.filter(c => c.type === 'POSITIVE' && c.active)
  const antiActive = allCriteria.filter(c => c.type === 'ANTI_BONUS' && c.active)
  const scopeCounts = (() => {
    const inTab = allCriteria.filter(c => c.type === tab && (showInactive ? true : c.active))
    return {
      all: inTab.length,
      global: inTab.filter(c => c.orgUnitId === null).length,
      local: inTab.filter(c => c.orgUnitId !== null).length,
    }
  })()
  const positiveCount = positiveActive.length
  const antiCount = antiActive.length

  const positiveWeightUsed = positiveActive
    .filter(c => c.orgUnitId === null)
    .reduce((sum, c) => sum + c.weight, 0)
  const remaining = Math.max(0, 100 - positiveWeightUsed)
  const overflow = positiveWeightUsed > 100.001

  const visibleCriteria = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = allCriteria
      .filter(c => c.type === tab)
      .filter(c => (showInactive ? true : c.active))
      .filter(c => {
        if (scope === 'GLOBAL') return c.orgUnitId === null
        if (scope === 'LOCAL') return c.orgUnitId !== null
        return true
      })
      .filter(c => !q || c.nameRu.toLowerCase().includes(q) || c.nameKg.toLowerCase().includes(q))

    const cmp = (a: Criteria, b: Criteria): number => {
      switch (sortKey) {
        case 'name':   return a.nameRu.localeCompare(b.nameRu, 'ru')
        case 'scope':  return (a.orgUnitNameRu ?? 'Глобальный').localeCompare(b.orgUnitNameRu ?? 'Глобальный', 'ru')
        case 'status': return Number(b.active) - Number(a.active) || Number(b.autoCalculated) - Number(a.autoCalculated)
        case 'weight':
        default:       return a.weight - b.weight
      }
    }
    const sorted = [...filtered].sort(cmp)
    if (sortDir === 'desc') sorted.reverse()
    return sorted
  }, [allCriteria, tab, showInactive, scope, query, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'weight' ? 'desc' : 'asc')
    }
  }

  const handleSave = async (data: CriteriaRequest) => {
    if (editing) await criteriaApi.update(editing.id, data)
    else await criteriaApi.create(data)
    pushToast({ kind: 'success', text: editing ? `«${data.nameRu}» обновлён` : `«${data.nameRu}» создан` })
    await loadCriteria()
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    const target = deactivateTarget
    await criteriaApi.deactivate(target.id)
    setDeactivateTarget(null)
    await loadCriteria()
    pushToast({
      kind: 'info',
      text: `«${target.nameRu}» деактивирован`,
      duration: 5000,
      action: {
        label: 'Отменить',
        onClick: async () => {
          try {
            await criteriaApi.reactivate(target.id)
            await loadCriteria()
            pushToast({ kind: 'success', text: 'Восстановлено' })
          } catch {
            pushToast({ kind: 'error', text: 'Не удалось отменить' })
          }
        },
      },
    })
  }

  const handleReactivate = async (c: Criteria) => {
    // Optimistic flip
    const snapshot = allCriteria
    setAllCriteria(prev => prev.map(x => x.id === c.id ? { ...x, active: true } : x))
    try {
      await criteriaApi.reactivate(c.id)
      pushToast({ kind: 'success', text: `«${c.nameRu}» реактивирован` })
      await loadCriteria()
    } catch (err: any) {
      setAllCriteria(snapshot)
      pushToast({ kind: 'error', text: err.response?.data?.messageRu || err.response?.data?.message_ru || 'Ошибка при реактивации' })
    }
  }

  const handleRowClick = (c: Criteria) => {
    if (!isAdmin) return
    setEditing(c)
    setModalOpen(true)
  }

  const selectedRows = visibleCriteria.filter(c => selected.has(c.id))
  const allSelected = visibleCriteria.length > 0 && visibleCriteria.every(c => selected.has(c.id))
  const someSelected = !allSelected && visibleCriteria.some(c => selected.has(c.id))

  const toggleSelectAll = () => {
    const next = new Set(selected)
    if (allSelected) {
      visibleCriteria.forEach(c => next.delete(c.id))
    } else {
      visibleCriteria.forEach(c => next.add(c.id))
    }
    setSelected(next)
  }
  const toggleSelect = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const runBulkDeactivate = async () => {
    const targets = selectedRows.filter(c => c.active && !c.frozen)
    const ids = new Set(targets.map(t => t.id))
    const snapshot = allCriteria
    // Optimistic
    setAllCriteria(prev => prev.map(x => ids.has(x.id) ? { ...x, active: false } : x))
    setSelected(new Set())
    setBulkConfirm(null)
    const results = await Promise.allSettled(targets.map(c => criteriaApi.deactivate(c.id)))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed === targets.length) {
      setAllCriteria(snapshot)
      pushToast({ kind: 'error', text: `Не удалось деактивировать критерии (${failed})` })
    } else if (failed > 0) {
      pushToast({ kind: 'info', text: `Деактивировано ${targets.length - failed} из ${targets.length}. Ошибок: ${failed}` })
    } else {
      pushToast({ kind: 'success', text: `Деактивировано ${targets.length} ${plural(targets.length, ['критерий', 'критерия', 'критериев'])}` })
    }
    await loadCriteria()
  }
  const runBulkReactivate = async () => {
    const targets = selectedRows.filter(c => !c.active)
    const ids = new Set(targets.map(t => t.id))
    const snapshot = allCriteria
    setAllCriteria(prev => prev.map(x => ids.has(x.id) ? { ...x, active: true } : x))
    setSelected(new Set())
    setBulkConfirm(null)
    const results = await Promise.allSettled(targets.map(c => criteriaApi.reactivate(c.id)))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed === targets.length) {
      setAllCriteria(snapshot)
      pushToast({ kind: 'error', text: `Не удалось реактивировать критерии (${failed})` })
    } else if (failed > 0) {
      pushToast({ kind: 'info', text: `Реактивировано ${targets.length - failed} из ${targets.length}. Ошибок: ${failed}` })
    } else {
      pushToast({ kind: 'success', text: `Реактивировано ${targets.length} ${plural(targets.length, ['критерий', 'критерия', 'критериев'])}` })
    }
    await loadCriteria()
  }

  const saveCurrentView = () => {
    const name = viewNameDraft.trim()
    if (!name) return
    const view: SavedView = {
      id: Math.random().toString(36).slice(2),
      name,
      tab, scope, showInactive, query, sortKey, sortDir,
      cols: Array.from(visibleCols),
    }
    setSavedViews(prev => {
      const next = [...prev, view]
      return next.length > 20 ? next.slice(next.length - 20) : next
    })
    setViewNameDraft('')
    pushToast({ kind: 'success', text: `Вид «${name}» сохранён` })
  }
  const applyView = (v: SavedView) => {
    setTab(v.tab); setScope(v.scope); setShowInactive(v.showInactive)
    setQuery(v.query); setSortKey(v.sortKey); setSortDir(v.sortDir)
    setVisibleCols(new Set(v.cols))
    setViewsMenuOpen(false)
    pushToast({ kind: 'info', text: `Вид «${v.name}» применён` })
  }
  const deleteView = (id: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== id))
  }

  const toggleCol = (k: ColKey) => {
    const required = ALL_COLS.find(c => c.k === k)?.required
    if (required) return
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })
  }

  const saveInlineWeight = async (c: Criteria, raw: string) => {
    const parsed = Number(raw.replace(',', '.'))
    setInlineEditId(null)
    if (!isFinite(parsed) || parsed < 0 || parsed === c.weight) return
    const snapshot = allCriteria
    setAllCriteria(prev => prev.map(x => x.id === c.id ? { ...x, weight: parsed } : x))
    try {
      await criteriaApi.update(c.id, {
        nameRu: c.nameRu, nameKg: c.nameKg, type: c.type,
        weight: parsed, orgUnitId: c.orgUnitId, autoCalculated: c.autoCalculated,
      })
      pushToast({ kind: 'success', text: `Вес обновлён: ${parsed.toFixed(2)}` })
      await loadCriteria()
    } catch (err: any) {
      setAllCriteria(snapshot)
      pushToast({ kind: 'error', text: err.response?.data?.messageRu || 'Ошибка обновления веса' })
    }
  }

  const applyBulkEdit = async (patch: { autoCalculated?: boolean; orgUnitId?: number | null }) => {
    const targets = selectedRows
    const snapshot = allCriteria
    setAllCriteria(prev => prev.map(x => {
      if (!selected.has(x.id)) return x
      return { ...x, ...patch }
    }))
    setBulkEditOpen(false)
    const results = await Promise.allSettled(targets.map(c =>
      criteriaApi.update(c.id, {
        nameRu: c.nameRu, nameKg: c.nameKg, type: c.type,
        weight: c.weight,
        orgUnitId: patch.orgUnitId !== undefined ? patch.orgUnitId : c.orgUnitId,
        autoCalculated: patch.autoCalculated !== undefined ? patch.autoCalculated : c.autoCalculated,
      })
    ))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed === targets.length) {
      setAllCriteria(snapshot)
      pushToast({ kind: 'error', text: `Не удалось применить (${failed})` })
    } else if (failed > 0) {
      pushToast({ kind: 'info', text: `Обновлено ${targets.length - failed} из ${targets.length}` })
    } else {
      pushToast({ kind: 'success', text: `Обновлено ${targets.length} ${plural(targets.length, ['критерий', 'критерия', 'критериев'])}` })
    }
    setSelected(new Set())
    await loadCriteria()
  }

  const startDuplicate = (c: Criteria) => {
    setEditing(null)
    setDuplicatePrefill({
      nameRu: `${c.nameRu} (копия)`,
      nameKg: c.nameKg ? `${c.nameKg} (копия)` : '',
      type: c.type,
      weight: c.weight,
      orgUnitId: c.orgUnitId,
      autoCalculated: c.autoCalculated,
    })
    setModalOpen(true)
  }

  const globalPositiveActive = positiveActive.filter(c => c.orgUnitId === null)
  const rebalanceTargets = globalPositiveActive.filter(c => !c.frozen)
  const rebalanceFrozenSum = globalPositiveActive
    .filter(c => c.frozen)
    .reduce((s, c) => s + c.weight, 0)
  const rebalanceCurrentSum = rebalanceTargets.reduce((s, c) => s + c.weight, 0)
  const rebalanceTargetSum = Math.max(0, 100 - rebalanceFrozenSum)
  const rebalanceFactor = rebalanceCurrentSum > 0 ? rebalanceTargetSum / rebalanceCurrentSum : 0

  const runRebalance = async () => {
    setRebalanceOpen(false)
    if (rebalanceTargets.length === 0 || rebalanceCurrentSum <= 0) return
    const snapshot = allCriteria
    const updates = rebalanceTargets.map(c => ({
      c,
      newWeight: Math.round(c.weight * rebalanceFactor * 100) / 100,
    }))
    // Distribute rounding residual onto the largest row so the sum lands on target exactly.
    const sum = updates.reduce((s, u) => s + u.newWeight, 0)
    const residual = Math.round((rebalanceTargetSum - sum) * 100) / 100
    if (residual !== 0 && updates.length > 0) {
      const i = updates.reduce((maxIdx, u, idx, arr) =>
        u.newWeight > arr[maxIdx].newWeight ? idx : maxIdx, 0)
      updates[i].newWeight = Math.round((updates[i].newWeight + residual) * 100) / 100
    }
    const ids = new Map(updates.map(u => [u.c.id, u.newWeight]))
    setAllCriteria(prev => prev.map(x => ids.has(x.id) ? { ...x, weight: ids.get(x.id)! } : x))
    const results = await Promise.allSettled(updates.map(u =>
      criteriaApi.update(u.c.id, {
        nameRu: u.c.nameRu, nameKg: u.c.nameKg, type: u.c.type,
        weight: u.newWeight, orgUnitId: u.c.orgUnitId, autoCalculated: u.c.autoCalculated,
      })
    ))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed === updates.length) {
      setAllCriteria(snapshot)
      pushToast({ kind: 'error', text: `Не удалось перераспределить веса (${failed})` })
    } else if (failed > 0) {
      pushToast({ kind: 'info', text: `Обновлено ${updates.length - failed} из ${updates.length}` })
    } else {
      pushToast({ kind: 'success', text: `Перераспределено: сумма = 100.00%` })
    }
    await loadCriteria()
  }

  const exportCsv = () => {
    const rowsToExport = selectedRows.length > 0 ? selectedRows : visibleCriteria
    const headers = ['№', 'Название (ru)', 'Название (kg)', 'Тип', 'Область', 'Вес', 'Активен', 'Авто', 'Заморожен']
    const lines = rowsToExport.map((c, i) => [
      i + 1,
      c.nameRu,
      c.nameKg,
      c.type,
      c.orgUnitId === null ? 'Глобальный' : (c.orgUnitNameRu ?? ''),
      c.weight.toFixed(2),
      c.active ? 'да' : 'нет',
      c.autoCalculated ? 'да' : 'нет',
      c.frozen ? 'да' : 'нет',
    ])
    const csv = [headers, ...lines]
      .map(row => row.map(v => {
        const s = String(v ?? '')
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
      }).join(';'))
      .join('\r\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const d = new Date()
    const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
    a.download = `criteria-${tab.toLowerCase()}-${scope.toLowerCase()}-${dateStr}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    pushToast({ kind: 'success', text: `Экспортировано ${rowsToExport.length} строк${selectedRows.length > 0 ? ' (выбранные)' : ''}` })
  }

  // Global keyboard shortcuts
  const leaderRef = useRef<{ key: string; t: number } | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inEditable = !!target && (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' ||
        target.isContentEditable
      )
      if (e.key === '?' && !inEditable) { e.preventDefault(); setShortcutsOpen(v => !v); return }
      if (e.key === 'Escape') {
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (selected.size > 0) { setSelected(new Set()); return }
      }
      if (inEditable) return
      const now = Date.now()
      const leader = leaderRef.current
      if (leader && leader.key === 'g' && now - leader.t < 800) {
        if (e.key === 'p' || e.key === 'з') { e.preventDefault(); setTab('POSITIVE'); leaderRef.current = null; return }
        if (e.key === 'a' || e.key === 'ф') { e.preventDefault(); setTab('ANTI_BONUS'); leaderRef.current = null; return }
        leaderRef.current = null
      }
      if (e.key === 'g' || e.key === 'п') { leaderRef.current = { key: 'g', t: now }; return }
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus() }
      else if ((e.key === 'n' || e.key === 'т') && isAdmin) { e.preventDefault(); setEditing(null); setModalOpen(true) }
      else if (e.key === '[') { setTab('POSITIVE') }
      else if (e.key === ']') { setTab('ANTI_BONUS') }
      else if (e.key === 'e' && isAdmin) { e.preventDefault(); exportCsv() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selected.size, shortcutsOpen, visibleCriteria, tab])

  const rowMaxWeight = Math.max(...visibleCriteria.map(x => x.weight), 1)

  const criteriaColumns = useMemo<Column<Criteria>[]>(() => {
    const cols: Column<Criteria>[] = []
    const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation()

    if (isAdmin) {
      cols.push({
        key: '__select',
        width: '40px',
        srOnlyHeader: true,
        header: (
          <>
            <label className="crit-sr-only" htmlFor="crit-select-all">Выбрать все</label>
            <input
              id="crit-select-all"
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected }}
              onChange={toggleSelectAll}
              onClick={stop}
            />
          </>
        ),
        render: (c) => (
          <span onClick={stop}>
            <label className="crit-sr-only" htmlFor={`crit-sel-${c.id}`}>Выбрать «{c.nameRu}»</label>
            <input
              id={`crit-sel-${c.id}`}
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggleSelect(c.id)}
              onClick={stop}
            />
          </span>
        ),
      })
    }

    if (visibleCols.has('rank')) {
      cols.push({
        key: 'rank',
        header: '№',
        width: '56px',
        align: 'right',
        render: (c) => (
          <span className="crit-mono">
            {(visibleCriteria.indexOf(c) + 1).toString().padStart(2, '0')}
          </span>
        ),
      })
    }

    if (visibleCols.has('name')) {
      cols.push({
        key: 'name',
        header: 'Наименование',
        sortable: true,
        render: (c) => {
          const logoTone = ((c.id % 8) + 1)
          return (
            <div className="crit-name-cell">
              <div className={`crit-logo-mini crit-logo-c${logoTone}`} aria-hidden="true">
                {c.nameRu.slice(0, 2).toUpperCase()}
              </div>
              <div className="crit-name-block">
                <TruncatedText text={c.nameRu} className="crit-name-ru" />
                <TruncatedText text={c.nameKg} className="crit-name-kg" />
              </div>
            </div>
          )
        },
      })
    }

    if (visibleCols.has('scope')) {
      cols.push({
        key: 'scope',
        header: 'Область применения',
        sortable: true,
        width: '180px',
        render: (c) => (
          c.orgUnitId === null ? (
            <span className="crit-pill accent with-dot">
              <Globe2 size={11} strokeWidth={1.8} aria-hidden="true" />
              Глобальный
            </span>
          ) : (
            <span className="crit-pill neutral" title={c.orgUnitNameRu ?? undefined}>
              <Building2 size={11} strokeWidth={1.8} aria-hidden="true" />
              {c.orgUnitNameRu}
            </span>
          )
        ),
      })
    }

    if (visibleCols.has('weight')) {
      cols.push({
        key: 'weight',
        header: 'Вес',
        sortable: true,
        width: '180px',
        align: 'right',
        render: (c) => {
          const isAnti = c.type === 'ANTI_BONUS'
          const isGlobalPositive = !isAnti && c.orgUnitId === null
          const barColor = isAnti ? 'var(--crit-danger)' : 'var(--crit-accent)'
          const denom = isGlobalPositive ? 100 : Math.max(rowMaxWeight, 0.0001)
          const barWidth = Math.min(100, (c.weight / denom) * 100)
          const barTooltip = isAnti
            ? `${c.weight.toFixed(2)} штрафных баллов`
            : isGlobalPositive
              ? `${c.weight.toFixed(2)}% из 100% (глобальный бюджет)`
              : `${c.weight.toFixed(2)}% (локальный, не входит в общий бюджет)`
          if (inlineEditId === c.id) {
            return (
              <InlineWeightEditor
                initial={c.weight}
                isAnti={isAnti}
                onCancel={() => setInlineEditId(null)}
                onSave={(raw) => saveInlineWeight(c, raw)}
                stop={stop}
              />
            )
          }
          return (
            <div
              className={`crit-share-cell ${isAdmin && !c.frozen ? 'editable' : ''}`}
              title={isAdmin && !c.frozen ? `${barTooltip} · двойной клик для редактирования` : barTooltip}
              onDoubleClick={(e) => { e.stopPropagation(); if (isAdmin && !c.frozen) setInlineEditId(c.id) }}
            >
              <div className="crit-share-num">
                {c.weight.toFixed(2)}<small>{isAnti ? ' pts' : ' %'}</small>
                {isAdmin && !c.frozen && (
                  <Pencil
                    size={10}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="crit-share-edit-hint"
                  />
                )}
              </div>
              <div
                className={`crit-share-bar${isGlobalPositive ? ' is-budget' : ''}`}
                role="img"
                aria-label={barTooltip}
              >
                <div className="crit-share-bar-fill" style={{ width: `${barWidth}%`, background: barColor }} />
              </div>
            </div>
          )
        },
      })
    }

    if (visibleCols.has('status')) {
      cols.push({
        key: 'status',
        header: 'Статус',
        sortable: true,
        width: '170px',
        render: (c) => (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {c.active ? (
              <span className="crit-pill active with-dot">Активен</span>
            ) : (
              <span className="crit-pill neutral">Архив</span>
            )}
            {c.autoCalculated && (
              <span className="crit-pill accent">
                <Zap size={10} strokeWidth={2} aria-hidden="true" />
                Auto
              </span>
            )}
            {c.frozen && (
              <span className="crit-pill warn">
                <Lock size={10} strokeWidth={2} aria-hidden="true" />
                Freeze
              </span>
            )}
          </div>
        ),
      })
    }

    if (isAdmin) {
      cols.push({
        key: '__actions',
        header: 'Действия',
        srOnlyHeader: true,
        width: '170px',
        render: (c) => (
          <div className="crit-row-actions" onClick={stop}>
            <button className="crit-iconbtn" title="История" aria-label={`История «${c.nameRu}»`} onClick={() => setHistoryTarget(c)}>
              <History size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button className="crit-iconbtn" title="Дублировать" aria-label={`Дублировать «${c.nameRu}»`} onClick={() => startDuplicate(c)}>
              <Copy size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
            {c.active ? (
              <>
                <button className="crit-iconbtn" title="Изменить" aria-label={`Изменить «${c.nameRu}»`} onClick={() => { setEditing(c); setModalOpen(true) }}>
                  <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <button className="crit-iconbtn danger" title="Деактивировать" aria-label={`Деактивировать «${c.nameRu}»`} onClick={() => setDeactivateTarget(c)}>
                  <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </>
            ) : (
              <button className="crit-iconbtn success" title="Реактивировать" aria-label={`Реактивировать «${c.nameRu}»`} onClick={() => handleReactivate(c)}>
                <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            )}
          </div>
        ),
      })
    }

    return cols
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, visibleCols, selected, allSelected, someSelected, inlineEditId, visibleCriteria, rowMaxWeight])

  const activeChips: { key: string; label: string; clear: () => void }[] = []
  if (query) activeChips.push({ key: 'q', label: `Поиск: «${query}»`, clear: () => setQuery('') })
  if (scope !== 'ALL') activeChips.push({
    key: 'scope', label: scope === 'GLOBAL' ? 'Только глобальные' : 'Только локальные', clear: () => setScope('ALL'),
  })
  if (showInactive) activeChips.push({ key: 'arch', label: 'Показан архив', clear: () => setShowInactive(false) })

  return (
    <div className="crit-asubk">
      <style>{CSS}</style>

      {/* HEAD */}
      <div className="crit-head">
        <div>
          <nav className="crit-breadcrumb" aria-label="Хлебные крошки">
            <a href="/">Главная</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Критерии</span>
          </nav>
          <h1>Критерии оценки</h1>
          <div className="crit-meta-row">
            <span>Всего: <strong>{allCriteria.length}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Активных: <strong>{allCriteria.filter(c => c.active).length}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Архив: <strong>{allCriteria.filter(c => !c.active).length}</strong></span>
            <span aria-hidden="true">·</span>
            <span title={lastUpdated.toISOString()}>Обновлено: {lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="crit-subtitle">Реестр положительных и анти-бонусных критериев. Сумма весов глобальных положительных критериев — ровно 100%.</div>
        </div>
        <div className="crit-head-actions">
          <div className="crit-popover-wrap">
            <button
              className={`crit-btn ${viewsMenuOpen ? 'has-active' : ''}`}
              onClick={() => { setViewsMenuOpen(v => !v); setColMenuOpen(false) }}
              aria-expanded={viewsMenuOpen}
              aria-haspopup="menu"
              title="Сохранённые виды"
            >
              <Bookmark size={14} strokeWidth={1.8} aria-hidden="true" />
              Виды
              {savedViews.length > 0 && <span className="crit-badge-num">{savedViews.length}</span>}
            </button>
            {viewsMenuOpen && (
              <div className="crit-popover" role="menu" onClick={e => e.stopPropagation()}>
                <div className="crit-popover-head">Сохранённые виды</div>
                {savedViews.length === 0 ? (
                  <div className="crit-popover-empty">Пока ничего не сохранено</div>
                ) : (
                  <ul className="crit-views-list">
                    {savedViews.map(v => (
                      <li key={v.id}>
                        <button className="crit-view-apply" onClick={() => applyView(v)}>
                          <span>{v.name}</span>
                          <small>{v.tab === 'POSITIVE' ? 'POS' : 'ANTI'} · {v.scope}</small>
                        </button>
                        <button className="crit-view-del" onClick={() => deleteView(v.id)} aria-label={`Удалить вид «${v.name}»`}>
                          <Trash2 size={12} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="crit-popover-foot">
                  <label htmlFor="crit-view-name" className="crit-sr-only">Имя для нового вида</label>
                  <input
                    id="crit-view-name"
                    type="text"
                    placeholder="Имя для нового вида…"
                    value={viewNameDraft}
                    onChange={e => setViewNameDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveCurrentView() } }}
                  />
                  <button className="crit-btn accent" onClick={saveCurrentView} disabled={!viewNameDraft.trim()}>
                    <Save size={13} strokeWidth={1.8} aria-hidden="true" />
                    Сохранить
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="crit-popover-wrap">
            <button
              className={`crit-btn ${colMenuOpen ? 'has-active' : ''}`}
              onClick={() => { setColMenuOpen(v => !v); setViewsMenuOpen(false) }}
              aria-expanded={colMenuOpen}
              aria-haspopup="menu"
              title="Видимость колонок"
            >
              <Settings2 size={14} strokeWidth={1.8} aria-hidden="true" />
              Колонки
            </button>
            {colMenuOpen && (
              <div className="crit-popover" role="menu" onClick={e => e.stopPropagation()}>
                <div className="crit-popover-head">Видимость колонок</div>
                <ul className="crit-cols-list">
                  {ALL_COLS.map(col => (
                    <li key={col.k}>
                      <label>
                        <input
                          type="checkbox"
                          checked={visibleCols.has(col.k)}
                          disabled={col.required}
                          onChange={() => toggleCol(col.k)}
                        />
                        {col.label}
                        {col.required && <span className="crit-col-req">обяз.</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            className="crit-btn ghost"
            onClick={() => setShortcutsOpen(true)}
            title="Горячие клавиши (?)"
            aria-label="Показать горячие клавиши"
          >
            <Keyboard size={14} strokeWidth={1.8} aria-hidden="true" />
            <span className="crit-kbd-hint">?</span>
          </button>
          <button
            className="crit-btn"
            onClick={exportCsv}
            disabled={visibleCriteria.length === 0}
            title="Экспорт CSV (E)"
          >
            <Download size={14} strokeWidth={1.8} aria-hidden="true" />
            Экспорт CSV
            <span className="crit-kbd-hint">E</span>
          </button>
          <button
            className="crit-btn ghost"
            onClick={() => window.print()}
            disabled={visibleCriteria.length === 0}
            title="Печать / PDF"
            aria-label="Печать таблицы"
          >
            <Printer size={14} strokeWidth={1.8} aria-hidden="true" />
            Печать
          </button>
          {isAdmin && (
            <button className="crit-btn accent" onClick={() => { setEditing(null); setModalOpen(true) }} title="Новый критерий (N)">
              <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
              Новый критерий
              <span className="crit-kbd-hint">N</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="crit-kpi-strip">
        <KpiCard label="Всего критериев" value={positiveCount + antiCount} sub="активных в реестре" stripe="neutral" />
        <KpiCard label="Положительные" value={positiveCount} sub={positiveWeightUsed === 0 ? 'Веса не заданы' : `${positiveWeightUsed.toFixed(1)}% распределено`} stripe="positive" />
        <KpiCard label="Антибонусы" value={antiCount} sub="штрафных позиций" stripe="anti" />
        <KpiCard
          label={overflow ? 'Превышение' : 'Свободный вес'}
          value={`${(overflow ? positiveWeightUsed - 100 : remaining).toFixed(1)}%`}
          sub={overflow ? 'требует корректировки' : 'до 100%'}
          tone={overflow ? 'danger' : remaining < 5 ? 'warn' : 'ok'}
        />
      </div>

      {/* REBALANCE STRIP — only when global positives don't sum to 100% */}
      {isAdmin && tab === 'POSITIVE' && Math.abs(positiveWeightUsed - 100) > 0.5 && rebalanceTargets.length > 0 && (
        <div className={`crit-rebalance-strip ${overflow ? 'is-danger' : 'is-warn'}`} role="region" aria-label="Балансировка к 100%">
          <div className="crit-rebalance-text">
            <Scale size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>
              Сумма глобальных положительных:{' '}
              <strong>{positiveWeightUsed.toFixed(2)}%</strong>
              {' '}— до 100% {overflow ? 'превышение' : 'не хватает'}{' '}
              <strong>{Math.abs(positiveWeightUsed - 100).toFixed(2)}%</strong>.
              {rebalanceFrozenSum > 0 && ` Заморожено: ${rebalanceFrozenSum.toFixed(2)}%.`}
            </span>
          </div>
          <button
            className="crit-btn accent"
            onClick={() => setRebalanceOpen(true)}
            title="Пропорционально пересчитать веса редактируемых критериев"
          >
            <Scale size={13} strokeWidth={1.8} aria-hidden="true" />
            Балансировать к 100%
          </button>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="crit-toolbar" role="region" aria-label="Фильтры и переключение вида">
        <div className="crit-toolbar-row">
          <div className="crit-search">
            <Search size={16} strokeWidth={1.8} aria-hidden="true" />
            <label htmlFor="crit-search-input" className="crit-sr-only">Поиск критериев</label>
            <input
              id="crit-search-input"
              ref={searchInputRef}
              type="search"
              placeholder="Поиск по названию критерия… ( / )"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape' && query) { e.preventDefault(); setQuery('') } }}
              aria-label="Поиск критериев"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                className="crit-search-clear"
                onClick={() => setQuery('')}
                aria-label="Очистить поиск"
                title="Очистить (ESC)"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="crit-view-switch" role="tablist" aria-label="Область применения">
            <button
              className={scope === 'ALL' ? 'active' : ''}
              onClick={() => setScope('ALL')}
              role="tab"
              aria-selected={scope === 'ALL'}
            >Все <span className="crit-tab-count">{scopeCounts.all}</span></button>
            <button
              className={scope === 'GLOBAL' ? 'active' : ''}
              onClick={() => setScope('GLOBAL')}
              role="tab"
              aria-selected={scope === 'GLOBAL'}
            >Глобальные <span className="crit-tab-count">{scopeCounts.global}</span></button>
            <button
              className={scope === 'LOCAL' ? 'active' : ''}
              onClick={() => setScope('LOCAL')}
              role="tab"
              aria-selected={scope === 'LOCAL'}
            >Локальные <span className="crit-tab-count">{scopeCounts.local}</span></button>
          </div>

          {isAdmin && (
            <button
              type="button"
              className={`crit-btn ${showInactive ? 'has-active' : ''}`}
              onClick={() => setShowInactive(v => !v)}
              aria-pressed={showInactive}
            >
              <SlidersHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
              Показать архив
              {showInactive && <span className="crit-badge-num">on</span>}
            </button>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <div className="crit-view-switch" role="tablist" aria-label="Тип критериев">
              <button
                className={tab === 'POSITIVE' ? 'active' : ''}
                onClick={() => setTab('POSITIVE')}
                role="tab"
                aria-selected={tab === 'POSITIVE'}
              >
                <TrendingUp size={13} strokeWidth={1.8} aria-hidden="true" />
                Положительные
                <span className="crit-tab-count">{positiveCount}</span>
              </button>
              <button
                className={tab === 'ANTI_BONUS' ? 'active' : ''}
                onClick={() => setTab('ANTI_BONUS')}
                role="tab"
                aria-selected={tab === 'ANTI_BONUS'}
              >
                <TrendingDown size={13} strokeWidth={1.8} aria-hidden="true" />
                Антибонусы
                <span className="crit-tab-count">{antiCount}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CHIPS */}
      {activeChips.length > 0 && (
        <div className="crit-chips-row" role="region" aria-label="Активные фильтры">
          {activeChips.map(c => (
            <span key={c.key} className="crit-chip">
              {c.label}
              <button onClick={c.clear} aria-label={`Убрать фильтр: ${c.label}`}>
                <X size={11} strokeWidth={2.4} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            className="crit-clear-all"
            onClick={() => { setQuery(''); setScope('ALL'); setShowInactive(false) }}
          >
            Сбросить всё
          </button>
          <button
            className="crit-clear-all"
            onClick={() => { setViewsMenuOpen(true); setColMenuOpen(false) }}
            title="Сохранить текущие фильтры как вид"
          >
            <Bookmark size={11} strokeWidth={1.8} aria-hidden="true" />
            Сохранить вид
          </button>
        </div>
      )}

      {/* BULK BAR */}
      {isAdmin && selectedRows.length > 0 && (
        <div className="crit-bulk-bar" role="region" aria-label="Массовые действия">
          <span className="crit-bulk-count">
            <strong>{selectedRows.length}</strong> {plural(selectedRows.length, ['выбран', 'выбрано', 'выбрано'])}
            {' · сумма весов: '}
            <strong>{selectedRows.reduce((s, c) => s + c.weight, 0).toFixed(2)}{tab === 'ANTI_BONUS' ? ' pts' : '%'}</strong>
          </span>
          <div className="crit-bulk-actions">
            <button className="crit-btn" onClick={() => setBulkEditOpen(true)}>
              <Edit3 size={13} strokeWidth={1.8} aria-hidden="true" />
              Редактировать поля…
            </button>
            {selectedRows.some(c => c.active && !c.frozen) && (
              <button className="crit-btn danger-ghost" onClick={() => setBulkConfirm('deactivate')}>
                <Trash2 size={13} strokeWidth={1.8} aria-hidden="true" />
                Деактивировать выбранные
              </button>
            )}
            {selectedRows.some(c => !c.active) && (
              <button className="crit-btn" onClick={() => setBulkConfirm('reactivate')}>
                <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
                Реактивировать выбранные
              </button>
            )}
            <button className="crit-btn ghost" onClick={() => setSelected(new Set())}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* DATA */}
      <div className="crit-data-card" aria-busy={loading}>
        {loading ? (
          <div className="crit-tbl-wrap">
            <DataTable<Criteria>
              caption="Загрузка критериев"
              columns={criteriaColumns}
              rows={[]}
              rowKey={(c) => c.id}
              loading
              skeletonRows={6}
            />
          </div>
        ) : loadError ? (
          <div className="crit-empty">
            <AlertTriangle size={32} strokeWidth={1.5} aria-hidden="true" />
            <h4>Ошибка загрузки</h4>
            <p>{loadError}</p>
            <button className="crit-btn accent" onClick={loadCriteria}>
              <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
              Повторить
            </button>
          </div>
        ) : visibleCriteria.length === 0 ? (
          (() => {
            const totalForTab = allCriteria.filter(c => c.type === tab).length
            const filtersOn = !!query || scope !== 'ALL' || showInactive
            if (totalForTab === 0) {
              return (
                <div className="crit-empty">
                  <Sparkles size={32} strokeWidth={1.5} aria-hidden="true" />
                  <h4>{tab === 'POSITIVE' ? 'Нет положительных критериев' : 'Нет антибонусов'}</h4>
                  <p>
                    {tab === 'POSITIVE'
                      ? 'Создайте первый критерий — сумма весов глобальных должна составлять ровно 100%.'
                      : 'Антибонусы — штрафные позиции, вычитаемые из итогового балла.'}
                  </p>
                  {isAdmin && (
                    <button
                      className="crit-btn accent"
                      onClick={() => { setEditing(null); setModalOpen(true) }}
                    >
                      <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
                      Создать первый критерий
                    </button>
                  )}
                </div>
              )
            }
            return (
              <div className="crit-empty">
                <Search size={28} strokeWidth={1.6} aria-hidden="true" />
                <h4>Ничего не найдено</h4>
                <p>
                  {filtersOn
                    ? 'Под активные фильтры ничего не подходит. Попробуйте сбросить параметры.'
                    : 'В этом разделе нет видимых записей.'}
                </p>
                {filtersOn && (
                  <button
                    className="crit-btn accent"
                    onClick={() => { setQuery(''); setScope('ALL'); setShowInactive(false) }}
                  >
                    Сбросить все фильтры
                  </button>
                )}
              </div>
            )
          })()
        ) : (
          <div className="crit-tbl-wrap">
            <DataTable<Criteria>
              caption={`Список критериев. Сортировка: ${sortLabel(sortKey)} ${sortDir === 'asc' ? 'по возрастанию' : 'по убыванию'}.`}
              columns={criteriaColumns}
              rows={visibleCriteria}
              rowKey={(c) => c.id}
              sort={{ key: sortKey, dir: sortDir }}
              onSort={(k) => handleSort(k as SortKey)}
              onRowClick={isAdmin ? handleRowClick : undefined}
              totalCount={visibleCriteria.length}
            />
          </div>
        )}

        {!loading && visibleCriteria.length > 0 && (
          <div className="crit-pager">
            <div className="crit-pager-info" aria-live="polite">
              Показано <strong>{visibleCriteria.length}</strong> из <strong>{(tab === 'POSITIVE' ? positiveCount : antiCount)}</strong> {tab === 'POSITIVE' ? 'положительных' : 'анти-бонусных'} критериев
            </div>
            <div className="crit-pager-info" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
              GFH · v1.0
            </div>
          </div>
        )}
      </div>

      <CriteriaFormModal
        open={modalOpen}
        editing={editing}
        prefill={duplicatePrefill}
        orgUnits={orgUnits}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setDuplicatePrefill(null) }}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Деактивировать критерий?"
        description={`«${deactivateTarget?.nameRu}» больше не будет применяться к новым оценкам.`}
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={bulkConfirm === 'deactivate'}
        title="Деактивировать выбранные критерии?"
        description={`Будет деактивировано ${selectedRows.filter(c => c.active && !c.frozen).length} критериев. Замороженные позиции пропущены.`}
        variant="danger"
        onConfirm={runBulkDeactivate}
        onCancel={() => setBulkConfirm(null)}
      />
      <ConfirmDialog
        open={bulkConfirm === 'reactivate'}
        title="Реактивировать выбранные критерии?"
        description={`Будет восстановлено ${selectedRows.filter(c => !c.active).length} критериев из архива.`}
        variant="default"
        onConfirm={runBulkReactivate}
        onCancel={() => setBulkConfirm(null)}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        rows={selectedRows}
        orgUnits={orgUnits}
        onCancel={() => setBulkEditOpen(false)}
        onApply={applyBulkEdit}
      />

      <ConfirmDialog
        open={rebalanceOpen}
        title="Подогнать веса к 100%?"
        description={
          rebalanceTargets.length === 0
            ? 'Нет редактируемых глобальных положительных критериев.'
            : `Будет пропорционально пересчитано ${rebalanceTargets.length} ${plural(rebalanceTargets.length, ['критерий', 'критерия', 'критериев'])}. ` +
              `Текущая сумма редактируемых: ${rebalanceCurrentSum.toFixed(2)}%. ` +
              `Цель: ${rebalanceTargetSum.toFixed(2)}% (заморожено: ${rebalanceFrozenSum.toFixed(2)}%). ` +
              `Коэффициент: ×${rebalanceFactor.toFixed(4)}.`
        }
        variant="default"
        onConfirm={runRebalance}
        onCancel={() => setRebalanceOpen(false)}
      />

      <HistoryDrawer
        target={historyTarget}
        entries={historyEntries}
        loading={historyLoading}
        onClose={() => setHistoryTarget(null)}
      />

      {/* TOAST REGION */}
      <div className="crit-toast-region" role="region" aria-live="polite" aria-label="Уведомления">
        {toasts.map(t => (
          <div key={t.id} className={`crit-toast crit-toast-${t.kind}`} role="status">
            {t.kind === 'success' && <CheckCircle2 size={16} strokeWidth={2} aria-hidden="true" />}
            {t.kind === 'error'   && <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />}
            {t.kind === 'info'    && <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />}
            <span>{t.text}</span>
            {t.action && (
              <button
                className="crit-toast-action"
                onClick={() => { t.action!.onClick(); setToasts(prev => prev.filter(x => x.id !== t.id)) }}
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} aria-label="Закрыть">
              <X size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* SHORTCUTS DIALOG */}
      {shortcutsOpen && (
        <div className="crit-kbd-overlay" role="dialog" aria-modal="true" aria-label="Горячие клавиши" onClick={() => setShortcutsOpen(false)}>
          <div className="crit-kbd-panel" onClick={e => e.stopPropagation()}>
            <div className="crit-kbd-head">
              <h3>Горячие клавиши</h3>
              <button onClick={() => setShortcutsOpen(false)} aria-label="Закрыть">
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <dl className="crit-kbd-list">
              <dt><kbd>/</kbd></dt><dd>Фокус на поиск</dd>
              {isAdmin && (<><dt><kbd>N</kbd></dt><dd>Новый критерий</dd></>)}
              {isAdmin && (<><dt><kbd>E</kbd></dt><dd>Экспорт CSV</dd></>)}
              <dt><kbd>[</kbd> / <kbd>]</kbd></dt><dd>Переключить вкладку</dd>
              <dt><kbd>G</kbd> <kbd>P</kbd> / <kbd>G</kbd> <kbd>A</kbd></dt><dd>Перейти на Положительные / Антибонусы</dd>
              <dt><kbd>Esc</kbd></dt><dd>Сбросить выбор / закрыть диалог</dd>
              <dt><kbd>?</kbd></dt><dd>Показать / скрыть эту справку</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────── COMPONENTS ─────────────────────── */

function sortLabel(k: SortKey): string {
  switch (k) {
    case 'name':   return 'по названию'
    case 'scope':  return 'по области'
    case 'status': return 'по статусу'
    case 'weight': return 'по весу'
    default:       return 'по умолчанию'
  }
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1]
  return forms[2]
}

function KpiCard({
  label, value, sub, tone, stripe,
}: {
  label: string
  value: React.ReactNode
  sub: string
  tone?: 'ok' | 'warn' | 'danger'
  stripe?: 'neutral' | 'positive' | 'anti' | 'ok' | 'warn' | 'danger'
}) {
  const color =
    tone === 'danger' ? '#b3261e' :
    tone === 'warn'   ? '#9a6a18' :
    undefined
  const stripeAttr = stripe ?? tone ?? 'neutral'
  return (
    <div className="crit-kpi-card" data-stripe={stripeAttr}>
      <div className="crit-kpi-label">{label}</div>
      <div className="crit-kpi-value" style={color ? { color } : undefined}>{value}</div>
      <div className="crit-kpi-sub">{sub}</div>
    </div>
  )
}

function InlineWeightEditor({
  initial, isAnti, onCancel, onSave, stop,
}: {
  initial: number
  isAnti: boolean
  onCancel: () => void
  onSave: (raw: string) => void
  stop: (e: React.MouseEvent | React.KeyboardEvent) => void
}) {
  const [val, setVal] = useState(initial.toFixed(2))
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  const commit = () => onSave(val)
  return (
    <div className="crit-inline-edit" onClick={stop}>
      <input
        ref={ref}
        type="number"
        step="0.5"
        min="0"
        max={isAnti ? undefined : 100}
        value={val}
        onChange={e => {
          const n = Number(e.target.value.replace(',', '.'))
          if (!isAnti && isFinite(n) && n > 100) { setVal('100'); return }
          setVal(e.target.value)
        }}
        onBlur={commit}
        onKeyDown={e => {
          stop(e)
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          else if (e.key === 'Escape') { e.preventDefault(); onCancel() }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setVal(v => ((Number(v) || 0) + 0.5).toFixed(2)) }
          else if (e.key === 'ArrowDown') { e.preventDefault(); setVal(v => Math.max(0, (Number(v) || 0) - 0.5).toFixed(2)) }
        }}
        aria-label="Вес критерия"
      />
      <span className="crit-inline-unit">{isAnti ? 'pts' : '%'}</span>
    </div>
  )
}

/* Tooltip on truncation — measures overflow, attaches title only when clipped,
   and shows custom popover on hover/focus that also works for keyboard users. */
function TruncatedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)
  const [hovered, setHovered] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setTruncated(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [text])
  return (
    <span className={`crit-trunc-wrap ${className ?? ''}`}>
      <span
        ref={ref}
        className="crit-trunc"
        tabIndex={truncated ? 0 : -1}
        onMouseEnter={() => truncated && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => truncated && setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={truncated ? text : undefined}
      >
        {text}
      </span>
      {truncated && hovered && (
        <span role="tooltip" className="crit-tooltip">{text}</span>
      )}
    </span>
  )
}

function BulkEditDialog({
  open, rows, orgUnits, onCancel, onApply,
}: {
  open: boolean
  rows: Criteria[]
  orgUnits: OrgUnit[]
  onCancel: () => void
  onApply: (patch: { autoCalculated?: boolean; orgUnitId?: number | null }) => void
}) {
  const [autoMode, setAutoMode] = useState<'keep' | 'on' | 'off'>('keep')
  const [scopeMode, setScopeMode] = useState<'keep' | 'global' | 'local'>('keep')
  const [orgUnitId, setOrgUnitId] = useState<number | ''>('')
  const [step, setStep] = useState<'configure' | 'preview'>('configure')
  useEffect(() => {
    if (open) { setAutoMode('keep'); setScopeMode('keep'); setOrgUnitId(''); setStep('configure') }
  }, [open])
  if (!open) return null
  const count = rows.length
  const patch: { autoCalculated?: boolean; orgUnitId?: number | null } = {}
  if (autoMode === 'on') patch.autoCalculated = true
  else if (autoMode === 'off') patch.autoCalculated = false
  if (scopeMode === 'global') patch.orgUnitId = null
  else if (scopeMode === 'local' && orgUnitId !== '') patch.orgUnitId = Number(orgUnitId)
  const hasPatch = Object.keys(patch).length > 0

  const orgNameById = new Map(orgUnits.map(u => [u.id, u.nameRu]))
  const scopeLabel = (c: Criteria) =>
    c.orgUnitId === null ? 'Глобальный' : (c.orgUnitNameRu ?? orgNameById.get(c.orgUnitId) ?? `#${c.orgUnitId}`)
  const scopeAfter = patch.orgUnitId === undefined
    ? null
    : patch.orgUnitId === null
      ? 'Глобальный'
      : (orgNameById.get(patch.orgUnitId) ?? `#${patch.orgUnitId}`)

  const goPreview = () => { if (hasPatch) setStep('preview') }
  const submit = () => { onApply(patch) }

  return (
    <div className="crit-kbd-overlay" role="dialog" aria-modal="true" aria-label="Массовое редактирование" onClick={onCancel}>
      <div className="crit-kbd-panel" style={{ maxWidth: step === 'preview' ? 680 : 480 }} onClick={e => e.stopPropagation()}>
        <div className="crit-kbd-head">
          <h3>
            {step === 'configure'
              ? `Изменить ${count} ${plural(count, ['критерий', 'критерия', 'критериев'])}`
              : `Подтвердите изменения: ${count} ${plural(count, ['строка', 'строки', 'строк'])}`}
          </h3>
          <button onClick={onCancel} aria-label="Закрыть">
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {step === 'configure' ? (
          <div className="crit-bulk-edit-body">
            <fieldset>
              <legend>Авто-расчёт</legend>
              <label><input type="radio" name="auto" checked={autoMode === 'keep'} onChange={() => setAutoMode('keep')} /> Не менять</label>
              <label><input type="radio" name="auto" checked={autoMode === 'on'}   onChange={() => setAutoMode('on')} />   Включить</label>
              <label><input type="radio" name="auto" checked={autoMode === 'off'}  onChange={() => setAutoMode('off')} />  Выключить</label>
            </fieldset>
            <fieldset>
              <legend>Область применения</legend>
              <label><input type="radio" name="scope" checked={scopeMode === 'keep'}   onChange={() => setScopeMode('keep')} />   Не менять</label>
              <label><input type="radio" name="scope" checked={scopeMode === 'global'} onChange={() => setScopeMode('global')} /> Глобальный</label>
              <label>
                <input type="radio" name="scope" checked={scopeMode === 'local'} onChange={() => setScopeMode('local')} />
                Локальный →
                <select
                  disabled={scopeMode !== 'local'}
                  value={orgUnitId}
                  onChange={e => setOrgUnitId(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">— выбрать отдел —</option>
                  {orgUnits.map(u => <option key={u.id} value={u.id}>{u.nameRu}</option>)}
                </select>
              </label>
            </fieldset>
          </div>
        ) : (
          <div className="crit-bulk-preview-body">
            <div className="crit-bulk-preview-summary">
              {patch.autoCalculated !== undefined && (
                <div><span className="crit-bulk-preview-key">Авто-расчёт:</span> {patch.autoCalculated ? 'Включить' : 'Выключить'}</div>
              )}
              {scopeAfter !== null && (
                <div><span className="crit-bulk-preview-key">Область:</span> {scopeAfter}</div>
              )}
            </div>
            <DataTable<Criteria>
              caption="Предпросмотр массовых изменений"
              rowKey={(c) => c.id}
              rows={rows}
              columns={[
                {
                  key: 'name',
                  header: 'Критерий',
                  render: (c) => c.nameRu,
                },
                ...(patch.autoCalculated !== undefined ? [{
                  key: 'auto',
                  header: 'Авто',
                  render: (c: Criteria) => {
                    const autoBefore = c.autoCalculated
                    const autoAfter = patch.autoCalculated ?? autoBefore
                    return (
                      <span className={`crit-bulk-cell ${autoBefore !== autoAfter ? 'changed' : 'same'}`}>
                        <span className="crit-bulk-was">{autoBefore ? 'да' : 'нет'}</span>
                        <ArrowRight size={11} strokeWidth={2} aria-hidden="true" />
                        <span className="crit-bulk-will">{autoAfter ? 'да' : 'нет'}</span>
                      </span>
                    )
                  },
                }] : []),
                ...(scopeAfter !== null ? [{
                  key: 'scope',
                  header: 'Область',
                  render: (c: Criteria) => {
                    const scopeBefore = scopeLabel(c)
                    const scopeAfterRow = patch.orgUnitId === undefined ? scopeBefore : (scopeAfter ?? scopeBefore)
                    return (
                      <span className={`crit-bulk-cell ${scopeBefore !== scopeAfterRow ? 'changed' : 'same'}`}>
                        <span className="crit-bulk-was">{scopeBefore}</span>
                        <ArrowRight size={11} strokeWidth={2} aria-hidden="true" />
                        <span className="crit-bulk-will">{scopeAfterRow}</span>
                      </span>
                    )
                  },
                }] : []),
              ]}
            />
          </div>
        )}

        <div className="crit-bulk-edit-foot">
          <button className="crit-btn ghost" onClick={onCancel}>Отмена</button>
          {step === 'configure' ? (
            <button
              className="crit-btn accent"
              onClick={goPreview}
              disabled={!hasPatch || (scopeMode === 'local' && orgUnitId === '')}
              title={hasPatch ? '' : 'Выберите хотя бы одно поле для изменения'}
            >
              Предпросмотр →
            </button>
          ) : (
            <>
              <button className="crit-btn" onClick={() => setStep('configure')}>← Назад</button>
              <button className="crit-btn accent" onClick={submit}>Применить</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryDrawer({
  target, entries, loading, onClose,
}: {
  target: Criteria | null
  entries: AuditLogEntry[] | null
  loading: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, onClose])
  if (!target) return null
  return (
    <>
      <div className="crit-drawer-backdrop" onClick={onClose} />
      <aside className="crit-drawer" role="dialog" aria-modal="true" aria-label={`История изменений: ${target.nameRu}`}>
        <div className="crit-drawer-head">
          <div>
            <div className="crit-drawer-eyebrow">История</div>
            <h3>{target.nameRu}</h3>
          </div>
          <button onClick={onClose} aria-label="Закрыть">
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="crit-drawer-body">
          {loading ? (
            <div className="crit-drawer-empty">Загрузка…</div>
          ) : !entries || entries.length === 0 ? (
            <div className="crit-drawer-empty">Записей не найдено.</div>
          ) : (
            <ul className="crit-history-list">
              {entries.map(e => (
                <li key={e.id}>
                  <div className="crit-history-meta">
                    <strong>{e.action}</strong>
                    <span>{new Date(e.createdAt).toLocaleString('ru-RU')}</span>
                  </div>
                  <div className="crit-history-actor">{e.actorEmail}</div>
                  {e.details && <pre className="crit-history-details">{e.details}</pre>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

/* ─────────────────────── SCOPED STYLES ─────────────────────── */

const CSS = `
.crit-asubk {
  --crit-ink: #0b1220;
  --crit-ink-soft: #475569;
  --crit-ink-faint: #64748b;
  --crit-line: #e2e8f0;
  --crit-line-strong: #cbd5e1;
  --crit-line-soft: #eef2f7;
  --crit-surface: #ffffff;
  --crit-surface-muted: #f8fafc;
  --crit-surface-alt: #f1f5f9;
  --crit-accent: #0a6b4e;
  --crit-accent-soft: #e6f1ec;
  --crit-accent-ink: #0a5240;
  --crit-accent-50: #e6f1ec;
  --crit-accent-100: #cce3d8;
  --crit-accent-600: #0a6b4e;
  --crit-accent-700: #095a42;
  --crit-accent-800: #0a5240;
  --crit-success: #0a6b4e;
  --crit-success-soft: #e6f1ec;
  --crit-warn: #b27b14;
  --crit-warn-soft: #fbf2dd;
  --crit-danger: #b3261e;
  --crit-danger-soft: #fbeae8;
  --crit-radius-lg: 14px;
  --crit-radius-md: 10px;
  --crit-radius-sm: 8px;
  --crit-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.04);
  --crit-shadow-md: 0 4px 12px -6px rgba(15, 23, 42, 0.10);
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--crit-ink);
  -webkit-font-smoothing: antialiased;
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 32px 48px;
}
.crit-asubk * { box-sizing: border-box; }
@media (max-width: 720px) {
  .crit-asubk { padding: 20px 16px 40px; }
}

.crit-sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

.crit-asubk :focus-visible {
  outline: 2px solid var(--crit-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

.crit-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.crit-head h1 {
  margin: 0 0 6px;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 22px; font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--crit-ink);
  line-height: 1.25;
}
.crit-subtitle {
  font-size: 14px;
  color: var(--crit-ink-soft);
  max-width: 720px;
  line-height: 1.5;
}
.crit-breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px;
  color: var(--crit-ink-faint);
  margin-bottom: 4px;
}
.crit-breadcrumb a { color: var(--crit-ink-soft); text-decoration: none; }
.crit-breadcrumb a:hover { color: var(--crit-accent); text-decoration: underline; }
.crit-breadcrumb [aria-current="page"] { color: var(--crit-ink); font-weight: 500; }
.crit-meta-row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  font-size: 12.5px;
  color: var(--crit-ink-soft);
  margin: 4px 0 8px;
  font-variant-numeric: tabular-nums;
}
.crit-meta-row strong { color: var(--crit-ink); font-weight: 600; }
.crit-head-actions { display: flex; gap: 10px; flex-shrink: 0; flex-wrap: wrap; }
@media (max-width: 820px) {
  .crit-head { flex-direction: column; align-items: stretch; }
  .crit-head h1 { font-size: 20px; }
  .crit-head-actions { width: 100%; }
}

.crit-btn {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--crit-line);
  background: #fff;
  color: var(--crit-ink);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--crit-radius-md);
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
  white-space: nowrap;
}
.crit-btn:hover { background: var(--crit-surface-muted); border-color: var(--crit-line-strong); }
.crit-btn.accent {
  background: var(--crit-accent);
  border-color: var(--crit-accent);
  color: #fff;
}
.crit-btn.accent:hover { background: #095a42; border-color: #095a42; }
.crit-btn.has-active {
  background: var(--crit-accent-soft);
  border-color: color-mix(in srgb, var(--crit-accent) 28%, transparent);
  color: var(--crit-accent-ink);
}
.crit-btn.ghost { background: transparent; border-color: transparent; }
.crit-btn.ghost:hover { background: var(--crit-surface-muted); }
.crit-btn.danger-ghost {
  background: #fff;
  border-color: #fecaca;
  color: var(--crit-danger);
}
.crit-btn.danger-ghost:hover {
  background: var(--crit-danger-soft);
  border-color: #f87171;
}
.crit-badge-num {
  background: var(--crit-accent);
  color: #fff;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.crit-kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.crit-kpi-card {
  position: relative;
  background: #fff;
  border: 1px solid var(--crit-line);
  border-radius: var(--crit-radius-md);
  padding: 12px 14px 12px 17px;
  overflow: hidden;
}
.crit-kpi-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--crit-line-strong);
}
.crit-kpi-card[data-stripe="positive"]::before { background: var(--crit-accent); }
.crit-kpi-card[data-stripe="anti"]::before     { background: var(--crit-danger); }
.crit-kpi-card[data-stripe="ok"]::before       { background: var(--crit-success); }
.crit-kpi-card[data-stripe="warn"]::before     { background: var(--crit-warn); }
.crit-kpi-card[data-stripe="danger"]::before   { background: var(--crit-danger); }
.crit-kpi-label {
  font-size: 11px;
  color: var(--crit-ink-faint);
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 500;
  margin-bottom: 6px;
}
.crit-kpi-value {
  font-size: 22px;
  font-weight: 650;
  color: var(--crit-ink);
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.crit-kpi-sub {
  font-size: 12px;
  color: var(--crit-ink-soft);
  margin-top: 5px;
  line-height: 1.45;
}
@media (max-width: 980px) {
  .crit-kpi-strip { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .crit-kpi-strip { grid-template-columns: 1fr; }
}

.crit-toolbar {
  background: #fff;
  border: 1px solid var(--crit-line);
  border-radius: var(--crit-radius-lg);
  padding: 10px 12px;
  margin-bottom: 16px;
  position: sticky;
  top: 0;
  z-index: 5;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03), 0 8px 20px -16px rgba(15, 23, 42, 0.18);
}
.crit-toolbar-row {
  display: flex; align-items: center; gap: 12px;
  flex-wrap: wrap;
}
.crit-search {
  position: relative;
  flex: 1; min-width: 240px; max-width: 360px;
}
.crit-search input {
  width: 100%;
  height: 40px;
  padding: 0 40px 0 38px;
  border: 1px solid var(--crit-line);
  border-radius: var(--crit-radius-md);
  font-family: inherit;
  font-size: 13.5px;
  color: var(--crit-ink);
  background: #fff;
  outline: none;
  transition: border-color .1s ease, box-shadow .1s ease;
  box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.02);
}
.crit-search input:focus {
  border-color: var(--crit-accent);
  box-shadow: 0 0 0 3px var(--crit-accent-soft);
}
.crit-search input::placeholder { color: var(--crit-ink-faint); }
.crit-search > svg:first-child {
  position: absolute;
  left: 12px; top: 50%;
  transform: translateY(-50%);
  color: var(--crit-ink-faint);
  pointer-events: none;
}
.crit-search-clear {
  position: absolute;
  right: 6px; top: 50%;
  transform: translateY(-50%);
  width: 28px; height: 28px;
  border: 0; background: transparent;
  color: var(--crit-ink-faint);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
}
.crit-search-clear:hover { background: var(--crit-surface-alt); color: var(--crit-ink); }

.crit-select {
  height: 40px;
  padding: 0 32px 0 12px;
  border: 1px solid var(--crit-line);
  border-radius: var(--crit-radius-md);
  font-family: inherit;
  font-size: 13.5px;
  color: var(--crit-ink);
  background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 12px center;
  appearance: none;
  cursor: pointer;
  min-width: 200px;
  outline: none;
}
.crit-select:hover { border-color: var(--crit-line-strong); }
.crit-select:focus {
  border-color: var(--crit-accent);
  box-shadow: 0 0 0 3px var(--crit-accent-soft);
}

.crit-view-switch {
  display: inline-flex;
  border: 1px solid var(--crit-line);
  border-radius: var(--crit-radius-md);
  overflow: hidden;
  background: #fff;
}
.crit-view-switch button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--crit-ink-soft);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
  transition: background .1s ease, color .1s ease;
}
.crit-view-switch button + button { border-left: 1px solid var(--crit-line); }
.crit-view-switch button:hover { background: var(--crit-surface-muted); color: var(--crit-ink); }
.crit-view-switch button.active {
  background: var(--crit-accent);
  color: #fff;
  font-weight: 600;
  box-shadow: inset 0 -2px 0 rgba(0,0,0,0.12);
}
.crit-view-switch button.active:hover { background: var(--crit-accent); color: #fff; }
.crit-tab-count {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  background: rgba(15,23,42,0.06);
  color: var(--crit-ink-soft);
  padding: 1px 6px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
.crit-view-switch button.active .crit-tab-count {
  background: rgba(255,255,255,0.22);
  color: #fff;
}

.crit-chips-row {
  display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  min-height: 32px;
}
.crit-chip {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 32px;
  padding: 0 4px 0 12px;
  background: var(--crit-accent-soft);
  color: var(--crit-accent-ink);
  border: 1px solid color-mix(in srgb, var(--crit-accent) 18%, transparent);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
}
.crit-chip button {
  border: 0; background: transparent;
  color: var(--crit-accent-ink);
  cursor: pointer;
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%;
  padding: 0;
}
.crit-chip button:hover { background: rgba(10,107,78,0.15); }
.crit-clear-all {
  margin-left: auto;
  background: transparent;
  border: 0;
  color: var(--crit-ink-soft);
  font-family: inherit;
  font-size: 12.5px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  min-height: 32px;
}
.crit-clear-all:hover { background: var(--crit-surface-muted); color: var(--crit-ink); }

/* Bulk action bar */
.crit-bulk-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--crit-accent-soft);
  border: 1px solid color-mix(in srgb, var(--crit-accent) 28%, transparent);
  border-radius: var(--crit-radius-md);
  margin-bottom: 14px;
  flex-wrap: wrap;
  animation: critBulkIn 180ms ease-out;
  position: sticky;
  bottom: 16px;
  z-index: 6;
  box-shadow: 0 10px 24px -12px rgba(10, 107, 78, 0.35), 0 2px 6px rgba(15, 23, 42, 0.06);
}
@keyframes critBulkIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.crit-bulk-count {
  font-size: 13.5px;
  color: var(--crit-accent-ink);
  display: inline-flex; align-items: center; gap: 6px;
}
.crit-bulk-count strong { font-weight: 700; font-variant-numeric: tabular-nums; }
.crit-bulk-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.crit-bulk-bar .crit-btn {
  background: #fff;
  border-color: color-mix(in srgb, var(--crit-accent) 22%, transparent);
}
.crit-bulk-bar .crit-btn:hover { background: var(--crit-surface-muted); border-color: var(--crit-accent); }
.crit-bulk-bar .crit-btn.ghost { background: transparent; border-color: transparent; }
.crit-bulk-bar .crit-btn.ghost:hover { background: rgba(255,255,255,0.6); }

/* Pills */
.crit-pill {
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 22px;
  font-size: 11.5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-weight: 500;
  border: 1px solid transparent;
  white-space: nowrap;
  line-height: 1.4;
  box-sizing: border-box;
}
.crit-pill.with-dot::before {
  content: '';
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
.crit-pill { border: 0 !important; }
.crit-pill.active  { background: var(--crit-success-soft); color: var(--crit-success); }
.crit-pill.warn    { background: var(--crit-warn-soft);    color: var(--crit-warn); }
.crit-pill.danger  { background: var(--crit-danger-soft);  color: var(--crit-danger); }
.crit-pill.accent  { background: var(--crit-accent-soft);  color: var(--crit-accent-ink); }
.crit-pill.neutral { background: var(--crit-surface-alt);  color: var(--crit-ink-soft); }

.crit-data-card {
  background: #fff;
  border: 1px solid var(--crit-line);
  border-radius: var(--crit-radius-lg);
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px -10px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.6);
}
.crit-tbl-wrap {
  overflow-x: auto;
  overflow-y: auto;
  max-height: calc(100vh - 280px);
  position: relative;
  background:
    linear-gradient(to right, #fff 30%, rgba(255,255,255,0)),
    linear-gradient(to right, rgba(255,255,255,0), #fff 70%) 100% 0,
    radial-gradient(farthest-side at 0 50%, rgba(15,23,42,0.10), rgba(15,23,42,0)),
    radial-gradient(farthest-side at 100% 50%, rgba(15,23,42,0.10), rgba(15,23,42,0)) 100% 0;
  background-repeat: no-repeat;
  background-size: 40px 100%, 40px 100%, 14px 100%, 14px 100%;
  background-attachment: local, local, scroll, scroll;
}
.crit-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.75px;
}
.crit-tbl thead th {
  text-align: left;
  font-weight: 500;
  font-size: 11.5px;
  color: var(--crit-ink-soft);
  background: var(--crit-surface-muted);
  border-bottom: 1px solid var(--crit-line);
  padding: 0;
  letter-spacing: 0.06em;
  white-space: nowrap;
  text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
  position: sticky;
  top: 0;
  z-index: 2;
}
.crit-tbl thead th:hover { background: var(--crit-surface-alt); }
.crit-tbl thead th.num { text-align: right; }
.crit-th-btn, .crit-th-static {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 16px;
  background: transparent; border: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  width: 100%;
  text-align: left;
}
.crit-th-btn.num, .crit-th-static.num { justify-content: flex-end; }
.crit-th-static { cursor: default; }
.crit-th-btn:focus-visible { outline: 2px solid var(--crit-accent); outline-offset: -2px; }
.crit-th-btn:hover { color: var(--crit-ink); background: rgba(15,23,42,0.03); }
.crit-th-btn.active {
  color: var(--crit-accent-ink);
  background: var(--crit-accent-soft);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
.crit-th-btn.active .crit-sort-ind { color: var(--crit-accent); }
.crit-sort-ind { display: inline-flex; color: var(--crit-ink-faint); }
.crit-tbl thead th input[type="checkbox"] { margin: 0 0 0 16px; }

.crit-tbl tbody tr {
  transition: background .12s ease;
  content-visibility: auto;
  contain-intrinsic-size: auto 64px;
}
.crit-tbl tbody tr.clickable { cursor: pointer; }
.crit-tbl tbody tr.clickable:hover td { background: var(--crit-accent-soft); }
.crit-tbl tbody tr.selected td { background: var(--crit-accent-soft); }
.crit-tbl tbody tr.selected td:first-child { box-shadow: inset 3px 0 0 var(--crit-accent); }
.crit-tbl tbody td { min-height: 60px; }
.crit-tbl tbody tr.clickable:hover td:first-child { box-shadow: inset 3px 0 0 color-mix(in srgb, var(--crit-accent) 60%, transparent); }
.crit-tbl tbody tr.selected td {
  background: color-mix(in srgb, var(--crit-accent-soft) 70%, #fff) !important;
  box-shadow: inset 3px 0 0 var(--crit-accent);
  font-weight: 500;
}
.crit-tbl tbody tr:focus-visible { outline: none; }
.crit-tbl tbody tr:focus-visible td:first-child { box-shadow: inset 3px 0 0 var(--crit-accent); }
.crit-tbl tbody td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--crit-line-soft);
  color: var(--crit-ink);
  vertical-align: middle;
}
.crit-tbl tbody tr:last-child td { border-bottom: 0; }
.crit-tbl td.num { text-align: right; font-variant-numeric: tabular-nums; }
.crit-tbl input[type="checkbox"] {
  width: 16px; height: 16px;
  accent-color: var(--crit-accent);
  cursor: pointer;
}
.crit-mono { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: var(--crit-ink-soft); }

.crit-name-cell { display: flex; align-items: center; gap: 12px; min-width: 240px; }
.crit-logo-mini {
  width: 34px; height: 34px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
}
.crit-logo-c1 { background: #e6f1ec; color: #0a5240; border-color: rgba(10,107,78,0.18); }
.crit-logo-c2 { background: #e6eef5; color: #2f4a66; border-color: rgba(47,74,102,0.18); }
.crit-logo-c3 { background: #f3ecdf; color: #6e5527; border-color: rgba(110,85,39,0.18); }
.crit-logo-c4 { background: #ebe7f1; color: #4d3f63; border-color: rgba(77,63,99,0.18); }
.crit-logo-c5 { background: #f1e5e7; color: #6d3a44; border-color: rgba(109,58,68,0.18); }
.crit-logo-c6 { background: #e7e9ed; color: #2a3340; border-color: rgba(42,51,64,0.18); }
.crit-logo-c7 { background: #e3ede7; color: #2c4e3c; border-color: rgba(44,78,60,0.18); }
.crit-logo-c8 { background: #efece1; color: #5a522f; border-color: rgba(90,82,47,0.18); }

.crit-name-block { line-height: 1.35; min-width: 0; max-width: 420px; }
.crit-trunc-wrap {
  position: relative;
  display: block;
  max-width: 100%;
}
.crit-trunc {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
.crit-name-ru .crit-trunc {
  font-size: 14px; font-weight: 600;
  color: var(--crit-ink);
  letter-spacing: -0.005em;
}
.crit-name-kg .crit-trunc {
  font-size: 12px;
  color: var(--crit-ink-soft);
  font-family: 'JetBrains Mono', monospace;
  font-style: italic;
  margin-top: 2px;
}
.crit-tooltip {
  position: absolute;
  left: 0; bottom: calc(100% + 8px);
  z-index: 50;
  background: var(--crit-ink);
  color: #fff;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  font-style: normal;
  font-weight: 500;
  padding: 7px 10px;
  border-radius: 8px;
  max-width: 320px;
  white-space: normal;
  word-break: break-word;
  box-shadow: 0 6px 16px rgba(15,23,42,0.18);
  pointer-events: none;
  animation: critTipIn 120ms ease-out;
}
@keyframes critTipIn {
  from { opacity: 0; transform: translateY(2px); }
  to   { opacity: 1; transform: translateY(0); }
}

.crit-share-cell { min-width: 140px; display: inline-block; text-align: left; width: 100%; }
.crit-share-num {
  font-size: 14.5px;
  font-weight: 650;
  color: var(--crit-ink);
  font-variant-numeric: tabular-nums;
  text-align: right;
  letter-spacing: -0.005em;
}
.crit-share-edit-hint { margin-left: 4px; opacity: 0; transition: opacity .12s ease; color: var(--crit-ink-faint); vertical-align: middle; }
.crit-share-cell.editable:hover .crit-share-edit-hint { opacity: 1; color: var(--crit-accent); }
.crit-share-num small {
  font-weight: 500; color: var(--crit-ink-faint);
  font-size: 11px;
  margin-left: 2px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.crit-share-bar {
  position: relative;
  height: 6px;
  background: var(--crit-surface-alt);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 6px;
}
.crit-share-bar.is-budget {
  /* track represents the full 100% budget — emphasize edges */
  background: linear-gradient(90deg,
    var(--crit-surface-alt) 0%,
    var(--crit-surface-alt) 99%,
    color-mix(in srgb, var(--crit-accent) 30%, transparent) 100%);
  outline: 1px solid color-mix(in srgb, var(--crit-line) 80%, transparent);
  outline-offset: 0;
}
.crit-share-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 360ms cubic-bezier(.22,.84,.32,1);
  will-change: width;
}

.crit-row-actions {
  display: flex; gap: 4px; justify-content: flex-end;
  opacity: 0;
  transition: opacity .12s ease;
}
.crit-tbl tbody tr:hover .crit-row-actions,
.crit-tbl tbody tr:focus-within .crit-row-actions,
.crit-tbl tbody tr.selected .crit-row-actions { opacity: 1; }
@media (hover: none) {
  .crit-row-actions { opacity: 1; }
}
.crit-iconbtn {
  width: 34px; height: 34px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--crit-ink-soft);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
}
.crit-iconbtn:hover { background: var(--crit-surface-muted); border-color: var(--crit-line); color: var(--crit-ink); }
.crit-iconbtn:focus-visible { outline: 2px solid var(--crit-accent); outline-offset: 1px; }
.crit-iconbtn.danger:hover  { background: var(--crit-danger-soft);  color: var(--crit-danger);  border-color: color-mix(in srgb, var(--crit-danger) 22%, transparent); }
.crit-iconbtn.success:hover { background: var(--crit-success-soft); color: var(--crit-success); border-color: color-mix(in srgb, var(--crit-success) 22%, transparent); }

.crit-pager {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px;
  border-top: 1px solid var(--crit-line);
  background: var(--crit-surface-muted);
  flex-wrap: wrap;
  gap: 12px;
}
.crit-pager-info { font-size: 13px; color: var(--crit-ink-soft); line-height: 1.4; display: inline-flex; align-items: center; gap: 4px; }
.crit-pager-info strong { color: var(--crit-ink); font-weight: 600; font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', monospace; }

.crit-empty {
  padding: 80px 24px;
  text-align: center;
  color: var(--crit-ink-soft);
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.crit-empty > svg:first-child {
  color: var(--crit-accent);
  padding: 14px;
  background: var(--crit-accent-soft);
  border-radius: 50%;
  box-sizing: content-box;
  margin-bottom: 4px;
}
.crit-empty h4 {
  margin: 6px 0 0;
  font-size: 16px; font-weight: 600; color: var(--crit-ink);
  letter-spacing: -0.005em;
}
.crit-empty p { margin: 0; font-size: 13.5px; max-width: 420px; line-height: 1.55; }
.crit-empty .crit-btn { margin-top: 14px; }

/* Skeleton */
.crit-sk-cell {
  display: inline-block;
  height: 12px;
  background: linear-gradient(90deg, var(--crit-line-soft) 0%, var(--crit-surface-muted) 50%, var(--crit-line-soft) 100%);
  background-size: 200% 100%;
  border-radius: 4px;
  animation: critShimmer 1.1s ease-in-out infinite;
}
@keyframes critShimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.crit-kbd-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: var(--crit-surface-muted);
  border: 1px solid var(--crit-line);
  border-bottom-width: 2px;
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--crit-ink-soft);
  display: inline-flex; align-items: center;
  min-width: 16px;
  justify-content: center;
}

/* Toasts */
.crit-toast-region {
  position: fixed;
  right: 20px; bottom: 20px;
  z-index: 100;
  display: flex; flex-direction: column;
  gap: 10px;
  max-width: 380px;
  pointer-events: none;
}
.crit-toast {
  pointer-events: auto;
  display: flex; align-items: center; gap: 10px;
  background: var(--crit-surface);
  border: 1px solid var(--crit-line);
  border-radius: 12px;
  padding: 11px 13px;
  box-shadow: 0 14px 36px rgba(15,23,42,0.14), 0 2px 6px rgba(15,23,42,0.06);
  font-size: 13px;
  color: var(--crit-ink);
  animation: critToastIn 200ms ease-out;
}
.crit-toast > span { flex: 1; line-height: 1.4; }
.crit-toast button {
  width: 24px; height: 24px;
  border: 0; background: transparent;
  color: var(--crit-ink-faint);
  cursor: pointer;
  border-radius: 4px;
  display: inline-flex; align-items: center; justify-content: center;
}
.crit-toast button:hover { background: var(--crit-surface-muted); color: var(--crit-ink); }
.crit-toast-action {
  width: auto !important; height: auto !important;
  padding: 4px 10px !important;
  border-radius: 6px !important;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--crit-accent) !important;
  background: var(--crit-accent-soft) !important;
}
.crit-toast-action:hover { background: color-mix(in srgb, var(--crit-accent) 18%, transparent) !important; }
.crit-toast-success { border-left: 4px solid var(--crit-success); background: linear-gradient(90deg, var(--crit-success-soft) 0%, var(--crit-surface) 35%); }
.crit-toast-success > svg { color: var(--crit-success); }
.crit-toast-error   { border-left: 4px solid var(--crit-danger);  background: linear-gradient(90deg, var(--crit-danger-soft) 0%, var(--crit-surface) 35%); }
.crit-toast-error   > svg { color: var(--crit-danger); }
.crit-toast-info    { border-left: 4px solid var(--crit-warn);    background: linear-gradient(90deg, var(--crit-warn-soft) 0%, var(--crit-surface) 35%); }
.crit-toast-info    > svg { color: var(--crit-warn); }
@keyframes critToastIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Shortcuts dialog */
.crit-kbd-overlay {
  position: fixed; inset: 0;
  background: rgba(11,18,32,0.5);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: critFadeIn 150ms ease-out;
}
.crit-kbd-panel {
  background: var(--crit-surface);
  border: 1px solid var(--crit-line);
  border-radius: 16px;
  padding: 22px 24px 24px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 24px 60px rgba(15,23,42,0.30);
}
.crit-kbd-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.crit-kbd-head h3 {
  margin: 0;
  font-size: 15px; font-weight: 600;
  color: var(--crit-ink);
}
.crit-kbd-head button {
  width: 28px; height: 28px;
  border: 0; background: transparent;
  cursor: pointer;
  color: var(--crit-ink-soft);
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
}
.crit-kbd-head button:hover { background: var(--crit-surface-muted); color: var(--crit-ink); }
.crit-kbd-list {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 10px 18px;
  margin: 0;
  font-size: 13px;
}
.crit-kbd-list dt { margin: 0; }
.crit-kbd-list dd { margin: 0; color: var(--crit-ink-soft); align-self: center; }
.crit-kbd-list kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  background: var(--crit-surface-muted);
  border: 1px solid var(--crit-line);
  border-bottom-width: 2px;
  padding: 3px 8px;
  border-radius: 5px;
  color: var(--crit-ink);
  min-width: 22px;
  display: inline-block;
  text-align: center;
}
@keyframes critFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Popover (Views + Cols menus) */
.crit-popover-wrap { position: relative; display: inline-block; }
.crit-popover {
  position: absolute;
  top: calc(100% + 6px); right: 0;
  z-index: 60;
  width: 300px;
  background: var(--crit-surface);
  border: 1px solid var(--crit-line);
  border-radius: var(--crit-radius-md);
  box-shadow: 0 20px 48px rgba(15,23,42,0.16), 0 2px 6px rgba(15,23,42,0.06);
  animation: critPopIn 140ms ease-out;
  overflow: hidden;
}
@keyframes critPopIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.crit-popover-head {
  padding: 10px 12px 8px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--crit-ink-faint);
  background: var(--crit-surface-muted);
}
.crit-popover-empty {
  padding: 20px 12px;
  font-size: 12.5px;
  color: var(--crit-ink-faint);
  text-align: center;
  font-style: italic;
}
.crit-views-list, .crit-cols-list {
  list-style: none; margin: 0; padding: 6px;
  max-height: 240px; overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--crit-line-strong) transparent;
}
.crit-views-list::-webkit-scrollbar, .crit-cols-list::-webkit-scrollbar { width: 6px; }
.crit-views-list::-webkit-scrollbar-thumb, .crit-cols-list::-webkit-scrollbar-thumb { background: var(--crit-line-strong); border-radius: 3px; }
.crit-views-list li {
  display: flex; align-items: center; gap: 6px;
  padding: 2px 0;
}
.crit-view-apply {
  flex: 1;
  text-align: left;
  background: transparent; border: 0;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
  font: inherit; color: var(--crit-ink);
  display: flex; align-items: baseline; justify-content: space-between; gap: 8px;
  transition: background .12s ease;
}
.crit-view-apply:hover { background: var(--crit-surface-muted); }
.crit-view-apply small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  color: var(--crit-ink-faint);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.crit-view-del {
  width: 28px; height: 28px;
  border: 0; background: transparent;
  color: var(--crit-ink-faint);
  cursor: pointer;
  border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background .12s ease, color .12s ease;
}
.crit-view-del:hover { background: var(--crit-danger-soft); color: var(--crit-danger); }
.crit-cols-list li label {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  border-radius: 7px;
  font-size: 13px;
  cursor: pointer;
  transition: background .12s ease;
}
.crit-cols-list li label:hover { background: var(--crit-surface-muted); }
.crit-cols-list input[type="checkbox"]:disabled + * { color: var(--crit-ink-faint); }
.crit-col-req {
  margin-left: auto;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--crit-ink-faint);
  text-transform: uppercase;
}
.crit-popover-foot {
  display: flex; gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--crit-line-soft);
  background: var(--crit-surface-muted);
}
.crit-popover-foot input {
  flex: 1;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--crit-line);
  border-radius: 7px;
  font: inherit; font-size: 12.5px;
  background: var(--crit-surface);
  color: var(--crit-ink);
  outline: none;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.crit-popover-foot input:focus { box-shadow: 0 0 0 3px var(--crit-accent-soft); }
.crit-popover-foot input:focus { border-color: var(--crit-accent); }
.crit-popover-foot .crit-btn { min-height: 34px; padding: 0 12px; font-size: 12.5px; border-radius: 7px; }

/* Inline weight edit */
.crit-share-cell.editable { cursor: pointer; }
.crit-share-cell.editable:hover .crit-share-num { color: var(--crit-accent-ink); }
.crit-inline-edit {
  display: inline-flex; align-items: center; gap: 4px;
  background: #fff;
  border: 1px solid var(--crit-accent);
  border-radius: 7px;
  padding: 3px 6px;
  box-shadow: 0 0 0 3px var(--crit-accent-soft);
}
.crit-inline-edit input {
  width: 76px;
  height: 28px;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--crit-ink);
  text-align: right;
  outline: none;
  padding: 0 2px;
}
.crit-inline-unit {
  font-size: 11px;
  color: var(--crit-ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Bulk edit body */
.crit-bulk-edit-body { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
.crit-bulk-edit-body fieldset {
  border: 1px solid var(--crit-line);
  border-radius: var(--crit-radius-md);
  padding: 12px 14px;
  margin: 0;
  background: var(--crit-surface-muted);
}
.crit-bulk-edit-body legend {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--crit-ink-faint);
  padding: 0 6px;
  background: var(--crit-surface);
  border-radius: 4px;
}
.crit-bulk-edit-body label {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  cursor: pointer;
  color: var(--crit-ink);
}
.crit-bulk-edit-body select {
  margin-left: 6px;
  height: 30px;
  padding: 0 24px 0 10px;
  border: 1px solid var(--crit-line);
  border-radius: 6px;
  font: inherit;
  font-size: 12.5px;
  background: var(--crit-surface);
  color: var(--crit-ink);
  outline: none;
  transition: border-color .12s ease, box-shadow .12s ease;
}
.crit-bulk-edit-body select:focus { border-color: var(--crit-accent); box-shadow: 0 0 0 3px var(--crit-accent-soft); }
.crit-bulk-edit-body select:disabled { opacity: 0.5; cursor: not-allowed; }
.crit-bulk-edit-foot {
  display: flex; gap: 8px; justify-content: flex-end;
}

/* History drawer */
.crit-drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(11,18,32,0.45);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: 150;
  animation: critFadeIn 150ms ease-out;
}
.crit-drawer {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 480px; max-width: 92vw;
  background: var(--crit-surface);
  border-left: 1px solid var(--crit-line);
  z-index: 160;
  display: flex; flex-direction: column;
  box-shadow: -24px 0 72px rgba(15,23,42,0.22);
  animation: critDrawerIn 220ms cubic-bezier(.22,.84,.32,1);
}
@keyframes critDrawerIn {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
.crit-drawer-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--crit-line);
  background: var(--crit-surface-muted);
}
.crit-drawer-head h3 {
  margin: 0;
  font-size: 17px; font-weight: 600;
  color: var(--crit-ink);
  letter-spacing: -0.005em;
}
.crit-drawer-eyebrow {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--crit-ink-faint);
  margin-bottom: 4px;
}
.crit-drawer-head button {
  width: 32px; height: 32px;
  border: 0; background: transparent;
  cursor: pointer;
  color: var(--crit-ink-soft);
  border-radius: 7px;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background .12s ease, color .12s ease;
}
.crit-drawer-head button:hover { background: var(--crit-surface); color: var(--crit-ink); border: 1px solid var(--crit-line); }
.crit-drawer-body { flex: 1; overflow-y: auto; padding: 18px 24px; }
.crit-drawer-empty {
  text-align: center;
  font-size: 13px;
  color: var(--crit-ink-soft);
  padding: 40px 0;
}
.crit-history-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.crit-history-list li {
  border: 1px solid var(--crit-line-soft);
  border-left: 3px solid var(--crit-accent);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--crit-surface);
  transition: background .12s ease;
}
.crit-history-list li:hover { background: var(--crit-surface-muted); }
.crit-history-meta {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}
.crit-history-meta strong {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: var(--crit-accent-ink);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.crit-history-meta span {
  font-size: 11px;
  color: var(--crit-ink-faint);
  font-variant-numeric: tabular-nums;
}
.crit-history-actor {
  font-size: 12.5px;
  color: var(--crit-ink-soft);
}
.crit-history-details {
  margin: 8px 0 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: var(--crit-ink-soft);
  background: var(--crit-surface-alt);
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--crit-line-soft);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
}

/* Dark mode — token overrides only; structure unchanged */
@media (prefers-color-scheme: dark) {
  .crit-asubk {
    --crit-ink: #e8edf3;
    --crit-ink-soft: #9aa6b8;
    --crit-ink-faint: #64748b;
    --crit-line: #1f2a3a;
    --crit-line-strong: #2c3a4e;
    --crit-line-soft: #1a2331;
    --crit-surface: #0d141f;
    --crit-surface-muted: #111a26;
    --crit-surface-alt: #18222f;
    --crit-accent: #2d9b78;
    --crit-accent-soft: #14322a;
    --crit-accent-ink: #6cd6b1;
    --crit-success: #2d9b78;
    --crit-success-soft: #14322a;
    --crit-warn: #d4a23a;
    --crit-warn-soft: #2e2412;
    --crit-danger: #e07060;
    --crit-danger-soft: #2e1816;
  }
  .crit-asubk .crit-btn { background: var(--crit-surface-muted); color: var(--crit-ink); }
  .crit-asubk .crit-btn:hover { background: var(--crit-surface-alt); }
  .crit-asubk .crit-btn.accent { color: #04150f; }
  .crit-asubk .crit-search input,
  .crit-asubk .crit-select,
  .crit-asubk .crit-view-switch,
  .crit-asubk .crit-toolbar,
  .crit-asubk .crit-data-card,
  .crit-asubk .crit-kpi-card { background: var(--crit-surface); }
  .crit-asubk .crit-tbl thead th { background: var(--crit-surface-muted); }
  .crit-asubk .crit-tbl tbody tr:nth-child(even) td { background: var(--crit-surface-muted); }
  .crit-asubk .crit-tbl tbody tr.clickable:hover td { background: var(--crit-accent-soft); }
  .crit-asubk .crit-pager { background: var(--crit-surface-muted); }
  .crit-asubk .crit-tooltip {
    background: #f1f5f9; color: #0b1220;
    box-shadow: 0 6px 16px rgba(0,0,0,0.5);
  }
  .crit-asubk .crit-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .crit-asubk *, .crit-asubk *::before, .crit-asubk *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
  .crit-share-bar-fill { transition: none !important; }
  .crit-bulk-bar { animation: none !important; }
}

@media (max-width: 720px) {
  .crit-head { flex-direction: column; align-items: stretch; }
  .crit-head-actions { width: 100%; }
  .crit-head-actions .crit-btn { flex: 1; justify-content: center; min-height: 36px; padding: 0 10px; }
  .crit-search { max-width: none; }
  .crit-toolbar-row > div[style*="margin-left"] { margin-left: 0 !important; width: 100%; }
  .crit-view-switch { width: 100%; }
  .crit-view-switch button { flex: 1; justify-content: center; min-height: 38px; }
  .crit-pager { flex-direction: column; align-items: stretch; gap: 8px; }
  .crit-pager-info { text-align: center; }

  /* Sticky first content column (name) + horizontal scroll */
  .crit-tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .crit-tbl { min-width: 720px; }
  .crit-tbl thead th:nth-child(2),
  .crit-tbl tbody td:nth-child(2) {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--crit-surface);
    box-shadow: 6px 0 12px -8px rgba(0,0,0,0.25);
  }
  .crit-tbl tbody tr:nth-child(even) td:nth-child(2) { background: var(--crit-surface-muted); }
  .crit-tbl tbody tr.selected td:nth-child(2),
  .crit-tbl tbody tr.clickable:hover td:nth-child(2) { background: var(--crit-accent-soft); }
}

/* ── REBALANCE STRIP ── */
.crit-rebalance-strip {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 12px 16px; margin-bottom: 16px;
  border-radius: var(--crit-radius-md);
  border: 1px solid;
  font-size: 13.5px;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.02);
}
.crit-rebalance-text > svg {
  flex-shrink: 0;
  padding: 6px;
  width: 16px; height: 16px;
  border-radius: 8px;
  background: rgba(255,255,255,0.6);
  box-sizing: content-box;
}
.crit-rebalance-text > span { font-weight: 500; }
.crit-rebalance-strip.is-warn  { background: var(--crit-warn-soft); border-color: color-mix(in srgb, var(--crit-warn) 32%, transparent); color: #5a3e0a; }
.crit-rebalance-strip.is-danger{ background: var(--crit-danger-soft); border-color: color-mix(in srgb, var(--crit-danger) 38%, transparent); color: #7a2c1a; }
.crit-rebalance-text { display: inline-flex; align-items: center; gap: 8px; flex: 1; min-width: 260px; }
.crit-rebalance-text strong { font-variant-numeric: tabular-nums; }
.crit-rebalance-strip .crit-btn { margin-left: auto; }

/* ── BULK PREVIEW ── */
.crit-bulk-preview-body {
  max-height: 60vh; overflow: auto;
  margin-bottom: 16px;
  border: 1px solid rgba(14,39,36,0.10);
  border-radius: 8px;
}
.crit-bulk-preview-summary {
  display: flex; gap: 18px; flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--crit-surface-muted);
  border-bottom: 1px solid rgba(14,39,36,0.08);
  font-size: 12.5px;
}
.crit-bulk-preview-key {
  color: var(--crit-ink-faint); margin-right: 6px; font-weight: 500;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.crit-bulk-preview-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.crit-bulk-preview-tbl th {
  text-align: left; padding: 9px 12px;
  background: var(--crit-surface-muted);
  border-bottom: 1px solid var(--crit-line);
  font-weight: 500; color: var(--crit-ink-soft);
  font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
  font-family: 'JetBrains Mono', monospace;
}
.crit-bulk-preview-tbl td {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(14,39,36,0.05);
  vertical-align: middle;
}
.crit-bulk-preview-tbl tr:last-child td { border-bottom: 0; }
.crit-bulk-cell { display: inline-flex; align-items: center; }
.crit-bulk-cell.changed { font-weight: 600; }
.crit-bulk-cell.same  { color: var(--crit-ink-faint); }
.crit-bulk-was, .crit-bulk-will { display: inline-block; vertical-align: middle; }
.crit-bulk-was  { color: var(--crit-ink-faint); text-decoration: line-through; margin-right: 6px; }
.crit-bulk-will { color: var(--crit-accent); margin-left: 6px; }
.crit-bulk-cell.same .crit-bulk-will { color: var(--crit-ink-faint); }
.crit-bulk-cell.same .crit-bulk-was { text-decoration: none; }

/* ── PRINT ── */
@media print {
  /* Hide chrome */
  .crit-head-actions,
  .crit-toolbar,
  .crit-chips-row,
  .crit-bulk-bar,
  .crit-rebalance-strip,
  .crit-toast-region,
  .crit-kbd-overlay,
  .crit-drawer,
  .crit-drawer-backdrop,
  .crit-popover,
  .crit-row-actions,
  .crit-pager { display: none !important; }

  body, .crit-asubk {
    background: #fff !important;
    color: #000 !important;
    font-size: 11pt;
  }
  .crit-asubk h1 { font-size: 18pt; margin-bottom: 4pt; }
  .crit-subtitle { font-size: 9pt; color: #444; margin-bottom: 8pt; }

  .crit-kpi-strip {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8pt;
    margin-bottom: 10pt;
  }
  .crit-kpi-card {
    border: 1pt solid #999 !important;
    background: #fff !important;
    box-shadow: none !important;
    padding: 6pt 8pt !important;
    page-break-inside: avoid;
  }

  .crit-data-card {
    border: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .crit-tbl { border-collapse: collapse !important; width: 100%; }
  .crit-tbl thead { display: table-header-group; }
  .crit-tbl tfoot { display: table-footer-group; }
  .crit-kpi-strip { break-after: page; page-break-after: always; }
  .crit-tbl thead th {
    background: #f0f0f0 !important;
    color: #000 !important;
    border-bottom: 0.75pt solid #000 !important;
    padding: 4pt 6pt;
    font-size: 9pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .crit-tbl tbody td {
    border-bottom: 0.4pt solid #ccc !important;
    padding: 4pt 6pt;
    background: #fff !important;
    page-break-inside: avoid;
  }
  .crit-tbl tbody tr { page-break-inside: avoid; }

  .crit-share-bar, .crit-share-bar-fill { display: none !important; }
  .crit-share-num { font-weight: 600; }
  .crit-logo-mini { display: none !important; }
  .crit-pill {
    border: 0.5pt solid #666 !important;
    background: #fff !important;
    color: #000 !important;
    padding: 0 4pt !important;
    font-size: 8pt;
  }
  .crit-name-kg { color: #555 !important; font-size: 9pt; }

  /* Append a print-only footer hint */
  .crit-data-card::after {
    content: "Печатная версия. Источник: KPI · " attr(data-print-date);
    display: block;
    margin-top: 8pt;
    font-size: 8pt;
    color: #666;
  }

  a[href]::after { content: ""; }
}
`
