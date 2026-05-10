import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { CheckCircle, Clock, AlertTriangle, ChevronRight, XCircle } from 'lucide-react'
import { RootState } from '../../app/store'
import { evaluationsApi, Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi, AppealPending, Period } from './periodsApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'

interface PeriodGroup {
  periodId: number
  periodType: string
  startDate: string
  endDate: string
  deadline: string
  evaluations: Evaluation[]
  isPastDeadline: boolean
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  MONTHLY: 'Ежемесячная',
  QUARTERLY: 'Квартальная',
  ANNUAL: 'Годовая',
}

function ProgressBar({ submitted, total }: { submitted: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((submitted / total) * 100)
  const colorClass = pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-yellow-400'

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Выполнено: {submitted} / {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ManagerTodoPage() {
  const navigate = useNavigate()
  const { role } = useSelector((s: RootState) => s.auth)
  const isAdmin = role === 'ADMIN'

  const [groups, setGroups] = useState<PeriodGroup[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])
  const [loading, setLoading] = useState(true)
  const [closeTarget, setCloseTarget] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [tasks, appeals, periods] = await Promise.all([
        evaluationsApi.myTasks(0, 200),
        periodsApi.pendingAppeals().catch(() => [] as AppealPending[]),
        periodsApi.list().catch(() => [] as Period[]),
      ])

      const byPeriod = tasks.content.reduce<Record<number, Evaluation[]>>((acc, e) => {
        if (!acc[e.periodId]) acc[e.periodId] = []
        acc[e.periodId].push(e)
        return acc
      }, {})

      const periodMap = Object.fromEntries(periods.map(p => [p.id, p]))
      const now = new Date()

      const grouped: PeriodGroup[] = Object.entries(byPeriod).map(([pid, evals]) => {
        const period = periodMap[Number(pid)]
        return {
          periodId: Number(pid),
          periodType: period?.type ?? 'MONTHLY',
          startDate: period?.startDate ?? '',
          endDate: period?.endDate ?? '',
          deadline: period?.submissionDeadline ?? '',
          evaluations: evals,
          isPastDeadline: period ? new Date(period.submissionDeadline) < now : false,
        }
      })

      setGroups(grouped)
      setPendingAppeals(appeals)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleForceClose = async () => {
    if (!closeTarget) return
    try {
      await periodsApi.close(closeTarget)
      setCloseTarget(null)
      await load()
    } catch {}
  }

  const formatDate = (s: string) => s ? new Date(s).toLocaleDateString('ru-RU') : '—'

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мои задачи</h1>

      {groups.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200 mb-8">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-3" />
          <p className="text-gray-500">Все оценки выполнены — нет ожидающих задач</p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {groups.map(group => {
            const submitted = group.evaluations.filter(e => e.status !== 'DRAFT').length
            const total = group.evaluations.length
            const drafts = group.evaluations.filter(e => e.status === 'DRAFT')

            return (
              <div key={group.periodId}
                className={`bg-white rounded-lg border p-4 ${
                  group.isPastDeadline ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        {PERIOD_TYPE_LABELS[group.periodType] ?? group.periodType} оценка
                      </span>
                      {group.isPastDeadline && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
                          <Clock size={10} />
                          Просрочено
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(group.startDate)} — {formatDate(group.endDate)} · Срок: {formatDate(group.deadline)}
                    </div>
                  </div>
                  {isAdmin && group.isPastDeadline && (
                    <button
                      onClick={() => setCloseTarget(group.periodId)}
                      className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                    >
                      <XCircle size={14} />
                      Закрыть период
                    </button>
                  )}
                </div>

                <ProgressBar submitted={submitted} total={total} />

                <div className="mt-3 space-y-1">
                  {drafts.slice(0, 5).map(e => (
                    <div
                      key={e.id}
                      onClick={() => navigate(`/evaluations/${e.id}`)}
                      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
                    >
                      <span className="text-sm text-gray-800">{e.evaluateeName}</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                  ))}
                  {drafts.length > 5 && (
                    <p className="text-xs text-gray-400 px-3">
                      + ещё {drafts.length - 5} сотрудников
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pendingAppeals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            Апелляции, ожидающие ответа ({pendingAppeals.length})
          </h2>
          <div className="space-y-2">
            {pendingAppeals.map(a => (
              <div key={a.id}
                className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{a.evaluateeName}</div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.reason}</div>
                  <div className="text-xs text-orange-600 mt-1">
                    Срок ответа: {new Date(a.deadline).toLocaleString('ru-RU')}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/evaluations/${a.evaluationId}`)}
                  className="ml-4 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Ответить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!closeTarget}
        title="Принудительно закрыть период?"
        description="Все неотправленные черновики будут закрыты. Это действие необратимо."
        variant="danger"
        onConfirm={handleForceClose}
        onCancel={() => setCloseTarget(null)}
      />
    </div>
  )
}
