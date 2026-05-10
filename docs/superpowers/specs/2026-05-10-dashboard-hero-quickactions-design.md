# Dashboard Hero + Quick Actions Redesign

**Date:** 2026-05-10  
**Scope:** `PersonalDashboardPage`, `ManagerDashboardPage` → unified `DashboardPage`  
**Design reference:** `/home/azamat/Downloads/Обзор_v2.html`

---

## Summary

Replace the two separate dashboard pages (PersonalDashboardPage, ManagerDashboardPage) with a single `DashboardPage` component that renders role-adaptive sections. This spec covers the **hero banner** and **quick action cards** only — subsequent sections (scorecard, team attention, history chart, event feed) are out of scope here.

---

## Hero Section

### Layout

Two-column grid (`1.5fr 1fr`) inside a dark green gradient banner.

**Left column — text content:**
- Mono timestamp line with animated pulse dot: `Weekday, DD Month YYYY · HH:MM`
- Serif `h1` greeting: `Доброе утро/день/вечер, <name>.` (time-based: morning <12, afternoon <18, evening otherwise)
- Subtitle prose: pending evaluation count + open appeals count for active period. Omits counts if zero.
- Active period tag + date range in mono font.

**Right column — KPI ring + side stats:**
- SVG ring (r=50, stroke-width=9) with three colour zones:
  - Red zone: 0–60% of circumference
  - Yellow zone: 60–80%
  - Green zone: 80–100%
- Gold arc from 0 to `(score/100) * circumference`.
- Centre overlay: score number (serif 38px), `/из 100` label, letter grade badge.
- Two side stat rows (semi-transparent dark tiles):
  - Row 1 label `vs Ср. отдел`, value `+(currentScore - departmentAvg)` or `—`
  - Row 2 label `Динамика`, value `+(history[0].score - history[1].score) vs Q{n-1}` or `—` if `history.length < 2`

### Null state (no score)
When `currentScore === null`:
- Ring renders grey track only, no gold arc.
- Centre shows `—` (muted) + `Нет оценки` label.
- Side rows show `—`.
- Subtitle prose adjusts: `"Оценка будет доступна после завершения периода."`

### Grade mapping
| Score | Grade |
|-------|-------|
| ≥ 90  | A     |
| ≥ 80  | A−    |
| ≥ 70  | B+    |
| ≥ 60  | B     |
| ≥ 50  | C     |
| < 50  | D     |

---

## Quick Actions Section

### Container
Below the hero, `background: var(--bg)`, padding `20px 24px`. Header row: mono section title `К действию · {count}` + right-aligned link `Все задачи →` (links to `/my-tasks`).

Three-column grid of action cards (`repeat(3, 1fr)`). Cards are conditionally rendered — hidden if no applicable data. If only 1–2 cards are visible, grid collapses to `repeat({n}, minmax(0,340px))`.

### Card 1 — Evaluate subordinates
- **Show when:** `myTasks.content` has DRAFT evaluations (count > 0)
- **Top stripe colour:** danger red when deadline ≤ 7 days, warn amber when ≤ 14 days, info blue otherwise
- **Tag:** days remaining to `submissionDeadline` of active period (e.g. `"6 дней"`)
- **Number:** `{draftCount} / {totalElements}` in serif display
- **Footer:** `Финал до {deadline} · {periodName}`
- **Click:** navigate to `/my-tasks`
- **Data:** `GET /evaluations/my-tasks` (existing)

### Card 2 — Pending appeals
- **Show when:** `pendingAppeals.length > 0`
- **Top stripe colour:** danger red when earliest deadline ≤ 3 days, warn amber otherwise
- **Tag:** days until nearest appeal deadline
- **Number:** count of pending appeals
- **Footer:** `Ждут решения · {name1}, {name2}` (first 2 names, truncated with `…` if more)
- **Click:** navigate to `/my-tasks` (appeals tab or filtered view)
- **Data:** `GET /appeals/pending` — **needs new backend endpoint** (see Backend Changes)

### Card 3 — Period deadline
- **Show when:** active period exists
- **Always visible** (info stripe, no urgency colour)
- **Top stripe colour:** always info blue
- **Tag:** `Информация`
- **Content:** small progress ring showing `completedEvaluations / totalEvaluations` %, date in serif, `ЧЕРЕЗ {n} ДНЕЙ` mono label
- **Footer:** `Оценено {completed} из {total}` or `Оценки ещё не начаты · период активен`
- **Click:** navigate to `/admin/periods` (if admin) or `/my-tasks` (otherwise)
- **Data:** `GET /periods` → filter `status === 'ACTIVE'`, use `submissionDeadline`; progress % from `myTasks` totals

---

## Backend Changes Required

### New endpoint: `GET /api/v1/appeals/pending`

Returns appeals where the current authenticated user is the **evaluator** and status is `PENDING`.

**Response:** `AppealPending[]` (type already defined in `periodsApi.ts`):
```ts
interface AppealPending {
  id: number
  evaluationId: number
  evaluateeName: string
  reason: string
  deadline: string   // ISO date — submissionDeadline of the period
  createdAt: string
}
```

Add to `AppealController`:
```java
@GetMapping("/pending")
public List<AppealPendingDto> getPendingAppeals(Authentication auth) {
    Long userId = resolveUserId(auth);
    return appealService.getPendingAppealsForEvaluator(userId);
}
```

`AppealService.getPendingAppealsForEvaluator(userId)`: query appeals where `evaluation.evaluatorId = userId AND status = PENDING`, map to DTO including period's `submissionDeadline` as `deadline`.

---

## Data Fetching

`DashboardPage` fires these requests in parallel on mount:

| Call | Purpose |
|------|---------|
| `analyticsApi.personal()` | Hero ring: `currentScore`, `departmentAvg`, `history`, `fullName` |
| `evaluationsApi.myTasks(0, 200)` | Card 1 draft count + total; Card 3 progress % |
| `periodsApi.list()` | Card 3 active period + deadline |
| `periodsApi.pendingAppeals()` | Card 2 pending appeals |

Loading state: hero and cards render skeleton placeholders. Error state: silent — sections with failed data are hidden rather than showing error banners.

---

## Component Structure

```
DashboardPage
├── DashboardHero          (hero banner, ring, side stats)
│   └── KpiRing            (SVG ring, grade, null state)
└── DashboardQuickActions  (section header + card grid)
    ├── EvaluateCard       (card 1, conditional)
    ├── AppealsCard        (card 2, conditional)
    └── DeadlineCard       (card 3, always if active period)
```

Files go in `src/features/dashboard/`. Existing `PersonalDashboardPage` and `ManagerDashboardPage` remain untouched until the new page is wired into routing — they are replaced by updating the route in `App.tsx`.

---

## Out of Scope (this spec)

- Scorecard (KPI criteria breakdown)
- Team attention section
- KPI history chart
- Event feed
- Admin dashboard redesign
- Sidebar/AppShell changes (separate work)
