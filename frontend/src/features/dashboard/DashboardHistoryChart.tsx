import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import type { PeriodScore } from '../analytics/analyticsApi'

interface Props {
  history: PeriodScore[]
}

type Tab = 'quarter' | 'half' | 'year'

function periodLabel(ps: PeriodScore): string {
  const d = new Date(ps.startDate)
  const yr = String(d.getFullYear()).slice(2)
  if (ps.periodType === 'QUARTERLY') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} '${yr}`
  }
  if (ps.periodType === 'MONTHLY') return `M${d.getMonth() + 1} '${yr}`
  return `${d.getFullYear()}`
}

function groupByHalf(quarters: PeriodScore[]): { label: string; score: number; deptAvg: number | null }[] {
  const result: { label: string; score: number; deptAvg: number | null }[] = []
  for (let i = 0; i < quarters.length; i += 2) {
    const pair = quarters.slice(i, i + 2)
    const avgScore = pair.reduce((s, p) => s + p.score, 0) / pair.length
    const depts = pair.map(p => p.departmentAvg).filter((v): v is number => v !== null)
    const avgDept = depts.length > 0 ? depts.reduce((s, v) => s + v, 0) / depts.length : null
    const d = new Date(pair[0].startDate)
    const half = d.getMonth() < 6 ? 'H1' : 'H2'
    result.push({ label: `${half} '${String(d.getFullYear()).slice(2)}`, score: Math.round(avgScore), deptAvg: avgDept })
  }
  return result
}

function groupByYear(quarters: PeriodScore[]): { label: string; score: number; deptAvg: number | null }[] {
  const byYear: Record<number, PeriodScore[]> = {}
  quarters.forEach(p => {
    const yr = new Date(p.startDate).getFullYear()
    ;(byYear[yr] ??= []).push(p)
  })
  return Object.entries(byYear).map(([yr, ps]) => {
    const avgScore = ps.reduce((s, p) => s + p.score, 0) / ps.length
    const depts = ps.map(p => p.departmentAvg).filter((v): v is number => v !== null)
    const avgDept = depts.length > 0 ? depts.reduce((s, v) => s + v, 0) / depts.length : null
    return { label: yr, score: Math.round(avgScore), deptAvg: avgDept }
  })
}

export function DashboardHistoryChart({ history }: Props) {
  const [tab, setTab] = useState<Tab>('quarter')

  const quarters = useMemo(() =>
    [...history]
      .filter(p => p.periodType === 'QUARTERLY')
      .reverse()
      .slice(-8),
    [history])

  const chartData = useMemo(() => {
    if (tab === 'quarter') {
      return quarters.map(p => ({
        label: periodLabel(p),
        score: Math.round(p.score),
        deptAvg: p.departmentAvg !== null ? Math.round(p.departmentAvg) : null,
      }))
    }
    if (tab === 'half') return groupByHalf(quarters)
    return groupByYear(quarters)
  }, [tab, quarters])

  const hasHalf = quarters.length >= 2
  const hasYear = quarters.length >= 4

  if (history.length === 0) return null

  const n = chartData.length
  const suffix = history[0].periodType === 'MONTHLY' ? 'месяцев' : 'кварталов'

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      marginTop: 20, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{
            fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600,
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>
            История KPI · {n} {suffix}
          </span>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1a7558', display: 'inline-block' }} />
              Мой KPI
            </span>
            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#c9a84c', opacity: .8, display: 'inline-block' }} />
              Среднее по деп.
            </span>
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8,
          overflow: 'hidden', width: 'fit-content', marginBottom: 14,
        }}>
          {(['quarter', 'half', 'year'] as Tab[]).map(t => {
            const label = t === 'quarter' ? 'Квартал' : t === 'half' ? 'Полугодие' : 'Год'
            const disabled = (t === 'half' && !hasHalf) || (t === 'year' && !hasYear)
            return (
              <button key={t} onClick={() => !disabled && setTab(t)} disabled={disabled} style={{
                fontSize: 12, padding: '5px 14px', cursor: disabled ? 'default' : 'pointer',
                background: tab === t ? 'var(--ink, #1a1a2e)' : '#fff',
                color: tab === t ? '#fff' : disabled ? '#d1d5db' : '#6b7280',
                border: 'none', fontFamily: 'inherit',
              }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={3} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis domain={[50, 100]} ticks={[55, 70, 85, 100]} tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              labelStyle={{ fontWeight: 600 }}
              formatter={(val: number, name: string) => [val, name === 'score' ? 'Мой KPI' : 'Ср. по деп.']}
            />
            <Bar dataKey="score" fill="#1a7558" radius={[3, 3, 0, 0]} />
            <Bar dataKey="deptAvg" fill="#c9a84c" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
