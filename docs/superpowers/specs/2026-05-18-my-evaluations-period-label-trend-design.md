# MyEvaluationsPage — period date-range labels + score-trend panel — design

Date: 2026-05-18
Status: approved

## Goal

Two additions to the redesigned `frontend/src/features/evaluations/MyEvaluationsPage.tsx`:

1. **Period label** — replace the placeholder `Период #{periodId}` with a human
   date-range label derived from period metadata.
2. **Score trend panel** — a full-width bar chart of final scores over time,
   below the 4 stat cards.

## Out of scope

Other evaluation pages. Backend changes. The existing hero, 4 `StatCard`s,
`DataPanel`, and `StatusDistribution` — unchanged except the period column
render and one new panel inside the stat grid.

## Data flow

`MyEvaluationsPage` currently calls `evaluationsApi.myHistory(0, 200)` → `all:
Evaluation[]`. `Evaluation` carries only `periodId`, not period metadata.

Add a parallel fetch: `periodsApi.list()` (`features/periods/periodsApi.ts`,
`GET /periods` → `Period[]`). `Period` has `id`, `type`, `startDate`,
`endDate`, `submissionDeadline`, `status`. Build `periodById:
Map<number, Period>` once after fetch.

Both fetches run together (`Promise.allSettled` style — independent failure).
If `periodsApi.list()` fails or returns empty, the page still works:

- Period label falls back to `Период #{periodId}`.
- Trend orders points by `periodId` ascending instead of `startDate`.
- Hero foot flags partial-failure (mirrors existing `DashboardPage` pattern,
  same flag already used for a `myHistory` failure).

> Risk note: `GET /periods` may be admin-restricted. `MyTasksPage` already
> calls `periodsApi.list()` as a non-admin (evaluator) context, so it is
> expected to be reachable. Verify at implementation time; the graceful
> fallback above covers a 403 either way.

## Part 1 — Period date-range label

New util file `features/evaluations/components/periodFormat.ts`.

```
formatPeriodRange(period: Period | undefined, periodId: number): string
```

Russian short month names (lowercase): `янв фев мар апр май июн июл авг сен
окт ноя дек`. Parse `startDate` / `endDate` as ISO date strings.

Rules:

- `period` undefined → `Период #{periodId}`.
- start and end in the **same calendar month** → `«{месяц} {год}»` e.g. `май 2026`.
- same calendar **year**, different months → `«{мес}–{мес} {год}»` e.g. `апр–июн 2026`.
- spans **different years** → `«{мес} {год} – {мес} {год}»` e.g. `дек 2025 – фев 2026`.

Used in:

- `DataPanel` period column render (replaces `Период #{periodId}`).
- `DataPanel` `renderCard` period title.
- `searchText` — append the formatted label so search matches the visible text
  (keep `Период #{periodId}` in `searchText` too, so id search still works).

The period column `comparator` sorts by `period.startDate` when available,
falling back to `periodId` — so the column sorts chronologically, not by the
label string.

## Part 2 — Score trend panel

New component `features/evaluations/components/ScoreTrend.tsx`.

```
ScoreTrend({ evaluations, periodById, loading }: {
  evaluations: Evaluation[]
  periodById: Map<number, Period>
  loading: boolean
})
```

### Data derivation (inside the component)

1. Keep evaluations with `finalScore != null`.
2. Group by `periodId`; per period keep the **latest** one
   (max `submittedAt ?? createdAt`).
3. Sort periods chronologically: by `periodById.get(id)?.startDate` when
   present, else by `periodId` ascending.
4. Take the **last 12** (most recent).

Each point: `{ periodId, score, label }` where `label =
formatPeriodRange(periodById.get(periodId), periodId)`.

### Render

dv3 panel: `.dv3-hero`-sibling styling — bordered box, `border-top: 2px solid
var(--dv3-zone-info)`, `background: var(--dv3-bg2)`. Placed inside the existing
`.dv3-grid`, in a `.dv3-col-12` cell, immediately after the 4 `StatCard`s.

- Meta line: `SCORE.TREND · {N} ПЕРИОДОВ` (uppercase, `--dv3-zone-info`).
- Bar chart, style B from the approved mockup:
  - One bar per point, equal flex width, gap ~5px.
  - Bar height = `score / 100` of the plot area; plot area fixed height ~130px.
  - Bars use a muted green (`--dv3-green` at reduced intensity); the **latest**
    (rightmost) bar uses the gold accent (`#f0caa4` / `--dv3-zone-warn`).
  - Y gridlines at 25 / 50 / 75 (`--dv3-border`).
  - X-axis: two end labels only — oldest point label (left), newest (right).
  - Hover on a bar → native `title` tooltip `{label}: {score}`.
- Empty / insufficient: fewer than 2 derived points → panel shows
  `Недостаточно данных для графика.` in `--dv3-text3`.
- Loading: `loading` true → meta line + `.dv3-loading` pulse placeholder,
  no bars.

No chart library — plain divs/SVG, consistent with existing dv3 components.

## Files

- Create: `features/evaluations/components/periodFormat.ts` — `formatPeriodRange`.
- Create: `features/evaluations/components/ScoreTrend.tsx`.
- Modify: `features/evaluations/MyEvaluationsPage.tsx` — add `periodsApi.list()`
  fetch, build `periodById` Map, pass to the period column render/comparator,
  `renderCard`, `searchText`, and render `<ScoreTrend>` in a `.dv3-col-12` cell
  after the stat cards.

No change to `evaluationsApi.ts` (periods come from existing `periodsApi`).

## Error / empty handling

- `periodsApi.list()` failure → `#id` label fallback, trend by `periodId`
  order, partial-failure flag in hero foot.
- Empty dataset → trend shows insufficient-data state; label code path unused.
- Loading → `ScoreTrend` `loading` prop shows pulse.

## Testing

Manual: `npx tsc --noEmit` clean; `npm run build` clean. Visual check:
period column shows date ranges, sorts chronologically; search matches range
text and `#id`; trend panel renders bars with latest gold, gridlines, end
labels, hover tooltip; insufficient-data + loading states; period-fetch
failure falls back to `#id` labels without breaking the page.
