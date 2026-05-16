# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 6-section single-view dashboard with a role-tabbed, two-column layout (My KPI / Команда), drop decorative & duplicated panels, and surface actionable content above the fold.

**Architecture:** Pure presentational refactor inside `frontend/src/features/dashboard/`. One additive backend change: append `teamAvgHistory: List<Double>` (last 4 closed periods) to `TeamResponse` to power a small sparkline. No new endpoints, no migrations, no schema changes. Tab choice persisted via `localStorage.gfh_dashboard_tab`.

**Tech Stack:** React 18 + TypeScript + Vite, Redux Toolkit (auth role), `@radix-ui/react-tabs` (already dep), react-i18next, Spring Boot 3.2 + JdbcTemplate + JUnit5/Mockito (backend).

**Spec:** `docs/superpowers/specs/2026-05-12-dashboard-redesign-design.md`

**Test note:** Frontend has no test runner installed (`package.json` shows none); verification per frontend task = `npx tsc --noEmit` + `npm run build` + manual smoke at `http://localhost:5173/`. Backend uses existing Mockito pattern (see `AnalyticsTeamTest.java`).

---

## Task 1: Backend — add `teamAvgHistory` to `TeamResponse`

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/dto/TeamResponse.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java:239-351`
- Test: `backend/src/test/java/kg/gfh/kpi/service/AnalyticsTeamTest.java`

- [ ] **Step 1: Write the failing test**

Append to `AnalyticsTeamTest.java`:

```java
@Test
void getTeamAttention_includesTeamAvgHistoryFromLast4ClosedPeriods() {
    // reports
    when(jdbc.queryForList(contains("FROM users"), eq(42L))).thenReturn(List.of(
        java.util.Map.of("id", 1L, "full_name", "A B", "position", "")
    ));
    // active period
    when(jdbc.query(contains("evaluation_periods WHERE status = 'ACTIVE'"), any(org.springframework.jdbc.core.RowMapper.class)))
        .thenReturn(List.of(99L));
    // active evals (one row, score 80)
    when(jdbc.queryForList(contains("DISTINCT ON (e.evaluatee_id)") , (Object[]) null))
        .thenReturn(List.of());
    // history query — 4 rows oldest→newest
    when(jdbc.queryForList(contains("FROM evaluations e\n            JOIN evaluation_periods ep ON ep.id = e.period_id\n            WHERE e.evaluatee_id IN")))
        .thenReturn(List.of());
    when(jdbc.query(contains("team_avg_history"), any(org.springframework.jdbc.core.RowMapper.class)))
        .thenReturn(List.of(70.0, 72.0, 75.0, 78.0));

    TeamResponse result = analyticsService.getTeamAttention(42L);

    assertThat(result.teamAvgHistory()).containsExactly(70.0, 72.0, 75.0, 78.0);
}

@Test
void getTeamAttention_teamAvgHistoryEmptyWhenNoClosedPeriods() {
    when(jdbc.queryForList(anyString(), eq(42L))).thenReturn(List.of());
    TeamResponse result = analyticsService.getTeamAttention(42L);
    assertThat(result.teamAvgHistory()).isEmpty();
}
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
cd backend && mvn test -Dtest=AnalyticsTeamTest
```

Expected: compilation failure (`teamAvgHistory()` not in record).

- [ ] **Step 3: Add field to record**

`backend/src/main/java/kg/gfh/kpi/dto/TeamResponse.java`:

```java
package kg.gfh.kpi.dto;

import java.util.List;

public record TeamResponse(
    List<TeamMemberDto> attention,
    TeamMemberDto bestPerformer,
    int totalCount,
    Double teamAvg,
    List<Double> teamAvgHistory
) {
    public record TeamMemberDto(
        Long userId,
        String fullName,
        String position,
        String initials,
        Double latestScore,
        Double scoreDelta,
        String status,
        String reasonLabel
    ) {}
}
```

- [ ] **Step 4: Update `AnalyticsService.getTeamAttention`**

In `AnalyticsService.java`, replace the early-return at line ~248:

```java
        if (reports.isEmpty()) {
            return new TeamResponse(List.of(), null, 0, null, List.of());
        }
```

After computing `teamAvg` (~line 346), before `return new TeamResponse(...)` (~line 349), add:

```java
        // Last 4 closed periods' team avg (oldest → newest)
        String inClause = subIds.stream().map(String::valueOf)
            .collect(java.util.stream.Collectors.joining(","));
        List<Double> teamAvgHistory = jdbc.query("""
            SELECT AVG(e.final_score::float) AS team_avg_history
            FROM evaluations e
            JOIN evaluation_periods ep ON ep.id = e.period_id
            WHERE e.evaluatee_id IN (%s)
              AND ep.status = 'CLOSED'
              AND e.final_score IS NOT NULL
              AND e.status IN ('SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')
            GROUP BY ep.id, ep.start_date
            ORDER BY ep.start_date DESC
            LIMIT 4
            """.formatted(inClause),
            (rs, i) -> Math.round(rs.getDouble("team_avg_history") * 10.0) / 10.0);
        java.util.Collections.reverse(teamAvgHistory); // oldest → newest

        return new TeamResponse(attentionList, best, reports.size(),
            teamAvg != null ? Math.round(teamAvg * 10.0) / 10.0 : null,
            teamAvgHistory);
```

Remove the old single-line `return new TeamResponse(...)` that this block replaces.

- [ ] **Step 5: Run tests, confirm pass**

```bash
cd backend && mvn test -Dtest=AnalyticsTeamTest
```

Expected: PASS, both new tests + existing.

- [ ] **Step 6: Run full backend test suite**

```bash
cd backend && mvn test
```

Expected: all green; other tests still construct `TeamResponse(...)` only via service code, so no fan-out breakage. If any explicit `new TeamResponse(` shows up elsewhere, add `, List.of()` as 5th arg.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/TeamResponse.java \
        backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java \
        backend/src/test/java/kg/gfh/kpi/service/AnalyticsTeamTest.java
git commit -m "feat(analytics): add teamAvgHistory (last 4 closed periods) to TeamResponse"
```

---

## Task 2: Frontend — extend `TeamResponse` TS type

**Files:**
- Modify: `frontend/src/features/analytics/analyticsApi.ts:57-62`

- [ ] **Step 1: Add field to interface**

```ts
export interface TeamResponse {
  attention: TeamMemberDto[]
  bestPerformer: TeamMemberDto | null
  totalCount: number
  teamAvg: number | null
  teamAvgHistory: number[]
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: pass. (`DashboardTeam.tsx` currently destructures `attention, bestPerformer, totalCount, teamAvg` — adding a field doesn't break that.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analytics/analyticsApi.ts
git commit -m "feat(dashboard): type teamAvgHistory on TeamResponse"
```

---

## Task 3: Frontend — `DashboardGreeting` component

**Files:**
- Create: `frontend/src/features/dashboard/DashboardGreeting.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useTranslation } from 'react-i18next'

interface Props {
  firstName: string
}

function greetingKey(): 'morning' | 'day' | 'evening' {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'day'
  return 'evening'
}

function todayLine(locale: string): string {
  const now = new Date()
  const datePart = now.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${datePart} · ${hh}:${mm}`
}

export function DashboardGreeting({ firstName }: Props) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'kg' ? 'ky-KG' : 'ru-RU'
  return (
    <div
      className="flex items-center justify-between mb-3"
      style={{
        padding: '8px 16px',
        background: 'var(--bg-soft, #f5f1e8)',
        borderRadius: 8,
        fontSize: 12,
        color: 'var(--ink-faint, #6b7280)',
      }}
    >
      <span style={{ fontWeight: 500, color: 'var(--ink, #1a1a2e)' }}>
        {t(`dashboard.greeting.${greetingKey()}`)}, {firstName}
      </span>
      <span className="font-mono" style={{ fontSize: 11 }}>
        {todayLine(locale)}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardGreeting.tsx
git commit -m "feat(dashboard): add slim DashboardGreeting band"
```

---

## Task 4: Frontend — `DashboardTabs` component with persistence

**Files:**
- Create: `frontend/src/features/dashboard/DashboardTabs.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useTranslation } from 'react-i18next'

export type DashboardTab = 'mine' | 'team'

interface Props {
  active: DashboardTab
  onChange: (tab: DashboardTab) => void
  showTeamTab: boolean
}

const STORAGE_KEY = 'gfh_dashboard_tab'

export function loadDashboardTab(role: string | null): DashboardTab {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'mine' || stored === 'team') return stored
  return role === 'MANAGER' || role === 'ADMIN' ? 'team' : 'mine'
}

export function saveDashboardTab(tab: DashboardTab): void {
  localStorage.setItem(STORAGE_KEY, tab)
}

export function DashboardTabs({ active, onChange, showTeamTab }: Props) {
  const { t } = useTranslation()
  const tabs: { id: DashboardTab; label: string }[] = [
    { id: 'mine', label: t('dashboard.tab.mine', 'Мой KPI') },
  ]
  if (showTeamTab) tabs.push({ id: 'team', label: t('dashboard.tab.team', 'Команда') })

  return (
    <div role="tablist" aria-label={t('dashboard.tab.label', 'Разделы дашборда')}
      style={{ display: 'flex', borderBottom: '1px solid var(--line, #e5e7eb)', marginBottom: 16 }}>
      {tabs.map(({ id, label }) => {
        const on = active === id
        return (
          <button
            key={id}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => { onChange(id); saveDashboardTab(id) }}
            onKeyDown={e => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const i = tabs.findIndex(x => x.id === active)
                const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]
                onChange(next.id); saveDashboardTab(next.id)
              }
            }}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              fontSize: 14,
              fontWeight: on ? 600 : 500,
              color: on ? 'var(--ink, #1a1a2e)' : 'var(--ink-faint, #6b7280)',
              borderBottom: `2px solid ${on ? 'var(--accent, #1a7558)' : 'transparent'}`,
              cursor: 'pointer',
              marginBottom: -1,
              fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardTabs.tsx
git commit -m "feat(dashboard): add tab strip with role default + localStorage persistence"
```

---

## Task 5: Frontend — `TasksPanel` (IC tab right column)

**Files:**
- Create: `frontend/src/features/dashboard/TasksPanel.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import type { AppealPending } from '../periods/periodsApi'

interface Props {
  myTasks: PageResponse<Evaluation> | null
  myAppeals: AppealPending[]
}

interface Row {
  key: string
  title: string
  deadline: string | null
  urgency: 'urgent' | 'warn' | 'info'
  onClick: () => void
}

function daysUntil(d: string): number {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000))
}

function urgencyOf(d: string | null): 'urgent' | 'warn' | 'info' {
  if (!d) return 'info'
  const n = daysUntil(d)
  if (n <= 3) return 'urgent'
  if (n <= 7) return 'warn'
  return 'info'
}

function pillStyle(u: 'urgent' | 'warn' | 'info'): React.CSSProperties {
  const c = u === 'urgent' ? '#dc2626' : u === 'warn' ? '#d97706' : '#6b7280'
  const bg = u === 'urgent' ? '#fee2e2' : u === 'warn' ? '#fef3c7' : '#f1f5f9'
  return { fontSize: 11, padding: '2px 8px', borderRadius: 12, color: c, background: bg, whiteSpace: 'nowrap' }
}

const MAX_ROWS = 6

export function TasksPanel({ myTasks, myAppeals }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const rows: Row[] = []

  myTasks?.content
    .filter(e => e.status === 'DRAFT')
    .forEach(e => rows.push({
      key: `eval-${e.id}`,
      title: t('dashboard.tasks.evaluate', 'Оценка: {{name}}', { name: e.evaluateeName ?? '—' }),
      deadline: e.deadline ?? null,
      urgency: urgencyOf(e.deadline ?? null),
      onClick: () => navigate(`/evaluations/${e.id}`),
    }))

  myAppeals.forEach(a => rows.push({
    key: `appeal-${a.evaluationId}`,
    title: t('dashboard.tasks.appeal', 'Апелляция: {{name}}', { name: a.evaluateeName }),
    deadline: a.deadline,
    urgency: urgencyOf(a.deadline),
    onClick: () => navigate('/my-tasks'),
  }))

  rows.sort((a, b) => {
    const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity
    const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity
    return ad - bd
  })

  const shown = rows.slice(0, MAX_ROWS)

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid var(--line, #e5e7eb)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--line, #e5e7eb)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span className="font-mono" style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          {t('dashboard.tasks.title', 'Открытые задачи')} · {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: '20px', fontSize: 13, color: '#6b7280' }}>
          {t('dashboard.tasks.empty', 'Открытых задач нет')}
        </div>
      ) : (
        <>
          {shown.map((r, i) => (
            <button key={r.key} onClick={r.onClick}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left',
                padding: '11px 18px',
                borderBottom: i < shown.length - 1 ? '1px solid #f3f4f6' : 'none',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              <span style={{ fontSize: 13, color: 'var(--ink, #1a1a2e)' }}>{r.title}</span>
              <span style={pillStyle(r.urgency)}>
                {r.deadline ? `${daysUntil(r.deadline)} ${t('dashboard.tasks.daysShort', 'дн.')}` : '—'}
              </span>
            </button>
          ))}
          <div style={{
            padding: '10px 18px', textAlign: 'right', background: '#fafafa',
            borderTop: '1px solid var(--line, #e5e7eb)',
          }}>
            <a href="/my-tasks" onClick={e => { e.preventDefault(); navigate('/my-tasks') }}
              style={{ fontSize: 12, color: 'var(--accent, #1a7558)', fontWeight: 500 }}>
              {t('dashboard.tasks.viewAll', 'Все задачи →')}
            </a>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify field names on `Evaluation` and `AppealPending`**

```bash
cd /home/azamat/Desktop/projects/gfh/kpi
grep -n "evaluateeName\|deadline" frontend/src/features/evaluations/evaluationsApi.ts frontend/src/features/periods/periodsApi.ts
```

If `Evaluation` lacks `deadline` field, derive from `activePeriod.submissionDeadline` (passed as new prop) or use `e.updatedAt` only for sort — adjust component before continuing.

- [ ] **Step 3: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Fix any field-name mismatches surfaced.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/dashboard/TasksPanel.tsx
git commit -m "feat(dashboard): add TasksPanel for IC tab"
```

---

## Task 6: Frontend — `ActionQueue` (manager tab left column)

**Files:**
- Create: `frontend/src/features/dashboard/ActionQueue.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import type { AppealPending, Period } from '../periods/periodsApi'

interface Props {
  myTasks: PageResponse<Evaluation> | null
  pendingAppeals: AppealPending[]
  activePeriod: Period | null
}

function daysUntil(d: string): number {
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000))
}

function urgencyColor(d: string | null): string {
  if (!d) return '#6b7280'
  const n = daysUntil(d)
  if (n <= 3) return '#dc2626'
  if (n <= 7) return '#d97706'
  return '#1a7558'
}

interface GroupRow {
  key: string
  label: string
  count: number
  nearestDeadline: string | null
  onClick: () => void
}

export function ActionQueue({ myTasks, pendingAppeals, activePeriod }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const drafts = myTasks?.content.filter(e => e.status === 'DRAFT') ?? []
  const draftDeadline = activePeriod?.submissionDeadline ?? null

  const appealDeadlines = pendingAppeals.map(a => a.deadline).sort()
  const appealNearest = appealDeadlines[0] ?? null

  const overdue = drafts.filter(e => draftDeadline && daysUntil(draftDeadline) === 0).length

  const groups: GroupRow[] = []
  if (drafts.length > 0) groups.push({
    key: 'drafts',
    label: t('dashboard.actionQueue.drafts', 'Оценки на подачу'),
    count: drafts.length,
    nearestDeadline: draftDeadline,
    onClick: () => navigate('/my-tasks?filter=drafts'),
  })
  if (pendingAppeals.length > 0) groups.push({
    key: 'appeals',
    label: t('dashboard.actionQueue.appeals', 'Апелляции на решение'),
    count: pendingAppeals.length,
    nearestDeadline: appealNearest,
    onClick: () => navigate('/my-tasks?filter=appeals'),
  })
  if (overdue > 0) groups.push({
    key: 'overdue',
    label: t('dashboard.actionQueue.overdue', 'Просроченные оценки'),
    count: overdue,
    nearestDeadline: null,
    onClick: () => navigate('/my-tasks?filter=overdue'),
  })

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid var(--line, #e5e7eb)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e5e7eb)' }}>
        <span className="font-mono" style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          {t('dashboard.actionQueue.title', 'Очередь действий')}
        </span>
      </div>
      {groups.length === 0 ? (
        <div style={{ padding: '20px', fontSize: 13, color: '#6b7280' }}>
          {t('dashboard.actionQueue.empty', 'Действий не требуется')}
        </div>
      ) : (
        <>
          {groups.map((g, i) => (
            <button key={g.key} onClick={g.onClick}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left',
                padding: '13px 18px',
                borderBottom: i < groups.length - 1 ? '1px solid #f3f4f6' : 'none',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink, #1a1a2e)', fontWeight: 500 }}>{g.label}</div>
                {g.nearestDeadline && (
                  <div style={{ fontSize: 11, color: urgencyColor(g.nearestDeadline), marginTop: 2 }}>
                    {t('dashboard.actionQueue.nearest', 'Ближайший')}: {daysUntil(g.nearestDeadline)} {t('dashboard.tasks.daysShort', 'дн.')}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 18, fontWeight: 700, fontFamily: 'Georgia, serif',
                color: urgencyColor(g.nearestDeadline),
              }}>
                {g.count}
              </span>
            </button>
          ))}
          <div style={{
            padding: '10px 18px', textAlign: 'right', background: '#fafafa',
            borderTop: '1px solid var(--line, #e5e7eb)',
          }}>
            <a href="/my-tasks" onClick={e => { e.preventDefault(); navigate('/my-tasks') }}
              style={{ fontSize: 12, color: 'var(--accent, #1a7558)', fontWeight: 500 }}>
              {t('dashboard.tasks.viewAll', 'Все задачи →')}
            </a>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/ActionQueue.tsx
git commit -m "feat(dashboard): add ActionQueue for manager tab"
```

---

## Task 7: Frontend — `TeamHealthPanel` (manager tab right column, replaces `DashboardTeam`)

**Files:**
- Create: `frontend/src/features/dashboard/TeamHealthPanel.tsx`

- [ ] **Step 1: Write component**

```tsx
import { useTranslation } from 'react-i18next'
import type { TeamResponse, TeamMemberDto } from '../analytics/analyticsApi'

interface Props {
  team: TeamResponse | null
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#0d4d3f,#1a7558)', color: '#fff',
      fontSize: 11, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{initials}</div>
  )
}

function reasonColor(status: string): string {
  if (status === 'appeal' || status === 'low') return '#dc2626'
  if (status === 'unevaluated') return '#d97706'
  return '#16a34a'
}

function MemberRow({ m, highlight }: { m: TeamMemberDto; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 18px', borderBottom: '1px solid #f3f4f6',
      background: highlight ? '#f0fdf4' : undefined,
    }}>
      <Avatar initials={m.initials} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--ink, #1a1a2e)' }}>{m.fullName}</div>
        <div style={{ fontSize: 11, color: reasonColor(m.status) }}>{m.reasonLabel}</div>
      </div>
      <div style={{
        fontSize: 14, fontWeight: 700, fontFamily: 'Georgia, serif',
        color: m.latestScore !== null && m.latestScore < 70 ? '#dc2626' : 'var(--ink, #1a1a2e)',
      }}>
        {m.latestScore !== null ? m.latestScore.toFixed(0) : '—'}
      </div>
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const W = 80, H = 26, PAD = 2
  const min = Math.min(...values), max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((v, i) => {
    const x = PAD + (i * (W - 2 * PAD)) / (values.length - 1)
    const y = H - PAD - ((v - min) / range) * (H - 2 * PAD)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={W} height={H} aria-hidden="true">
      <polyline points={points} fill="none" stroke="var(--accent, #1a7558)" strokeWidth={1.6} />
    </svg>
  )
}

export function TeamHealthPanel({ team }: Props) {
  const { t } = useTranslation()
  if (!team) return null
  const { attention, bestPerformer, totalCount, teamAvg, teamAvgHistory } = team

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid var(--line, #e5e7eb)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--line, #e5e7eb)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <span className="font-mono" style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          {t('dashboard.teamHealth.title', 'Здоровье команды')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {teamAvg !== null && (
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              {t('dashboard.teamHealth.avg', 'Средний')}:{' '}
              <strong style={{ color: 'var(--ink, #1a1a2e)' }}>{teamAvg.toFixed(0)}</strong>
            </span>
          )}
          <Sparkline values={teamAvgHistory} />
        </div>
      </div>
      {attention.length === 0 && !bestPerformer ? (
        <div style={{ padding: '20px', fontSize: 13, color: '#6b7280' }}>
          {t('dashboard.teamHealth.allGood', 'Команда в норме')}
        </div>
      ) : (
        <>
          {attention.map(m => <MemberRow key={m.userId} m={m} />)}
          {bestPerformer && <MemberRow m={bestPerformer} highlight />}
          <div style={{
            padding: '10px 18px', fontSize: 12, color: '#6b7280',
            display: 'flex', justifyContent: 'space-between',
            background: '#fafafa', borderTop: '1px solid var(--line, #e5e7eb)',
          }}>
            <span>{t('dashboard.teamHealth.total', 'Всего {{n}} сотрудников', { n: totalCount })}</span>
            <a href="/admin/org" style={{ color: 'var(--accent, #1a7558)' }}>
              {t('dashboard.teamHealth.viewAll', 'Вся команда →')}
            </a>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/TeamHealthPanel.tsx
git commit -m "feat(dashboard): add TeamHealthPanel with sparkline (replaces DashboardTeam)"
```

---

## Task 8: Frontend — `DashboardScorecard` always-expanded

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardScorecard.tsx`

- [ ] **Step 1: Remove expand toggle state and button**

Open `DashboardScorecard.tsx`. Make these changes:

Replace line 1 import:

```tsx
import type { ScorecardResponse, CriteriaScore } from '../analytics/analyticsApi'
```

(Drop `useState` import.)

Inside `DashboardScorecard`, remove the `const [expanded, setExpanded] = useState(false)` line.

Remove the entire "Expand button" block (the `<button>` element with `onClick={() => setExpanded(...)}`).

Change `{expanded && (` and matching `)}` so the criteria table + anti-bonus block render unconditionally.

- [ ] **Step 2: Typecheck**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardScorecard.tsx
git commit -m "refactor(dashboard): scorecard always expanded (drop Детали toggle)"
```

---

## Task 9: Frontend — i18n keys (ru + kg)

**Files:**
- Modify: `frontend/public/locales/ru/translation.json`
- Modify: `frontend/public/locales/kg/translation.json`

- [ ] **Step 1: Add `dashboard` namespace block to ru**

Insert (or merge into existing `dashboard` object) in `frontend/public/locales/ru/translation.json`:

```json
"dashboard": {
  "tab": {
    "label": "Разделы дашборда",
    "mine": "Мой KPI",
    "team": "Команда"
  },
  "greeting": {
    "morning": "Доброе утро",
    "day": "Добрый день",
    "evening": "Добрый вечер"
  },
  "tasks": {
    "title": "Открытые задачи",
    "empty": "Открытых задач нет",
    "viewAll": "Все задачи →",
    "evaluate": "Оценка: {{name}}",
    "appeal": "Апелляция: {{name}}",
    "daysShort": "дн."
  },
  "actionQueue": {
    "title": "Очередь действий",
    "empty": "Действий не требуется",
    "drafts": "Оценки на подачу",
    "appeals": "Апелляции на решение",
    "overdue": "Просроченные оценки",
    "nearest": "Ближайший"
  },
  "teamHealth": {
    "title": "Здоровье команды",
    "avg": "Средний",
    "allGood": "Команда в норме",
    "total": "Всего {{n}} сотрудников",
    "viewAll": "Вся команда →"
  },
  "partialLoadFailure": "Часть данных дашборда не загрузилась"
}
```

If a top-level `dashboard` key already exists, deep-merge (do not overwrite existing keys; add only missing ones).

- [ ] **Step 2: Add Kyrgyz translations to kg**

Insert (or merge) in `frontend/public/locales/kg/translation.json`:

```json
"dashboard": {
  "tab": {
    "label": "Башкы беттин бөлүмдөрү",
    "mine": "Менин KPI",
    "team": "Команда"
  },
  "greeting": {
    "morning": "Кутмандуу таң",
    "day": "Кутмандуу күн",
    "evening": "Кутмандуу кеч"
  },
  "tasks": {
    "title": "Ачык тапшырмалар",
    "empty": "Ачык тапшырма жок",
    "viewAll": "Бардык тапшырмалар →",
    "evaluate": "Баалоо: {{name}}",
    "appeal": "Апелляция: {{name}}",
    "daysShort": "күн"
  },
  "actionQueue": {
    "title": "Иш-аракеттер кезеги",
    "empty": "Иш-аракет талап кылынбайт",
    "drafts": "Берилүүчү баалоолор",
    "appeals": "Чечилүүчү апелляциялар",
    "overdue": "Мөөнөтү өткөн баалоолор",
    "nearest": "Жакынкы"
  },
  "teamHealth": {
    "title": "Команданын абалы",
    "avg": "Орточо",
    "allGood": "Команда нормалдуу",
    "total": "Бардыгы {{n}} кызматкер",
    "viewAll": "Бардык команда →"
  },
  "partialLoadFailure": "Башкы беттин маалыматынын бир бөлүгү жүктөлгөн жок"
}
```

- [ ] **Step 3: Validate JSON**

```bash
cd /home/azamat/Desktop/projects/gfh/kpi
python3 -m json.tool frontend/public/locales/ru/translation.json > /dev/null
python3 -m json.tool frontend/public/locales/kg/translation.json > /dev/null
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/public/locales/ru/translation.json frontend/public/locales/kg/translation.json
git commit -m "feat(dashboard): add i18n keys for tabs/tasks/actionQueue/teamHealth"
```

---

## Task 10: Frontend — Rewrite `DashboardPage` as tabs container

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'
import { analyticsApi } from '../analytics/analyticsApi'
import type { PersonalAnalytics, ScorecardResponse, TeamResponse } from '../analytics/analyticsApi'
import { evaluationsApi } from '../evaluations/evaluationsApi'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi } from '../periods/periodsApi'
import type { Period, AppealPending } from '../periods/periodsApi'
import { usePageTitle } from '../../context/PageContext'
import { DashboardGreeting } from './DashboardGreeting'
import { DashboardTabs, loadDashboardTab } from './DashboardTabs'
import type { DashboardTab } from './DashboardTabs'
import { DashboardScorecard } from './DashboardScorecard'
import { TasksPanel } from './TasksPanel'
import { ActionQueue } from './ActionQueue'
import { TeamHealthPanel } from './TeamHealthPanel'

export function DashboardPage() {
  const { t } = useTranslation()
  usePageTitle('nav.dashboard')
  const role = useSelector((s: RootState) => s.auth.role)
  const showTeamTab = role === 'MANAGER' || role === 'ADMIN'

  const [tab, setTab] = useState<DashboardTab>(() => loadDashboardTab(role))
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [myTasks, setMyTasks] = useState<PageResponse<Evaluation> | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null)
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [partialFailure, setPartialFailure] = useState(false)

  useEffect(() => {
    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      evaluationsApi.myTasks(0, 200).then(setMyTasks),
      periodsApi.list().then(setPeriods),
      periodsApi.pendingAppeals().then(setPendingAppeals),
      analyticsApi.scorecard().then(v => { if (v) setScorecard(v) }),
      ...(showTeamTab ? [analyticsApi.team().then(setTeam)] : []),
    ]
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
    })
  }, [showTeamTab])

  // If team tab unavailable for current role, force mine
  const effectiveTab: DashboardTab = !showTeamTab && tab === 'team' ? 'mine' : tab

  const activePeriod = periods.find(p => p.status === 'ACTIVE') ?? null
  const firstName = analytics?.fullName?.split(' ').pop() ?? analytics?.fullName ?? ''

  // IC appeals: filter pendingAppeals to those where the IC is the evaluatee.
  // Backend currently returns appeals visible to the user; treat all as IC-facing
  // in `mine` tab (manager tab uses the same list as "decisions to make").
  const myAppeals = pendingAppeals

  return (
    <div style={{ padding: '20px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {partialFailure ? t('dashboard.partialLoadFailure', 'Часть данных дашборда не загрузилась') : ''}
      </div>

      <DashboardGreeting firstName={firstName} />

      <DashboardTabs
        active={effectiveTab}
        onChange={setTab}
        showTeamTab={showTeamTab}
      />

      {effectiveTab === 'mine' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20 }}>
          <DashboardScorecard scorecard={scorecard} />
          <TasksPanel myTasks={myTasks} myAppeals={myAppeals} />
        </div>
      )}

      {effectiveTab === 'team' && showTeamTab && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20 }}>
          <ActionQueue
            myTasks={myTasks}
            pendingAppeals={pendingAppeals}
            activePeriod={activePeriod}
          />
          <TeamHealthPanel team={team} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Responsive collapse — add media query**

Append below the page-level `<div>` style or in a CSS file. Simplest: wrap grids with `className="dashboard-grid"` and add to `frontend/src/index.css` (or the existing global stylesheet — check `App.tsx` import):

```bash
cd /home/azamat/Desktop/projects/gfh/kpi/frontend
grep -rn "@media" src/index.css src/App.css src/styles 2>/dev/null | head -3
```

Add to the first global CSS file imported by `App.tsx`:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap: 20px;
}
@media (max-width: 900px) {
  .dashboard-grid { grid-template-columns: 1fr; }
}
```

Then change both `<div style={{ display: 'grid', ... }}>` in `DashboardPage.tsx` to `<div className="dashboard-grid">`.

- [ ] **Step 3: Typecheck + build**

```bash
cd frontend
npx tsc --noEmit
npm run build
```

Expected: typecheck pass, build succeeds.

- [ ] **Step 4: Manual smoke**

Start backend + frontend:

```bash
cd /home/azamat/Desktop/projects/gfh/kpi && ./scripts/dev-start.sh
```

Open `http://localhost:5173/`. Log in as admin (`admin@gfh.kg` / `Admin123!@#`). Verify:
- Greeting band visible at top with date+time.
- Two tabs visible (Мой KPI / Команда).
- Default tab = Команда (admin role).
- Switch to Мой KPI → see scorecard + tasks panel side-by-side.
- Reload page → tab choice persisted.
- Resize browser below 900px → columns stack.

Also log in as a non-manager user (seed data should have one) → confirm only Мой KPI tab visible.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx frontend/src/index.css
git commit -m "feat(dashboard): rewrite as role-tabbed two-column layout"
```

---

## Task 11: Cleanup — delete obsolete components

**Files:**
- Delete: `frontend/src/features/dashboard/DashboardHero.tsx`
- Delete: `frontend/src/features/dashboard/DashboardQuickActions.tsx`
- Delete: `frontend/src/features/dashboard/DashboardHistoryChart.tsx`
- Delete: `frontend/src/features/dashboard/DashboardEventFeed.tsx`
- Delete: `frontend/src/features/dashboard/DashboardTeam.tsx`
- Delete: `frontend/src/features/dashboard/KpiRing.tsx`

- [ ] **Step 1: Check for remaining imports outside `DashboardPage.tsx`**

```bash
cd /home/azamat/Desktop/projects/gfh/kpi/frontend
for f in DashboardHero DashboardQuickActions DashboardHistoryChart DashboardEventFeed DashboardTeam KpiRing; do
  echo "=== $f ==="
  grep -rn "from.*$f\|import.*$f" src --include="*.tsx" --include="*.ts" | grep -v "features/dashboard/$f"
done
```

Expected: empty output. If any external import exists, STOP and resolve (move file to consumer or update consumer) before deleting.

- [ ] **Step 2: Verify history chart exists on `/my-kpi` before deleting**

```bash
grep -n "DashboardHistoryChart\|HistoryChart\|history" frontend/src/features/analytics/PersonalDashboardPage.tsx | head -10
```

If `/my-kpi` (PersonalDashboardPage) lacks chart and the user wants to keep trend visualization accessible, **first move** `DashboardHistoryChart.tsx` to `frontend/src/features/analytics/PersonalHistoryChart.tsx` and import there. If it already has equivalent, proceed with delete.

- [ ] **Step 3: Delete files**

```bash
cd /home/azamat/Desktop/projects/gfh/kpi
rm frontend/src/features/dashboard/DashboardHero.tsx
rm frontend/src/features/dashboard/DashboardQuickActions.tsx
rm frontend/src/features/dashboard/DashboardHistoryChart.tsx
rm frontend/src/features/dashboard/DashboardEventFeed.tsx
rm frontend/src/features/dashboard/DashboardTeam.tsx
rm frontend/src/features/dashboard/KpiRing.tsx
```

- [ ] **Step 4: Remove `analyticsApi.events` call site cleanup**

In `DashboardPage.tsx` the `analyticsApi.events()` call is already removed in Task 10. Check the API method is no longer referenced anywhere:

```bash
cd /home/azamat/Desktop/projects/gfh/kpi/frontend
grep -rn "analyticsApi.events\|analyticsApi\.events" src
```

If empty → optionally remove `events` from `analyticsApi.ts` (defer to follow-up; not required for this task).

- [ ] **Step 5: Typecheck + build**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add -A frontend/src/features/dashboard/
git commit -m "chore(dashboard): remove obsolete Hero/QuickActions/HistoryChart/EventFeed/Team/KpiRing"
```

---

## Final verification

- [ ] **Run full backend test suite**

```bash
cd backend && mvn test
```

Expected: all pass.

- [ ] **Run frontend build**

```bash
cd frontend && npm run build
```

Expected: success, no TS errors.

- [ ] **Manual sweep (logged in as admin → manager seed user → IC seed user)**

Verify per role:
- Admin/Manager: lands on Команда tab; sees Action Queue + Team Health.
- IC: lands on Мой KPI tab; no Команда tab visible; sees Scorecard + Tasks.
- Tab persistence works across reload.
- No console errors.
- Responsive collapse at < 900px.

- [ ] **Push branch**

```bash
git push -u origin feat/dashboard-redesign
```

(Create branch first if not already on it: `git checkout -b feat/dashboard-redesign`.)
