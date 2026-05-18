# MyEvaluationsPage — Period Labels + Score Trend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `Период #{id}` placeholder with human date-range labels and add a full-width score-trend bar panel to `MyEvaluationsPage`.

**Architecture:** A pure formatter util (`periodFormat.ts`) turns a `Period` into a date-range string. A new presentational component (`ScoreTrend.tsx`) derives one point per period from the evaluation history and renders bars in the dv3 skin. `MyEvaluationsPage` fetches periods alongside history, builds a `Map<periodId, Period>`, and feeds it to the period column, card, search text, comparator, and the trend panel.

**Tech Stack:** React 18, TypeScript, Vite. No frontend test framework — verification is `npx tsc --noEmit` + `npm run build`.

**Branch:** `redesign/my-evaluations` (continue on it).

**Spec:** `docs/superpowers/specs/2026-05-18-my-evaluations-period-label-trend-design.md`

---

## File Structure

- `frontend/src/features/evaluations/components/periodFormat.ts` — **create.** Pure `formatPeriodRange` formatter. No React.
- `frontend/src/features/evaluations/components/ScoreTrend.tsx` — **create.** Bar-chart panel component + its scoped CSS.
- `frontend/src/features/evaluations/MyEvaluationsPage.tsx` — **modify.** Fetch periods, build map, wire into column/card/search/comparator/trend.

All commands run from `frontend/`.

---

### Task 1: Period date-range formatter

**Files:**
- Create: `frontend/src/features/evaluations/components/periodFormat.ts`

- [ ] **Step 1: Create the formatter**

`Period` is exported from `frontend/src/features/periods/periodsApi.ts` with fields `id`, `type`, `startDate`, `endDate` (ISO `YYYY-MM-DD` strings). Parse year/month directly off the string to avoid timezone shifts.

```ts
import type { Period } from '../../periods/periodsApi'

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]

interface YearMonth { y: number; m: number }

function parseYearMonth(iso: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]) - 1 }
}

/**
 * Human label for a period as a date range.
 *  - same month        → "май 2026"
 *  - same year         → "апр–июн 2026"
 *  - spans years       → "дек 2025 – фев 2026"
 *  - period missing /
 *    unparseable dates → "Период #{periodId}"
 */
export function formatPeriodRange(period: Period | undefined, periodId: number): string {
  if (!period) return `Период #${periodId}`
  const start = parseYearMonth(period.startDate)
  const end = parseYearMonth(period.endDate)
  if (!start || !end) return `Период #${periodId}`

  if (start.y === end.y && start.m === end.m) {
    return `${MONTHS_SHORT[start.m]} ${start.y}`
  }
  if (start.y === end.y) {
    return `${MONTHS_SHORT[start.m]}–${MONTHS_SHORT[end.m]} ${start.y}`
  }
  return `${MONTHS_SHORT[start.m]} ${start.y} – ${MONTHS_SHORT[end.m]} ${end.y}`
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/evaluations/components/periodFormat.ts
git commit -m "feat: add formatPeriodRange period date-range formatter"
```

---

### Task 2: ScoreTrend bar-chart panel

**Files:**
- Create: `frontend/src/features/evaluations/components/ScoreTrend.tsx`

Depends on Task 1 (`formatPeriodRange`).

- [ ] **Step 1: Create the component**

`Evaluation` is exported from `frontend/src/features/evaluations/evaluationsApi.ts` with fields `id`, `periodId`, `status`, `finalScore: number | null`, `submittedAt: string | null`, `createdAt: string`. `Period` from `periodsApi.ts`.

The panel renders inside the page's `.dv3-root` (dv3 CSS variables already in scope). It accepts a `className` so the page can place it as `dv3-col-12`. Component owns its scoped CSS string `SCORE_TREND_CSS`, injected by the page (same pattern as `STAT_CARD_CSS`).

```tsx
import { useMemo } from 'react'
import type { Evaluation } from '../evaluationsApi'
import type { Period } from '../../periods/periodsApi'
import { formatPeriodRange } from './periodFormat'

/* Scoped styles — injected once by MyEvaluationsPage. Uses dv3 vars from .dv3-root. */
export const SCORE_TREND_CSS = `
.evt-panel {
  border: 1px solid var(--dv3-border);
  border-top: 2px solid var(--dv3-zone-info);
  background: var(--dv3-bg2);
  padding: 14px 16px 12px;
}
.evt-meta {
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dv3-zone-info);
}
.evt-plot {
  position: relative;
  height: 130px;
  margin-top: 12px;
}
.evt-gridline {
  position: absolute; left: 0; right: 0; height: 1px;
  background: var(--dv3-border);
}
.evt-bars {
  position: absolute; inset: 0;
  display: flex; align-items: flex-end; gap: 5px;
}
.evt-bar {
  flex: 1; min-width: 4px;
  border-radius: 2px 2px 0 0;
  background: var(--dv3-accent);
  opacity: 0.55;
}
.evt-bar--last { background: var(--dv3-zone-warn); opacity: 1; }
.evt-xaxis {
  display: flex; justify-content: space-between;
  font-size: 9px; color: var(--dv3-text3);
  margin-top: 6px; letter-spacing: 0.04em;
}
.evt-empty {
  margin-top: 12px;
  font-size: 12px; color: var(--dv3-text3);
}
`

interface TrendPoint { periodId: number; score: number; label: string }

interface ScoreTrendProps {
  evaluations: Evaluation[]
  periodById: Map<number, Period>
  loading: boolean
  className?: string
}

function evalTime(e: Evaluation): string {
  return e.submittedAt ?? e.createdAt
}

export function ScoreTrend({ evaluations, periodById, loading, className }: ScoreTrendProps) {
  const points = useMemo<TrendPoint[]>(() => {
    // Latest scored evaluation per period.
    const latest = new Map<number, Evaluation>()
    for (const e of evaluations) {
      if (e.finalScore === null) continue
      const cur = latest.get(e.periodId)
      if (!cur || evalTime(e) > evalTime(cur)) latest.set(e.periodId, e)
    }
    // Chronological by period.startDate, fall back to periodId.
    const ordered = [...latest.values()].sort((a, b) => {
      const pa = periodById.get(a.periodId)
      const pb = periodById.get(b.periodId)
      if (pa && pb) return pa.startDate.localeCompare(pb.startDate)
      return a.periodId - b.periodId
    })
    return ordered.slice(-12).map(e => ({
      periodId: e.periodId,
      score: Number(e.finalScore),
      label: formatPeriodRange(periodById.get(e.periodId), e.periodId),
    }))
  }, [evaluations, periodById])

  const rootClass = className ? `evt-panel ${className}` : 'evt-panel'

  if (loading) {
    return (
      <div className={rootClass}>
        <div className="evt-meta">SCORE.TREND</div>
        <div className="evt-plot dv3-loading" />
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div className={rootClass}>
        <div className="evt-meta">SCORE.TREND</div>
        <div className="evt-empty">Недостаточно данных для графика.</div>
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <div className="evt-meta">SCORE.TREND · {points.length} ПЕРИОДОВ</div>
      <div className="evt-plot">
        <div className="evt-gridline" style={{ top: '25%' }} />
        <div className="evt-gridline" style={{ top: '50%' }} />
        <div className="evt-gridline" style={{ top: '75%' }} />
        <div className="evt-bars">
          {points.map((p, i) => (
            <div
              key={p.periodId}
              className={`evt-bar${i === points.length - 1 ? ' evt-bar--last' : ''}`}
              style={{ height: `${Math.max(0, Math.min(100, p.score))}%` }}
              title={`${p.label}: ${p.score.toFixed(1)}`}
            />
          ))}
        </div>
      </div>
      <div className="evt-xaxis">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/evaluations/components/ScoreTrend.tsx
git commit -m "feat: add ScoreTrend bar-chart panel for evaluation history"
```

---

### Task 3: Wire periods + trend into MyEvaluationsPage

**Files:**
- Modify: `frontend/src/features/evaluations/MyEvaluationsPage.tsx`

Depends on Tasks 1 and 2.

- [ ] **Step 1: Add imports**

After the existing import block (the `StatusDistribution` import on line 11), the import section should read:

```tsx
import {
  STATUS_LABELS, STATUS_ORDER, EvaluationStatusBadge,
} from './components/evaluationStatus'
import { StatusDistribution } from './components/StatusDistribution'
import { ScoreTrend, SCORE_TREND_CSS } from './components/ScoreTrend'
import { formatPeriodRange } from './components/periodFormat'
import { periodsApi, type Period } from '../periods/periodsApi'
```

- [ ] **Step 2: Add period state**

After the existing `const [all, setAll] = useState<Evaluation[]>([])` line, add:

```tsx
  const [periodById, setPeriodById] = useState<Map<number, Period>>(new Map())
```

- [ ] **Step 3: Fetch periods alongside history**

Replace the existing data-fetch `useEffect` (currently `evaluationsApi.myHistory(0, 200).then(...).catch(...).finally(...)`) with:

```tsx
  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      evaluationsApi.myHistory(0, 200),
      periodsApi.list(),
    ]).then(([history, periods]) => {
      if (history.status === 'fulfilled') setAll(history.value.content)
      else setFailed(true)
      if (periods.status === 'fulfilled') {
        setPeriodById(new Map(periods.value.map(p => [p.id, p])))
      } else {
        setFailed(true)
      }
    }).finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [])
```

- [ ] **Step 4: Use the date-range label in the period column**

In the `columns` array, replace the `period` column's `render` (the block rendering `Период #{e.periodId}`) with:

```tsx
    {
      key: 'period', header: 'Период', sortable: true,
      render: (e) => (
        <div>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {formatPeriodRange(periodById.get(e.periodId), e.periodId)}
          </div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
            {fmtDateShort(rowDate(e))}
          </div>
        </div>
      ),
    },
```

- [ ] **Step 5: Use the date-range label in the card**

In `renderCard`, replace the period title `<div>` (currently `Период #{e.periodId}`) with:

```tsx
            <div className="font-display truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {formatPeriodRange(periodById.get(e.periodId), e.periodId)}
            </div>
```

- [ ] **Step 6: Extend search text**

Replace the `searchText` definition with:

```tsx
  const searchText = (e: Evaluation) =>
    `Период #${e.periodId} ${formatPeriodRange(periodById.get(e.periodId), e.periodId)} ${e.evaluatorName}`
```

- [ ] **Step 7: Sort the period column chronologically**

In the `comparator` function, split the combined `case 'date': case 'period':` so `period` sorts by `startDate` then `periodId`. The `switch` becomes:

```tsx
  const comparator = (key: string) => (a: Evaluation, b: Evaluation): number => {
    switch (key) {
      case 'evaluator':  return a.evaluatorName.localeCompare(b.evaluatorName, 'ru')
      case 'status':     return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      case 'finalScore': return (a.finalScore ?? -1) - (b.finalScore ?? -1)
      case 'period': {
        const pa = periodById.get(a.periodId)
        const pb = periodById.get(b.periodId)
        if (pa && pb) return pa.startDate.localeCompare(pb.startDate)
        return a.periodId - b.periodId
      }
      case 'date':
      default:           return (rowDate(a) ?? '').localeCompare(rowDate(b) ?? '')
    }
  }
```

- [ ] **Step 8: Inject the trend CSS**

After the existing `<style>{STAT_CARD_CSS}</style>` line, add:

```tsx
        <style>{SCORE_TREND_CSS}</style>
```

- [ ] **Step 9: Render the trend panel**

In the `.dv3-grid` block, immediately after the closing `/>` of the fourth `StatCard` (the `APPEALS` card) and before the `</div>` that closes `.dv3-grid`, add:

```tsx
            <ScoreTrend
              className="dv3-col-12"
              evaluations={all}
              periodById={periodById}
              loading={loading}
            />
```

- [ ] **Step 10: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 11: Production build**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 12: Commit**

```bash
git add src/features/evaluations/MyEvaluationsPage.tsx
git commit -m "feat: period date-range labels + score-trend panel on MyEvaluationsPage"
```

---

## Verification

After all tasks, run from `frontend/`:

- `npx tsc --noEmit` — clean.
- `npm run build` — clean.

Manual (`./scripts/dev-start.sh`, open `/my-evaluations`):

- Period column shows date ranges (`май 2026`, `апр–июн 2026`), not `Период #N`.
- Sorting the Период column orders chronologically (by period start), not by label text.
- Search matches both the date-range text and `#id`.
- Score-trend panel sits full-width below the 4 stat cards: bars per period, rightmost bar gold, three gridlines, two end labels, hover tooltip `{label}: {score}`.
- Fewer than 2 scored periods → panel shows "Недостаточно данных для графика."
- While loading → panel shows pulsing placeholder.
- Simulate a periods-fetch failure (e.g. offline `/periods`) → period labels fall back to `Период #N`, trend still renders ordered by periodId, hero foot shows "ошибка загрузки". Page does not crash.
