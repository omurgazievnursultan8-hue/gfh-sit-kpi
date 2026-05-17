# StatCard Component — Design

**Date:** 2026-05-17
**Status:** Approved

## Problem

`DashboardPage.tsx` renders 5 stat cards (R01–D01). Two use a local `Card`
component; three duplicate `dv3-card` markup inline because `Card` has no
`onClick` and renders a non-clickable `<section>`. Helper functions `asciiBar`
and `scoreZone` live in the page file. No reusable stat card exists — every
feature page rolls its own `Card`.

## Goal

Extract one reusable `StatCard` component covering the 5 dashboard stat cards.
Out of scope: evaluations/analytics container `Card`s (they wrap lists, not
stats) and `DashboardInsights` `CardShell`.

## The 5 cards & their variations

| ID  | Card               | Unit    | Zone | Inline label | Gauge variant | Clickable |
|-----|--------------------|---------|------|--------------|---------------|-----------|
| R01 | SELF.RATING        | `/ 100` | yes  | no           | marker (pin)  | no        |
| P01 | EVAL.CYCLE.PROGRESS| `/ N`   | no   | yes          | meta (3-span) | no        |
| A01 | APPEALS            | none    | no   | yes          | meta          | → /my-tasks      |
| N01 | NOTIFICATIONS      | none    | no   | yes          | meta          | → /notifications |
| D01 | DELEGATIONS        | none    | no   | yes          | meta          | no        |

## Component API

New file: `src/components/StatCard.tsx`

```tsx
interface StatCardGauge {
  pct: number                     // 0..1, internally clamped
  variant: 'marker' | 'meta'
  left: ReactNode
  right: ReactNode
  center?: ReactNode              // 'meta' variant only
  current?: number | string       // 'marker' variant pin value
}

interface StatCardProps {
  title: string
  id: string                      // rendered as [ id ] in header
  loading?: boolean
  value: number | string | null
  placeholder?: string            // shown while loading; default '··'
  emptyValue?: string             // shown when value === null; default '—'
  unit?: string                   // e.g. '/ 100', '/ 12'
  label?: string                  // inline uppercase label after number
  zoneScore?: number | null       // present → number color + zone tag
  gauge: StatCardGauge
  onClick?: () => void            // present → clickable div + keydown handler
}
```

### Behavior

- `loading` true → number shows `placeholder`, gets `dv3-loading` pulse class.
- `value === null` (not loading) → shows `emptyValue`.
- `zoneScore` present → maps via internal `scoreZone`: ≥80 up, ≥50 warn, else
  down. Drives number color class + renders zone tag below number. `null` or
  absent → neutral, no tag.
- `onClick` present → root is a `<div role="button" tabIndex={0}>` with
  `dv3-card-btn` class; Enter and Space trigger `onClick` (Space calls
  `preventDefault`). Absent → root is `<section>`.
- Gauge `variant: 'marker'` → ASCII bar + `dv3-gauge-meta--mark` row with
  positioned `dv3-gauge-cur` pin at `pct * 100%`, showing `current`.
- Gauge `variant: 'meta'` → ASCII bar + 3-span row: `left` / `center` / `right`.

### Internal helpers

`asciiBar` and `scoreZone` move from `DashboardPage.tsx` into `StatCard.tsx`
as module-private functions. `asciiBar` width fixed at 22 (current value).

## CSS ownership

- `STAT_CARD_CSS` exported from `StatCard.tsx`: card shell, corner marks,
  `dv3-card-btn`, card head, KPI number/unit/label, gauge, zone tag/colors.
- `dashboardStyles.ts` keeps: `:root` / `.dv3-root` vars, `.dv3-loading`,
  grid (`dv3-grid`, `dv3-col-*`), hero block.
- Class names stay `dv3-*`; CSS vars stay `--dv3-*`. StatCard always renders
  inside `.dv3-root`, so var resolution is unchanged.
- `DashboardPage` injects both strings once: `<style>{DASHBOARD_CSS}</style>`
  and `<style>{STAT_CARD_CSS}</style>`.

## DashboardPage changes

- Remove local `Card`, `asciiBar`, `scoreZone`.
- Keep all derive logic (scorePct, cyclePct, appealsPct, notifPct, delegPct,
  zone, etc.) and the data-fetch effect.
- Render 5 `<StatCard>` inside `dv3-grid`, each wrapped in a `dv3-col-4` —
  grid column class stays on a wrapper, not StatCard (StatCard is layout-
  agnostic). Alternatively pass a `className` for the column; design choice:
  **wrapper div** to keep StatCard free of grid concerns.

## Testing

`src/components/StatCard.test.tsx`:

- zone tag renders for `zoneScore` ≥ 80; absent when `zoneScore` undefined.
- number color class matches zone (up/warn/down).
- `loading` → shows `placeholder`, no zone tag.
- `value === null` → shows `emptyValue`.
- `onClick` fires on Enter and on Space.
- `marker` variant: pin element positioned at `pct * 100%`.
- `meta` variant: renders left/center/right.

## Files touched

| File | Change |
|------|--------|
| `src/components/StatCard.tsx` | new — component + `STAT_CARD_CSS` + helpers |
| `src/components/StatCard.test.tsx` | new — variant tests |
| `src/features/dashboard/dashboardStyles.ts` | remove card/kpi/gauge/zone CSS |
| `src/features/dashboard/DashboardPage.tsx` | use StatCard; drop Card/helpers |

## Non-goals

- Unifying evaluations/analytics `Card`s or `DashboardInsights` `CardShell`.
- Changing card visuals, copy, or data sources.
- Fixing pre-existing dashboard issues (notif cap overflow, gauge semantics).
