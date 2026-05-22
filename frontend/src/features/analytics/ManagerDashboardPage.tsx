import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, TrendingDown, Users, ArrowRight } from 'lucide-react'
import { evaluationsApi } from '../evaluations/evaluationsApi'
import { ExportButtons } from '../../components/ExportButtons'
import { DataTable, type Column } from '../../components/DataTable'
import { TableCard } from '../../components/TableCard'
import { Badge } from '../../components/Badge'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'

const PLACEHOLDER = '··'

interface SubordinateRow {
  userId: number
  evaluationId: number
  fullName: string
  score: number | null
  status: string
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>—</span>
  const color = score >= 80 ? 'var(--accent-2)' : score >= 60 ? 'var(--gold)' : 'var(--danger)'
  return <span className="font-mono font-semibold" style={{ color }}>{score.toFixed(1)}</span>
}

type RankedRow = SubordinateRow & { rank: number }

function buildSubordinateColumns(onOpen: (r: RankedRow) => void): Column<RankedRow>[] {
  return [
    {
      key: 'rank', header: '#', width: '56px',
      render: r => <span style={{ fontWeight: 500, color: 'var(--ink-dim)' }}>#{r.rank}</span>,
    },
    { key: 'fullName', header: 'ФИО', render: r => r.fullName },
    { key: 'score', header: 'Рейтинг', render: r => <ScoreCell score={r.score} /> },
    {
      key: 'status', header: 'Статус',
      render: r => (
        <Badge tone={r.status === 'DRAFT' ? 'warn' : 'success'}>
          {r.status === 'DRAFT' ? 'Ожидает' : 'Готово'}
        </Badge>
      ),
    },
    {
      key: '__actions', header: 'Действия', srOnlyHeader: true, align: 'right', width: '120px',
      render: r => (
        <button
          type="button"
          onClick={() => onOpen(r)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition hover:bg-[var(--accent-mute)]"
          style={{ color: 'var(--accent-2)' }}
        >
          Открыть
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      ),
    },
  ]
}

export function ManagerDashboardPage() {
  const navigate = useNavigate()

  const [subordinates, setSubordinates] = useState<SubordinateRow[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    Promise.all([
      evaluationsApi.myTasks(0, 200),
      evaluationsApi.myHistory(0, 200),
    ]).then(([tasks, history]) => {
      // Pending evaluations (DRAFT) — current user as evaluator
      const pending = tasks.content
      setPendingCount(pending.filter(e => e.status === 'DRAFT').length)
      setTotalCount(tasks.totalElements)

      // Build subordinate list from pending tasks (DRAFT evaluatees)
      // Deduplicate by evaluateeId, prefer non-null score
      const byEvaluatee = new Map<number, SubordinateRow>()
      for (const e of pending) {
        byEvaluatee.set(e.evaluateeId, {
          userId: e.evaluateeId,
          evaluationId: e.id,
          fullName: e.evaluateeName,
          score: e.finalScore,
          status: e.status,
        })
      }
      setSubordinates(Array.from(byEvaluatee.values()))
      setFailed(false)
    }).catch(() => setFailed(true)).finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [])

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

  const pct = totalCount === 0 ? 0 : Math.round(((totalCount - pendingCount) / totalCount) * 100)
  const withScores = subordinates.filter(s => s.score !== null)
  const sorted = [...withScores].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const allSorted = [...subordinates].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const rankedRows: RankedRow[] = allSorted.map((s, i) => ({ ...s, rank: i + 1 }))
  const subordinateColumns = buildSubordinateColumns(r => navigate(`/evaluations/${r.evaluationId}`))
  const top3 = sorted.slice(0, 3)
  const bottom3 = sorted.length >= 3 ? sorted.slice(-3).reverse() : []

  /* ── derived stats ─────────────────────────────────────────────────────── */
  const teamSize = subordinates.length
  const doneCount = totalCount - pendingCount
  const avgScore = withScores.length
    ? withScores.reduce((s, r) => s + (r.score as number), 0) / withScores.length
    : null
  const avgWhole = avgScore !== null ? Math.round(avgScore) : null

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
              title="TEAM.SIZE" id="T01" loading={loading}
              value={teamSize} label="подчинённых"
            />
            <StatCard
              className="dv3-col-3"
              title="PROGRESS" id="P01" loading={loading}
              value={pct} unit="%"
              gauge={{
                pct: totalCount > 0 ? doneCount / totalCount : 0, variant: 'meta',
                left: '0',
                center: <><strong>{doneCount}</strong> из {totalCount}</>,
                right: totalCount,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="TEAM.AVG" id="A01" loading={loading}
              value={avgWhole} unit="/ 100" zoneScore={avgWhole}
              gauge={{
                pct: avgScore !== null ? avgScore / 100 : 0, variant: 'marker',
                left: '0', right: '100',
                current: avgWhole !== null ? avgWhole : '—',
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="PENDING" id="X01" loading={loading}
              value={pendingCount} label="ожидают оценки"
              onClick={() => navigate('/my-tasks')}
              gauge={{
                pct: totalCount > 0 ? pendingCount / totalCount : 0, variant: 'meta',
                left: '0',
                center: <><strong>{totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}%</strong> всех</>,
                right: totalCount,
              }}
            />
          </div>
          <div style={{ marginTop: 24 }}>
      <div className="flex items-center justify-end mb-6">
        <ExportButtons type="period" />
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className="font-medium">Прогресс оценок</span>
          <span>{totalCount - pendingCount} / {totalCount} ({pct}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-yellow-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => navigate('/my-tasks')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Перейти к задачам ({pendingCount} ожидают) →
          </button>
        )}
      </div>

      {/* Top 3 / Bottom 3 — only shown when scores available */}
      {(top3.length > 0 || bottom3.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {top3.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} className="text-green-600" />
                <span className="font-semibold text-green-800 text-sm">Топ-3</span>
              </div>
              {top3.map((s, i) => (
                <div key={s.userId} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">
                    <span className="font-bold text-green-700 mr-2">#{i + 1}</span>
                    {s.fullName}
                  </span>
                  <ScoreCell score={s.score} />
                </div>
              ))}
            </div>
          )}
          {bottom3.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={16} className="text-red-600" />
                <span className="font-semibold text-red-800 text-sm">Требуют внимания</span>
              </div>
              {bottom3.map((s) => (
                <div key={s.userId} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">{s.fullName}</span>
                  <ScoreCell score={s.score} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full subordinates table */}
      <TableCard
        header={
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: 'var(--ink-soft)' }} />
            <span className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
              Все подчинённые ({subordinates.length})
            </span>
          </div>
        }
      >
        <DataTable<RankedRow>
          caption="Все подчинённые"
          columns={subordinateColumns}
          rows={rankedRows}
          rowKey={r => r.userId}
          totalCount={rankedRows.length}
          empty="Нет данных для текущего периода"
        />
      </TableCard>
          </div>
        </div>
      </div>
    </>
  )
}
