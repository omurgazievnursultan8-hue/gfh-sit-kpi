# DashboardV3Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third dashboard page (`DashboardV3Page`) at `/dashboard-v3`, a reduced-widget variant of the existing terminal-style `DashboardV2Page`.

**Architecture:** New React page component reusing the v2 terminal/Swiss-grid aesthetic. CSS is copied into an independent `dashboardV3Styles.ts` with a `.dv3-` class prefix. The page reuses all existing APIs — no backend changes. `AppShell` (wrapping every route in `main.tsx`) supplies the sidebar + topbar automatically.

**Tech Stack:** React 18, TypeScript, React Router v6, Redux Toolkit, react-i18next, Vite.

---

## Notes for the engineer

- This project has **no unit tests for dashboard pages**; verification is `npx tsc --noEmit` plus manual browser checks. The plan follows that norm — there are no failing-test steps.
- v3 = `DashboardV2Page` minus the `RATING.DYNAMICS` chart and the `ACTIVE.PERIODS` card, with classes renamed `dv2-` → `dv3-`.
- Reference file (do not modify): `frontend/src/features/dashboard/DashboardV2Page.tsx` and `frontend/src/features/dashboard/dashboardV2Styles.ts`.
- All paths below are relative to repo root. Frontend commands run from `frontend/`.

## File structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/features/dashboard/dashboardV3Styles.ts` | Create | Scoped CSS string `DASHBOARD_V3_CSS`, `.dv3-` prefixed. |
| `frontend/src/features/dashboard/DashboardV3Page.tsx` | Create | The page component. |
| `frontend/src/App.tsx` | Modify | Register `/dashboard-v3` route. |
| `frontend/src/components/shell/navConfig.ts` | Modify | Add sidebar nav entry. |
| `frontend/public/locales/ru/translation.json` | Modify | Add `nav.dashboardV3` key. |
| `frontend/public/locales/kg/translation.json` | Modify | Add `nav.dashboardV3` key. |

---

## Task 1: Create the v3 stylesheet

**Files:**
- Create: `frontend/src/features/dashboard/dashboardV3Styles.ts`

- [ ] **Step 1: Copy the v2 stylesheet**

```bash
cd frontend
cp src/features/dashboard/dashboardV2Styles.ts src/features/dashboard/dashboardV3Styles.ts
```

- [ ] **Step 2: Rename the export and all class prefixes**

In `src/features/dashboard/dashboardV3Styles.ts`, perform two textual replacements across the whole file:

1. Replace the export name `DASHBOARD_V2_CSS` → `DASHBOARD_V3_CSS`.
2. Replace every occurrence of the substring `dv2-` → `dv3-` (there are 177 occurrences — replace all).

Also update the leading comment's first line from `for DashboardV2Page.` to `for DashboardV3Page.`.

The result: a file identical to `dashboardV2Styles.ts` except `DASHBOARD_V3_CSS` exports a CSS string whose every class is `.dv3-…` and whose root selector is `.dv3-root`.

- [ ] **Step 3: Verify the rename is complete**

Run: `cd frontend && grep -c "dv2-" src/features/dashboard/dashboardV3Styles.ts`
Expected: `0`

Run: `grep -c "dv3-" src/features/dashboard/dashboardV3Styles.ts`
Expected: `177`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/dashboard/dashboardV3Styles.ts
git commit -m "feat(dashboard): add dashboardV3Styles stylesheet"
```

---

## Task 2: Create DashboardV3Page component

**Files:**
- Create: `frontend/src/features/dashboard/DashboardV3Page.tsx`

- [ ] **Step 1: Write the full component**

Create `frontend/src/features/dashboard/DashboardV3Page.tsx` with exactly this content:

```tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'
import { usePageTitle } from '../../context/PageContext'
import { analyticsApi } from '../analytics/analyticsApi'
import type {
  PersonalAnalytics, ScorecardResponse, TeamResponse,
  DashboardEvent, PendingSummary,
} from '../analytics/analyticsApi'
import { periodsApi } from '../periods/periodsApi'
import type { Period, AppealPending } from '../periods/periodsApi'
import { delegationsApi } from '../org/delegationsApi'
import type { Delegation } from '../org/delegationsApi'
import { DASHBOARD_V3_CSS } from './dashboardV3Styles'

// ── helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(d)
}

function signed(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}`
}

function zoneClass(n: number | null | undefined): 'up' | 'down' | '' {
  if (n === null || n === undefined) return ''
  return n >= 0 ? 'up' : 'down'
}

function periodCode(type: string, startDate: string): string {
  const d = new Date(startDate)
  const yy = String(d.getFullYear()).slice(2)
  if (type === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1}.${yy}`
  if (type === 'MONTHLY') return `M${d.getMonth() + 1}.${yy}`
  return `Y.${yy}`
}

function shortDate(s: string): string {
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).toUpperCase()
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function asciiBar(pct: number, width = 20): { fill: string; empty: string } {
  const clamped = Math.max(0, Math.min(1, pct))
  const filled = Math.round(clamped * width)
  return { fill: '█'.repeat(filled), empty: '█'.repeat(width - filled) }
}

// ── card shell ──────────────────────────────────────────────────────────────
function Card({ col, title, id, children }: {
  col: number; title: string; id: string; children: React.ReactNode
}) {
  return (
    <section className={`dv3-card dv3-col-${col}`}>
      <div className="dv3-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv3-card-id">[ {id} ]</span>
      </div>
      <div className="dv3-card-body">{children}</div>
    </section>
  )
}

function Tag({ kind, children }: { kind: 'up' | 'down' | 'warn' | 'info' | 'gold' | 'neutral'; children: React.ReactNode }) {
  return <span className={`dv3-tag dv3-tag--${kind}`}>{children}</span>
}

// ── page ────────────────────────────────────────────────────────────────────
export function DashboardV3Page() {
  usePageTitle('nav.dashboard')
  const navigate = useNavigate()
  const role = useSelector((s: RootState) => s.auth.role)
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount)
  const isManager = role !== 'EMPLOYEE'

  const [clock, setClock] = useState('')

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null)
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [summary, setSummary] = useState<PendingSummary | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [appeals, setAppeals] = useState<AppealPending[]>([])
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [partialFailure, setPartialFailure] = useState(false)

  // Live clock — terminal aesthetic.
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch all panels — render whatever succeeds, flag partial failure.
  useEffect(() => {
    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      analyticsApi.scorecard().then(setScorecard),
      analyticsApi.events().then(setEvents),
      analyticsApi.pendingSummary().then(setSummary),
      periodsApi.list().then(setPeriods),
      periodsApi.pendingAppeals().then(setAppeals),
      delegationsApi.list(0, 50).then(r => setDelegations(r.content)),
    ]
    if (isManager) tasks.push(analyticsApi.team().then(setTeam))
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
    })
  }, [isManager])

  const activePeriods = useMemo(
    () => periods
      .filter(p => p.status === 'ACTIVE')
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()),
    [periods],
  )

  // ── derived ────────────────────────────────────────────────────────────────
  const histScores = (analytics?.history ?? []).map(h => h.score)
  const peak = histScores.length ? Math.max(...histScores) : null
  const trough = histScores.length ? Math.min(...histScores) : null
  const avg = histScores.length
    ? histScores.reduce((a, b) => a + b, 0) / histScores.length : null
  const sigma = stdDev(histScores)

  const currentScore = analytics?.currentScore ?? null
  const intPart = currentScore !== null ? Math.trunc(currentScore) : null
  const decPart = currentScore !== null
    ? `.${(Math.abs(currentScore) % 1).toFixed(2).slice(2)}` : ''

  const activeDelegations = delegations.filter(d => d.isActive)
  const activePeriodLabel = activePeriods[0]
    ? periodCode(activePeriods[0].type, activePeriods[0].startDate)
    : 'N/A'

  const cycleDone = summary?.completedEvaluations ?? 0
  const cycleTotal = summary?.totalEvaluations ?? 0
  const cyclePct = cycleTotal > 0 ? cycleDone / cycleTotal : 0
  const cycleBar = asciiBar(cyclePct, 22)

  // ── ticker rows ────────────────────────────────────────────────────────────
  const tickerItems: Array<{ label: string; value: string; zone: string }> = [
    { label: 'SELF', value: fmt(currentScore), zone: '' },
    { label: 'DEPT.AVG', value: fmt(analytics?.departmentAvg), zone: '' },
    { label: 'COMPANY.AVG', value: fmt(analytics?.companyAvg), zone: '' },
    { label: 'ANTI.BONUS', value: fmt(scorecard?.antiBonusTotal), zone: scorecard && scorecard.antiBonusTotal < 0 ? 'down' : '' },
    { label: 'EVALS.DONE', value: `${cycleDone}/${cycleTotal}`, zone: '' },
    { label: 'APPEALS', value: String(appeals.length), zone: appeals.length > 0 ? 'down' : 'up' },
    { label: 'NOTIF', value: String(unreadCount), zone: '' },
    { label: 'DELEG', value: String(activeDelegations.length), zone: '' },
  ]

  const eventTag = (t: DashboardEvent['iconType']) =>
    t === 'success' ? 'OK' : t === 'warn' ? 'WARN' : 'INFO'

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_V3_CSS}</style>

      <div className="dv3-terminal">
        {/* a11y partial-failure announcer */}
        <div className="sr-only" role="status" aria-live="polite">
          {partialFailure ? 'Часть данных дашборда не загрузилась' : ''}
        </div>

        {/* ── HEADER ── */}
        <header className="dv3-head">
          <div className="dv3-head-brand">
            <span className="dv3-head-logo">GFH</span>
            <span>EMPLOYEE.RATING.TERMINAL · v3.0</span>
          </div>
          <div className="dv3-head-cmd">
            <span>dashboard --period={activePeriodLabel}</span>
            <span className="dv3-head-caret" />
          </div>
          <div className="dv3-head-right">
            <span>SESS <span className="dv3-mono">{clock}</span></span>
            <span>·</span>
            <span className="dv3-mono">UTC+6</span>
          </div>
        </header>

        {/* ── TICKER ── */}
        <div className="dv3-ticker">
          <div className="dv3-ticker-inner">
            {[...tickerItems, ...tickerItems].map((it, i) => (
              <span key={i} className="dv3-ticker-item">
                <strong>{it.label}</strong> {it.value}
                {it.zone && <span className={`dv3-${it.zone}`}>{it.zone === 'up' ? ' OK' : ' !'}</span>}
                <span className="dv3-ticker-sep">|</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="dv3-grid">

          {/* SELF.RATING */}
          <Card col={8} title="SELF.RATING" id="R01">
            <div className="dv3-kpi">
              <div className="dv3-kpi-num">
                {intPart !== null ? intPart : '—'}
                <span className="dv3-kpi-dec">{decPart}</span>
                <span className="dv3-kpi-unit">/ 100</span>
              </div>
              <div className="dv3-kpi-meta">
                {scorecard?.grade && <Tag kind="gold">{scorecard.grade}</Tag>}
                {scorecard && scorecard.vsPrevPeriod !== null && (
                  <>
                    <div className={`dv3-kpi-delta dv3-${zoneClass(scorecard.vsPrevPeriod)}`}>
                      {signed(scorecard.vsPrevPeriod)}
                    </div>
                    <div className="dv3-kpi-delta-lab">
                      vs {scorecard.prevPeriodLabel ?? 'PREV'}
                    </div>
                  </>
                )}
                {scorecard && (
                  <div className="dv3-kpi-target">
                    GOAL Δ <strong className={`dv3-${zoneClass(scorecard.vsGoal)}`}>
                      {signed(scorecard.vsGoal)}
                    </strong>
                    {scorecard.rank !== null && <> · RANK <strong>#{scorecard.rank}</strong></>}
                  </div>
                )}
              </div>
            </div>

            <div className="dv3-rule-thick" />

            <div className="dv3-data-rows">
              {(scorecard?.criteria ?? []).slice(0, 5).map((c, i) => {
                const pct = c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0
                const good = pct >= 60
                return (
                  <div key={c.criteriaId} className="dv3-data-row">
                    <span className="dv3-data-idx">{String(i + 1).padStart(2, '0')}</span>
                    <span className="dv3-data-name">{c.nameRu}</span>
                    <span className="dv3-bar-track">
                      <span className={`dv3-bar-fill dv3-${good ? 'up' : 'down'}`}
                        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
                    </span>
                    <span className={`dv3-data-val dv3-${good ? 'up' : 'down'}`}>
                      {fmt(c.score)}
                    </span>
                  </div>
                )
              })}
              {(!scorecard || scorecard.criteria.length === 0) && (
                <div className="dv3-empty">NO SCORECARD · PERIOD NOT CLOSED</div>
              )}
            </div>

            <div className="dv3-rule" />

            <div className="dv3-field-grid dv3-field-grid--3">
              <div className="dv3-field">
                <div className="dv3-field-lab">PEAK</div>
                <div className="dv3-field-val">{fmt(peak)}</div>
                <div className="dv3-field-sub">12M HIGH</div>
              </div>
              <div className="dv3-field">
                <div className="dv3-field-lab">TROUGH</div>
                <div className="dv3-field-val">{fmt(trough)}</div>
                <div className="dv3-field-sub">12M LOW</div>
              </div>
              <div className="dv3-field">
                <div className="dv3-field-lab">AVG</div>
                <div className="dv3-field-val">{fmt(avg)}</div>
                <div className="dv3-field-sub">σ = {fmt(sigma, 1)}</div>
              </div>
            </div>
          </Card>

          {/* EVAL.CYCLE.PROGRESS */}
          <Card col={4} title="EVAL.CYCLE.PROGRESS" id="P01">
            <div className="dv3-row-between dv3-baseline">
              <div>
                <span className="dv3-big-num">{cycleDone} / {cycleTotal}</span>
                <span className="dv3-muted dv3-ml">EVALUATIONS COMPLETE</span>
              </div>
              {summary && summary.pendingEvaluations > 0 && (
                <Tag kind="warn">{summary.pendingEvaluations} PENDING</Tag>
              )}
            </div>
            <div className="dv3-gauge">
              <div className="dv3-gauge-bar dv3-gauge-bar--lg">
                <span className="dv3-fill">{cycleBar.fill}</span>
                <span className="dv3-dim">{cycleBar.empty}</span>
              </div>
              <div className="dv3-gauge-meta">
                <span>0%</span>
                <span><strong>{Math.round(cyclePct * 100)}%</strong></span>
                <span>100%</span>
              </div>
            </div>
            <div className="dv3-rule" />
            <div className="dv3-field-grid dv3-field-grid--3">
              <div className="dv3-field">
                <div className="dv3-field-lab">DONE</div>
                <div className="dv3-field-val dv3-up">{cycleDone}</div>
                <div className="dv3-field-sub">SUBMITTED</div>
              </div>
              <div className="dv3-field">
                <div className="dv3-field-lab">PEND.EVAL</div>
                <div className="dv3-field-val">{summary?.pendingEvaluations ?? 0}</div>
                <div className="dv3-field-sub">TO SCORE</div>
              </div>
              <div className="dv3-field">
                <div className="dv3-field-lab">PEND.APPEAL</div>
                <div className="dv3-field-val">{summary?.pendingAppeals ?? 0}</div>
                <div className="dv3-field-sub">TO REVIEW</div>
              </div>
            </div>
          </Card>

          {/* SUBORDINATES.RANK — managers only */}
          {isManager && (
            <Card col={6} title="SUBORDINATES.RANK" id="S01">
              {team && (team.bestPerformer || team.attention.length > 0) ? (
                <div className="dv3-ladder">
                  {[
                    ...(team.bestPerformer ? [team.bestPerformer] : []),
                    ...team.attention,
                  ].map(m => {
                    const down = m.status === 'low' || m.status === 'appeal'
                    const pct = m.latestScore !== null ? Math.max(8, Math.min(100, m.latestScore)) : 8
                    return (
                      <div key={m.userId} className="dv3-ladder-row">
                        <span className="dv3-ladder-key">{m.initials}</span>
                        <span className="dv3-ladder-name">{m.fullName}</span>
                        <span className="dv3-ladder-bg" style={{ width: `${pct}%` }} />
                        <span className={`dv3-ladder-val dv3-${down ? 'down' : 'up'}`}>
                          {fmt(m.latestScore)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="dv3-ladder-foot">
                    TEAM {team.totalCount} · AVG {fmt(team.teamAvg)}
                  </div>
                </div>
              ) : (
                <div className="dv3-empty">NO SUBORDINATE DATA</div>
              )}
            </Card>
          )}

          {/* ANTI.BONUS */}
          <Card col={6} title="ANTI.BONUS" id="A01">
            <div className="dv3-row-between dv3-baseline">
              <span className="dv3-big-num dv3-down">
                {scorecard ? signed(scorecard.antiBonusTotal) : '—'}
              </span>
              {scorecard && (
                <Tag kind={scorecard.antiBonusTotal < 0 ? 'down' : 'up'}>
                  {scorecard.antiBonusTotal < 0 ? 'PENALTY' : 'CLEAN'}
                </Tag>
              )}
            </div>
            <div className="dv3-sub-cap">CUMULATIVE PENALTY · CURRENT PERIOD</div>
            <div className="dv3-rule" />
            <div className="dv3-data-rows">
              {(scorecard?.antiBonuses ?? []).slice(0, 5).map((a, i) => (
                <div key={a.criteriaId} className="dv3-data-row">
                  <span className="dv3-data-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="dv3-data-name">{a.nameRu}</span>
                  <span className="dv3-data-val dv3-down">{signed(a.score)}</span>
                </div>
              ))}
              {(!scorecard || scorecard.antiBonuses.length === 0) && (
                <div className="dv3-empty">NO PENALTIES RECORDED</div>
              )}
            </div>
          </Card>

          {/* EVENT.LOG */}
          <Card col={6} title="EVENT.LOG" id="L01">
            <div className="dv3-cmd-list">
              {events.length === 0 && <div className="dv3-empty">NO EVENTS</div>}
              {events.slice(0, 8).map(e => (
                <div key={e.id} className="dv3-cmd-row">
                  <span className="dv3-cmd-time">
                    {new Date(e.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="dv3-cmd-msg">{e.text}</span>
                  <span className={`dv3-cmd-tag dv3-cmd-tag--${eventTag(e.iconType)}`}>
                    {eventTag(e.iconType)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* MINI · APPEALS */}
          <button className="dv3-card dv3-col-3 dv3-card-btn" onClick={() => navigate('/my-tasks')}>
            <div className="dv3-card-head">
              <span><strong>APPEALS</strong></span>
              <span className="dv3-card-id">[ M01 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-mini-num">
                <span>{appeals.length}</span>
                <span className="dv3-muted">PENDING</span>
              </div>
              <div className="dv3-rule" />
              <div className="dv3-mini-list">
                {appeals.slice(0, 3).map(a => (
                  <div key={a.id}>· {a.evaluateeName} · {shortDate(a.deadline)}</div>
                ))}
                {appeals.length === 0 && <div className="dv3-muted">· none open</div>}
              </div>
            </div>
          </button>

          {/* MINI · NOTIFICATIONS */}
          <div className="dv3-card dv3-col-3">
            <div className="dv3-card-head">
              <span><strong>NOTIFICATIONS</strong></span>
              <span className="dv3-card-id">[ M02 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-mini-num">
                <span>{unreadCount}</span>
                <span className="dv3-muted">UNREAD</span>
              </div>
              <div className="dv3-rule" />
              <div className="dv3-mini-list">
                <div className="dv3-muted">· realtime feed active</div>
              </div>
            </div>
          </div>

          {/* MINI · DELEGATIONS */}
          <div className="dv3-card dv3-col-3">
            <div className="dv3-card-head">
              <span><strong>DELEGATIONS</strong></span>
              <span className="dv3-card-id">[ M03 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-mini-num">
                <span>{activeDelegations.length}</span>
                <span className="dv3-muted">ACTIVE</span>
              </div>
              <div className="dv3-rule" />
              <div className="dv3-mini-list">
                {activeDelegations.slice(0, 3).map(d => (
                  <div key={d.id}>· {d.evaluateeName} → {d.delegatedToName}</div>
                ))}
                {activeDelegations.length === 0 && <div className="dv3-muted">· none active</div>}
              </div>
            </div>
          </div>

          {/* MINI · NAV */}
          <div className="dv3-card dv3-col-3">
            <div className="dv3-card-head">
              <span><strong>NAVIGATE</strong></span>
              <span className="dv3-card-id">[ M04 ]</span>
            </div>
            <div className="dv3-card-body">
              <div className="dv3-nav-list">
                <button onClick={() => navigate('/my-kpi')}>
                  <span>[ KPI ]</span><span className="dv3-muted">PERSONAL.ANALYTICS</span>
                </button>
                <button onClick={() => navigate('/my-tasks')}>
                  <span>[ TASKS ]</span><span className="dv3-muted">EVALUATIONS.QUEUE</span>
                </button>
                <button onClick={() => navigate('/dashboard')}>
                  <span>[ V1 ]</span><span className="dv3-muted">CLASSIC.DASHBOARD</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── FOOTER ── */}
        <div className="dv3-status-bar">
          <div className="dv3-status-left">
            <span className="dv3-status-item">
              <span className={`dv3-status-dot${partialFailure ? ' dv3-warn-dot' : ''}`} />
              API · {partialFailure ? 'DEGRADED' : 'UP'}
            </span>
            <span className="dv3-status-item">
              <span className="dv3-status-dot" /> SESSION · {role ?? '—'}
            </span>
            <span className="dv3-status-item">
              <span className="dv3-status-dot" /> PERIOD · {activePeriodLabel}
            </span>
          </div>
          <div>GFH.TERM v3.0 · {analytics?.fullName ?? '—'}</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardV3Page.tsx
git commit -m "feat(dashboard): add DashboardV3Page component"
```

---

## Task 3: Wire route, nav link, and translations

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/shell/navConfig.ts`
- Modify: `frontend/public/locales/ru/translation.json`
- Modify: `frontend/public/locales/kg/translation.json`

- [ ] **Step 1: Add the import to App.tsx**

In `frontend/src/App.tsx`, immediately after the existing line 15:

```tsx
import { DashboardV2Page } from './features/dashboard/DashboardV2Page'
```

add:

```tsx
import { DashboardV3Page } from './features/dashboard/DashboardV3Page'
```

- [ ] **Step 2: Add the route to App.tsx**

In `frontend/src/App.tsx`, immediately after the existing line 54:

```tsx
      <Route path="/dashboard-v2" element={<ProtectedRoute><DashboardV2Page /></ProtectedRoute>} />
```

add:

```tsx
      <Route path="/dashboard-v3" element={<ProtectedRoute><DashboardV3Page /></ProtectedRoute>} />
```

- [ ] **Step 3: Add the nav entry to navConfig.ts**

In `frontend/src/components/shell/navConfig.ts`, immediately after the existing line 66:

```ts
          { to: '/dashboard-v2', labelKey: 'nav.dashboardV2', icon: Activity, roles: ALL_ROLES },
```

add:

```ts
          { to: '/dashboard-v3', labelKey: 'nav.dashboardV3', icon: Activity, roles: ALL_ROLES },
```

(`Activity` is already imported in this file — reused intentionally.)

- [ ] **Step 4: Add the Russian translation**

In `frontend/public/locales/ru/translation.json`, the `nav` object currently has at line 34:

```json
    "dashboardV2": "Дашборд V2",
```

Add a `dashboardV3` key right after it:

```json
    "dashboardV2": "Дашборд V2",
    "dashboardV3": "Дашборд V3",
```

- [ ] **Step 5: Add the Kyrgyz translation**

In `frontend/public/locales/kg/translation.json`, the `nav` object currently has at line 34:

```json
    "dashboardV2": "Башкы бет V2",
```

Add a `dashboardV3` key right after it:

```json
    "dashboardV2": "Башкы бет V2",
    "dashboardV3": "Башкы бет V3",
```

- [ ] **Step 6: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/shell/navConfig.ts frontend/public/locales/ru/translation.json frontend/public/locales/kg/translation.json
git commit -m "feat(dashboard): route /dashboard-v3 and add nav link"
```

---

## Task 4: Verify in the browser

**Files:** none (verification only).

- [ ] **Step 1: Build to confirm production compile**

Run: `cd frontend && npm run build`
Expected: build succeeds, no TypeScript or Vite errors.

- [ ] **Step 2: Manual checks**

Start the dev stack (`./scripts/dev-start.sh` from repo root) and verify:

- `/dashboard-v3` renders inside the app sidebar + topbar.
- Sidebar shows a "Дашборд V3" link that routes to `/dashboard-v3`.
- Terminal header reads `EMPLOYEE.RATING.TERMINAL · v3.0`; clock ticks; ticker scrolls.
- Cards present: `SELF.RATING`, `EVAL.CYCLE.PROGRESS`, `ANTI.BONUS`, `EVENT.LOG`, and four mini cards.
- Logged in as a **manager**: `SUBORDINATES.RANK` card is present.
- Logged in as an **EMPLOYEE**: `SUBORDINATES.RANK` is absent and the remaining row reflows without a gap.
- No `RATING.DYNAMICS` chart and no `ACTIVE.PERIODS` card (intentionally removed).
- Toggling the global theme recolors the page (light/dark).

- [ ] **Step 3: No commit** — verification only.

---

## Self-review notes

- **Spec coverage:** every spec widget (R01, P01, S01, A01, L01, M01–M04) maps to JSX in Task 2. Dropped items (dynamics chart, heatmap, vbar, export, theme toggle) are absent — matches spec scope. CSS copy (Task 1), route + nav + i18n (Task 3) all covered.
- **Type consistency:** v3 component reuses the exact API types and method names from `DashboardV2Page`; only `PeriodProgress` import and the per-period progress effect were dropped along with `ACTIVE.PERIODS`. No dangling references.
- **No placeholders:** all code and commands are concrete.
