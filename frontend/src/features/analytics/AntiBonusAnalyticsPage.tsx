import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { analyticsApi, AntiBonusAnalytics } from './analyticsApi'
import api from '../../app/api'
import { ExportButtons } from '../../components/ExportButtons'
import { DataTable, type Column } from '../../components/DataTable'
import { TableCard } from '../../components/TableCard'

interface OrgUnitOption { id: number; nameRu: string; children?: OrgUnitOption[] }

type Tab = 'distribution' | 'dynamics'

type Top10Row = AntiBonusAnalytics['top10'][number]

const LINE_COLORS = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#0284c7', '#7c3aed']

function flattenUnits(units: OrgUnitOption[]): OrgUnitOption[] {
  return units.flatMap(u => [u, ...flattenUnits(u.children || [])])
}

export function AntiBonusAnalyticsPage() {
  const [data, setData] = useState<AntiBonusAnalytics | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [periodType, setPeriodType] = useState<string>('MONTHLY')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('distribution')

  useEffect(() => {
    api.get<OrgUnitOption[]>('/org/structure').then(r => {
      setOrgUnits(flattenUnits(r.data))
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    analyticsApi.antiBonus({
      orgUnitId: selectedUnit ? Number(selectedUnit) : undefined,
      periodType,
    }).then(setData).finally(() => setLoading(false))
  }, [selectedUnit, periodType])

  const dynamicsLines = data ? [...new Set(data.dynamics.map(d => d.criteriaNameRu))] : []
  const dynamicsData = data
    ? [...new Set(data.dynamics.map(d => d.periodStart))].sort().map(period => {
        const row: Record<string, any> = { period }
        data.dynamics.filter(d => d.periodStart === period)
          .forEach(d => { row[d.criteriaNameRu] = Number(Number(d.avgRawValue).toFixed(2)) })
        return row
      })
    : []

  const top10Columns: Column<Top10Row>[] = [
    {
      key: 'rank',
      header: '#',
      width: '48px',
      render: (_r) => {
        const i = (data?.top10 ?? []).indexOf(_r)
        return <span className="font-mono font-bold" style={{ fontSize: 13, color: 'var(--ink-faint)' }}>#{i + 1}</span>
      },
    },
    {
      key: 'fullName',
      header: 'Сотрудник',
      render: (r) => <span style={{ fontSize: 13, color: 'var(--ink)' }}>{r.fullName}</span>,
    },
    {
      key: 'orgUnitName',
      header: 'Подразделение',
      render: (r) => <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{r.orgUnitName ?? '—'}</span>,
    },
    {
      key: 'incidentCount',
      header: 'Инциденты',
      render: (r) => <span className="font-mono" style={{ fontSize: 13, color: 'var(--gold)' }}>{r.incidentCount}</span>,
    },
    {
      key: 'totalDeduction',
      header: 'Удержание',
      render: (r) => (
        <span className="font-mono font-bold" style={{ fontSize: 13, color: 'var(--danger)' }}>
          -{Number(r.totalDeduction).toFixed(2)}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Аналитика антибонусов</h1>
        <ExportButtons type="period" />
      </div>

      <div className="rounded-lg p-4 mb-6 flex gap-4 items-end"
           style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>Подразделение</label>
          <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}
            className="px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-primary" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }}>
            <option value="">Все подразделения</option>
            {orgUnits.map(u => <option key={u.id} value={u.id}>{u.nameRu}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>Тип периода</label>
          <select value={periodType} onChange={e => setPeriodType(e.target.value)}
            className="px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-primary" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }}>
            <option value="MONTHLY">Ежемесячный</option>
            <option value="QUARTERLY">Квартальный</option>
            <option value="ANNUAL">Годовой</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : !data ? (
        <div className="text-center py-12 text-red-500">Ошибка загрузки</div>
      ) : (
        <div className="space-y-6">
          <TableCard
            header={
              <h2 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                Топ-10 по антибонусным удержаниям
              </h2>
            }
          >
            <DataTable<Top10Row>
              columns={top10Columns}
              rows={data.top10}
              rowKey={(e) => e.userId}
              caption="Топ-10 по антибонусным удержаниям"
              empty={<span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Нет данных</span>}
              totalCount={data.top10.length}
            />
          </TableCard>

          <div>
            <div className="flex gap-1 mb-4 border-b border-gray-200">
              {([['distribution', 'Распределение'], ['dynamics', 'Динамика по периодам']] as [Tab, string][]).map(
                ([key, label]) => (
                  <button key={key} onClick={() => setTab(key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      tab === key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}>
                    {label}
                  </button>
                )
              )}
            </div>

            {tab === 'distribution' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-4">Распределение итоговых баллов</h3>
                {data.distribution.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-sm">Нет данных</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.distribution} margin={{ left: 10, right: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="employeeCount" name="Сотрудников" fill="#1e40af" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {tab === 'dynamics' && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 text-sm mb-4">
                  Динамика антибонусов (последние 12 периодов)
                </h3>
                {dynamicsData.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-sm">Нет данных</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dynamicsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {dynamicsLines.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name}
                          stroke={LINE_COLORS[i % LINE_COLORS.length]}
                          strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
