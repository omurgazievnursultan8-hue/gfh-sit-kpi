# M3-FE-01: Evaluation Form — Positive/Anti-Bonus Sections, Autosave Draft, File Upload

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the evaluation form page used by evaluators to score employees: split into Positive and Anti-Bonus sections, autosave draft every 30 seconds, live score preview (dry-run), file attachment support, and final submit with confirmation.

**Architecture:** `EvaluationFormPage` receives `evaluationId` from URL params. It fetches the evaluation and applicable criteria, renders two sections with numeric inputs, autosaves via a `useEffect`/`setInterval` that calls `PUT /api/v1/evaluations/{id}/scores`, and calls `POST /api/v1/evaluations/{id}/scores/preview` on any score change to update the live rating preview. Submitting shows a confirm dialog then calls `POST /api/v1/evaluations/{id}/submit`.

**Tech Stack:** React 18, react-i18next, Tailwind CSS, shadcn/ui.

**Depends on:** m2-criteria/fe-02-settings-calendar-ui.md (project scaffold complete; criteria API in place)

---

### Task 1: Evaluation API client

**Files:**
- Create: `frontend/src/features/evaluations/evaluationsApi.ts`

- [ ] **Step 1: Create evaluations API client**

`frontend/src/features/evaluations/evaluationsApi.ts`:
```ts
import api from '../../app/api'
import { Criteria } from '../criteria/criteriaApi'

export type EvaluationStatus = 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'APPEALED' | 'CLOSED'

export interface Evaluation {
  id: number
  periodId: number
  evaluateeId: number
  evaluateeName: string
  evaluatorId: number
  evaluatorName: string
  status: EvaluationStatus
  finalScore: number | null
  version: number
  submittedAt: string | null
  createdAt: string
}

export interface EvaluationScore {
  criteriaId: number
  value: number
  note?: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const evaluationsApi = {
  myTasks: (page = 0, size = 20) =>
    api.get<PageResponse<Evaluation>>('/evaluations/my-tasks', { params: { page, size } }).then(r => r.data),
  myHistory: (page = 0, size = 20) =>
    api.get<PageResponse<Evaluation>>('/evaluations/my-history', { params: { page, size } }).then(r => r.data),
  get: (id: number) =>
    api.get<Evaluation>(`/evaluations/${id}`).then(r => r.data),
  saveScores: (id: number, scores: EvaluationScore[]) =>
    api.put<Evaluation>(`/evaluations/${id}/scores`, scores).then(r => r.data),
  preview: (id: number, scores: EvaluationScore[]) =>
    api.post<number>(`/evaluations/${id}/scores/preview`, scores).then(r => r.data),
  submit: (id: number) =>
    api.post<Evaluation>(`/evaluations/${id}/submit`).then(r => r.data),
  reassign: (id: number, newEvaluatorId: number) =>
    api.put<Evaluation>(`/evaluations/${id}/reassign`, null, { params: { newEvaluatorId } }).then(r => r.data),
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/features/evaluations/evaluationsApi.ts
git commit -m "feat(fe/eval): add evaluations API client"
```

---

### Task 2: EvaluationFormPage

**Files:**
- Create: `frontend/src/features/evaluations/EvaluationFormPage.tsx`

- [ ] **Step 1: Create EvaluationFormPage**

`frontend/src/features/evaluations/EvaluationFormPage.tsx`:
```tsx
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Send, Eye } from 'lucide-react'
import { evaluationsApi, Evaluation, EvaluationScore } from './evaluationsApi'
import { criteriaApi, Criteria } from '../criteria/criteriaApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FileUploadSection } from './components/FileUploadSection'
import api from '../../app/api'

interface ScoreMap { [criteriaId: number]: { value: string; note: string } }

export function EvaluationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [scores, setScores] = useState<ScoreMap>({})
  const [previewScore, setPreviewScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const positiveCriteria = criteria.filter(c => c.type === 'POSITIVE' && c.active)
  const antiBonusCriteria = criteria.filter(c => c.type === 'ANTI_BONUS' && c.active)

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      criteriaApi.list(0, 200),
    ]).then(([eval_, criteriaPage]) => {
      setEvaluation(eval_)
      setCriteria(criteriaPage.content)
      // Load existing scores
      api.get<EvaluationScore[]>(`/evaluations/${evaluationId}/scores`).then(r => {
        const map: ScoreMap = {}
        r.data.forEach(s => {
          map[s.criteriaId] = { value: s.value.toString(), note: s.note ?? '' }
        })
        setScores(map)
      }).catch(() => {})
    }).finally(() => setLoading(false))
  }, [evaluationId])

  const buildScoreList = useCallback((): EvaluationScore[] =>
    Object.entries(scores)
      .filter(([, v]) => v.value !== '')
      .map(([id, v]) => ({
        criteriaId: Number(id),
        value: parseFloat(v.value),
        note: v.note || undefined,
      })), [scores])

  const save = useCallback(async () => {
    const list = buildScoreList()
    if (list.length === 0) return
    setSaving(true)
    try {
      await evaluationsApi.saveScores(evaluationId, list)
      setLastSaved(new Date())
    } finally {
      setSaving(false)
    }
  }, [evaluationId, buildScoreList])

  const updatePreview = useCallback(async () => {
    const list = buildScoreList()
    if (list.length === 0) { setPreviewScore(null); return }
    try {
      const score = await evaluationsApi.preview(evaluationId, list)
      setPreviewScore(score)
    } catch {}
  }, [evaluationId, buildScoreList])

  // Autosave every 30 seconds
  useEffect(() => {
    autosaveRef.current = setInterval(save, 30_000)
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current) }
  }, [save])

  // Update preview on score change (debounced 800ms)
  useEffect(() => {
    const t = setTimeout(updatePreview, 800)
    return () => clearTimeout(t)
  }, [scores, updatePreview])

  const handleScoreChange = (criteriaId: number, field: 'value' | 'note', val: string) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: { ...prev[criteriaId] ?? { value: '', note: '' }, [field]: val },
    }))
  }

  const handleSubmit = async () => {
    setSubmitLoading(true)
    try {
      await save()
      await evaluationsApi.submit(evaluationId)
      navigate('/my-tasks')
    } finally {
      setSubmitLoading(false)
      setSubmitOpen(false)
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Загрузка...</div>
  if (!evaluation) return <div className="text-center py-12 text-red-500">Оценка не найдена</div>
  if (evaluation.status !== 'DRAFT') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Эта оценка уже отправлена (статус: {evaluation.status})</p>
      </div>
    )
  }

  const renderSection = (sectionCriteria: Criteria[], title: string) => (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">{title}</h2>
      {sectionCriteria.length === 0 ? (
        <p className="text-sm text-gray-400">Нет критериев для этого раздела</p>
      ) : (
        <div className="space-y-4">
          {sectionCriteria.map(c => {
            const score = scores[c.id] ?? { value: '', note: '' }
            return (
              <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900">{c.nameRu}</span>
                    <span className="ml-2 text-xs text-gray-400">({c.weight}%)</span>
                    {c.autoCalculated && (
                      <span className="ml-2 text-xs text-blue-500">авто</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Значение"
                    value={score.value}
                    onChange={e => handleScoreChange(c.id, 'value', e.target.value)}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    placeholder="Примечание (необязательно)"
                    value={score.note}
                    onChange={e => handleScoreChange(c.id, 'note', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Оценка сотрудника</h1>
          <p className="text-gray-500 mt-1">{evaluation.evaluateeName}</p>
        </div>
        <div className="flex items-center gap-3">
          {previewScore !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              <Eye size={14} />
              <span>Итог: <strong>{previewScore.toFixed(2)}</strong></span>
            </div>
          )}
          {lastSaved && (
            <span className="text-xs text-gray-400">
              Сохранено {lastSaved.toLocaleTimeString('ru-RU')}
            </span>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Save size={14} />
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button onClick={() => setSubmitOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700">
            <Send size={14} />
            Отправить
          </button>
        </div>
      </div>

      {renderSection(positiveCriteria, 'Положительные критерии')}
      {renderSection(antiBonusCriteria, 'Антибонусы')}

      <FileUploadSection evaluationId={evaluationId} />

      <ConfirmDialog
        open={submitOpen}
        title="Отправить оценку?"
        message="После отправки оценку нельзя будет изменить. Сотрудник получит уведомление."
        variant="default"
        loading={submitLoading}
        onConfirm={handleSubmit}
        onCancel={() => setSubmitOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create FileUploadSection component**

`frontend/src/features/evaluations/components/FileUploadSection.tsx`:
```tsx
import { useEffect, useState, useRef } from 'react'
import { Paperclip, Trash2, Download } from 'lucide-react'
import api from '../../../app/api'

interface EvaluationFile {
  id: number
  originalName: string
  mimeType: string
  fileSize: number
  uploadedAt: string
}

export function FileUploadSection({ evaluationId }: { evaluationId: number }) {
  const [files, setFiles] = useState<EvaluationFile[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFiles = () =>
    api.get<EvaluationFile[]>(`/evaluations/${evaluationId}/files`)
      .then(r => setFiles(r.data))
      .catch(() => {})

  useEffect(() => { loadFiles() }, [evaluationId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      await api.post(`/evaluations/${evaluationId}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await loadFiles()
    } catch (err: any) {
      alert(err.response?.data?.message_ru || 'Ошибка загрузки файла')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (fileId: number) => {
    await api.delete(`/evaluations/${evaluationId}/files/${fileId}`)
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-800">Прикреплённые файлы</h3>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 text-sm text-primary hover:underline disabled:opacity-50">
          <Paperclip size={14} />
          {uploading ? 'Загрузка...' : 'Прикрепить файл'}
        </button>
        <input ref={inputRef} type="file" className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.docx"
          onChange={handleUpload} />
      </div>
      {files.length === 0 ? (
        <p className="text-sm text-gray-400">Файлы не прикреплены</p>
      ) : (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Paperclip size={12} className="text-gray-400" />
                {f.originalName}
                <span className="text-xs text-gray-400">({formatSize(f.fileSize)})</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/api/v1/evaluations/${evaluationId}/files/${f.id}`}
                  className="p-1 text-gray-400 hover:text-blue-600" title="Скачать">
                  <Download size={14} />
                </a>
                <button onClick={() => handleDelete(f.id)}
                  className="p-1 text-gray-400 hover:text-red-600" title="Удалить">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Wire route in App.tsx**

```tsx
import { EvaluationFormPage } from './features/evaluations/EvaluationFormPage'

// Inside Layout routes:
<Route path="evaluations/:id" element={<EvaluationFormPage />} />
```

- [ ] **Step 4: Create MyTasksPage (evaluator's task list)**

`frontend/src/features/evaluations/MyTasksPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, Evaluation } from './evaluationsApi'

export function MyTasksPage() {
  const navigate = useNavigate()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    evaluationsApi.myTasks().then(data => {
      setEvaluations(data.content)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Мои задачи по оценке</h1>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Нет ожидающих оценок</div>
      ) : (
        <div className="space-y-3">
          {evaluations.map(e => (
            <div key={e.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between hover:shadow-sm cursor-pointer"
              onClick={() => navigate(`/evaluations/${e.id}`)}>
              <div>
                <div className="font-medium text-gray-900">{e.evaluateeName}</div>
                <div className="text-sm text-gray-500">Период #{e.periodId}</div>
              </div>
              <span className="text-xs px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                Ожидает заполнения
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

Add route and sidebar entry:
```tsx
// In App.tsx:
import { MyTasksPage } from './features/evaluations/MyTasksPage'
<Route path="my-tasks" element={<MyTasksPage />} />

// In Sidebar.tsx:
{ to: '/my-tasks', label: t('nav.myTasks'), roles: ['HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN', 'ADMIN'] },
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/evaluations/
git commit -m "feat(fe/eval): add evaluation form with autosave, live preview, file upload, and my-tasks page"
```
