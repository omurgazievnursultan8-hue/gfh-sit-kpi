# Dashboard Remaining Sections Design

**Date:** 2026-05-10
**Scope:** `DashboardPage` — scorecard, team attention, history chart, event feed
**Prerequisite:** Hero + quick actions already implemented (commit e03f0ce–bfd1028)

---

## Summary

Add four sections below the existing hero + quick actions on `DashboardPage`. Each section is a collapsible card. Data fetched in parallel on mount alongside existing requests.

---

## Section 1: Scorecard (`DashboardScorecard`)

### Visibility
Always rendered if `scorecard !== null` (i.e. user has at least one evaluated period).

### Layout
Header always visible — never collapses. Contains: score, grade badge, four comparison pills. "Детали" button toggles criteria table + anti-bonus block.

### Header content
- Score: serif display `{totalScore} / 100`
- Grade badge (same mapping as KpiRing: ≥90=A, ≥80=A−, ≥70=B+, ≥60=B, ≥50=C, <50=D)
- Pills row:
  - `vs {prevPeriodLabel} {vsPrevPeriod:+}` — hidden if `vsPrevPeriod === null`
  - `vs цель {vsGoal:+}` — `vsGoal = totalScore − 90`
  - `#{rank} в отделе` — hidden if `rank === null`
  - `штрафы {antiBonusTotal}` (red pill) — hidden if `antiBonusTotal === 0`
- Section title (mono): `Мой KPI · {periodLabel}` e.g. `Мой KPI · Q4 2025`

### Expanded content (criteria table)
Each positive criteria row:
- Weight badge (e.g. `25%`)
- Criteria name + `levelLabel` (org unit name, small text below)
- Meter bar: filled to `(score / maxScore) * 100%`, amber if fill < 70%
- Score: `{score}/{maxScore}` + delta `+2` / `−2` (green/red), hidden if `delta === null`

Anti-bonus block (only if `antiBonuses.length > 0`):
- Red section header `● Штрафные баллы`
- Same row structure, weight badge shows negative value (e.g. `−3`, red background)

### Data: `GET /api/v1/analytics/personal/scorecard`

Backend resolves period: active if exists, else latest closed evaluation for current user.

**Response type:**
```ts
interface ScorecardResponse {
  periodId: number
  periodLabel: string          // "Q4 2025", "M12 2025", "Год 2025"
  totalScore: number
  grade: string
  vsGoal: number               // totalScore − 90
  vsPrevPeriod: number | null  // null if no previous period
  prevPeriodLabel: string | null
  rank: number | null          // position in department ranking for this period
  antiBonusTotal: number       // sum of anti-bonus score values (negative number or 0)
  criteria: CriteriaScore[]    // POSITIVE criteria only
  antiBonuses: CriteriaScore[] // ANTI_BONUS criteria only
}

interface CriteriaScore {
  criteriaId: number
  nameRu: string
  nameKg: string
  weight: number               // e.g. 25.0 (percentage)
  score: number                // actual scored value
  maxScore: number             // equal to weight (max possible for this criteria)
  delta: number | null         // score − previous period's score for same criteria; null if no prev
  levelLabel: string           // criteria.orgUnit.nameRu
}
```

**Backend implementation:**
- New method `AnalyticsService.getPersonalScorecard(Long userId)`
- Finds active period via `EvaluationPeriod` status=ACTIVE; if none, finds user's latest CLOSED/ACKNOWLEDGED evaluation
- Queries `EvaluationScore` where `evaluationId = resolvedEvaluationId`, joins `Criteria`
- For `rank`: reuses `getDepartmentRanking(orgUnitId, periodId)`, finds position of `userId`
- For `delta` per criteria: finds previous evaluation, looks up same `criteriaId` score
- New controller method on `AnalyticsController`: `@GetMapping("/personal/scorecard")`

---

## Section 2: Team Attention (`DashboardTeam`)

### Visibility
Rendered only when `role === 'MANAGER' || role === 'ADMIN'` (from Redux auth state). Hidden for all other roles. If rendered but `team.attention.length === 0` and `team.bestPerformer === null`, show "Команда в норме" empty state.

### Layout
Header always visible. Contains: attention count (red), team avg pill, summary pills (appeal count, unevaluated count). "Детали" button toggles member rows.

### Header content
- Section title (mono): `Команда`
- Attention count: `{attention.length}` in serif red, followed by `требуют внимания`
- Team avg pill: `Средний балл: {teamAvg}` (hidden if `teamAvg === null`)
- Summary pills: `{n} апелляции` (red, if > 0), `{n} не оценён` (neutral, if > 0)

### Expanded content (member rows)
Members in `attention` array, sorted by urgency: `appeal` → `low` → `unevaluated`. Best performer shown last with green row background.

Each row:
- Avatar circle: initials, dark green gradient
- Name + position (small text)
- Reason label (colour by status: `appeal`/`low` → red, `unevaluated` → amber, `best` → green)
- Score (serif, coloured: red if < 70, green if ≥ 90, muted if null) + delta vs prev period

Footer (inside expanded area): total team count left, "Вся команда →" link to `/admin/org` (ADMIN only) — hidden for MANAGER (no separate team page in scope).

### Data: `GET /api/v1/analytics/team`

**Response type:**
```ts
interface TeamResponse {
  attention: TeamMemberAttention[]
  bestPerformer: TeamMemberAttention | null
  totalCount: number
  teamAvg: number | null
}

interface TeamMemberAttention {
  userId: number
  fullName: string
  position: string
  initials: string             // e.g. "КА" — first letters of first + last name
  latestScore: number | null
  scoreDelta: number | null
  status: 'appeal' | 'low' | 'unevaluated' | 'best'
  reasonLabel: string          // Russian label, e.g. "Подал апелляцию · до 13.01"
}
```

**Status assignment logic (backend):**
- `appeal` — user has an evaluation with status `APPEALED` in active period
- `low` — `latestScore < 60`
- `unevaluated` — no evaluation in active period (or active period exists but evaluation status is DRAFT only)
- `best` — highest `latestScore` among direct reports who do NOT qualify for appeal/low/unevaluated; skip if score is null

`attention` and `bestPerformer` are mutually exclusive: a user appears in at most one of the two. `bestPerformer` is the top scorer who has no attention flag.

**Backend implementation:**
- New method `AnalyticsService.getTeamAttention(Long managerId)`
- Query direct reports: `User WHERE managerId = :managerId AND isActive = true`
- For each subordinate: find latest evaluation in active period (if exists), check appeal status
- Returns empty `attention` and `null` `bestPerformer` for non-managers (no 403 — silently empty)
- New controller method on `AnalyticsController`: `@GetMapping("/team")`

---

## Section 3: History Chart (`DashboardHistoryChart`)

### Visibility
Rendered when `analytics.history.length > 0`.

### Layout
Section header: `История KPI · {n} кварталов` (or "месяцев" / "периодов" based on data). No expand button — always fully visible.

Controls row: legend (green = my KPI, gold = dept avg) left, Квартал/Полугодие/Год toggle right.

Recharts `BarChart` with:
- Two `Bar` per entry: personal score (accent green `#1a7558`) + dept avg (gold `#c9a84c`, 70% opacity)
- X-axis: period labels (e.g. `Q3 '24`)
- Y-axis: 0–100, ticks at 55/70/85/100
- `Tooltip` showing both values on hover
- No legend inside chart (external legend row above)

### Toggle behaviour (client-side grouping)
- **Квартал**: show QUARTERLY periods from history as-is, last 8
- **Полугодие**: group consecutive pairs of QUARTERLY periods by average, or show MONTHLY periods grouped into 6-month buckets
- **Год**: group 4 QUARTERLY periods into annual averages

If history contains only one period type, tabs that produce no data are disabled.

### Backend change: extend `PeriodScore`
Add `departmentAvg: number | null` to `PeriodScore` in `PersonalAnalyticsResponse`. `AnalyticsService.getPersonalAnalytics` already queries per-period data — add a correlated subquery or join to compute avg `final_score` of the user's `unitId` per period.

Frontend `analyticsApi.ts` `PeriodScore` type gets `departmentAvg: number | null`.

---

## Section 4: Event Feed (`DashboardEventFeed`)

### Visibility
Always rendered. If `events.length === 0`, shows "Событий пока нет" empty state.

### Layout
Section header: `Лента событий`. No expand button.

Chronological list, newest first, max 10 events. Each row:
- Icon circle (30px): colour by type
  - `success` (green bg `#dcfce7`): checkmark — EVALUATION_CLOSED, EVALUATION_ACKNOWLEDGED
  - `warn` (amber bg `#fef3c7`): exclamation — APPEAL_FILED, APPEAL_RESOLVED
  - `info` (blue bg `#dbeafe`): calendar/chat — PERIOD_OPENED, EVALUATION_SUBMITTED
- Event text (13px): human-readable Russian description
- Relative timestamp right-aligned (mono, small): `2ч`, `вчера`, `5 янв`

### Event text templates
| `action` value | Text |
|---|---|
| `EVALUATION_CLOSED` | `Ваша оценка за {period} — {score}/100, {grade} опубликована` |
| `EVALUATION_SUBMITTED` | `Оценка за {period} отправлена на подтверждение` |
| `EVALUATION_ACKNOWLEDGED` | `Оценка {period} подтверждена · закрыто без апелляции` |
| `APPEAL_FILED` | `{evaluateeName} подал апелляцию · срок ответа до {deadline}` |
| `APPEAL_RESOLVED` | `Апелляция за {period} закрыта` |
| `PERIOD_OPENED` | `Открыт период {label} · дедлайн {date}` |

`newValue` JSONB field on `AuditLog` contains context (period label, score, name) — parsed on the backend into a structured response. Frontend receives pre-rendered `text` string.

### Data: `GET /api/v1/analytics/events`

**Response type:**
```ts
interface DashboardEvent {
  id: number
  action: string
  text: string                 // pre-rendered Russian description
  iconType: 'success' | 'warn' | 'info'
  timestamp: string            // ISO datetime
}
```

**Backend implementation:**
- New method `AnalyticsService.getDashboardEvents(Long userId)`
- Query: `SELECT * FROM audit_log WHERE user_id = :userId AND action IN (:relevantActions) ORDER BY timestamp DESC LIMIT 10`
- Relevant actions: `EVALUATION_CLOSED`, `EVALUATION_SUBMITTED`, `EVALUATION_ACKNOWLEDGED`, `APPEAL_FILED`, `APPEAL_RESOLVED`, `PERIOD_OPENED` — verify each action string exists in `audit_log` before mapping; omit any that are not written by current code
- Maps each row to `DashboardEvent`: parses `newValue` JSONB for context fields, renders `text` string
- New controller method on `AnalyticsController`: `@GetMapping("/events")`

---

## Data Fetching

`DashboardPage` fires all requests in parallel on mount (extends existing 4):

| Call | New? | Purpose |
|---|---|---|
| `analyticsApi.personal()` | existing | Hero ring, history data |
| `evaluationsApi.myTasks(0, 200)` | existing | Quick actions cards |
| `periodsApi.list()` | existing | Active period |
| `periodsApi.pendingAppeals()` | existing | Appeals card |
| `analyticsApi.scorecard()` | **new** | Scorecard section |
| `analyticsApi.team()` | **new** | Team section (empty for non-managers) |
| `analyticsApi.events()` | **new** | Event feed |

Error handling: silent — failed sections hidden (matches existing pattern).
Loading: each section renders a skeleton placeholder independently.

---

## Component Structure

```
DashboardPage
├── DashboardHero                (existing)
├── DashboardQuickActions        (existing)
├── DashboardScorecard           (new)
├── DashboardTeam                (new — hidden for non-MANAGER/ADMIN)
├── DashboardHistoryChart        (new)
└── DashboardEventFeed           (new)
```

All new files in `frontend/src/features/dashboard/`.

---

## Backend Changes Summary

| Change | File |
|---|---|
| Add `departmentAvg` to `PeriodScore` DTO | `PersonalAnalyticsResponse.java` (or inline record) |
| New `getPersonalScorecard(userId)` | `AnalyticsService.java` |
| New `getTeamAttention(managerId)` | `AnalyticsService.java` |
| New `getDashboardEvents(userId)` | `AnalyticsService.java` |
| New DTOs: `ScorecardResponse`, `CriteriaScore`, `TeamResponse`, `TeamMemberAttention`, `DashboardEvent` | `dto/` package |
| New endpoints `/scorecard`, `/team`, `/events` | `AnalyticsController.java` |

---

## Out of Scope

- Admin dashboard redesign
- Full team list page (`/team`)
- Scorecard period selector (always resolves automatically)
- Push notifications for events (separate WebSocket work)
- Export / print scorecard
