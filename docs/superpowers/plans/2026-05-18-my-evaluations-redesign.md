# MyEvaluationsPage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `MyEvaluationsPage` so it reuses the dashboard hero + dashboard gauge `StatCard` + users-page `DataPanel`, replacing all bespoke inline components.

**Architecture:** The page renders two regions. A `.dv3-root` region holds the dashboard hero markup and a `.dv3-grid` of 4 gauge `StatCard`s. A second plain region holds the users-page `DataPanel` (table default) and a status-distribution panel. Status metadata + a status badge are extracted to a shared file; the distribution panel is extracted to its own file.

**Tech Stack:** React 18, TypeScript, Vite, react-router-dom v6. No frontend unit-test framework exists — verification is `npx tsc --noEmit` + `npm run build` + manual checks.

---

## File Structure

- Create: `frontend/src/features/evaluations/components/evaluationStatus.tsx` — `EvaluationStatus` label/visual maps + `EvaluationStatusBadge`.
- Create: `frontend/src/features/evaluations/components/StatusDistribution.tsx` — status-breakdown bars panel.
- Modify (full rewrite): `frontend/src/features/evaluations/MyEvaluationsPage.tsx`.

No API, routing, or i18n changes. The page keeps Russian string literals (matching the current file) and is **not** wrapped in `<Layout>` (the route supplies layout; current file has no `Layout` import).

---

## Task 1: Status metadata + badge component

**Files:**
- Create: `frontend/src/features/evaluations/components/evaluationStatus.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { EvaluationStatus } from '../evaluationsApi'

export const STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Ожидает реакции',
  ACKNOWLEDGED: 'Подтверждено',
  APPEALED: 'Апелляция',
  CLOSED: 'Завершено',
}

export interface StatusVisual { bg: string; fg: string; border: string; stripe: string }

export const STATUS_VISUALS: Record<EvaluationStatus, StatusVisual> = {
  DRAFT:        { bg: 'rgba(120,120,120,0.12)', fg: '#6b6b6b',        border: 'rgba(120,120,120,0.32)', stripe: 'var(--line-strong)' },
  SUBMITTED:    { bg: 'rgba(200,150,40,0.14)',  fg: '#9c7416',        border: 'rgba(200,150,40,0.32)',  stripe: 'var(--warn, #c89628)' },
  ACKNOWLEDGED: { bg: 'rgba(26,117,88,0.14)',   fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.32)',  stripe: 'var(--accent-2)' },
  APPEALED:     { bg: 'rgba(200,80,60,0.14)',   fg: '#b04d3a',        border: 'rgba(200,80,60,0.32)',   stripe: 'var(--danger)' },
  CLOSED:       { bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7',        border: 'rgba(120,150,200,0.32)', stripe: 'var(--info)' },
}

// Filter-chip / sort order for statuses.
export const STATUS_ORDER: EvaluationStatus[] = ['SUBMITTED', 'APPEALED', 'DRAFT', 'ACKNOWLEDGED', 'CLOSED']

export function EvaluationStatusBadge({ status }: { status: EvaluationStatus }) {
  const v = STATUS_VISUALS[status]
  return (
    <span
      className="font-mono font-semibold uppercase tracking-widest"
      style={{
        fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
        background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS (no errors). The file is not yet imported; this only confirms the file itself type-checks.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/evaluations/components/evaluationStatus.tsx
git commit -m "feat: extract EvaluationStatusBadge + status metadata"
```

---

## Task 2: Status distribution panel

**Files:**
- Create: `frontend/src/features/evaluations/components/StatusDistribution.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { EvaluationStatus } from '../evaluationsApi'
import { STATUS_LABELS, STATUS_VISUALS, STATUS_ORDER } from './evaluationStatus'

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

/** Status-breakdown bars. Dominant status first, status order as tiebreaker. */
export function StatusDistribution({
  counts, total,
}: {
  counts: Record<EvaluationStatus, number>
  total: number
}) {
  const rows = STATUS_ORDER
    .map(s => ({ status: s, count: counts[s] }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--surface)', border: '1px solid var(--line-soft)',
        padding: '16px 18px', boxShadow: 'var(--shadow-sm)', marginTop: 16,
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: 'var(--info)' }} />
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          Распределение по статусам
        </span>
        <span className="font-mono font-semibold" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          {total} {plural(total, ['запись', 'записи', 'записей'])}
        </span>
      </div>

      {total === 0 ? (
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          Нет данных.
        </div>
      ) : (
        rows.map(r => {
          const pct = (r.count / total) * 100
          const v = STATUS_VISUALS[r.status]
          return (
            <div key={r.status} className="mb-2.5 last:mb-0">
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <span className="truncate" style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>
                  {STATUS_LABELS[r.status]}
                </span>
                <span className="font-mono tabular-nums whitespace-nowrap"
                      style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
                  {r.count}
                  <span className="ml-1" style={{ color: 'var(--ink-dim)', fontWeight: 400 }}>
                    · {pct.toFixed(0)}%
                  </span>
                </span>
              </div>
              <div className="relative overflow-hidden rounded-full"
                   style={{ height: 6, background: 'var(--bg-soft, #ebe6db)' }}>
                <div className="absolute inset-y-0 left-0 transition-all"
                     style={{ width: `${pct}%`, background: v.stripe, borderRadius: 999 }} />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/evaluations/components/StatusDistribution.tsx
git commit -m "feat: extract StatusDistribution panel"
```

---

## Task 3: Rewrite MyEvaluationsPage

**Files:**
- Modify (full rewrite): `frontend/src/features/evaluations/MyEvaluationsPage.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, type Evaluation, type EvaluationStatus } from './evaluationsApi'
import { usePageTitle } from '../../context/PageContext'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import {
  STATUS_LABELS, STATUS_ORDER, EvaluationStatusBadge,
} from './components/evaluationStatus'
import { StatusDistribution } from './components/StatusDistribution'

/* ──────────────────────────────────────────────────────────────────────────
 * "Мои оценки" — rebuilt on shared components:
 *   dashboard hero (.dv3-hero) + 4 gauge StatCards + users-page DataPanel.
 * ────────────────────────────────────────────────────────────────────────── */

const PANEL_KEY = 'gfh_my_evaluations'
const PLACEHOLDER = '··'

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function rowDate(e: Evaluation): string | null {
  return e.submittedAt ?? e.createdAt
}

function signedDelta(n: number | null): { txt: string; tone: 'up' | 'down' | 'flat' } {
  if (n === null || Number.isNaN(n)) return { txt: '—', tone: 'flat' }
  if (Math.abs(n) < 0.05) return { txt: '±0.0', tone: 'flat' }
  return { txt: `${n > 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}`, tone: n > 0 ? 'up' : 'down' }
}

export function MyEvaluationsPage() {
  const navigate = useNavigate()
  usePageTitle('nav.myEvaluations')

  const [all, setAll] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    setLoading(true)
    evaluationsApi.myHistory(0, 200)
      .then(data => setAll(data.content))
      .catch(() => setFailed(true))
      .finally(() => { setLoading(false); setLoadedAt(new Date()) })
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

  /* ── derived stats ─────────────────────────────────────────────────────── */
  const counts = useMemo<Record<EvaluationStatus, number>>(() => {
    const c: Record<EvaluationStatus, number> = {
      DRAFT: 0, SUBMITTED: 0, ACKNOWLEDGED: 0, APPEALED: 0, CLOSED: 0,
    }
    for (const e of all) c[e.status] += 1
    return c
  }, [all])

  const scored = useMemo(() => all.filter(e => e.finalScore !== null), [all])
  const avgScore = scored.length
    ? scored.reduce((s, e) => s + (e.finalScore as number), 0) / scored.length
    : null
  const avgWhole = avgScore !== null ? Math.round(avgScore) : null

  const total = all.length
  const pending = counts.SUBMITTED
  const appealed = counts.APPEALED
  const closed = counts.CLOSED + counts.ACKNOWLEDGED

  // Per-evaluation delta vs the next-older scored entry, computed from the
  // API order (newest-first) so it is stable regardless of DataPanel sorting.
  const deltaById = useMemo(() => {
    const m = new Map<number, number | null>()
    for (let i = 0; i < scored.length; i++) {
      const cur = scored[i].finalScore as number
      const prev = i + 1 < scored.length ? scored[i + 1].finalScore : null
      m.set(scored[i].id, prev !== null ? cur - prev : null)
    }
    return m
  }, [scored])

  /* ── DataPanel config ──────────────────────────────────────────────────── */
  const columns: Column<Evaluation>[] = [
    {
      key: 'period', header: 'Период', sortable: true,
      render: (e) => (
        <div>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            Период #{e.periodId}
          </div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
            {fmtDateShort(rowDate(e))}
          </div>
        </div>
      ),
    },
    {
      key: 'evaluator', header: 'Оценщик', sortable: true,
      render: (e) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{e.evaluatorName}</span>,
    },
    {
      key: 'date', header: 'Дата', sortable: true,
      render: (e) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{fmtDateShort(rowDate(e))}</span>,
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (e) => <EvaluationStatusBadge status={e.status} />,
    },
    {
      key: 'finalScore', header: 'Итог', sortable: true, align: 'right',
      render: (e) => (
        <span className="font-display tabular-nums" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
          {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
        </span>
      ),
    },
    {
      key: 'delta', header: 'Δ', align: 'right',
      render: (e) => {
        const d = signedDelta(deltaById.get(e.id) ?? null)
        const color = d.tone === 'up' ? 'var(--accent-2)' : d.tone === 'down' ? 'var(--danger)' : 'var(--ink-faint)'
        return <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color }}>{d.txt}</span>
      },
    },
  ]

  const FILTERS: FilterDef[] = [
    {
      key: 'status', label: 'Статус', type: 'select',
      options: [
        { value: '', label: 'Все статусы' },
        ...STATUS_ORDER.map(s => ({ value: s, label: STATUS_LABELS[s] })),
      ],
    },
  ]

  const searchText = (e: Evaluation) => `Период #${e.periodId} ${e.evaluatorName}`

  const clientFilter = (e: Evaluation, v: Record<string, string>) =>
    !v.status || e.status === v.status

  const comparator = (key: string) => (a: Evaluation, b: Evaluation): number => {
    switch (key) {
      case 'evaluator':  return a.evaluatorName.localeCompare(b.evaluatorName, 'ru')
      case 'status':     return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      case 'finalScore': return (a.finalScore ?? -1) - (b.finalScore ?? -1)
      case 'date':
      case 'period':
      default:           return (rowDate(a) ?? '').localeCompare(rowDate(b) ?? '')
    }
  }

  const renderCard = (e: Evaluation): ReactNode => {
    const d = signedDelta(deltaById.get(e.id) ?? null)
    const deltaColor = d.tone === 'up' ? 'var(--accent-2)' : d.tone === 'down' ? 'var(--danger)' : 'var(--ink-faint)'
    return (
      <div
        onClick={() => navigate(`/my-evaluations/${e.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/my-evaluations/${e.id}`) } }}
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 16, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              Период #{e.periodId}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
              {fmtDateShort(rowDate(e))}
            </div>
          </div>
          <EvaluationStatusBadge status={e.status} />
        </div>
        <div className="flex items-end justify-between gap-3" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <span className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{e.evaluatorName}</span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display tabular-nums" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
              {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
            </span>
            <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: deltaColor }}>{d.txt}</span>
          </span>
        </div>
      </div>
    )
  }

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* HERO */}
          <div className="dv3-hero">
            <div className="dv3-hero-meta">
              <span className="dv3-hero-meta-l">EVAL.LEDGER</span>
              <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
            </div>
            <div className="dv3-hero-main">
              <div>
                <h1 className="dv3-hero-title">
                  {timeGreeting}. <span className="dv3-accent">Мои оценки</span>
                </h1>
                <p className="dv3-hero-sub">{todayLine}</p>
              </div>
              <div className="dv3-hero-metrics">
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : total}
                  </span>
                  <span className="dv3-hero-metric-lab">всего</span>
                </div>
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : pending}
                  </span>
                  <span className="dv3-hero-metric-lab">ждут реакции</span>
                </div>
              </div>
            </div>
            <div className="dv3-hero-foot">
              <span className={failed ? 'dv3-hero-foot-warn' : 'dv3-hero-foot-ok'}>
                STATUS · {failed ? 'ошибка загрузки' : 'ок'}
              </span>
              <span>{updatedLabel}</span>
            </div>
          </div>

          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="SELF.AVG" id="A01" loading={loading}
              value={avgWhole} unit="/ 100" zoneScore={avgWhole}
              gauge={{
                pct: avgScore !== null ? avgScore / 100 : 0, variant: 'marker',
                left: '0', right: '100',
                current: avgWhole !== null ? avgWhole : '—',
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="EVAL.TOTAL" id="T01" loading={loading}
              value={total} label="оценок"
              gauge={{
                pct: total > 0 ? closed / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{closed}</strong> закрыто</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="PENDING" id="P01" loading={loading}
              value={pending} label="ждут реакции"
              gauge={{
                pct: total > 0 ? pending / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((pending / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="APPEALS" id="X01" loading={loading}
              value={appealed} label="апелляции"
              onClick={() => navigate('/my-tasks')}
              gauge={{
                pct: total > 0 ? appealed / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((appealed / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
          </div>
        </div>
      </div>

      {/* LIST + DISTRIBUTION */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }}>
        <DataPanel<Evaluation>
          mode="client"
          columns={columns}
          rows={all}
          rowKey={(e) => e.id}
          loading={loading}
          caption="Журнал моих оценок"
          empty="Нет оценок"
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по периоду или оценщику"
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'date', dir: 'desc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          panelStorageKey={PANEL_KEY}
          columnConfig
          onRowClick={(e) => navigate(`/my-evaluations/${e.id}`)}
        />

        <StatusDistribution counts={counts} total={total} />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS. If `Column` reports an unknown `align` value, check `DataTable.tsx` for the allowed `align` union and adjust (`'right'` is used by `UsersPage.tsx`, so it is valid).

- [ ] **Step 3: Production build**

Run: `cd frontend && npm run build`
Expected: build succeeds, no TypeScript or bundler errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/evaluations/MyEvaluationsPage.tsx
git commit -m "refactor: rebuild MyEvaluationsPage on dashboard + DataPanel components"
```

---

## Task 4: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Run the dev stack**

Run: `./scripts/dev-start.sh`
Expected: backend `:8080`, frontend `:5173` up.

- [ ] **Step 2: Open `/my-evaluations` and confirm**

Log in (`admin@gfh.kg` / `Admin123!@#` or a seeded employee with history) and check:
- Hero shows greeting, `Мои оценки`, today line, clock, `всего` + `ждут реакции` metrics, status foot line.
- 4 gauge StatCards render: `SELF.AVG` (marker gauge, zone color), `EVAL.TOTAL`, `PENDING`, `APPEALS`.
- Clicking `APPEALS` card navigates to `/my-tasks`.
- DataPanel table shows columns Период / Оценщик / Дата / Статус / Итог / Δ.
- Search filters rows; status select filters rows; column sort works; pagination works.
- Switching to cards view renders evaluation cards; clicking a card or table row opens `/my-evaluations/:id`.
- Distribution panel below the table shows status bars.

- [ ] **Step 3: Confirm empty + loading states**

- While data loads: hero metrics show `··`, stat cards show `··`.
- For an account with no history: hero metrics `0`, stat cards `0`, table shows `Нет оценок`, distribution shows `Нет данных.`.

- [ ] **Step 4: Final commit (only if Step 2-3 surfaced fixes)**

```bash
git add -A
git commit -m "fix: address MyEvaluationsPage redesign review findings"
```

---

## Self-Review Notes

- **Spec coverage:** hero (Task 3), 4 gauge StatCards (Task 3), DataPanel table list (Task 3), distribution panel (Task 2), `EvaluationStatusBadge` (Task 1), removal of inline components (Task 3 full rewrite). All spec sections covered.
- **`EVAL.TOTAL` gauge:** no natural denominator — gauge shows closed-share, as the spec explicitly allows.
- **Δ stability:** `deltaById` is computed from API order before `DataPanel` sorts, so the Δ column stays correct under any sort — not sortable by design.
- **Layout:** page intentionally not wrapped in `<Layout>` (matches the pre-rewrite file). If `/my-evaluations` renders without app chrome after the change, the route in `App.tsx` needs `Layout` — verify in Task 4 Step 2.
