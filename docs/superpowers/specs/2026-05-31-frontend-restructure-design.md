# Frontend Restructure Design

**Date:** 2026-05-31
**Scope:** `frontend/src/` full reorganization
**Status:** Approved (design), pending implementation plan

## Goal

Reorganize frontend source tree to:

- Enforce consistent per-feature layout
- Separate cross-cutting infrastructure (`app/`), shared primitives (`shared/`), layout chrome (`layouts/`), and domain features (`features/`)
- Eliminate dead code (legacy files, V1 dashboard, duplicate styles)
- Split 62KB monolithic `index.css` into focused stylesheets
- Establish import boundaries via barrels and ESLint

Non-goals:

- No migration from Redux Toolkit to TanStack Query
- No full Tailwind-only conversion (keep current Tailwind + CSS modules mix)
- No test framework introduction
- No backend changes

## Target Structure

```
src/
├─ app/
│  ├─ api.ts                     # axios instance, interceptors
│  ├─ store.ts                   # Redux store
│  ├─ router.tsx                 # <Routes> extracted from App.tsx
│  ├─ providers/
│  │  ├─ ThemeProvider.tsx
│  │  ├─ I18nProvider.tsx
│  │  ├─ AuthBootstrap.tsx
│  │  ├─ ThemeCustomizer.tsx
│  │  ├─ useTheme.ts
│  │  └─ useDensity.tsx
│  └─ routes/
│     ├─ ProtectedRoute.tsx
│     └─ RoleRoute.tsx           # extracted role-based guard (if present inline)
├─ shared/
│  ├─ ui/                        # Badge, ConfirmDialog, TableCard, StatCard
│  ├─ datapanel/                 # DataPanel, DataTable, ColumnsMenu, etc.
│  ├─ hooks/                     # useOutsideClick, useIdleTimeout
│  ├─ lib/                       # ratingZones, pure utilities
│  └─ types/                     # Pagination, ApiError, shared DTO shapes
├─ layouts/
│  ├─ shell/
│  │  ├─ AppShell.tsx
│  │  ├─ Topbar.tsx
│  │  ├─ NavPanel.tsx
│  │  ├─ IconRail.tsx
│  │  ├─ CommandPalette.tsx
│  │  ├─ NotificationsMenu.tsx
│  │  ├─ LangSwitcher.tsx
│  │  ├─ NavFAB.tsx
│  │  ├─ navConfig.ts
│  │  ├─ navMemory.ts
│  │  ├─ shellUtils.ts
│  │  ├─ useCurrentPeriod.ts
│  │  ├─ useUserCounters.ts
│  │  └─ PageContext.tsx
│  └─ admin/
│     ├─ AdminLayout.tsx
│     ├─ AdminHero.tsx
│     └─ AdminStatsCards.tsx
├─ features/
│  └─ <domain>/
│     ├─ api.ts                  # renamed from <domain>Api.ts
│     ├─ slice.ts                # renamed (only if Redux slice exists)
│     ├─ types.ts                # feature DTOs and enums
│     ├─ hooks/                  # feature-only hooks
│     ├─ components/             # feature-only components
│     ├─ pages/                  # *Page.tsx components
│     └─ index.ts                # barrel — public surface only
├─ styles/
│  ├─ tokens.css                 # CSS vars (colors, spacing, theme)
│  ├─ base.css                   # reset, html/body, typography, scrollbar
│  ├─ utilities.css              # app-specific utility classes
│  └─ index.css                  # entry: @import above + Tailwind directives
├─ App.tsx                       # thin: providers + router
├─ main.tsx
├─ i18n.ts
└─ vite-env.d.ts
```

## File Mapping (old → new)

| Old path | New path |
|---|---|
| `components/ui/*` | `shared/ui/*` |
| `components/stats/StatCard.tsx` | `shared/ui/StatCard.tsx` |
| `components/datapanel/*` | `shared/datapanel/*` |
| `components/shell/*` | `layouts/shell/*` |
| `components/theme/ThemeCustomizer.tsx` | `app/providers/ThemeCustomizer.tsx` |
| `context/PeriodContext.tsx` | `features/periods/PeriodContext.tsx` |
| `context/AdminRangeContext.tsx` | `features/admin/AdminRangeContext.tsx` |
| `context/PageContext.tsx` | `layouts/shell/PageContext.tsx` |
| `hooks/useNotifications.ts` | `features/notifications/hooks/useNotifications.ts` |
| `hooks/useTheme.ts` | `app/providers/useTheme.ts` |
| `hooks/useDensity.tsx` | `app/providers/useDensity.tsx` |
| `hooks/useOutsideClick.ts` | `shared/hooks/useOutsideClick.ts` |
| `hooks/useIdleTimeout.ts` | `shared/hooks/useIdleTimeout.ts` |
| `lib/dashboardPalettes.ts` | `features/dashboard/palettes.ts` |
| `lib/ratingZones.ts` | `shared/lib/ratingZones.ts` |
| `app/ProtectedRoute.tsx` | `app/routes/ProtectedRoute.tsx` |
| `features/admin/AdminLayout.tsx` | `layouts/admin/AdminLayout.tsx` |
| `features/admin/AdminHero.tsx` | `layouts/admin/AdminHero.tsx` |
| `features/admin/AdminStatsCards.tsx` | `layouts/admin/AdminStatsCards.tsx` |
| `features/admin/AdminAppealsPage.tsx` | DELETE — reuse `features/appeals/AppealPage` |
| `features/evaluations/EvaluationFormPage.legacy.tsx` | DELETE |
| `features/dashboard/DashboardPage.tsx` (V1) | DELETE (V3 canonical) |
| `features/dashboard/DashboardPageV3.tsx` | rename → `features/dashboard/pages/DashboardPage.tsx` |
| `features/dashboard/dashboardStyles.ts` + `dv3Styles.ts` + `dv3FormStyles.ts` | merge → `features/dashboard/styles.ts` |
| `features/positions/positionsApi.ts` | `features/org/positionsApi.ts` (or merge into `features/org/api.ts`) |
| `features/<domain>/<domain>Api.ts` | `features/<domain>/api.ts` |
| `features/auth/authSlice.ts` | `features/auth/slice.ts` |
| `features/notifications/notificationsSlice.ts` | `features/notifications/slice.ts` |
| `features/<domain>/<Domain>Page.tsx` | `features/<domain>/pages/<Domain>Page.tsx` |
| `src/index.css` (62KB) | split → `src/styles/{tokens,base,utilities,index}.css` |

## Conventions

### Path alias

Configure `@/` → `src/` in:

- `vite.config.ts` — `resolve.alias`
- `tsconfig.json` — `compilerOptions.paths`

All new imports use `@/` prefix. Existing relative imports rewritten by codemod.

### Per-feature barrel

Each feature exposes a public `index.ts`:

```ts
// features/evaluations/index.ts
export { default as EvaluationsPage } from './pages/EvaluationsPage';
export { default as EvaluationDetailPage } from './pages/EvaluationDetailPage';
export { default as EvaluationFormPage } from './pages/EvaluationFormPage';
export { default as MyTasksPage } from './pages/MyTasksPage';
export type { Evaluation, EvaluationStatus } from './types';
```

### Import boundary rule

ESLint `no-restricted-imports`:

- Allowed: `@/features/<x>` (barrel)
- Forbidden: `@/features/<x>/pages/...`, `@/features/<x>/components/...` (deep import) from outside that feature
- Same-feature relative imports unrestricted

Phase 6 flips this rule from `warn` to `error`.

### Naming

- Pages: `<Name>Page.tsx` in `pages/`
- API module: `api.ts`
- Slice: `slice.ts`
- Types: `types.ts`
- No version suffixes (`V2`, `V3`) — canonical name wins, legacy deleted

## CSS Split

Current `index.css` is 62KB and contains theme tokens, base resets, custom utilities, and ad-hoc component styles intermixed.

Split into:

- `styles/tokens.css` — CSS custom properties (colors, spacing, radii, shadows, dark/light theme vars)
- `styles/base.css` — resets, html/body, font setup, scrollbar styling, focus styles
- `styles/utilities.css` — app-specific utility classes not covered by Tailwind
- `styles/index.css` — entry point: `@import './tokens.css'; @import './base.css'; @tailwind base; @tailwind components; @tailwind utilities; @import './utilities.css';`

Component-scoped `*.module.css` files stay colocated with their components — no change.

## Migration Phases

Each phase is independently shippable. Run `npx tsc --noEmit` and `npm run build` after every phase. Manual smoke: login, dashboard, admin, evaluations, analytics.

### Phase 1 — Dead code removal

- Delete `EvaluationFormPage.legacy.tsx`
- Verify routes reference `DashboardPageV3`; delete `DashboardPage.tsx` (V1)
- Rename `DashboardPageV3.tsx` → `DashboardPage.tsx`
- Merge `dashboardStyles.ts`, `dv3Styles.ts`, `dv3FormStyles.ts` → single `styles.ts`
- Decide fate of `features/positions/` (only contains `positionsApi.ts`): if imported, move to `features/org/`; if unused, delete

### Phase 2 — Path alias and ESLint scaffold

- Add `@/` alias in `vite.config.ts` + `tsconfig.json`
- Add ESLint `no-restricted-imports` rule with feature barrel patterns (severity: `warn`)
- Codemod existing imports to `@/` form (optional — can be incremental)

### Phase 3 — Shared and layouts extraction

- `git mv` `components/ui` → `shared/ui`
- `git mv` `components/stats/StatCard.tsx` → `shared/ui/StatCard.tsx`
- `git mv` `components/datapanel` → `shared/datapanel`
- `git mv` `components/shell` → `layouts/shell`
- `git mv` `components/theme/ThemeCustomizer.tsx` → `app/providers/`
- Move `hooks/`, `lib/`, `context/` per file mapping table
- Move admin layout pieces to `layouts/admin/`
- Fix imports (codemod + manual cleanup)
- Delete now-empty `components/`, `context/` if empty

### Phase 4 — Feature normalization

Per feature:

- Create `pages/`, `components/` (if needed), `hooks/` (if needed) subfolders
- Move `*Page.tsx` files into `pages/`
- Rename `<domain>Api.ts` → `api.ts`
- Rename slice files → `slice.ts`
- Extract inline DTOs/enums to `types.ts`
- Add `index.ts` barrel

Order (low risk first): `settings`, `positions` (merge into org), `calendar`, `appeals`, `notifications`, `auth`, `criteria`, `periods`, `users`, `org`, `evaluations`, `analytics`, `dashboard`, `admin`.

Dedupe `AdminAppealsPage` against `features/appeals/AppealPage` — admin variant should import shared logic, not duplicate.

### Phase 5 — CSS split

- Read `src/index.css`, categorize blocks
- Carve into `styles/tokens.css`, `styles/base.css`, `styles/utilities.css`
- Move entry to `styles/index.css`
- Update `main.tsx` import path
- Verify dark/light theme toggle still works
- Verify all Tailwind directives intact

### Phase 6 — Barrel enforcement

- Flip ESLint rule severity `warn` → `error`
- Run `npx eslint src/` — fix all violations
- Forbid direct deep imports across feature boundaries
- Commit final rule

## Git Hygiene

- Use `git mv` for every move to preserve blame
- One phase per commit (or per logical group within a phase)
- Commit message format follows project convention (Conventional Commits, ru/kg-aware where applicable)
- No `--no-verify`, no force pushes

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Broken imports after move | Codemod per move; `tsc --noEmit` after each |
| Lost git history | Use `git mv` exclusively |
| Vite HMR cache stale | Restart dev server between phases |
| Route references deleted page | Grep routes after each delete |
| CSS regression after split | Manual visual smoke on dashboard, admin, login |
| ESLint rule too aggressive early | Start as `warn`, promote to `error` only in Phase 6 |
| AdminAppealsPage dedupe breaks admin flow | Keep behavior parity; admin reuses appeals feature components via barrel |

## Verification Per Phase

- `npx tsc --noEmit` — zero errors
- `npm run build` — succeeds
- Manual smoke flow:
  1. Login as admin
  2. Open dashboard, verify panels render
  3. Open admin → users, periods, audit, monitoring
  4. Open evaluations → list, detail, form
  5. Open analytics pages
  6. Toggle theme dark/light, toggle language ru/kg
- Browser console — no new errors or 404s on static assets

## Out of Scope

- Backend changes
- API contract changes
- Redux → TanStack Query migration
- Tailwind-only refactor
- Test framework introduction
- Storybook
- New features

## Next Steps

1. User reviews this spec.
2. On approval, invoke `superpowers:writing-plans` to produce a phase-by-phase implementation plan with concrete file lists, codemod scripts, and verification commands.
3. Execute phases sequentially via `superpowers:executing-plans`.
