import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts'
import { analyticsApi, AntiBonusAnalytics } from './analyticsApi'
import api from '../../app/api'
import { ExportButtons } from './components/ExportButtons'
import { DataTable, type Column } from '../../components/datapanel/DataTable'
import { TableCard } from '../../components/ui/TableCard'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/stats/StatCard'

interface OrgUnitOption { id: number; nameRu: string; children?: OrgUnitOption[] }

type Tab = 'distribution' | 'dynamics'

type Top10Row = AntiBonusAnalytics['top10'][number]

const LINE_COLORS = ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#0284c7', '#7c3aed']
const PLACEHOLDER = '··'

function flattenUnits(units: OrgUnitOption[]): OrgUnitOption[] {
  return units.flatMap(u => [u, ...flattenUnits(u.children || [])])
}

export function AntiBonusAnalyticsPage() {
  const [data, setData] = useState<AntiBonusAnalytics | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [periodType, setPeriodType] = useState<string>('MONTHLY')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<Tab>('distribution')
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

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
    })
      .then(d => { setData(d); setFailed(false) })
      .catch(() => setFailed(true))
      .finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [selectedUnit, periodType])

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
  const top10 = data?.top10 ?? []
  const flagged = top10.length
  const totalIncidents = top10.reduce((s, r) => s + r.incidentCount, 0)
  const totalDeduction = top10.reduce((s, r) => s + Number(r.totalDeduction), 0)
  const totalEmployees = (data?.distribution ?? []).reduce((s, d) => s + d.employeeCount, 0)
  // Share of all distributed employees that are flagged (lower share = healthier).
  const flaggedPct = totalEmployees > 0 ? flagged / totalEmployees : 0

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
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="FLAGGED" id="F01" loading={loading}
              value={flagged} label="сотрудников в топ-10"
              gauge={{
                pct: flaggedPct, variant: 'meta',
                left: '0',
                center: <><strong>{Math.round(flaggedPct * 100)}%</strong> от всех</>,
                right: totalEmployees,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="INCIDENTS" id="I01" loading={loading}
              value={totalIncidents} label="инцидентов"
              gauge={{
                pct: flagged > 0 ? Math.min(1, totalIncidents / (flagged * 5)) : 0, variant: 'meta',
                left: '0',
                center: <><strong>{flagged > 0 ? (totalIncidents / flagged).toFixed(1) : '0'}</strong> на сотрудника</>,
                right: flagged * 5,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="DEDUCTION" id="D01" loading={loading}
              value={Number(totalDeduction.toFixed(1))} label="суммарное удержание"
            />
            <StatCard
              className="dv3-col-3"
              title="WORKFORCE" id="W01" loading={loading}
              value={totalEmployees} label="сотрудников в выборке"
            />
          </div>

      {/* FILTERS + TABLE + CHARTS */}
          <div style={{ marginTop: 24 }}>
        <div className="dp-dash rounded-lg p-4 mb-6 flex gap-4 items-end flex-wrap"
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
          <div className="ml-auto">
            <ExportButtons type="period" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>Загрузка...</div>
        ) : !data ? (
          <div className="text-center py-12" style={{ color: 'var(--danger)' }}>Ошибка загрузки</div>
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

            <div className="dp-dash rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}>
              <div className="flex gap-1 px-4 pt-3" style={{ borderBottom: '1px solid var(--line-soft)' }}>
                {([['distribution', 'Распределение'], ['dynamics', 'Динамика по периодам']] as [Tab, string][]).map(
                  ([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                      className="px-4 py-2 text-sm font-medium transition-colors"
                      style={{
                        borderBottom: '2px solid',
                        borderColor: tab === key ? 'var(--accent)' : 'transparent',
                        color: tab === key ? 'var(--accent)' : 'var(--ink-faint)',
                      }}>
                      {label}
                    </button>
                  )
                )}
              </div>

              {tab === 'distribution' && (
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>Распределение итоговых баллов</h3>
                  {data.distribution.length === 0 ? (
                    <div className="py-6 text-center text-sm" style={{ color: 'var(--ink-faint)' }}>Нет данных</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={data.distribution} margin={{ left: 10, right: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="employeeCount" name="Сотрудников" fill="var(--dv3-accent)" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              {tab === 'dynamics' && (
                <div className="p-4">
                  <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--ink)' }}>
                    Динамика антибонусов (последние 12 периодов)
                  </h3>
                  {dynamicsData.length === 0 ? (
                    <div className="py-6 text-center text-sm" style={{ color: 'var(--ink-faint)' }}>Нет данных</div>
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
        </div>
      </div>
    </>
  )
}
