# Global Table Density — Design

**Date:** 2026-05-15
**Status:** Approved

## Problem

Table row density is inconsistent across the app. The shared `DataTable` component
supports two density modes (`comfortable`, `compact`), but:

- Several tables hardcode `density="compact"` (AntiBonus top-10, Hierarchical
  analytics, Criteria bulk-edit preview) while the rest use the default
  `comfortable`.
- `UserTable` has its own separate density picker in `UsersFilters`, independent
  of `DataTable`.

There is no single, user-controlled density setting. Users cannot pick their
preferred row density, and tables do not look the same.

## Goal

One global density preference, selected by the user, applied identically to
**every** table in the app. Persisted client-side, switchable from the account
menu — the same surface and pattern as the existing theme toggle.

## Decisions (locked)

| Question | Decision |
|---|---|
| Selector location | IconRail account menu, next to the theme toggle |
| Persistence | `localStorage`, key `gfh_density` (mirrors `gfh_theme`) |
| Density options | `comfortable` / `compact` (no third mode) |
| UserTable local picker | Removed — UserTable obeys the global setting |

## Approach

Context provider (chosen over prop threading and a CSS `data-density` attribute).
A React context is the single source of truth; `DataTable` reads it directly, so
no page needs to thread a `density` prop and tables cannot drift apart.

## Components

### 1. `useDensity` hook — `src/hooks/useDensity.ts`

Mirrors `useTheme` structure:

- `safeGet` / `safeSet` localStorage helpers (try/catch — Safari private mode).
- Storage key: `gfh_density`.
- Valid values: `'comfortable' | 'compact'`. Default `'comfortable'` when unset
  or invalid.
- Cross-tab sync: `storage` event listener updates state when another tab
  changes `gfh_density`.
- Returns `{ density, setDensity }`. `setDensity` writes through to localStorage
  immediately (unlike theme, there is no OS-follow behaviour — density is always
  an explicit value, so it always persists).

The `Density` type is owned by `DataTable.tsx` (already exported there). The hook
imports it from `DataTable` to avoid a duplicate definition.

### 2. `DensityContext` + `DensityProvider` — `src/hooks/useDensity.ts`

- `DensityContext` — React context of `{ density, setDensity }`.
- `DensityProvider` — calls `useDensity()`, supplies the context value.
- Default context value: `{ density: 'comfortable', setDensity: noop }` so a
  `DataTable` rendered outside the provider still works (defensive; the provider
  wraps the whole app in practice).
- Mounted in `App.tsx` (or `main.tsx`) wrapping the app tree, alongside existing
  providers.

### 3. `DataTable` change — `src/components/DataTable.tsx`

- The `density` prop becomes **optional**.
- When omitted, `DataTable` reads `density` from `DensityContext`.
- When passed explicitly, the prop wins (override escape hatch — not used by any
  table after this change, but kept for flexibility).
- No change to the `DENSITY` token table or rendering logic.

### 4. Account-menu density selector — `src/components/shell/IconRail.tsx`

- A segmented control with two options: Comfortable | Compact.
- Placed in the account dropdown menu next to the theme toggle, styled
  consistently with it.
- Calls `setDensity` from `useDensity()` (or the context).
- Accessible: `role="radiogroup"` / `radio`, or grouped buttons with
  `aria-pressed`. Keyboard operable.

### 5. UserTable / UsersFilters cleanup

- Remove the density picker UI from `UsersFilters`.
- Remove the `density` state and prop plumbing for UserTable in the users page.
- `UserTable` reads global density: either via `DataTable`'s context (if UserTable
  is migrated to `DataTable`) or directly via `useDensity()`. **UserTable is NOT
  migrated to `DataTable` in this work** — it keeps its bespoke markup but sources
  its density token from the global hook instead of a local prop.
- Consolidate the `Density` type: delete the local definition in
  `users/components/UsersFilters.tsx` (and `usersMeta` if present); import the
  exported `Density` from `DataTable.tsx`.

### 6. Remove hardcoded density props

Delete the explicit `density="compact"` prop from every `DataTable` usage so all
tables obey the global setting:

- `AntiBonusAnalyticsPage.tsx` — top-10 table
- `HierarchicalAnalyticsPage.tsx` — analytics table
- `CriteriaPage.tsx` — bulk-edit preview table

No other table passes `density` explicitly.

### 7. i18n

Add translation keys to `public/locales/ru/translation.json` and
`public/locales/kg/translation.json`:

- `prefs.density` — section/label ("Плотность" / kg)
- `prefs.density.comfortable` — "Просторно" / kg
- `prefs.density.compact` — "Компактно" / kg

(Exact key namespace to match existing menu/i18n conventions in `IconRail`.)

## Data Flow

```
localStorage(gfh_density)
        │  read on mount / storage event
        ▼
   useDensity()  ──►  DensityProvider  ──►  DensityContext
        ▲                                        │
        │ setDensity                             │ useContext
   IconRail selector                       DataTable (all tables)
                                           UserTable (via useDensity)
```

## Tables Affected (must all look identical after)

`MyEvaluations`-area aside, the `DataTable`-based tables: ManagerDashboard
subordinates, AuditLog, AdminMonitoring, Criteria list, Criteria bulk preview,
Calendar special days, AntiBonus top-10, Hierarchical analytics — plus
`UserTable`. All read one density value.

## Error Handling / Edge Cases

- localStorage unavailable (Safari private mode) — `safeGet`/`safeSet` swallow
  errors; density falls back to in-memory state defaulting to `comfortable`.
- Invalid stored value — treated as unset, default `comfortable`.
- `DataTable` rendered outside `DensityProvider` — default context value keeps it
  working at `comfortable`.
- Cross-tab change — `storage` listener syncs all open tabs.

## Testing

- `useDensity`: default value, persists on `setDensity`, reads existing stored
  value, ignores invalid stored value, cross-tab `storage` event updates state.
- `DataTable`: renders at context density when no prop; explicit prop overrides
  context.
- Manual: switch density in the account menu → every listed table updates;
  reload → preference retained; second tab → syncs.

## Out of Scope

- Migrating `UserTable` to `DataTable` (separate effort).
- A third "spacious" density mode.
- Server-side / cross-device persistence.
- Per-page density overrides in the UI.
