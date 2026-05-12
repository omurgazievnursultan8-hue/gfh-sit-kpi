# Dashboard Redesign — Design Spec

**Date:** 2026-05-12
**Branch target:** `feat/dashboard-redesign` (new, from `feat/dev-seed-data` or `main`)
**Scope:** `frontend/src/features/dashboard/` only (one small backend addition for sparkline data)

## Problem

Current dashboard (`frontend/src/features/dashboard/DashboardPage.tsx`) renders six stacked sections totaling ~1260 LOC: gradient hero with KpiRing, quick-action cards, collapsed scorecard, collapsed team panel, history chart, event feed.

Observed issues:

- **Duplication.** Period deadline appears in hero subtitle, quick-action "deadline" card, and scorecard header. Vs-prev-period delta appears in hero side-stat and scorecard pill and history chart.
- **Primary value hidden.** Scorecard criteria, team detail, history all collapsed by default. Manager opens page → sees decorative ring + 3 cards before any actionable list.
- **Role mismatch.** IC employee never sees "Оценить сотрудников" card (manager-only); when no drafts/appeals exist for an IC, the entire Quick Actions block disappears, leaving whitespace where actions should be. Manager view is IC view + an extra panel; no real differentiation of priorities.
- **Empty signal.** Hero greeting + datetime + decorative ring occupy ~25% of viewport above the fold; conveys no actionable information.

## Goals

1. Role-appropriate landing: IC sees own score + own open tasks; manager sees team action queue + team health.
2. Above-the-fold = actionable. Greeting band slim; first interactive content within 80px of top.
3. Remove duplicated data (vs-dept/vs-prev hero stats, deadline card, history chart from dashboard).
4. Default everything expanded — no required clicks to reveal primary content.

## Non-Goals

- Backend rewrite. Only one small additive field (`teamAvgHistory`) if sparkline kept.
- Changing `/my-kpi`, `/admin`, or `ManagerDashboardPage` (analytics route).
- New permissions or role logic. Existing `MANAGER`/`ADMIN`/IC distinction stays.
- Mobile-first redesign — desktop is primary surface; existing responsive behavior preserved.

## Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Switchable tabs **Мой KPI** / **Команда** | brainstorm Q1 = C |
| D2 | Manager landing tab = **Команда**, balanced split | brainstorm Q2 = C |
| D3 | IC tab content = **scorecard + open tasks** | brainstorm Q3 (custom) |
| D4 | Remove: vs-dept/vs-prev hero stats, history chart, event feed, deadline quick-action card, KpiRing | brainstorm Q4 = B,C,D,E,F |
| D5 | Keep slim greeting band (greeting + datetime + name) | brainstorm Q5 = A |
| D6 | IC tab uses **2-column split** (scorecard left, tasks right) | brainstorm Q6 = B |
| D7 | Tab choice persisted in `localStorage.gfh_dashboard_tab` | implicit |
| D8 | Sparkline (team-avg trend, last 4 periods) — additive backend field `teamAvgHistory: number[]` on `TeamResponse` | open item #1 accepted |
| D9 | IC task list source = `evaluationsApi.myTasks` + `periodsApi.pendingAppeals` already loaded; no new endpoint | open item #3 |

## Layout

```
┌─ Greeting band (slim, ~36px, no gradient block) ───────────────────┐
│  ☀ Доброе утро, Азамат                       пн · 12 мая · 09:14   │
├─ Tab strip ────────────────────────────────────────────────────────┤
│  [ Мой KPI ]  [ Команда ]      (Команда rendered only for          │
│                                  role ∈ {MANAGER, ADMIN})          │
├─ Content (2-col split, equal weight, gap=20px) ────────────────────┤
│                                                                    │
│  Мой KPI tab:                                                      │
│    LEFT: Scorecard (expanded)        RIGHT: Open Tasks (TasksPanel)│
│      - total/100 + grade               - self-eval drafts          │
│      - vs prev / vs goal / rank pills  - appeals (where I am       │
│      - criteria rows w/ meter bars      evaluatee)                 │
│      - anti-bonus rows                 - row: title + deadline pill│
│                                        - "Все задачи →" footer    │
│                                                                    │
│  Команда tab (manager+admin only):                                 │
│    LEFT: Action Queue (ActionQueue)  RIGHT: Team Health (Panel)    │
│      - drafts: count + nearest dl     - attention list (appeals/   │
│      - appeals to decide               low/unevaluated)            │
│      - overdue evaluations            - best performer row         │
│      - row: count + deadline pill     - team avg number            │
│      - "Все задачи →" footer          - sparkline (last 4 periods) │
│                                        - "Вся команда →" footer   │
└────────────────────────────────────────────────────────────────────┘
```

Two-column grid `grid-template-columns: 1fr 1fr`. Below 900px viewport: collapse to single column (left then right stacked).

## Components

### New / renamed

- `DashboardGreeting.tsx` (~30 LOC) — replaces `DashboardHero.tsx`. Renders greeting (`Доброе утро/день/вечер` from hour) + localized today line + first name. No gradient, no ring, no side stats.
- `DashboardTabs.tsx` — tab strip + persistence. Reads/writes `localStorage.gfh_dashboard_tab`. Falls back to role default if no value (IC → `mine`, manager → `team`). Hides `team` tab for IC.
- `TasksPanel.tsx` — IC tab right column. Aggregates draft evaluations + pending appeals (IC-facing) into single ordered list by deadline asc. Renders up to 6 rows + "Все задачи →" link. Empty state shown when both sources empty.
- `ActionQueue.tsx` — manager tab left column. Groups: drafts to submit, appeals to decide, overdue evaluations. Each group = single row with count + nearest deadline pill.
- `TeamHealthPanel.tsx` — manager tab right column. Replaces `DashboardTeam.tsx`. Always expanded. Adds sparkline rendering `team.teamAvgHistory` (5×30px inline SVG, no library).

### Modified

- `DashboardScorecard.tsx` — drop expand/collapse state; criteria + anti-bonus rows always rendered. Remove "Детали" button. Slim header alignment for narrower column.
- `DashboardPage.tsx` — rewrite as tabs container. Loads same APIs as today, passes data down. No layout style props inline.

### Deleted

- `DashboardHero.tsx`
- `DashboardQuickActions.tsx` (logic redistributed to `TasksPanel` + `ActionQueue`)
- `DashboardHistoryChart.tsx`
- `DashboardEventFeed.tsx`
- `KpiRing.tsx`

If history chart has value elsewhere, confirm it already exists on `PersonalDashboardPage` (`/my-kpi`) before deleting; if not, move file there. Same check for event feed — leave deletion to a follow-up if any consumer remains.

## Data / API

### Frontend

`DashboardPage.tsx` data fetches reduced:

```
analyticsApi.personal()       — keep (firstName, vs-prev/goal pills inside scorecard)
analyticsApi.scorecard()      — keep
analyticsApi.team()           — keep (now includes teamAvgHistory)
evaluationsApi.myTasks(0,200) — keep
periodsApi.list()             — keep (activePeriod for deadline pills)
periodsApi.pendingAppeals()   — keep

analyticsApi.events()         — REMOVE
```

`partialFailure` announcer pattern preserved.

### Backend

Single additive change to `TeamResponse` DTO + service:

- Field: `teamAvgHistory: List<Double>` — last 4 closed periods' team average for the manager's primary team, oldest→newest. Empty list if no history.
- Service: append to existing `AnalyticsService.team()` query. No new endpoint. No migration.

If backend change is rejected during plan review, drop sparkline (D8 reverts); panel still ships without sparkline.

## Persistence

- `localStorage.gfh_dashboard_tab` = `"mine" | "team"`. Read on mount; written on tab click. Cleared on logout (add to existing logout cleanup if such exists; otherwise leave — stale value harmless).

## Accessibility

- Greeting band: `role="status"` if it contains period deadline; otherwise plain.
- Tabs: ARIA tabs pattern — `role="tablist"`, `role="tab"`, `aria-selected`, `tabindex` management; arrow-key navigation between tabs.
- `partialFailure` sr-only announcer preserved from current page.
- Focus ring tokens from existing shell polish (`feat(shell,a11y)` commit `1cb6998`) reused — no new ring styles.

## i18n

All new strings keyed under `dashboard.*` namespace:

- `dashboard.tab.mine` / `dashboard.tab.team`
- `dashboard.tasks.title` / `dashboard.tasks.empty` / `dashboard.tasks.viewAll`
- `dashboard.actionQueue.title` / `.drafts` / `.appeals` / `.overdue`
- `dashboard.teamHealth.title` / `.avg` / `.viewAll`
- Greeting strings (`dashboard.greeting.morning/day/evening`) — currently hard-coded ru in `DashboardHero.tsx`; this redesign extracts them.

Translation files: `frontend/public/locales/{ru,kg}/translation.json`. Both locales updated in same commit.

## Testing

- `frontend/src/features/dashboard/__tests__/DashboardTabs.test.tsx` — tab persistence, role gating of `team` tab, default selection.
- `TasksPanel.test.tsx` — ordering by deadline, empty state, item aggregation across drafts/appeals/sign-offs.
- `ActionQueue.test.tsx` — group counts, urgency thresholds (≤3d/≤7d), navigation targets.
- `DashboardPage.test.tsx` — render passes for IC/manager/admin roles, partial-failure announcer fires when one API rejects.

Backend: extend existing analytics-service test to assert `teamAvgHistory` length ≤ 4 and ordering. No new test class needed.

## Risks

- **Sparkline data path.** If `teamAvgHistory` query slows `analyticsApi.team()`, dashboard load regresses. Mitigation: bound query to last 4 periods, single SQL; measure in test.
- **History chart removal.** Users who rely on dashboard for trend will need to navigate to `/my-kpi`. Mitigation: confirm chart exists there before delete; otherwise move the component (no rewrite).
- **Tab persistence stale across roles.** Demoting a manager to IC leaves `gfh_dashboard_tab="team"` in localStorage; tab strip would hide that tab and fall back to `mine`. Validate fallback handles unknown value.

## Out of Scope (deferred)

- Mobile redesign beyond column collapse at 900px.
- Replacing scorecard meter-bar styling with a different chart type.
- Adding a "what changed since last visit" unread marker.
- Reworking notification bell or moving events anywhere else.

## File-Change Summary

```
DELETE  frontend/src/features/dashboard/DashboardHero.tsx
DELETE  frontend/src/features/dashboard/DashboardQuickActions.tsx
DELETE  frontend/src/features/dashboard/DashboardHistoryChart.tsx
DELETE  frontend/src/features/dashboard/DashboardEventFeed.tsx
DELETE  frontend/src/features/dashboard/KpiRing.tsx
NEW     frontend/src/features/dashboard/DashboardGreeting.tsx
NEW     frontend/src/features/dashboard/DashboardTabs.tsx
NEW     frontend/src/features/dashboard/TasksPanel.tsx
NEW     frontend/src/features/dashboard/ActionQueue.tsx
NEW     frontend/src/features/dashboard/TeamHealthPanel.tsx
EDIT    frontend/src/features/dashboard/DashboardPage.tsx       (rewrite as tabs container)
EDIT    frontend/src/features/dashboard/DashboardScorecard.tsx  (drop expand toggle, default open)
EDIT    frontend/src/features/analytics/analyticsApi.ts         (add teamAvgHistory field)
EDIT    frontend/public/locales/ru/translation.json             (new dashboard.* keys)
EDIT    frontend/public/locales/kg/translation.json             (new dashboard.* keys)
EDIT    backend/.../analytics/AnalyticsService.java             (populate teamAvgHistory)
EDIT    backend/.../analytics/dto/TeamResponse.java             (new field)
```

Net frontend LOC delta: ~−400 (current dashboard folder 1260 → target ~860).
