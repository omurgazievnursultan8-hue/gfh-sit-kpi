# StatCard Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract one reusable `StatCard` component covering the 5 dashboard stat cards (R01–D01), removing duplicated `dv3-card` markup and page-local helpers.

**Architecture:** New `src/components/StatCard.tsx` exports the `StatCard` component, a `STAT_CARD_CSS` string (card/kpi/gauge/zone CSS extracted from `dashboardStyles.ts`), and `scoreZone` (still used by the hero block). `DashboardPage` renders 5 `<StatCard>` inside `dv3-col-4` wrappers and injects both CSS strings. Class names stay `dv3-*`; StatCard always renders inside `.dv3-root` so `--dv3-*` vars resolve unchanged.

**Tech Stack:** React 18, TypeScript, Vite, react-i18next. No frontend test runner — verification is `npx tsc --noEmit` + `npm run build` + manual dashboard check.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `frontend/src/components/StatCard.tsx` | new — `StatCard` component, `STAT_CARD_CSS`, `scoreZone`, private `asciiBar` |
| `frontend/src/features/dashboard/DashboardPage.tsx` | modify — use `StatCard`; drop local `Card`/`asciiBar`/`scoreZone`; inject `STAT_CARD_CSS` |
| `frontend/src/features/dashboard/dashboardStyles.ts` | modify — remove card/kpi/gauge/zone-kpi CSS (moved to StatCard); keep root/grid/hero/loading |

**Note on `scoreZone`:** The spec said both helpers move into StatCard as module-private. `scoreZone` is also used by the dashboard hero metric (`dv3-hero-metric-num--zone-*`), so it is **exported** from StatCard instead of private. `asciiBar` stays private (hero uses no bars).

All commands run from `frontend/`.

---

### Task 1: Create StatCard component

**Files:**
- Create: `frontend/src/components/StatCard.tsx`

- [ ] **Step 1: Write StatCard.tsx**

Create `frontend/src/components/StatCard.tsx` with exactly this content:

```tsx
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

// ── helpers ─────────────────────────────────────────────────────────────────
function asciiBar(pct: number, width = 22): { fill: string; empty: string } {
  const clamped = Math.max(0, Math.min(1, pct))
  const filled = Math.round(clamped * width)
  return { fill: '█'.repeat(filled), empty: '░'.repeat(width - filled) }
}

// Maps a 0–100 score to a colour zone. null/undefined → neutral.
export function scoreZone(score: number | null | undefined): {
  numClass: string; tagClass: string; labelKey: string | null
} {
  if (score === null || score === undefined) {
    return { numClass: '', tagClass: '', labelKey: null }
  }
  if (score >= 80) return { numClass: 'zone-up', tagClass: 'up', labelKey: 'dashboard.zoneUp' }
  if (score >= 50) return { numClass: 'zone-warn', tagClass: 'warn', labelKey: 'dashboard.zoneNorm' }
  return { numClass: 'zone-down', tagClass: 'down', labelKey: 'dashboard.zoneDown' }
}

// ── types ───────────────────────────────────────────────────────────────────
export interface StatCardGauge {
  pct: number                    // 0..1, internally clamped
  variant: 'marker' | 'meta'
  left: ReactNode
  right: ReactNode
  center?: ReactNode             // 'meta' variant only
  current?: ReactNode            // 'marker' variant pin value
}

export interface StatCardProps {
  title: string
  id: string                     // rendered as [ id ] in header
  loading?: boolean
  value: number | string | null
  placeholder?: string           // shown while loading; default '··'
  emptyValue?: string            // shown when value === null; default '—'
  unit?: string                  // e.g. '/ 100'
  label?: string                 // inline uppercase label after number
  zoneScore?: number | null      // present → number colour + zone tag
  gauge: StatCardGauge
  onClick?: () => void           // present → clickable div + keydown handler
}

// ── component ───────────────────────────────────────────────────────────────
export function StatCard({
  title, id, loading = false, value,
  placeholder = '··', emptyValue = '—',
  unit, label, zoneScore, gauge, onClick,
}: StatCardProps) {
  const { t } = useTranslation()
  const zone = scoreZone(zoneScore)
  const bar = asciiBar(gauge.pct)

  const displayValue = loading
    ? placeholder
    : (value !== null && value !== undefined ? value : emptyValue)

  const numClass =
    `dv3-kpi-num${loading ? ' dv3-loading' : ''}` +
    (!loading && zone.numClass ? ` dv3-kpi-num--${zone.numClass}` : '')

  const body = (
    <>
      <div className="dv3-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv3-card-id">[ {id} ]</span>
      </div>
      <div className="dv3-card-body">
        <div className="dv3-kpi">
          <div>
            <div className={numClass}>
              {displayValue}
              {unit && <span className="dv3-kpi-unit">{unit}</span>}
              {label && <span className="dv3-kpi-label">{label}</span>}
            </div>
            {!loading && zone.labelKey && (
              <span className={`dv3-zone-tag dv3-zone-tag--${zone.tagClass}`}>
                {t(zone.labelKey)}
              </span>
            )}
          </div>
        </div>
        <div className="dv3-gauge">
          <div className="dv3-gauge-bar dv3-gauge-bar--lg" aria-hidden="true">
            <span className="dv3-fill">{bar.fill}</span>
            <span className="dv3-dim">{bar.empty}</span>
          </div>
          {gauge.variant === 'marker' ? (
            <div className="dv3-gauge-meta dv3-gauge-meta--mark">
              <span>{gauge.left}</span>
              <span
                className="dv3-gauge-cur"
                style={{ left: `${Math.min(100, Math.round(gauge.pct * 100))}%` }}
              >
                <strong>{gauge.current}</strong>
              </span>
              <span>{gauge.right}</span>
            </div>
          ) : (
            <div className="dv3-gauge-meta">
              <span>{gauge.left}</span>
              <span>{gauge.center}</span>
              <span>{gauge.right}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (onClick) {
    return (
      <div
        className="dv3-card dv3-card-btn"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (e.key === ' ') e.preventDefault()
            onClick()
          }
        }}
      >
        {body}
      </div>
    )
  }
  return <section className="dv3-card">{body}</section>
}

// ── styles ──────────────────────────────────────────────────────────────────
// Card/KPI/gauge/zone-KPI CSS. Relies on --dv3-* vars and .dv3-loading
// provided by DASHBOARD_CSS; StatCard always renders inside .dv3-root.
export const STAT_CARD_CSS = `
/* CARD */
.dv3-card {
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  position: relative;
  display: flex; flex-direction: column;
  text-align: left;
}
.dv3-card::before, .dv3-card::after {
  content: ""; position: absolute; width: 8px; height: 8px; pointer-events: none;
}
.dv3-card::before { top: -1px; left: -1px; border-top: 1px solid var(--dv3-accent); border-left: 1px solid var(--dv3-accent); }
.dv3-card::after { bottom: -1px; right: -1px; border-bottom: 1px solid var(--dv3-accent); border-right: 1px solid var(--dv3-accent); }
.dv3-card-btn { cursor: pointer; font-family: inherit; color: inherit; }
.dv3-card-btn:hover { border-color: var(--dv3-border-hi); }
.dv3-card-btn:focus-visible { outline: 2px solid var(--dv3-accent); outline-offset: 2px; }
.dv3-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg3);
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--dv3-text3);
}
.dv3-card-head strong { color: var(--dv3-text); font-weight: 600; letter-spacing: 0.14em; }
.dv3-card-id { font-size: 9px; color: var(--dv3-text4); letter-spacing: 0.1em; }
.dv3-card-body { padding: 16px 18px; flex: 1; display: flex; flex-direction: column; }

/* KPI */
.dv3-kpi { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: flex-end; }
.dv3-kpi-num {
  font-weight: 600; font-size: 80px; line-height: 0.9;
  letter-spacing: -0.04em; color: var(--dv3-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dv3-kpi-unit { font-size: 16px; color: var(--dv3-text3); margin-left: 8px; font-weight: 400; }
.dv3-kpi-label { font-size: 11px; color: var(--dv3-text3); margin-left: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
@media (max-width: 640px) {
  .dv3-kpi { grid-template-columns: 1fr; }
  .dv3-kpi-num { font-size: 52px; }
}

/* GAUGE */
.dv3-gauge { align-self: flex-start; margin-top: 12px; font-size: 11px; color: var(--dv3-text3); }
.dv3-gauge-bar { letter-spacing: 0.05em; margin: 6px 0; line-height: 1; white-space: nowrap; }
.dv3-gauge-bar--lg { font-size: 13px; letter-spacing: 0; }
.dv3-fill { color: var(--dv3-accent); }
.dv3-dim { color: var(--dv3-border-hi); }
.dv3-gauge-meta { display: flex; justify-content: space-between; font-size: 10px; color: var(--dv3-text3); }
.dv3-gauge-meta strong { color: var(--dv3-text); font-weight: 600; }
.dv3-gauge-meta--mark { position: relative; }
.dv3-gauge-cur { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }

/* ZONE-COLORED KPI */
.dv3-kpi-num--zone-up   { color: var(--dv3-zone-up); }
.dv3-kpi-num--zone-warn { color: var(--dv3-zone-warn); }
.dv3-kpi-num--zone-down { color: var(--dv3-zone-down); }
.dv3-zone-tag {
  display: inline-block; margin-top: 8px;
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600;
}
.dv3-zone-tag--up   { color: var(--dv3-zone-up); }
.dv3-zone-tag--warn { color: var(--dv3-zone-warn); }
.dv3-zone-tag--down { color: var(--dv3-zone-down); }
`
```

- [ ] **Step 2: Verify it type-checks**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS, no errors. (StatCard is not yet imported anywhere — this only confirms the file itself compiles.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/StatCard.tsx
git commit -m "feat: add reusable StatCard component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Wire DashboardPage to StatCard

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`

At this point card CSS exists in BOTH `DASHBOARD_CSS` and `STAT_CARD_CSS` — harmless duplication (identical rules, last wins). Task 3 removes it from `DASHBOARD_CSS`.

- [ ] **Step 1: Update imports**

In `DashboardPage.tsx`, the import of `DASHBOARD_CSS` is currently:

```tsx
import { DASHBOARD_CSS } from './dashboardStyles'
```

Replace with:

```tsx
import { DASHBOARD_CSS } from './dashboardStyles'
import { StatCard, STAT_CARD_CSS, scoreZone } from '../../components/StatCard'
```

- [ ] **Step 2: Remove the local `asciiBar` and `scoreZone` helpers**

Delete this entire block (the `// ── helpers ──` section, lines ~17–32):

```tsx
// ── helpers ─────────────────────────────────────────────────────────────────
function asciiBar(pct: number, width = 22): { fill: string; empty: string } {
  const clamped = Math.max(0, Math.min(1, pct))
  const filled = Math.round(clamped * width)
  return { fill: '█'.repeat(filled), empty: '░'.repeat(width - filled) }
}

// Maps a 0–100 score to a colour zone. null → neutral.
function scoreZone(score: number | null): {
  numClass: string; tagClass: string; labelKey: string | null
} {
  if (score === null) return { numClass: '', tagClass: '', labelKey: null }
  if (score >= 80) return { numClass: 'zone-up', tagClass: 'up', labelKey: 'dashboard.zoneUp' }
  if (score >= 50) return { numClass: 'zone-warn', tagClass: 'warn', labelKey: 'dashboard.zoneNorm' }
  return { numClass: 'zone-down', tagClass: 'down', labelKey: 'dashboard.zoneDown' }
}
```

`scoreZone` is now imported from StatCard; `asciiBar` is no longer needed here.

- [ ] **Step 3: Remove the local `Card` component**

Delete this entire block (the `// ── card shell ──` section, lines ~34–47):

```tsx
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
```

- [ ] **Step 4: Remove the now-unused `*Bar` derived consts**

In the `// ── derived ──` section, delete the four lines that build ASCII bars (StatCard builds its own bar from `gauge.pct`):

```tsx
  const scoreBar = asciiBar(scorePct, 22)
```
```tsx
  const cycleBar = asciiBar(cyclePct, 22)
```
```tsx
  const appealsBar = asciiBar(appealsPct, 22)
```
```tsx
  const notifBar = asciiBar(notifPct, 22)
```
```tsx
  const delegBar = asciiBar(delegPct, 22)
```

Keep `scorePct`, `cyclePct`, `appealsPct`, `notifPct`, `delegPct` — StatCard needs them as `gauge.pct`. Keep the `zone` const (`const zone = scoreZone(scoreWhole)`) — the hero block still uses it via the imported `scoreZone`.

- [ ] **Step 5: Replace the `<style>` injection**

Current line inside `<div className="dv3-terminal">`:

```tsx
      <style>{DASHBOARD_CSS}</style>
```

Replace with:

```tsx
      <style>{DASHBOARD_CSS}</style>
      <style>{STAT_CARD_CSS}</style>
```

- [ ] **Step 6: Replace the grid cards**

Replace the entire content of `<div className="dv3-grid">` — all 5 cards (the `SELF.RATING` Card through the `DELEGATIONS` div) — with:

```tsx
        <div className="dv3-grid">

          {/* SELF.RATING */}
          <div className="dv3-col-4">
            <StatCard
              title="SELF.RATING" id="R01" loading={loading}
              value={scoreWhole} unit="/ 100" zoneScore={scoreWhole}
              gauge={{
                pct: scorePct, variant: 'marker',
                left: '0', right: '100',
                current: scoreWhole !== null ? scoreWhole : '—',
              }}
            />
          </div>

          {/* EVAL.CYCLE.PROGRESS */}
          <div className="dv3-col-4">
            <StatCard
              title="EVAL.CYCLE.PROGRESS" id="P01" loading={loading}
              value={cycleDone}
              unit={`/ ${loading ? PLACEHOLDER : cycleTotal}`}
              label={t('dashboard.evaluationsComplete')}
              gauge={{
                pct: cyclePct, variant: 'meta',
                left: '0%',
                center: <strong>{Math.round(cyclePct * 100)}%</strong>,
                right: '100%',
              }}
            />
          </div>

          {/* APPEALS */}
          <div className="dv3-col-4">
            <StatCard
              title="APPEALS" id="A01" loading={loading}
              value={appealsPending}
              label={t('dashboard.pendingAppeals')}
              onClick={() => navigate('/my-tasks')}
              gauge={{
                pct: appealsPct, variant: 'meta',
                left: '0%',
                center: <><strong>{Math.round(appealsPct * 100)}%</strong> {t('dashboard.ofOpenTasks')}</>,
                right: '100%',
              }}
            />
          </div>

          {/* NOTIFICATIONS */}
          <div className="dv3-col-4">
            <StatCard
              title="NOTIFICATIONS" id="N01"
              value={unreadCount}
              label={t('dashboard.unread')}
              onClick={() => navigate('/notifications')}
              gauge={{
                pct: notifPct, variant: 'meta',
                left: '0',
                center: <><strong>{unreadCount}</strong> / {NOTIF_CAP} {t('dashboard.inbox')}</>,
                right: NOTIF_CAP,
              }}
            />
          </div>

          {/* DELEGATIONS */}
          <div className="dv3-col-4">
            <StatCard
              title="DELEGATIONS" id="D01" loading={loading}
              value={delegActive}
              label={t('dashboard.activeDelegations')}
              gauge={{
                pct: delegPct, variant: 'meta',
                left: '0',
                center: <><strong>{delegActive}</strong> / {delegTotal} {t('dashboard.total')}</>,
                right: delegTotal,
              }}
            />
          </div>

        </div>
```

Note: `NOTIFICATIONS` omits `loading` (its value comes synchronously from Redux — matches the original, which had no loading state on N01).

- [ ] **Step 7: Verify type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS, no errors. If it reports `'React' is declared but never used` or an unused import, remove the now-unused `React` import only if `React` is no longer referenced anywhere in the file (the deleted `Card` used `React.ReactNode`).

- [ ] **Step 8: Verify production build**

Run: `cd frontend && npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 9: Manual check**

Run `cd frontend && npm run dev`, open the dashboard. Confirm: 5 cards render identically to before; SELF.RATING shows zone colour + tag and the marker pin; APPEALS and NOTIFICATIONS are clickable (mouse + Enter + Space) and navigate; loading shows `··` pulse on R01/P01/A01/D01.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx
git commit -m "refactor: render dashboard cards via StatCard component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Remove duplicated card CSS from dashboardStyles.ts

**Files:**
- Modify: `frontend/src/features/dashboard/dashboardStyles.ts`

- [ ] **Step 1: Delete the card/KPI/gauge/zone-KPI CSS block**

In `dashboardStyles.ts`, inside the `DASHBOARD_CSS` template string, delete everything from the `/* CARD */` comment through the `.dv3-zone-tag--down` rule — i.e. this entire block:

```css
/* CARD */
.dv3-card {
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  position: relative;
  display: flex; flex-direction: column;
  text-align: left;
}
.dv3-card::before, .dv3-card::after {
  content: ""; position: absolute; width: 8px; height: 8px; pointer-events: none;
}
.dv3-card::before { top: -1px; left: -1px; border-top: 1px solid var(--dv3-accent); border-left: 1px solid var(--dv3-accent); }
.dv3-card::after { bottom: -1px; right: -1px; border-bottom: 1px solid var(--dv3-accent); border-right: 1px solid var(--dv3-accent); }
.dv3-card-btn { cursor: pointer; font-family: inherit; color: inherit; }
.dv3-card-btn:hover { border-color: var(--dv3-border-hi); }
.dv3-card-btn:focus-visible { outline: 2px solid var(--dv3-accent); outline-offset: 2px; }
.dv3-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg3);
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--dv3-text3);
}
.dv3-card-head strong { color: var(--dv3-text); font-weight: 600; letter-spacing: 0.14em; }
.dv3-card-id { font-size: 9px; color: var(--dv3-text4); letter-spacing: 0.1em; }
.dv3-card-body { padding: 16px 18px; flex: 1; display: flex; flex-direction: column; }

/* KPI */
.dv3-kpi { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: flex-end; }
.dv3-kpi-num {
  font-weight: 600; font-size: 80px; line-height: 0.9;
  letter-spacing: -0.04em; color: var(--dv3-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dv3-kpi-unit { font-size: 16px; color: var(--dv3-text3); margin-left: 8px; font-weight: 400; }
.dv3-kpi-label { font-size: 11px; color: var(--dv3-text3); margin-left: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
@media (max-width: 640px) {
  .dv3-kpi { grid-template-columns: 1fr; }
  .dv3-kpi-num { font-size: 52px; }
}

/* GAUGE */
.dv3-gauge { align-self: flex-start; margin-top: 12px; font-size: 11px; color: var(--dv3-text3); }
.dv3-gauge-bar { letter-spacing: 0.05em; margin: 6px 0; line-height: 1; white-space: nowrap; }
.dv3-gauge-bar--lg { font-size: 13px; letter-spacing: 0; }
.dv3-fill { color: var(--dv3-accent); }
.dv3-dim { color: var(--dv3-border-hi); }
.dv3-gauge-meta { display: flex; justify-content: space-between; font-size: 10px; color: var(--dv3-text3); }
.dv3-gauge-meta strong { color: var(--dv3-text); font-weight: 600; }
.dv3-gauge-meta--mark { position: relative; }
.dv3-gauge-cur { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }

/* ZONE-COLORED KPI */
.dv3-kpi-num--zone-up   { color: var(--dv3-zone-up); }
.dv3-kpi-num--zone-warn { color: var(--dv3-zone-warn); }
.dv3-kpi-num--zone-down { color: var(--dv3-zone-down); }
.dv3-zone-tag {
  display: inline-block; margin-top: 8px;
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600;
}
.dv3-zone-tag--up   { color: var(--dv3-zone-up); }
.dv3-zone-tag--warn { color: var(--dv3-zone-warn); }
.dv3-zone-tag--down { color: var(--dv3-zone-down); }
```

**Keep** the three hero-metric zone rules that immediately follow (these are NOT moved — the hero block still uses them):

```css
.dv3-hero-metric-num--zone-up   { color: var(--dv3-zone-up); }
.dv3-hero-metric-num--zone-warn { color: var(--dv3-zone-warn); }
.dv3-hero-metric-num--zone-down { color: var(--dv3-zone-down); }
```

After deletion, the `/* HERO */` section should follow directly after the three `dv3-hero-metric-num--zone-*` lines. Keep the `/* GRID */` and `/* LOADING */` sections untouched.

- [ ] **Step 2: Verify production build**

Run: `cd frontend && npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 3: Manual check**

Run `cd frontend && npm run dev`, open the dashboard. Confirm cards still render identically — card CSS now comes solely from `STAT_CARD_CSS`. Verify hero metric numbers still show zone colours.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/dashboard/dashboardStyles.ts
git commit -m "refactor: drop card CSS from dashboardStyles, owned by StatCard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- StatCard component + structured-props API → Task 1 ✓
- `STAT_CARD_CSS` export, card CSS extracted → Task 1 (add) + Task 3 (remove from dashboardStyles) ✓
- `asciiBar`/`scoreZone` move into StatCard → Task 1 ✓ (`scoreZone` exported, not private — documented in File Structure note; hero needs it)
- All 5 cards via StatCard, grid-wrapper div → Task 2 ✓
- `dashboardStyles.ts` keeps root/grid/hero/loading → Task 3 keeps them ✓
- Behavior preserved (zone, marker, clickable, loading, notif cap) → Task 2 Step 6 + Step 9 manual ✓
- Testing: spec's `StatCard.test.tsx` dropped — frontend has no test runner; verification is tsc + build + manual (user decision) ✓

**Placeholder scan:** none — all steps contain full code/commands.

**Type consistency:** `StatCardProps`/`StatCardGauge` defined in Task 1 match every `<StatCard>` usage in Task 2. `scoreZone` signature (`number | null | undefined`) accepts `scoreWhole` (`number | null`). `gauge.current` typed `ReactNode` accepts `scoreWhole !== null ? scoreWhole : '—'`.
