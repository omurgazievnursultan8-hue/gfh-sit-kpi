import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, TrendingDown, Users, ArrowRight } from 'lucide-react'
import { evaluationsApi, Evaluation } from '../evaluations/evaluationsApi'
import { ExportButtons } from '../../components/ExportButtons'
import { DataTable, type Column } from '../../components/DataTable'

interface SubordinateRow {
  userId: number
  evaluationId: number
  fullName: string
  score: number | null
  status: string
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">—</span>
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  return <span className={`font-mono font-semibold ${color}`}>{score.toFixed(1)}</span>
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
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          r.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
        }`}>
          {r.status === 'DRAFT' ? 'Ожидает' : 'Готово'}
        </span>
      ),
    },
    {
      key: '__actions', header: 'Действия', srOnlyHeader: true, align: 'right', width: '120px',
      render: r => (
        <button
          type="button"
          onClick={() => onOpen(r)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
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
    }).finally(() => setLoading(false))
  }, [])

  const pct = totalCount === 0 ? 0 : Math.round(((totalCount - pendingCount) / totalCount) * 100)
  const withScores = subordinates.filter(s => s.score !== null)
  const sorted = [...withScores].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const allSorted = [...subordinates].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const rankedRows: RankedRow[] = allSorted.map((s, i) => ({ ...s, rank: i + 1 }))
  const subordinateColumns = buildSubordinateColumns(r => navigate(`/evaluations/${r.evaluationId}`))
  const top3 = sorted.slice(0, 3)
  const bottom3 = sorted.length >= 3 ? sorted.slice(-3).reverse() : []

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Операционный дашборд</h1>
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
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <Users size={16} className="text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">
            Все подчинённые ({subordinates.length})
          </span>
        </div>
        <DataTable<RankedRow>
          caption="Все подчинённые"
          columns={subordinateColumns}
          rows={rankedRows}
          rowKey={r => r.userId}
          totalCount={rankedRows.length}
          empty="Нет данных для текущего периода"
        />
      </div>
    </div>
  )
}
