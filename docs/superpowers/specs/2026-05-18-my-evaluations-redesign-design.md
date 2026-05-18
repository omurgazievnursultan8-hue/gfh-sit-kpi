# MyEvaluationsPage redesign — design

Date: 2026-05-18
Status: approved

## Goal

Rebuild `frontend/src/features/evaluations/MyEvaluationsPage.tsx` so it reuses
existing shared components instead of its own inline ones:

- **Page header** — dashboard hero skin (`dv3-hero`).
- **Stat cards** — dashboard gauge `StatCard` (`components/StatCard.tsx`).
- **List of evaluations** — users-page `DataPanel` (`components/DataPanel.tsx`).

## Out of scope

Other evaluation pages (`MyTasksPage`, `EvaluatorEvaluationsPage`,
`EvaluationFormPage`, `EvaluationDetailPage`). API (`evaluationsApi`) unchanged.

## Page structure (top → bottom)

### 1. Hero

Dashboard `dv3-hero` markup + `DASHBOARD_CSS`. Mirrors `DashboardPage`:

- Meta line: `EVAL.LEDGER` label + `KGT HH:MM`.
- Title: `Мои оценки` with gold accent.
- Subtitle: localized today line (`weekday, day month year · HH:MM`).
- Two `dv3-hero-metric` numbers: `Всего` (total) and `Ждут реакции` (pending).
- Foot line: status (ok / partial-failure) + last-updated relative label.

Live 60s tick for clock/relative time, same as `DashboardPage`.

### 2. Stat grid — 4 gauge StatCards

Reuse `StatCard` + `STAT_CARD_CSS` + `scoreZone` from `components/StatCard.tsx`.
`dv3-grid` container, each card `dv3-col-*`.

| Card | title | value | gauge |
|------|-------|-------|-------|
| Средний итог | `SELF.AVG` | avgScore (rounded) | `marker`, pct = avg/100, `zoneScore` colored, unit `/ 100` |
| Всего оценок | `EVAL.TOTAL` | all.length | `meta`, pct = closed/total, center `N закрыто` |
| Ждут реакции | `PENDING` | counts.SUBMITTED | `meta`, pct = pending/total, center `N% всех` |
| Апелляции | `APPEALS` | counts.APPEALED | `meta`, pct = appealed/total, center `N% всех`, `onClick` → `/my-tasks` |

`closed` = `counts.CLOSED + counts.ACKNOWLEDGED`. Empty dataset → pct 0, value 0.
`EVAL.TOTAL` has no natural denominator — gauge shows closed-share by design.

### 3. List — DataPanel

`DataPanel<Evaluation>`, `mode="client"`, default view `table`,
`views={['table','cards']}`, `panelStorageKey='gfh_my_evaluations'`.

Columns:

| key | header | sortable | render |
|-----|--------|----------|--------|
| period | Период | yes | `Период #{periodId}` |
| evaluator | Оценщик | yes | `evaluatorName` |
| date | Дата | yes | `fmtDateShort(submittedAt ?? createdAt)` |
| status | Статус | yes | `<EvaluationStatusBadge>` |
| finalScore | Итог | yes | score `toFixed(1)` or `—` |
| delta | Δ | no | signed delta vs previous scored evaluation |

- `searchText` = `Период #{periodId} {evaluatorName}`.
- Filter: one `select` on status (`ALL` + each `EvaluationStatus`).
- `comparator` per sortable key; default sort `date desc` (newest first).
- `onRowClick` / card click → `navigate('/my-evaluations/' + id)`.
- `renderCard` — compact card mirroring users-page `renderCard` style
  (period title, evaluator, status badge, score).
- Δ computed from the full scored-ordered list (newest-first), each row vs the
  next-older scored entry — same logic as the current `EvaluationLedger`.

### 4. Distribution card

Separate panel below `DataPanel`. Keep current `StatusDistribution` (status
breakdown bars). Extract it into its own file
`features/evaluations/components/StatusDistribution.tsx`.

## New / changed components

- **`EvaluationStatusBadge`** — new, `features/evaluations/components/`.
  Status pill using current `STATUS_LABELS` + `STATUS_VISUALS`. Used in the
  DataPanel status column, card, and distribution.
- **`StatusDistribution`** — extracted from `MyEvaluationsPage` into its own
  file; logic unchanged.
- **`MyEvaluationsPage`** — rewritten. Removed inline pieces: green hero,
  inline `StatCard`, `Card`, `FilterChips`, `EvaluationLedger`, `Pagination`.
  `STATUS_*` constants move next to `EvaluationStatusBadge`.

## Data flow

Unchanged: `evaluationsApi.myHistory(0, 200)` → `all: Evaluation[]`.
Derived counts/avg/delta computed in page, same as today. `DataPanel` does
client-side search/filter/sort/paginate over `all`.

## Layout wrapper

Current `MyEvaluationsPage` does not import `Layout` (route supplies it).
Keep that — do not add `Layout` import (avoid double-wrap). Verify at
implementation time against the router.

## Error / empty handling

- Loading: `DataPanel` `loading` prop; hero shows placeholder `··`.
- Fetch failure: flag partial-failure in hero foot (mirror `DashboardPage`).
- Empty dataset: hero metrics 0, stat cards 0, `DataPanel` `empty` text,
  distribution shows "Нет данных".

## Testing

Manual: `npx tsc --noEmit` clean; `npm run build` clean. Visual check of
hero, 4 cards, table sort/filter/search/pagination, card view, distribution,
row → detail navigation, empty + loading states.
