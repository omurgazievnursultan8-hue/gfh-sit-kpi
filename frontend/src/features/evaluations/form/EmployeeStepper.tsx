import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { evaluationsApi, Evaluation } from '../evaluationsApi'

interface Props {
  evaluationId: number
  periodId: number
  evaluatorId: number
  evaluateeName: string
}

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts[1]?.[0] ?? ''
  return (first + last).toUpperCase() || '??'
}

const isDone = (s: Evaluation['status']): boolean =>
  s === 'SUBMITTED' || s === 'ACKNOWLEDGED' || s === 'CLOSED'

export function EmployeeStepper({ evaluationId, periodId, evaluatorId, evaluateeName }: Props) {
  const navigate = useNavigate()
  const [siblings, setSiblings] = useState<Evaluation[]>([])

  useEffect(() => {
    let alive = true
    const fallback = () => evaluationsApi.asEvaluator(0, 100)
      .then(p => p.content.filter(e => e.periodId === periodId))
      .catch(() => [] as Evaluation[])
    evaluationsApi.adminList({ periodId, evaluatorId, size: 100 })
      .then(p => p.content)
      .catch(fallback)
      .then(list => { if (alive) setSiblings(list) })
    return () => { alive = false }
  }, [periodId, evaluatorId, evaluationId])

  if (siblings.length === 0) {
    return (
      <div className="efm-stepper">
        <div className="efm-step is-active">
          <div className="efm-step-avatar">{initialsOf(evaluateeName)}</div>
          <div className="efm-step-info">
            <span className="efm-step-name">{evaluateeName}</span>
            <span className="efm-step-prog">в работе</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="efm-stepper" role="tablist">
      {siblings.map(e => {
        const active = e.id === evaluationId
        const done = isDone(e.status)
        return (
          <button
            key={e.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`efm-step ${active ? 'is-active' : ''} ${done ? 'is-done' : ''}`}
            onClick={() => { if (!active) navigate(`/evaluations/${e.id}`) }}
            title={e.evaluateeName}
          >
            <div className="efm-step-avatar">{initialsOf(e.evaluateeName)}</div>
            <div className="efm-step-info">
              <span className="efm-step-name">{e.evaluateeName}</span>
              <span className="efm-step-prog">
                {done ? '✓ готово' : active ? 'в работе' : 'черновик'}
              </span>
            </div>
            {done && <span className="efm-step-done" aria-hidden><Check size={14} /></span>}
          </button>
        )
      })}
    </div>
  )
}
