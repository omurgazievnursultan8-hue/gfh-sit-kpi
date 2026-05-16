# DashboardV3Page — Design

Date: 2026-05-17
Status: Approved

## Goal

Add a third dashboard page (`DashboardV3Page`) at `/dashboard-v3`, based on the
`stat_cards_v5` terminal/Swiss-grid mockup. It coexists with the existing
`DashboardPage` (`/dashboard`) and `DashboardV2Page` (`/dashboard-v2`); neither
is modified.

## Context

- `AppShell` (`src/components/shell/AppShell.tsx`) wraps every route via
  `main.tsx`. Any new route automatically gets the app sidebar + topbar. No
  layout work is required.
- `DashboardV2Page` already implements the same terminal aesthetic (sage-green
  Swiss/terminal, ticker strip, bracket-cornered cards). v3 reuses that visual
  language with a reduced widget set.
- All data comes from existing APIs (`analyticsApi`, `periodsApi`,
  `delegationsApi`). No backend changes.

## Scope

v3 = v2's widget set minus the `RATING.DYNAMICS` chart and the
`ACTIVE.PERIODS` card. The `CRITERIA.HEATMAP`, `ANTI.BONUS` vertical-bar chart,
`EXPORT` card, and header theme toggle from the v5 mockup are explicitly out of
scope (would require backend work or duplicate global theme handling).

## Files

| File | Action |
|---|---|
| `src/features/dashboard/DashboardV3Page.tsx` | New. Page component. |
| `src/features/dashboard/dashboardV3Styles.ts` | New. Copy of `dashboardV2Styles.ts` with `.dv2-` class prefix renamed to `.dv3-` and export `DASHBOARD_V3_CSS`. Independent — may diverge from v2. |
| `src/App.tsx` | Add route `/dashboard-v3` → `<ProtectedRoute><DashboardV3Page/></ProtectedRoute>`. |
| `src/components/shell/navConfig.ts` | Add nav entry `{ to: '/dashboard-v3', labelKey: 'nav.dashboardV3', icon: Activity, roles: ALL_ROLES }` next to the existing v2 entry (line 66). |
| `frontend/public/locales/{ru,kg}/translation.json` | Add `nav.dashboardV3` translation key. |

## Widgets (12-column Swiss grid)

| ID | Widget | Col | Data source | Notes |
|---|---|---|---|---|
| R01 | SELF.RATING — big KPI number, criteria breakdown rows, peak/trough/avg field grid | 8 | `analyticsApi.personal()`, `analyticsApi.scorecard()` | Same as v2 R01. |
| P01 | EVAL.CYCLE.PROGRESS — done/total, ASCII gauge, sub-field grid | 4 | `analyticsApi.pendingSummary()` | Same as v2 P01. |
| S01 | SUBORDINATES.RANK — ladder of team members | 6 | `analyticsApi.team()` | Manager-only (`role !== 'EMPLOYEE'`). Hidden for employees. |
| A01 | ANTI.BONUS — current-period penalty list (data rows, not bar chart) | 6 | `scorecard.antiBonuses` | Same as v2 A01. |
| L01 | EVENT.LOG — live event feed | 6 | `analyticsApi.events()` | Same as v2 L01. |
| M01 | Mini · APPEALS | 3 | `periodsApi.pendingAppeals()` | Clickable → `/my-tasks`. |
| M02 | Mini · NOTIFICATIONS | 3 | Redux `notifications.unreadCount` | |
| M03 | Mini · DELEGATIONS | 3 | `delegationsApi.list()` | |
| M04 | Mini · NAVIGATE | 3 | — | Links to `/my-kpi`, `/my-tasks`, `/dashboard`. |

### Grid reflow

Because the dynamics chart (v2 col-4 beside KPI) and ACTIVE.PERIODS are removed:

- Row 1: `R01` (col-8) + `P01` (col-4).
- Row 2: `S01` (col-6, manager) + `A01` (col-6) + `L01` (col-6). When the user
  is not a manager, `S01` is omitted and `A01`/`L01` reflow (each col-6, the
  row simply has two cards).
- Row 3: `M01` `M02` `M03` `M04`, col-3 each.

The 12-col grid plus the existing responsive breakpoints in the styles file
handle smaller viewports.

## Header / Ticker / Footer

Reused verbatim from v2 (terminal header with live clock, scrolling ticker
strip, status-bar footer). Header label updated to `v3.0`. Theme follows the
global `<html data-theme>` attribute — no page-local theme toggle.

## Data flow

Same pattern as `DashboardV2Page`:

- Single `useEffect` fires all API calls via `Promise.allSettled`.
- Each panel renders whatever resolved; rejected calls leave that panel in its
  empty state.
- A `partialFailure` flag drives the footer `API · DEGRADED` indicator and an
  `aria-live` screen-reader announcement.
- Manager-only `analyticsApi.team()` call is conditional on role.
- Live clock via `setInterval`, cleared on unmount.

## Error handling

- Per-panel empty states (`NO SCORECARD`, `NO SUBORDINATE DATA`, `NO EVENTS`,
  etc.) — copied from v2.
- Partial failure does not blank the page; only affected panels show empty.

## Testing

Manual verification (matches project norm — no existing dashboard unit tests):

- `npx tsc --noEmit` passes.
- `/dashboard-v3` renders with sidebar + topbar.
- Employee role: `SUBORDINATES.RANK` hidden, layout reflows cleanly.
- Manager role: all widgets present.
- Nav link appears in sidebar and routes correctly.

## Out of scope

- Any backend / API change.
- CRITERIA.HEATMAP, ANTI.BONUS vbar chart, EXPORT card, theme toggle.
- Changes to `DashboardPage` or `DashboardV2Page`.
