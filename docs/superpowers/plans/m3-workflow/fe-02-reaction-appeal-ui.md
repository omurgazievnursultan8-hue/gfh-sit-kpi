# M3-FE-02: Employee Reaction Page + Appeal Page

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the employee reaction page (shown after evaluation is SUBMITTED — employee clicks AGREE or DISAGREE) and the appeal page (shown if employee clicked DISAGREE — fill in reason and submit appeal). Both pages use the employee's evaluation history view as the entry point.

**Architecture:** `MyEvaluationsPage` lists the employee's evaluations. Clicking a SUBMITTED evaluation shows `EvaluationDetailPage` with score breakdown and the AGREE/DISAGREE reaction buttons. On DISAGREE, a "File Appeal" button appears, routing to `AppealPage` where the employee writes the reason.

**Tech Stack:** React 18, react-i18next, Tailwind CSS.

**Depends on:** m3-workflow/fe-01-evaluation-form.md

---

### Task 1: Employee evaluation history page

**Files:**
- Create: `frontend/src/features/evaluations/MyEvaluationsPage.tsx`
- Create: `frontend/src/features/evaluations/EvaluationDetailPage.tsx`

- [ ] **Step 1: Create MyEvaluationsPage**

`frontend/src/features/evaluations/MyEvaluationsPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, Evaluation, EvaluationStatus } from './evaluationsApi'

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Ожидает реакции',
  ACKNOWLEDGED: 'Подтверждено',
  APPEALED: 'Апелляция',
  CLOSED: 'Завершено',
}

const STATUS_COLORS: Record<EvaluationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  ACKNOWLEDGED: 'bg-green-100 text-green-700',
  APPEALED: 'bg-orange-100 text-orange-700',
  CLOSED: 'bg-blue-100 text-blue-700',
}

export function MyEvaluationsPage() {
  const navigate = useNavigate()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    evaluationsApi.myHistory(page).then(data => {
      setEvaluations(data.content)
      setTotalPages(data.totalPages)
    }).finally(() => setLoading(false))
  }, [page])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мои оценки</h1>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Оценок пока нет</div>
      ) : (
        <>
          <div className="space-y-3">
            {evaluations.map(e => (
              <div
                key={e.id}
                onClick={() => navigate(`/my-evaluations/${e.id}`)}
                className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm cursor-pointer"
              >
                <div>
                  <div className="font-medium text-gray-900">Период #{e.periodId}</div>
                  <div className="text-sm text-gray-500">
                    Оценщик: {e.evaluatorName}
                    {e.finalScore !== null && (
                      <span className="ml-3 font-semibold text-gray-800">
                        Итог: {e.finalScore.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[e.status]}`}>
                  {STATUS_LABELS[e.status]}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded text-sm ${
                    i === page ? 'bg-primary text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create EvaluationDetailPage with reaction buttons**

`frontend/src/features/evaluations/EvaluationDetailPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { evaluationsApi, Evaluation } from './evaluationsApi'
import api from '../../app/api'

interface ScoreHistory {
  criteriaId: number
  nameRu: string
  nameKg: string
  type: 'POSITIVE' | 'ANTI_BONUS'
  rawValue: number
  weightedValue: number
  weightSnapshot: number
}

export function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [scores, setScores] = useState<ScoreHistory[]>([])
  const [reacting, setReacting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      api.get<ScoreHistory[]>(`/evaluations/${evaluationId}/score-history`),
    ]).then(([eval_, hist]) => {
      setEvaluation(eval_)
      setScores(hist.data)
    }).finally(() => setLoading(false))
  }, [evaluationId])

  const react = async (reaction: 'AGREE' | 'DISAGREE') => {
    setReacting(true)
    try {
      await api.post(`/evaluations/${evaluationId}/reaction`, { reaction, comment })
      if (reaction === 'AGREE') {
        navigate('/my-evaluations')
      } else {
        navigate(`/appeals/new?evaluationId=${evaluationId}`)
      }
    } catch (err: any) {
      alert(err.response?.data?.message_ru || 'Ошибка')
    } finally {
      setReacting(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>
  if (!evaluation) return <div className="text-center py-12 text-red-500">Оценка не найдена</div>

  const positiveScores = scores.filter(s => s.type === 'POSITIVE')
  const antiBonusScores = scores.filter(s => s.type === 'ANTI_BONUS')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Детали оценки</h1>
        <p className="text-gray-500 mt-1">Оценщик: {evaluation.evaluatorName}</p>
      </div>

      {/* Score breakdown */}
      {positiveScores.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Положительные критерии</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {positiveScores.map(s => (
              <div key={s.criteriaId} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 text-sm">{s.nameRu}</span>
                  <span className="text-xs text-gray-400 ml-2">({s.weightSnapshot}%)</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-gray-800">{s.rawValue.toFixed(2)}</div>
                  <div className="text-xs text-gray-400">взвеш: {s.weightedValue.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {antiBonusScores.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Антибонусы</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {antiBonusScores.map(s => (
              <div key={s.criteriaId} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 text-sm">{s.nameRu}</span>
                  <span className="text-xs text-gray-400 ml-2">({s.weightSnapshot}%)</span>
                </div>
                <div className="text-right text-red-600">
                  <div className="text-sm font-mono">{s.rawValue.toFixed(2)}</div>
                  <div className="text-xs text-red-400">взвеш: -{s.weightedValue.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final score */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
        <div className="text-sm text-gray-500 mb-1">Итоговый рейтинг</div>
        <div className="text-4xl font-bold text-gray-900">
          {evaluation.finalScore?.toFixed(2) ?? '—'}
        </div>
      </div>

      {/* Reaction section — only for SUBMITTED evaluations */}
      {evaluation.status === 'SUBMITTED' && (
        <div className="bg-white rounded-lg border border-blue-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={16} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Ваша реакция</h3>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={() => react('AGREE')}
              disabled={reacting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <ThumbsUp size={16} />
              Согласен
            </button>
            <button
              onClick={() => react('DISAGREE')}
              disabled={reacting}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <ThumbsDown size={16} />
              Не согласен
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/evaluations/MyEvaluationsPage.tsx \
        frontend/src/features/evaluations/EvaluationDetailPage.tsx
git commit -m "feat(fe/eval): add employee evaluation history and detail page with AGREE/DISAGREE reaction buttons"
```

---

### Task 2: Appeal submission page

**Files:**
- Create: `frontend/src/features/appeals/AppealPage.tsx`

- [ ] **Step 1: Create AppealPage**

`frontend/src/features/appeals/AppealPage.tsx`:
```tsx
import { useState, FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import api from '../../app/api'

export function AppealPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const evaluationId = searchParams.get('evaluationId')

  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) { setError('Укажите причину апелляции'); return }
    if (!evaluationId) { setError('Не указан ID оценки'); return }

    setLoading(true); setError('')
    try {
      await api.post('/appeals', { evaluationId: Number(evaluationId), reason })
      navigate('/my-evaluations', { state: { message: 'Апелляция успешно подана' } })
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка при подаче апелляции')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle size={24} className="text-orange-500" />
        <h1 className="text-2xl font-bold text-gray-900">Подать апелляцию</h1>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-orange-800">
          Вы не согласны с результатами оценки. Укажите причину — оценщик получит уведомление
          и должен ответить в установленные сроки.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Причина апелляции <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            required
            rows={6}
            placeholder="Опишите, с чем именно вы не согласны и почему..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-gray-400 mt-1">{reason.length} символов</p>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Отмена
          </button>
          <button type="submit" disabled={loading || !reason.trim()}
            className="flex-1 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50">
            {loading ? 'Отправка...' : 'Подать апелляцию'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Wire routes in App.tsx**

```tsx
import { MyEvaluationsPage } from './features/evaluations/MyEvaluationsPage'
import { EvaluationDetailPage } from './features/evaluations/EvaluationDetailPage'
import { AppealPage } from './features/appeals/AppealPage'

// Inside Layout routes:
<Route path="my-evaluations" element={<MyEvaluationsPage />} />
<Route path="my-evaluations/:id" element={<EvaluationDetailPage />} />
<Route path="appeals/new" element={<AppealPage />} />
```

Add to `Sidebar.tsx`:
```tsx
{ to: '/my-evaluations', label: t('nav.myEvaluations'), roles: ['EMPLOYEE', 'HEAD_OF_DEPARTMENT_UNIT', 'HEAD_OF_DEPARTMENT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN'] },
```

- [ ] **Step 3: Manual verification**

```bash
cd frontend && npm run dev
```

1. Log in as EMPLOYEE → `/my-evaluations` shows list
2. Click a SUBMITTED evaluation → detail page with scores and reaction buttons
3. Click "Не согласен" → redirects to `/appeals/new?evaluationId=X`
4. Fill reason → submit → redirected back with success message
5. Back in `/my-evaluations` → evaluation shows status "Апелляция"

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/appeals/ \
        frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat(fe/appeal): add employee appeal submission page and evaluation detail with reaction buttons"
```
