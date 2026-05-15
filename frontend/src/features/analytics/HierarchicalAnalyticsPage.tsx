import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Table, BarChart2, Grid, X } from 'lucide-react'
import { analyticsApi, HierarchicalNode } from './analyticsApi'
import api from '../../app/api'
import { ExportButtons } from '../../components/ExportButtons'
import { DataTable, type Column } from '../../components/DataTable'

type DisplayMode = 'table' | 'bar' | 'tree' | 'heatmap'

interface OrgUnitOption { id: number; nameRu: string; nameKg: string }

function scoreColor(score: number | null): string {
  if (score === null) return '#e5e7eb'
  if (score >= 80) return '#16a34a'
  if (score >= 60) return '#ca8a04'
  return '#dc2626'
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
    }).then(setNodes).finally(() => setLoading(false))
  }, [selectedUnit, periodType, startDate, endDate])

  const flat = flattenTree(nodes)
  const flatRows = flattenTreeWithDepth(nodes)

  const tableColumns: Column<FlatRow>[] = [
    {
      key: 'orgUnit',
      header: 'Подразделение',
      render: n => (
        <span
          className="text-sm font-medium text-gray-900"
          style={{ paddingLeft: n.depth * 18, display: 'inline-block' }}
        >
          {n.orgUnitNameRu}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Тип',
      render: n => <span className="text-xs text-gray-500">{n.type}</span>,
    },
    {
      key: 'employeeCount',
      header: 'Сотр.',
      render: n => <span className="text-sm text-gray-700">{n.employeeCount}</span>,
    },
    {
      key: 'avgScore',
      header: 'Ср. балл',
      render: n =>
        n.avgScore !== null ? (
          <span className="font-mono font-bold" style={{ color: scoreColor(n.avgScore) }}>
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
        <span className="text-xs text-gray-500">
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Иерархическая аналитика</h1>
        <ExportButtons type="period" />
      </div>

      {/* Filter controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Подразделение</label>
          <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary">
            <option value="">Все подразделения</option>
            {orgUnits.map(u => <option key={u.id} value={u.id}>{u.nameRu}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Тип периода</label>
          <select value={periodType} onChange={e => setPeriodType(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary">
            <option value="MONTHLY">Ежемесячный</option>
            <option value="QUARTERLY">Квартальный</option>
            <option value="ANNUAL">Годовой</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">С</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">По</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            min={startDate}
            className="px-3 py-1.5 border border-gray-300 rounded text-sm" />
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-4">
        {modes.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm border ${
              mode === m.key
                ? 'bg-primary text-white border-primary'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Tree mode */}
          {mode === 'tree' && (
            nodes.length === 0
              ? <div className="text-center py-8 text-gray-400">Нет данных</div>
              : nodes.map(n => <TreeNode key={n.orgUnitId} node={n} onDrillDown={setDrillDown} />)
          )}

          {/* Table mode */}
          {mode === 'table' && (
            <div className="overflow-x-auto">
              <DataTable<FlatRow>
                caption="Иерархическая аналитика подразделений"
                columns={tableColumns}
                rows={flatRows}
                rowKey={n => n.orgUnitId}
                onRowClick={n => setDrillDown(n)}
                empty={<div className="text-gray-400">Нет данных</div>}
              />
            </div>
          )}

          {/* Bar chart mode */}
          {mode === 'bar' && barData.length > 0 && (
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
          )}

          {/* Heatmap mode */}
          {mode === 'heatmap' && (
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
          )}
        </div>
      )}

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
    </div>
  )
}
