# Table Unification — Design

**Date:** 2026-05-16
**Status:** Approved (design)
**Topic:** Migrate `DelegationsPage` to the shared `DataTable`, and unify all `DataTable`-based table pages onto one cream-themed look.

## Context

The frontend has one generic table component, `components/DataTable.tsx` (sortable, sticky
header, density-aware, skeleton/empty states, expandable rows). It is styled with the app's
cream CSS-var theme (`--ink` / `--line` / `--accent` / `--surface`).

Two visual languages coexist across table screens:

- **Cream theme** — CSS vars, JetBrains Mono labels, 3px accent-stripe cards. Used by
  `DelegationsPage`, `CriteriaPage`, `UserTable`. `DataTable` itself renders cream.
- **Gray theme** — Tailwind `bg-white` / `border-gray-200` / `text-gray-900`. Used by the
  five pages that consume `DataTable`: `AntiBonusAnalyticsPage`, `AuditLogPage`,
  `AdminMonitoringPage`, `HierarchicalAnalyticsPage`, `ManagerDashboardPage`.

Result: on the gray pages the table *core* renders cream while its wrapper card and cell
renderers are gray — a mismatch within each page and against `CriteriaPage`.

`DelegationsPage` does not use `DataTable` at all — it hand-rolls a CSS-grid (`<div>`) table
with `DelegationRow` components.

## Goal

All `DataTable`-based table screens share one look, enforced by a shared wrapper component
rather than convention.

- Migrate `DelegationsPage` from its custom div-grid table to `DataTable`.
- Restyle the five gray pages' **table card + filter/toolbar card** to the cream theme.
- Introduce a shared `TableCard` wrapper so future tables inherit the look for free.

### Non-goals

- `CriteriaPage` — already cream and consistent with `DataTable`; its bulk-edit/tabs UI is
  tangled into its card. Left untouched.
- `UserTable` — bespoke (avatars/role badges), already cream. Left bespoke.
- Page headings and charts (recharts bar/line, tree/heatmap views) — left as-is.
- i18n strings, data fetching, server pagination semantics — unchanged.

## Approach

**Approach 2 — shared `TableCard` wrapper** (chosen over inline restyle and over
"TableCard everywhere incl. CriteriaPage").

### Resolved open questions

1. **`rowClassName` on `DataTable`** — added. `DelegationsPage` currently dims inactive
   rows (`opacity: 0.65`); without a per-row hook that visual is lost on migration. The
   prop is a minimal, opt-in addition every table can use later.
2. **Status badges** — extracted into a shared `<Badge>` component. The five gray pages
   each render status pills (action tone, Quartz job state, evaluation status, delegation
   urgency). Inline restyle would copy the cream pill recipe ~8 times and drift — the same
   rationale that justifies `TableCard`. `<Badge>` stays within Approach 2's spirit (a
   shared primitive), not Approach 3 (which was specifically about CriteriaPage).

## Design

### 1. New component — `components/TableCard.tsx`

Cream card chrome for a table. Single purpose: surface + stripe + optional header/footer.

```tsx
interface TableCardProps {
  header?: React.ReactNode   // padded region, border-bottom under it
  footer?: React.ReactNode   // padded region, border-top above it
  accent?: boolean           // 3px var(--accent) top stripe; default true
  children: React.ReactNode  // full-bleed table area (DataTable)
  className?: string
}
```

Chrome:
- `background: var(--surface)`, `border: 1px solid var(--line-soft)`,
  `border-radius: 8px`, `box-shadow: var(--shadow-sm)`, `overflow: hidden`.
- When `accent`, a 3px `var(--accent)` bar across the top.
- `header` / `footer` render in a padded region (`14px 18px`) with a `var(--line-soft)`
  divider; `children` sit full-bleed between them so the `DataTable` touches the card edges
  (the dominant pattern — AntiBonus/Monitoring/Manager are already full-bleed; only the
  old DelegationsPage was padded).

### 2. New component — `components/Badge.tsx`

Cream status pill. Replaces the per-page Tailwind pill recipes.

```tsx
type BadgeTone = 'neutral' | 'success' | 'warn' | 'danger' | 'gold' | 'accent'

interface BadgeProps {
  tone?: BadgeTone   // default 'neutral'
  children: React.ReactNode
  title?: string
}
```

Style: `font-size 10`, `font-weight 600`, `padding 2px 8px`, `border-radius 4px`,
`border 1px solid`, tint background + colored text per tone:

| tone | text | background | border |
|---|---|---|---|
| neutral | `--ink-faint` | `--surface-mute` | `--line` |
| success / accent | `--accent-2` | `--accent-soft` | `--accent-soft` |
| warn | `--warn` | `--warn-soft` | `--warn-soft` |
| danger | `--danger` | `--danger-soft` | `--danger-soft` |
| gold | `--gold` | `--gold-soft` | `--gold-soft` |

### 3. `components/DataTable.tsx` — add `rowClassName`

Add one optional prop:

```tsx
rowClassName?: (row: T) => string | undefined
```

Applied to the `<tr className="dt-row ...">`. No behavior change when omitted. Used by
`DelegationsPage` to dim inactive delegations.

### 4. `DelegationsPage` → `DataTable`

Replace the div-grid table with `DataTable` inside a `TableCard`.

**Columns** — `Column<Delegation>[]`:

| key | header | width | render |
|---|---|---|---|
| `rank` | `#` | `44px` | mono dim two-digit number: `page*PAGE_SIZE + pageRows.indexOf(d) + 1` |
| `evaluatee` | Оцениваемый | — | `<PersonChip name={d.evaluateeName} tone="from" />` |
| `arrow` | (sr-only) | `24px` | gold `→`, centered |
| `delegate` | Делегат | — | `<PersonChip name={d.delegatedToName} tone="to" />` |
| `period` | Период | — | `fmtDate(validFrom) — fmtDate(validTo)`, mono |
| `window` | Окно | — | urgency `<Badge>` |
| `action` | Действие | `110px`, right | `Снять` button (active) / `архив` text |

- `rows={pageRows}`, `rowKey={d => d.id}`, `caption="Реестр делегирований"`,
  `loading={loading}`, `empty={<custom empty>}`, `totalCount={filtered.length}`.
- `rowClassName={d => d.isActive ? undefined : 'dl-inactive'}` + a CSS rule
  `.dl-inactive { opacity: .65 }` to preserve current dimming.
- No `onSort` — keeps the current fixed ordering (active first, then `validTo`). Matches
  the gray tables, none of which sort.
- No `onRowClick`.

**Card** — `TableCard`:
- `header` slot = the existing title row ("Реестр делегирований" + "Журнал" badge +
  `filtered.length/total` count) **and** the `FilterChips` + search row.
- `footer` slot = the existing numbered `Pagination` (rendered only when `totalPages > 1`).
- body = `DataTable`.

**Kept:** `StatCard` grid, `FilterChips`, search input, `Pagination`, all stats / filter /
search logic, `PersonChip`, `urgency`, `fmtDate`, `initials`, header strip, modals.

**Removed:** `DelegationRow`, the manual column-header `<div>` block, `cellHeadSty`, the
`.dl-row` grid CSS + its `@media (max-width: 720px)` rule. The `dl-stats-grid` / `dl-strip`
media queries stay.

`urgency(d)` is refactored to return a `BadgeTone` + label instead of raw color/bg/border.

### 5. Five gray pages — restyle

Each page: wrap its `DataTable` in `TableCard`, restyle the filter/toolbar card, and map
gray cell-renderer classes to CSS vars.

| Page | Table card | Filter / toolbar | Left as-is |
|---|---|---|---|
| `AntiBonusAnalyticsPage` | `TableCard`, header `Топ-10 по антибонусным удержаниям` | filter card (2 selects) | distribution/dynamics charts |
| `AuditLogPage` | `TableCard`, no header | filter card (4 inputs + 2 buttons); external pagination row → `footer` slot | page heading + export button |
| `AdminMonitoringPage` | `TableCard` for the Quartz-jobs `<section>`, header `quartzJobs` | none | Backend Health + error-log sections |
| `HierarchicalAnalyticsPage` | `TableCard` (the shared 4-mode container) | filter card (4 inputs) + mode-toggle button row | tree / bar / heatmap views, drill-down modal |
| `ManagerDashboardPage` | `TableCard`, header icon + `Все подчинённые (n)` | none | progress bar + top-3 / bottom-3 cards |

**Cell-renderer color map:**

| Tailwind class | CSS var |
|---|---|
| `text-gray-900` / `text-slate-900` | `var(--ink)` |
| `text-gray-700` / `text-slate-700` | `var(--ink-soft)` |
| `text-gray-600` / `-500` / `text-slate-600` / `-500` | `var(--ink-soft)` |
| `text-gray-400` / `text-slate-400` | `var(--ink-faint)` |
| `text-red-600` | `var(--danger)` |
| `text-green-600` / `emerald` | `var(--accent-2)` |
| `text-yellow-600` / `text-orange-600` | `var(--gold)` |

**Status badges → `<Badge>`:**
- `AuditLog` action tone: `CREATE`/`SUBMIT` → `success`, `DELETE`/`DEACTIVATE` → `danger`,
  `UPDATE` → `warn`, `DOWNLOAD`/`EXPORT` → `gold`, else `neutral`.
- `AdminMonitoring` job state: `NORMAL` → `success`, `PAUSED` → `warn`,
  `BLOCKED`/`ERROR` → `danger`, `NONE`/`UNKNOWN` → `neutral`.
- `Manager` status: `DRAFT` → `warn` (`Ожидает`), else `success` (`Готово`).

**Filter/toolbar card restyle** — inline, *not* `TableCard` (`TableCard` is table-only;
filter cards vary too much — chips vs selects vs date inputs vs mode toggle — to share a
structured component, and the shared part is only 4 lines of card chrome):
card `bg-white border-gray-200/slate-200` → `background: var(--surface)` /
`border: 1px solid var(--line-soft)`, keep radius + `box-shadow: var(--shadow-sm)`;
`<select>` / `<input>` `border-gray-300` → `var(--line)`, `bg-white` →
`var(--surface-mute)`; `<label>` `text-gray-500/600` → `var(--ink-faint)`. The
mode-toggle buttons (`HierarchicalAnalyticsPage`) restyle to the cream chip recipe used
by `DelegationsPage`'s `FilterChips`.

Score values (`ScoreCell`, hierarchical `avgScore`) use `--danger` / `--gold` / `--accent-2`
for the table cells. The `scoreColor` hex function stays for recharts charts.

Table renderers that pass no `loading` prop today (AntiBonus, Hierarchical, Manager — they
gate the whole page on a loading div) keep that behavior; this change does not add skeletons.

## Files

9 files — 2 new, 7 modified.

**New:**
- `frontend/src/components/TableCard.tsx`
- `frontend/src/components/Badge.tsx`

**Modified:**
- `frontend/src/components/DataTable.tsx` — add `rowClassName`
- `frontend/src/features/org/DelegationsPage.tsx` — migrate to `DataTable` + `TableCard`
- `frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx`
- `frontend/src/features/admin/AuditLogPage.tsx`
- `frontend/src/features/admin/AdminMonitoringPage.tsx`
- `frontend/src/features/analytics/HierarchicalAnalyticsPage.tsx`
- `frontend/src/features/analytics/ManagerDashboardPage.tsx`

## Verification

- `cd frontend && npx tsc --noEmit` — clean.
- `cd frontend && npm run build` — succeeds.
- Manual: each of the 6 touched table screens renders with cream chrome, the 3px accent
  stripe, density still respected, loading/empty states intact.
- `DelegationsPage`: filter chips + search + numbered pagination still work; inactive rows
  dimmed; "Снять" deactivation flow + `ConfirmDialog` unaffected.
- `AuditLog`: row expand/collapse still works after the `TableCard` wrap.
