import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Table, BarChart2, Grid, X } from 'lucide-react'
import { analyticsApi, HierarchicalNode } from './analyticsApi'
import api from '../../app/api'
import { ExportButtons } from '../../components/ExportButtons'
import { DataTable, type Column } from '../../components/DataTable'
import { TableCard } from '../../components/TableCard'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'

const PLACEHOLDER = '··'

type DisplayMode = 'table' | 'bar' | 'tree' | 'heatmap'

interface OrgUnitOption { id: number; nameRu: string; nameKg: string }

function scoreColor(score: number | null): string {
  if (score === null) return '#e5e7eb'
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#ca8a04'
  return '#dc2626'
}

/** Cream-theme score color for table cells (scoreColor stays hex for charts). */
function scoreVar(score: number | null): string {
  if (score === null) return 'var(--ink-faint)'
  if (score >= 80) return 'var(--accent-2)'
  if (score >= 60) return 'var(--gold)'
  return 'var(--danger)'
}

function scoreBgClass(score: number | null): string {
  if (score === null) return 'bg-gray-100'
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-400'
  return 'bg-red-500'
}

function flattenTree(nodes: HierarchicalNode[]): HierarchicalNode[] {
  const result: HierarchicalNode[] = []
  const visit = (n: HierarchicalNode) => {
    result.push(n)
    n.children.forEach(visit)
  }
  nodes.forEach(visit)
  return result
}

type FlatRow = HierarchicalNode & { depth: number }

function flattenTreeWithDepth(nodes: HierarchicalNode[]): FlatRow[] {
  const result: FlatRow[] = []
  const visit = (n: HierarchicalNode, depth: number) => {
    result.push({ ...n, depth })
    n.children.forEach(c => visit(c, depth + 1))
  }
  nodes.forEach(n => visit(n, 0))
  return result
}

function TreeNode({ node, depth = 0, onDrillDown }: {
  node: HierarchicalNode; depth?: number; onDrillDown: (n: HierarchicalNode) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const score = node.avgScore

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-gray-200 pl-3' : ''}>
      <div
        className="flex items-center gap-2 py-2 cursor-pointer hover:bg-gray-50 rounded px-2"
        onClick={() => onDrillDown(node)}
      >
        {node.children.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
            className="text-gray-400 hover:text-gray-600 w-4"
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {node.children.length === 0 && <span className="w-4" />}

        <span className="text-sm font-medium text-gray-900">{node.orgUnitNameRu}</span>
        <span className="text-xs text-gray-400">({node.employeeCount} чел.)</span>

        {score !== null && (
          <span className={`ml-auto text-xs font-mono font-bold px-2 py-0.5 rounded text-white ${scoreBgClass(score)}`}>
            {Number(score).toFixed(1)}
          </span>
        )}
      </div>
      {expanded && node.children.map(child => (
        <TreeNode key={child.orgUnitId} node={child} depth={depth + 1} onDrillDown={onDrillDown} />
      ))}
    </div>
  )
}

export function HierarchicalAnalyticsPage() {
  const [nodes, setNodes] = useState<HierarchicalNode[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [periodType, setPeriodType] = useState<string>('MONTHLY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [mode, setMode] = useState<DisplayMode>('tree')
  const [loading, setLoading] = useState(true)
  const [drillDown, setDrillDown] = useState<HierarchicalNode | null>(null)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    api.get<Array<{ id: number; nameRu: string; nameKg: string; children?: any[] }>>('/org/structure')
      .then(r => {
        const flatten = (units: any[]): OrgUnitOption[] =>
          units.flatMap(u => [
            { id: u.id, nameRu: u.nameRu, nameKg: u.nameKg },
            ...flatten(u.children || [])
          ])
        setOrgUnits(flatten(r.data))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    analyticsApi.hierarchical({
      orgUnitId: selectedUnit ? Number(selectedUnit) : undefined,
      periodType,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then(data => { setNodes(data); setFailed(false) })
      .catch(() => setFailed(true))
      .finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [selectedUnit, periodType, startDate, endDate])

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

  const flat = flattenTree(nodes)
  const flatRows = flattenTreeWithDepth(nodes)

  /* ── derived stats ─────────────────────────────────────────────────────── */
  const unitCount = flat.length
  const totalEmployees = useMemo(() => flat.reduce((s, n) => s + n.employeeCount, 0), [flat])
  const scoredUnits = useMemo(() => flat.filter(n => n.avgScore !== null), [flat])
  const orgAvg = scoredUnits.length
    ? scoredUnits.reduce((s, n) => s + (n.avgScore as number), 0) / scoredUnits.length
    : null
  const orgAvgWhole = orgAvg !== null ? Math.round(orgAvg) : null
  const topUnits = useMemo(() => scoredUnits.filter(n => (n.avgScore as number) >= 80).length, [scoredUnits])
  const riskUnits = useMemo(() => scoredUnits.filter(n => (n.avgScore as number) < 60).length, [scoredUnits])

  const tableColumns: Column<FlatRow>[] = [
    {
      key: 'orgUnit',
      header: 'Подразделение',
      render: n => (
        <span
          className="text-sm font-medium"
          style={{ paddingLeft: n.depth * 18, display: 'inline-block', color: 'var(--ink)' }}
        >
          {n.orgUnitNameRu}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Тип',
      render: n => <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{n.type}</span>,
    },
    {
      key: 'employeeCount',
      header: 'Сотр.',
      render: n => <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{n.employeeCount}</span>,
    },
    {
      key: 'avgScore',
      header: 'Ср. балл',
      render: n =>
        n.avgScore !== null ? (
          <span className="font-mono font-bold" style={{ color: scoreVar(n.avgScore) }}>
            {Number(n.avgScore).toFixed(1)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'minMax',
      header: 'Мин / Макс',
      render: n => (
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          {n.minScore !== null ? Number(n.minScore).toFixed(1) : '—'} /{' '}
          {n.maxScore !== null ? Number(n.maxScore).toFixed(1) : '—'}
        </span>
      ),
    },
  ]

  const barData = flat.map(n => ({
    name: n.orgUnitNameRu,
    score: n.avgScore !== null ? Number(Number(n.avgScore).toFixed(1)) : 0
  }))

  const modes: Array<{ key: DisplayMode; icon: React.ReactNode; label: string }> = [
    { key: 'tree', icon: '🌳', label: 'Дерево' },
    { key: 'table', icon: <Table size={14} />, label: 'Таблица' },
    { key: 'bar', icon: <BarChart2 size={14} />, label: 'Диаграмма' },
    { key: 'heatmap', icon: <Grid size={14} />, label: 'Тепловая карта' },
  ]

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="ORG.AVG" id="A01" loading={loading}
              value={orgAvgWhole} unit="/ 100" zoneScore={orgAvgWhole}
              gauge={{
                pct: orgAvg !== null ? orgAvg / 100 : 0, variant: 'marker',
                left: '0', right: '100',
                current: orgAvgWhole !== null ? orgAvgWhole : '—',
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="UNITS" id="U01" loading={loading}
              value={unitCount} label="подразделений"
              gauge={{
                pct: unitCount > 0 ? scoredUnits.length / unitCount : 0, variant: 'meta',
                left: '0',
                center: <><strong>{scoredUnits.length}</strong> с оценкой</>,
                right: unitCount,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="TOP" id="T01" loading={loading}
              value={topUnits} label="≥ 80 баллов"
              gauge={{
                pct: scoredUnits.length > 0 ? topUnits / scoredUnits.length : 0, variant: 'meta',
                left: '0',
                center: <><strong>{scoredUnits.length > 0 ? Math.round((topUnits / scoredUnits.length) * 100) : 0}%</strong> с оценкой</>,
                right: scoredUnits.length,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="RISK" id="R01" loading={loading}
              value={riskUnits} label="< 60 баллов"
              gauge={{
                pct: scoredUnits.length > 0 ? riskUnits / scoredUnits.length : 0, variant: 'meta',
                left: '0',
                center: <><strong>{totalEmployees}</strong> сотрудников</>,
                right: scoredUnits.length,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }}>
      <div className="flex items-center justify-end mb-6">
        <ExportButtons type="period" />
      </div>

      {/* Filter controls */}
      <div className="rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end"
           style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>Подразделение</label>
          <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
            className="px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-[var(--accent)]" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }}>
            <option value="">Все подразделения</option>
            {orgUnits.map(u => <option key={u.id} value={u.id}>{u.nameRu}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>Тип периода</label>
          <select value={periodType} onChange={e => setPeriodType(e.target.value)}
            className="px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-[var(--accent)]" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }}>
            <option value="MONTHLY">Ежемесячный</option>
            <option value="QUARTERLY">Квартальный</option>
            <option value="ANNUAL">Годовой</option>
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>С</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded text-sm" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>По</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            min={startDate}
            className="px-3 py-1.5 rounded text-sm" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }} />
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1.5 mb-4">
        {modes.map(m => {
          const active = mode === m.key
          return (
            <button key={m.key} onClick={() => setMode(m.key)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--bg)' : 'var(--ink-soft)',
                border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
              }}>
              {m.icon} {m.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>Загрузка...</div>
      ) : (
        <TableCard>
          {/* Tree mode */}
          {mode === 'tree' && (
            <div className="p-4">
              {nodes.length === 0
                ? <div className="text-center py-8" style={{ color: 'var(--ink-faint)' }}>Нет данных</div>
                : nodes.map(n => <TreeNode key={n.orgUnitId} node={n} onDrillDown={setDrillDown} />)}
            </div>
          )}

          {/* Table mode */}
          {mode === 'table' && (
            <DataTable<FlatRow>
              caption="Иерархическая аналитика подразделений"
              columns={tableColumns}
              rows={flatRows}
              rowKey={n => n.orgUnitId}
              onRowClick={n => setDrillDown(n)}
              empty={<span style={{ color: 'var(--ink-faint)' }}>Нет данных</span>}
            />
          )}

          {/* Bar chart mode */}
          {mode === 'bar' && barData.length > 0 && (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ left: 10, right: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" name="Средний балл">
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={scoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Heatmap mode */}
          {mode === 'heatmap' && (
            <div className="p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {flat.map(n => (
                  <div key={n.orgUnitId}
                    onClick={() => setDrillDown(n)}
                    title={n.orgUnitNameRu}
                    className="rounded-lg p-3 text-white text-center cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: scoreColor(n.avgScore) }}>
                    <div className="text-xs font-medium truncate">{n.orgUnitNameRu}</div>
                    <div className="text-lg font-bold mt-1">
                      {n.avgScore !== null ? Number(n.avgScore).toFixed(0) : '—'}
                    </div>
                    <div className="text-xs opacity-80">{n.employeeCount} чел.</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TableCard>
      )}
      </div>

      {/* Drill-down modal */}
      {drillDown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h3 className="font-semibold text-gray-900">{drillDown.orgUnitNameRu}</h3>
                <p className="text-sm text-gray-500">
                  Средний балл: {drillDown.avgScore !== null ? Number(drillDown.avgScore).toFixed(1) : '—'} ·{' '}
                  {drillDown.employeeCount} сотрудников
                </p>
              </div>
              <button onClick={() => setDrillDown(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center bg-green-50 rounded p-2">
                  <div className="text-lg font-bold text-green-700">
                    {drillDown.maxScore !== null ? Number(drillDown.maxScore).toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-gray-500">Максимум</div>
                </div>
                <div className="text-center bg-red-50 rounded p-2">
                  <div className="text-lg font-bold text-red-700">
                    {drillDown.minScore !== null ? Number(drillDown.minScore).toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-gray-500">Минимум</div>
                </div>
              </div>
              {drillDown.children.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Дочерние подразделения</h4>
                  {drillDown.children.map(child => (
                    <div key={child.orgUnitId}
                      className="flex items-center justify-between py-1.5 border-b border-gray-50">
                      <span className="text-sm text-gray-800">{child.orgUnitNameRu}</span>
                      <span className="font-mono text-sm font-bold"
                        style={{ color: scoreColor(child.avgScore) }}>
                        {child.avgScore !== null ? Number(child.avgScore).toFixed(1) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
