# Periods Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin page at `/admin/periods` for evaluation-period lifecycle management — list, create, activate, close, show progress.

**Architecture:** A `PeriodsPage` container fetches all periods via the existing `periodsApi`, splits them into three status buckets (ACTIVE / DRAFT / CLOSED), and renders each bucket as a section of `PeriodCard`s. A `PeriodFormModal` handles creation. Closing an active period goes through the shared `ConfirmDialog`.

**Tech Stack:** React 18 + TypeScript, Vite, Tailthwind utility classes + inline CSS-variable design tokens, `lucide-react` icons. No frontend test framework exists — verification is `npx tsc --noEmit` and `npm run build`.

---

## Background

`periodsApi.ts` already exposes everything needed (no changes):

```ts
periodsApi.list()        // → Promise<Period[]>
periodsApi.create(data)  // data: { type, startDate, endDate, submissionDeadline } → Promise<Period>
periodsApi.activate(id)  // → Promise<Period>
periodsApi.close(id)     // → Promise<Period>
periodsApi.progress(id)  // → Promise<{ total, completed }>
```

```ts
type PeriodType   = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
type PeriodStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'
interface Period {
  id: number; type: PeriodType; startDate: string; endDate: string
  submissionDeadline: string; status: PeriodStatus; autoCreated: boolean; createdAt: string
}
interface PeriodProgress { total: number; completed: number }
```

Design tokens in use across the codebase (see `DashboardPeriodStrip.tsx`):
`--surface`, `--line-soft`, `--line`, `--ink`, `--ink-soft`, `--ink-faint`,
`--accent-2`, `--warn`, `--danger`, `--bg-soft`, `--shadow-sm`.

`ConfirmDialog` props: `{ open, title, description, onConfirm, onCancel, confirmLabel?, cancelLabel?, variant? }`.

---

## File Structure

- Create: `frontend/src/features/periods/components/PeriodCard.tsx` — one period card + status visuals
- Create: `frontend/src/features/periods/components/PeriodFormModal.tsx` — create-period form modal
- Create: `frontend/src/features/periods/PeriodsPage.tsx` — container, sections, data orchestration
- Modify: `frontend/src/App.tsx` — route `/admin/periods` element `MyTasksPage` → `PeriodsPage`

---

## Task 1: PeriodCard component

**Files:**
- Create: `frontend/src/features/periods/components/PeriodCard.tsx`

- [ ] **Step 1: Write the component file**

```tsx
import type { Period, PeriodProgress, PeriodType, PeriodStatus } from '../periodsApi'

interface PeriodCardProps {
  period: Period
  progress: PeriodProgress | undefined
  busy: boolean
  onActivate: (id: number) => void
  onClose: (id: number) => void
}

const TYPE_LABEL: Record<PeriodType, string> = {
  MONTHLY: 'Ежемесячная',
  QUARTERLY: 'Квартальная',
  ANNUAL: 'Годовая',
}

interface StatusVisual { text: string; fg: string; bg: string; border: string; stripe: string }
const STATUS_VISUAL: Record<PeriodStatus, StatusVisual> = {
  ACTIVE: { text: 'Активный',   fg: '#2f9e6d', bg: 'rgba(120,200,150,0.14)', border: 'rgba(120,200,150,0.32)', stripe: 'var(--accent-2,#2f9e6d)' },
  DRAFT:  { text: 'Черновик',   fg: '#9c7416', bg: 'rgba(200,150,40,0.14)',  border: 'rgba(200,150,40,0.32)',  stripe: 'var(--warn,#c89628)' },
  CLOSED: { text: 'Завершён',   fg: '#6b6b6b', bg: 'rgba(120,120,120,0.12)', border: 'rgba(120,120,120,0.32)', stripe: 'var(--line-strong,#bdb6a6)' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function periodTitle(p: Period): string {
  const d = new Date(p.startDate)
  const y = d.getFullYear()
  if (p.type === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1} ${y}`
  if (p.type === 'MONTHLY') return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return `${y}`
}

export function PeriodCard({ period, progress, busy, onActivate, onClose }: PeriodCardProps) {
  const v = STATUS_VISUAL[period.status]
  const showProgress = period.status === 'ACTIVE' || period.status === 'CLOSED'
  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const pctColor = pct >= 80 ? 'var(--accent-2,#2f9e6d)' : pct >= 40 ? 'var(--warn)' : 'var(--danger)'

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '15px 17px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: v.stripe }} />

      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {periodTitle(period)}
          </span>
          <span
            className="font-mono font-semibold uppercase tracking-widest"
            style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: v.bg, color: v.fg, border: `1px solid ${v.border}` }}
          >
            {v.text}
          </span>
          {period.autoCreated && (
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-soft,#ebe6db)', color: 'var(--ink-faint)' }}
            >
              авто
            </span>
          )}
        </div>
        <span className="font-mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
          {TYPE_LABEL[period.type]}
        </span>
      </div>

      {showProgress && (
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-mono uppercase tracking-wider" style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>
              Заполнено
            </span>
            <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
              {progress === undefined ? '…' : total === 0 ? 'нет оценок' : `${completed} / ${total} · ${pct}%`}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-full" style={{ height: 6, background: 'var(--bg-soft,#ebe6db)' }}>
            <div className="absolute inset-y-0 left-0 transition-all" style={{ width: `${pct}%`, background: pctColor, borderRadius: 999 }} />
          </div>
        </div>
      )}

      <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
        {formatDate(period.startDate)} → {formatDate(period.endDate)}
        {' · дедлайн '}
        <strong style={{ color: 'var(--ink-soft)' }}>{formatDate(period.submissionDeadline)}</strong>
      </div>

      {period.status === 'DRAFT' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onActivate(period.id)}
          className="mt-3 font-mono uppercase tracking-widest disabled:opacity-50"
          style={{ fontSize: 10.5, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: 'var(--accent-2,#2f9e6d)', color: '#fff' }}
        >
          Активировать
        </button>
      )}
      {period.status === 'ACTIVE' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onClose(period.id)}
          className="mt-3 font-mono uppercase tracking-widest disabled:opacity-50"
          style={{ fontSize: 10.5, fontWeight: 600, padding: '6px 14px', borderRadius: 6, background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
        >
          Закрыть период
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — no errors. (`PeriodCard` is unused for now; unused exports do not error.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/periods/components/PeriodCard.tsx
git commit -m "feat(periods): add PeriodCard component"
```

---

## Task 2: PeriodFormModal component

**Files:**
- Create: `frontend/src/features/periods/components/PeriodFormModal.tsx`

- [ ] **Step 1: Write the component file**

```tsx
import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import type { PeriodType } from '../periodsApi'

export interface PeriodFormData {
  type: PeriodType
  startDate: string
  endDate: string
  submissionDeadline: string
}

interface Props {
  open: boolean
  onSave: (data: PeriodFormData) => Promise<void>
  onClose: () => void
}

const TYPE_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'MONTHLY', label: 'Ежемесячная' },
  { value: 'QUARTERLY', label: 'Квартальная' },
  { value: 'ANNUAL', label: 'Годовая' },
]

export function PeriodFormModal({ open, onSave, onClose }: Props) {
  const [type, setType] = useState<PeriodType>('MONTHLY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submissionDeadline, setSubmissionDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setType('MONTHLY')
    setStartDate('')
    setEndDate('')
    setSubmissionDeadline('')
    setError('')
  }, [open])

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate || !submissionDeadline) {
      setError('Заполните все даты')
      return
    }
    if (endDate < startDate) {
      setError('Дата окончания не может быть раньше начала')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSave({ type, startDate, endDate, submissionDeadline })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.messageRu || 'Ошибка при создании периода')
    } finally {
      setLoading(false)
    }
  }

  const labelCls = 'font-mono uppercase tracking-wider'
  const labelStyle = { fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 } as const
  const inputCls = 'w-full mt-1'
  const inputStyle = {
    fontSize: 13, padding: '8px 10px', borderRadius: 6,
    border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)',
  } as const

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg"
        style={{ background: 'var(--surface)', width: 'min(420px, 92vw)', padding: '22px 24px', boxShadow: 'var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.25))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-display" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            Новый период оценки
          </span>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X size={18} color="var(--ink-faint)" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className={labelCls} style={labelStyle}>Тип</label>
            <select
              className={inputCls}
              style={inputStyle}
              value={type}
              onChange={e => setType(e.target.value as PeriodType)}
            >
              {TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className={labelCls} style={labelStyle}>Дата начала</label>
            <input type="date" className={inputCls} style={inputStyle} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className={labelCls} style={labelStyle}>Дата окончания</label>
            <input type="date" className={inputCls} style={inputStyle} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className={labelCls} style={labelStyle}>Дедлайн подачи</label>
            <input type="date" className={inputCls} style={inputStyle} value={submissionDeadline} onChange={e => setSubmissionDeadline(e.target.value)} />
          </div>

          {error && (
            <div className="mb-3 font-mono" style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 10.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6, background: 'transparent', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="font-mono uppercase tracking-widest disabled:opacity-50"
              style={{ fontSize: 10.5, fontWeight: 600, padding: '7px 14px', borderRadius: 6, background: 'var(--accent-2,#2f9e6d)', color: '#fff' }}
            >
              {loading ? 'Создание…' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/periods/components/PeriodFormModal.tsx
git commit -m "feat(periods): add PeriodFormModal component"
```

---

## Task 3: PeriodsPage container

**Files:**
- Create: `frontend/src/features/periods/PeriodsPage.tsx`

- [ ] **Step 1: Write the component file**

```tsx
import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { periodsApi, Period, PeriodStatus, PeriodProgress } from './periodsApi'
import { PeriodCard } from './components/PeriodCard'
import { PeriodFormModal, PeriodFormData } from './components/PeriodFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { usePageTitle } from '../../context/PageContext'

const SECTIONS: { status: PeriodStatus; label: string }[] = [
  { status: 'ACTIVE', label: 'Активные' },
  { status: 'DRAFT',  label: 'Черновики' },
  { status: 'CLOSED', label: 'Завершённые' },
]

export function PeriodsPage() {
  usePageTitle('Периоды оценки')

  const [periods, setPeriods] = useState<Period[]>([])
  const [progress, setProgress] = useState<Record<number, PeriodProgress>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [closeTarget, setCloseTarget] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await periodsApi.list()
      setPeriods(list)
      // Fetch progress only for periods that have evaluations (ACTIVE/CLOSED).
      const withProgress = list.filter(p => p.status === 'ACTIVE' || p.status === 'CLOSED')
      const entries = await Promise.all(
        withProgress.map(async p => {
          try {
            return [p.id, await periodsApi.progress(p.id)] as const
          } catch {
            return [p.id, { total: 0, completed: 0 }] as const
          }
        }),
      )
      setProgress(Object.fromEntries(entries))
    } catch {
      setLoadError('Не удалось загрузить периоды')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (data: PeriodFormData) => {
    await periodsApi.create(data)
    await load()
  }

  const handleActivate = async (id: number) => {
    setBusyId(id)
    try {
      await periodsApi.activate(id)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  const handleClose = async () => {
    if (closeTarget == null) return
    const id = closeTarget
    setCloseTarget(null)
    setBusyId(id)
    try {
      await periodsApi.close(id)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px' }}>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)' }}>
          Периоды оценки
        </h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 font-mono uppercase tracking-widest"
          style={{ fontSize: 10.5, fontWeight: 600, padding: '8px 14px', borderRadius: 6, background: 'var(--accent-2,#2f9e6d)', color: '#fff' }}
        >
          <Plus size={14} /> Создать период
        </button>
      </div>

      {loading && (
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Загрузка…</div>
      )}

      {loadError && !loading && (
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--danger)' }}>{loadError}</div>
      )}

      {!loading && !loadError && periods.length === 0 && (
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          Периодов пока нет. Создайте первый.
        </div>
      )}

      {!loading && !loadError && SECTIONS.map(section => {
        const items = periods.filter(p => p.status === section.status)
        if (items.length === 0) return null
        return (
          <div key={section.status} className="mb-7">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono uppercase font-semibold tracking-widest" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                {section.label}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{items.length}</span>
            </div>
            <div className="grid gap-3">
              {items.map(p => (
                <PeriodCard
                  key={p.id}
                  period={p}
                  progress={progress[p.id]}
                  busy={busyId === p.id}
                  onActivate={handleActivate}
                  onClose={id => setCloseTarget(id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      <PeriodFormModal
        open={modalOpen}
        onSave={handleCreate}
        onClose={() => setModalOpen(false)}
      />

      <ConfirmDialog
        open={closeTarget !== null}
        title="Закрыть период?"
        description="После закрытия период нельзя будет редактировать или активировать заново."
        variant="danger"
        confirmLabel="Закрыть"
        onConfirm={handleClose}
        onCancel={() => setCloseTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify `usePageTitle` import path**

Run: `cd frontend && grep -rn "usePageTitle" src/context/PageContext.tsx src/features/evaluations/MyTasksPage.tsx`
Expected: confirms `usePageTitle` is exported from `src/context/PageContext` and called as `usePageTitle('...')`.
If the export path or call signature differs, adjust the import and call in `PeriodsPage.tsx` to match.

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/periods/PeriodsPage.tsx
git commit -m "feat(periods): add PeriodsPage container"
```

---

## Task 4: Wire the route

**Files:**
- Modify: `frontend/src/App.tsx` — import line near line 22, route element at line 102

- [ ] **Step 1: Add the import**

In `frontend/src/App.tsx`, add this import alongside the other feature imports (near the existing `MyTasksPage` import at line 22):

```tsx
import { PeriodsPage } from './features/periods/PeriodsPage'
```

- [ ] **Step 2: Replace the route element**

Change line 102 from:

```tsx
        <Route path="periods" element={<MyTasksPage />} />
```

to:

```tsx
        <Route path="periods" element={<PeriodsPage />} />
```

- [ ] **Step 3: Check whether `MyTasksPage` import is now unused**

Run: `cd frontend && grep -n "MyTasksPage" src/App.tsx`
Expected: `MyTasksPage` still appears on its import line AND on line 60 (`<MyTasksPage />` for the `/my-tasks` route). The import stays — do NOT remove it.
If line 60 no longer references `MyTasksPage`, then remove the now-unused import line instead.

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — no errors.

- [ ] **Step 5: Production build**

Run: `cd frontend && npm run build`
Expected: build succeeds, no TypeScript or Vite errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(periods): route /admin/periods to PeriodsPage"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Start the dev stack**

Run: `./scripts/dev-start.sh`
Wait for backend `:8080` and frontend `:5173` to be up.

- [ ] **Step 2: Visual check**

Log in as admin (`admin@gfh.kg` / `Admin123!@#`), navigate to `/admin/periods`. Confirm:
- Periods appear grouped under Активные / Черновики / Завершённые (empty sections hidden).
- ACTIVE and CLOSED cards show a progress bar; DRAFT cards do not.
- "Создать период" opens the modal; submitting a valid period adds it under Черновики.
- A DRAFT card's "Активировать" moves it to Активные.
- An ACTIVE card's "Закрыть период" opens the confirm dialog; confirming moves it to Завершённые.

- [ ] **Step 3: Stop the stack**

Ctrl+C to stop backend/frontend.

---

## Self-Review Notes

- **Spec coverage:** list (Task 3 sections) ✓, create (Tasks 2+3) ✓, activate (Tasks 1+3) ✓, close + ConfirmDialog (Tasks 1+3) ✓, progress for ACTIVE/CLOSED only (Tasks 1+3) ✓, route swap (Task 4) ✓, three status sections (Task 3) ✓, aesthetic via design tokens (Tasks 1-3) ✓.
- **Out of scope honored:** no appeals panel, no edit/delete — none added.
- **Type consistency:** `PeriodFormData` defined in Task 2, consumed in Task 3 ✓. `PeriodCard` props (`period, progress, busy, onActivate, onClose`) defined in Task 1, passed identically in Task 3 ✓. `periodsApi` method names match `periodsApi.ts` ✓.
- **Unknown verified at runtime:** `usePageTitle` import path is checked in Task 3 Step 2 rather than assumed.
