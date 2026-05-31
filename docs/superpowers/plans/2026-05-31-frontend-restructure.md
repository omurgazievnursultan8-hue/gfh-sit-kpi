# Frontend Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `frontend/src/` into `app/ + shared/ + layouts/ + features/` with consistent per-feature layout, dead-code removal, and split CSS — without changing user-visible behavior.

**Architecture:** Move-only refactor preserving git blame via `git mv`. Five phases, each independently shippable. Verification after each phase: `npx tsc --noEmit` + `npm run build` + manual smoke. Path alias `@/` already configured.

**Tech Stack:** React 18, TypeScript, Vite, Redux Toolkit, Tailwind, react-i18next.

**Spec:** `docs/superpowers/specs/2026-05-31-frontend-restructure-design.md`

**Working directory for every command:** `frontend/` (unless noted).

---

## Phase 1 — Dead Code Removal

Removes legacy/V1 files and consolidates duplicate dashboard styles before any moves. Lowest risk; sets clean baseline.

### Task 1.1: Delete legacy evaluation form

**Files:**
- Delete: `frontend/src/features/evaluations/EvaluationFormPage.legacy.tsx`

- [ ] **Step 1: Verify file is not imported anywhere**

Run: `cd frontend && grep -rn "EvaluationFormPage.legacy\|FormPage\.legacy" src/`
Expected: only the file itself appears, or no results.

- [ ] **Step 2: Delete file**

Run: `cd frontend && git rm src/features/evaluations/EvaluationFormPage.legacy.tsx`

- [ ] **Step 3: Type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(frontend): drop legacy EvaluationFormPage"
```

### Task 1.2: Delete V1 dashboard and its route

**Files:**
- Delete: `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/App.tsx` (remove V1 import + `/dashboard-v1` route)

- [ ] **Step 1: Confirm V1 only referenced from App.tsx**

Run: `cd frontend && grep -rn "from.*dashboard/DashboardPage'\|features/dashboard/DashboardPage\"" src/`
Expected: only `src/App.tsx` line 15.

- [ ] **Step 2: Remove import + route in App.tsx**

In `frontend/src/App.tsx`:
- Delete line 15: `import { DashboardPage } from './features/dashboard/DashboardPage'`
- Delete the `/dashboard-v1` route (line 58): `<Route path="/dashboard-v1" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />`

- [ ] **Step 3: Delete V1 file**

Run: `cd frontend && git rm src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 4: Type check + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(frontend): remove V1 DashboardPage and /dashboard-v1 route"
```

### Task 1.3: Rename DashboardPageV3 → DashboardPage

**Files:**
- Rename: `frontend/src/features/dashboard/DashboardPageV3.tsx` → `frontend/src/features/dashboard/DashboardPage.tsx`
- Modify: `frontend/src/App.tsx` (update import + JSX usage)
- Modify: any other importers of `DashboardPageV3`

- [ ] **Step 1: Find all importers of DashboardPageV3**

Run: `cd frontend && grep -rn "DashboardPageV3" src/`

- [ ] **Step 2: `git mv` rename**

Run: `cd frontend && git mv src/features/dashboard/DashboardPageV3.tsx src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 3: Inside the renamed file, rename the export**

Edit `frontend/src/features/dashboard/DashboardPage.tsx`:
- Replace `export function DashboardPageV3` → `export function DashboardPage`
- Replace `export const DashboardPageV3` → `export const DashboardPage` (whichever form exists)
- Replace any internal self-references `DashboardPageV3` → `DashboardPage`

- [ ] **Step 4: Update App.tsx import + usage**

In `frontend/src/App.tsx`:
- Change `import { DashboardPageV3 } from './features/dashboard/DashboardPageV3'` → `import { DashboardPage } from './features/dashboard/DashboardPage'`
- Change `<DashboardPageV3 />` → `<DashboardPage />`

- [ ] **Step 5: Update any other importers found in Step 1**

Apply the same rename across each file.

- [ ] **Step 6: Type check + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 7: Manual smoke**

Start dev: `./scripts/dev-start.sh`. Open `http://localhost:5173/dashboard`. Verify dashboard renders identically.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(frontend): rename DashboardPageV3 to canonical DashboardPage"
```

### Task 1.4: Merge dashboard style modules

**Files:**
- Modify: `frontend/src/features/dashboard/dashboardStyles.ts`
- Delete: `frontend/src/features/dashboard/dv3Styles.ts`
- Delete: `frontend/src/features/dashboard/dv3FormStyles.ts`
- Modify: all importers of `dv3Styles` / `dv3FormStyles`

- [ ] **Step 1: Inventory exports**

Run: `cd frontend && grep -n "^export" src/features/dashboard/dashboardStyles.ts src/features/dashboard/dv3Styles.ts src/features/dashboard/dv3FormStyles.ts`

- [ ] **Step 2: Find all importers**

Run: `cd frontend && grep -rn "from.*dashboard/dv3Styles\|from.*dashboard/dv3FormStyles\|from.*dashboard/dashboardStyles" src/`

- [ ] **Step 3: Append dv3Styles + dv3FormStyles exports into dashboardStyles.ts**

Copy all exported symbols from `dv3Styles.ts` and `dv3FormStyles.ts` into `dashboardStyles.ts`. Rename if names collide (prefix collisions with `form_` for form-only versions).

- [ ] **Step 4: Rename file to plain `styles.ts`**

Run: `cd frontend && git mv src/features/dashboard/dashboardStyles.ts src/features/dashboard/styles.ts`

- [ ] **Step 5: Update all importers**

Rewrite imports in every file found in Step 2 to `from './styles'` (or `from '@/features/dashboard/styles'` for cross-feature).

- [ ] **Step 6: Delete the now-empty source files**

Run: `cd frontend && git rm src/features/dashboard/dv3Styles.ts src/features/dashboard/dv3FormStyles.ts`

- [ ] **Step 7: Type check + build + smoke**

Run: `cd frontend && npx tsc --noEmit && npm run build`. Then load `/dashboard` in browser; verify visual parity.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(frontend): merge dv3 styles into dashboard styles"
```

### Task 1.5: Move positionsApi into features/org

**Files:**
- Move: `frontend/src/features/positions/positionsApi.ts` → `frontend/src/features/org/positionsApi.ts`
- Delete: empty `frontend/src/features/positions/` directory
- Modify: `frontend/src/features/users/components/UserFormModal.tsx` (line 7)
- Modify: `frontend/src/features/org/OrgUnitDetailPage.tsx` (line 7)

- [ ] **Step 1: `git mv` the API file**

Run: `cd frontend && git mv src/features/positions/positionsApi.ts src/features/org/positionsApi.ts`

- [ ] **Step 2: Update importers**

In `frontend/src/features/users/components/UserFormModal.tsx` line 7:
- Change `import { positionsApi, Position } from '../../positions/positionsApi'` → `import { positionsApi, Position } from '../../org/positionsApi'`

In `frontend/src/features/org/OrgUnitDetailPage.tsx` line 7:
- Change `import { positionsApi, type Position } from '../positions/positionsApi'` → `import { positionsApi, type Position } from './positionsApi'`

- [ ] **Step 3: Remove empty positions directory**

Run: `cd frontend && rmdir src/features/positions 2>/dev/null || true`

- [ ] **Step 4: Verify no stale references**

Run: `cd frontend && grep -rn "features/positions\|/positions/positionsApi" src/`
Expected: zero matches.

- [ ] **Step 5: Type check + build + smoke**

Run: `cd frontend && npx tsc --noEmit && npm run build`. Open Users page; open Org Unit detail; verify positions still load.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(frontend): move positionsApi into features/org"
```

---

## Phase 2 — Shared and Layouts Extraction

Move cross-cutting code out of `components/`, `hooks/`, `lib/`, `context/` into `shared/`, `layouts/`, `app/providers/`, `app/routes/`. Pure file moves with import rewrites.

### Task 2.1: Extract shared/ui

**Files:**
- Move all of `frontend/src/components/ui/*` → `frontend/src/shared/ui/`
- Move `frontend/src/components/stats/StatCard.tsx` → `frontend/src/shared/ui/StatCard.tsx`

- [ ] **Step 1: Create destination**

Run: `cd frontend && mkdir -p src/shared/ui`

- [ ] **Step 2: Move files via git mv**

```bash
cd frontend
git mv src/components/ui/Badge.tsx src/shared/ui/Badge.tsx
git mv src/components/ui/ConfirmDialog.tsx src/shared/ui/ConfirmDialog.tsx
git mv src/components/ui/TableCard.tsx src/shared/ui/TableCard.tsx
git mv src/components/stats/StatCard.tsx src/shared/ui/StatCard.tsx
rmdir src/components/ui src/components/stats 2>/dev/null || true
```

- [ ] **Step 3: Find and rewrite importers**

Run: `cd frontend && grep -rln "components/ui/\|components/stats/" src/`

For each match, rewrite imports:
- `components/ui/Badge` → `@/shared/ui/Badge`
- `components/ui/ConfirmDialog` → `@/shared/ui/ConfirmDialog`
- `components/ui/TableCard` → `@/shared/ui/TableCard`
- `components/stats/StatCard` → `@/shared/ui/StatCard`

Use codemod:
```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|components/ui/Badge|@/shared/ui/Badge|g" \
    -e "s|components/ui/ConfirmDialog|@/shared/ui/ConfirmDialog|g" \
    -e "s|components/ui/TableCard|@/shared/ui/TableCard|g" \
    -e "s|components/stats/StatCard|@/shared/ui/StatCard|g"
```

Then fix any leftover relative imports (`../../components/...`) that the sed missed by running another grep and editing manually.

- [ ] **Step 4: Type check + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(frontend): extract shared/ui from components/{ui,stats}"
```

### Task 2.2: Extract shared/datapanel

**Files:**
- Move `frontend/src/components/datapanel/*` → `frontend/src/shared/datapanel/`

- [ ] **Step 1: Move directory**

```bash
cd frontend
mkdir -p src/shared/datapanel
git mv src/components/datapanel/* src/shared/datapanel/
rmdir src/components/datapanel
```

- [ ] **Step 2: Rewrite importers**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' -o -name '*.css' | \
  xargs sed -i "s|components/datapanel|@/shared/datapanel|g"
```

Manually fix any relative `../../components/datapanel` paths grep finds.

- [ ] **Step 3: Verify**

Run: `cd frontend && grep -rn "components/datapanel" src/`
Expected: zero matches.

- [ ] **Step 4: Type check + build + smoke**

Run: `cd frontend && npx tsc --noEmit && npm run build`. Load any list page (Users, Periods) to verify DataPanel renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(frontend): extract shared/datapanel from components/datapanel"
```

### Task 2.3: Extract layouts/shell

**Files:**
- Move all of `frontend/src/components/shell/*` → `frontend/src/layouts/shell/`
- Move `frontend/src/context/PageContext.tsx` → `frontend/src/layouts/shell/PageContext.tsx`

- [ ] **Step 1: Move shell directory**

```bash
cd frontend
mkdir -p src/layouts/shell
git mv src/components/shell/* src/layouts/shell/
git mv src/context/PageContext.tsx src/layouts/shell/PageContext.tsx
rmdir src/components/shell
```

- [ ] **Step 2: Rewrite importers**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|components/shell|@/layouts/shell|g" \
    -e "s|from '\\(\\.\\./\\)*context/PageContext'|from '@/layouts/shell/PageContext'|g"
```

Manually fix any leftover relatives.

- [ ] **Step 3: Verify + smoke**

Run: `cd frontend && grep -rn "components/shell\|context/PageContext" src/`
Expected: zero matches.

Then: `npx tsc --noEmit && npm run build`. Load any page; verify Topbar, NavPanel, IconRail, CommandPalette work.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(frontend): move shell to layouts/shell, PageContext to layouts/shell"
```

### Task 2.4: Extract layouts/admin

**Files:**
- Move `frontend/src/features/admin/AdminLayout.tsx` → `frontend/src/layouts/admin/AdminLayout.tsx`
- Move `frontend/src/features/admin/AdminHero.tsx` → `frontend/src/layouts/admin/AdminHero.tsx`
- Move `frontend/src/features/admin/AdminStatsCards.tsx` → `frontend/src/layouts/admin/AdminStatsCards.tsx`
- Move `frontend/src/context/AdminRangeContext.tsx` → `frontend/src/layouts/admin/AdminRangeContext.tsx`

- [ ] **Step 1: Move files**

```bash
cd frontend
mkdir -p src/layouts/admin
git mv src/features/admin/AdminLayout.tsx src/layouts/admin/AdminLayout.tsx
git mv src/features/admin/AdminHero.tsx src/layouts/admin/AdminHero.tsx
git mv src/features/admin/AdminStatsCards.tsx src/layouts/admin/AdminStatsCards.tsx
git mv src/context/AdminRangeContext.tsx src/layouts/admin/AdminRangeContext.tsx
```

- [ ] **Step 2: Rewrite importers**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/admin/AdminLayout|@/layouts/admin/AdminLayout|g" \
    -e "s|features/admin/AdminHero|@/layouts/admin/AdminHero|g" \
    -e "s|features/admin/AdminStatsCards|@/layouts/admin/AdminStatsCards|g" \
    -e "s|context/AdminRangeContext|@/layouts/admin/AdminRangeContext|g"
```

Fix any leftover relative imports manually (grep first).

- [ ] **Step 3: Verify + smoke**

Run: `cd frontend && grep -rn "features/admin/AdminLayout\|features/admin/AdminHero\|features/admin/AdminStatsCards\|context/AdminRangeContext" src/`
Expected: zero matches.

Run: `npx tsc --noEmit && npm run build`. Load `/admin` and `/admin/users`; verify admin chrome.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(frontend): extract layouts/admin from features/admin"
```

### Task 2.5: Extract app/providers and app/routes

**Files:**
- Move `frontend/src/components/theme/ThemeCustomizer.tsx` → `frontend/src/app/providers/ThemeCustomizer.tsx`
- Move `frontend/src/hooks/useTheme.ts` → `frontend/src/app/providers/useTheme.ts`
- Move `frontend/src/hooks/useDensity.tsx` → `frontend/src/app/providers/useDensity.tsx`
- Move `frontend/src/app/ProtectedRoute.tsx` → `frontend/src/app/routes/ProtectedRoute.tsx`

- [ ] **Step 1: Move files**

```bash
cd frontend
mkdir -p src/app/providers src/app/routes
git mv src/components/theme/ThemeCustomizer.tsx src/app/providers/ThemeCustomizer.tsx
git mv src/hooks/useTheme.ts src/app/providers/useTheme.ts
git mv src/hooks/useDensity.tsx src/app/providers/useDensity.tsx
git mv src/app/ProtectedRoute.tsx src/app/routes/ProtectedRoute.tsx
rmdir src/components/theme 2>/dev/null || true
```

- [ ] **Step 2: Rewrite importers**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|components/theme/ThemeCustomizer|@/app/providers/ThemeCustomizer|g" \
    -e "s|hooks/useTheme|@/app/providers/useTheme|g" \
    -e "s|hooks/useDensity|@/app/providers/useDensity|g" \
    -e "s|app/ProtectedRoute|@/app/routes/ProtectedRoute|g"
```

Manually fix relative `./ProtectedRoute` import inside `App.tsx` (sed pattern above misses it):

In `frontend/src/App.tsx` find the line importing `ProtectedRoute` and change to `import { ProtectedRoute } from '@/app/routes/ProtectedRoute'`.

- [ ] **Step 3: Verify + smoke**

Run: `cd frontend && grep -rn "components/theme\|hooks/useTheme\|hooks/useDensity\|app/ProtectedRoute" src/`
Expected: zero matches.

Run: `npx tsc --noEmit && npm run build`. Open Theme Customizer; toggle density; verify route guards.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(frontend): extract app/providers (theme, density, customizer) and app/routes"
```

### Task 2.6: Extract shared/hooks

**Files:**
- Move `frontend/src/hooks/useOutsideClick.ts` → `frontend/src/shared/hooks/useOutsideClick.ts`
- Move `frontend/src/hooks/useIdleTimeout.ts` → `frontend/src/shared/hooks/useIdleTimeout.ts`

- [ ] **Step 1: Move files**

```bash
cd frontend
mkdir -p src/shared/hooks
git mv src/hooks/useOutsideClick.ts src/shared/hooks/useOutsideClick.ts
git mv src/hooks/useIdleTimeout.ts src/shared/hooks/useIdleTimeout.ts
```

- [ ] **Step 2: Rewrite importers**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|hooks/useOutsideClick|@/shared/hooks/useOutsideClick|g" \
    -e "s|hooks/useIdleTimeout|@/shared/hooks/useIdleTimeout|g"
```

- [ ] **Step 3: Type check + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(frontend): extract shared/hooks (useOutsideClick, useIdleTimeout)"
```

### Task 2.7: Move feature-owned hooks/context

**Files:**
- Move `frontend/src/hooks/useNotifications.ts` → `frontend/src/features/notifications/hooks/useNotifications.ts`
- Move `frontend/src/context/PeriodContext.tsx` → `frontend/src/features/periods/PeriodContext.tsx`

- [ ] **Step 1: Move files**

```bash
cd frontend
mkdir -p src/features/notifications/hooks
git mv src/hooks/useNotifications.ts src/features/notifications/hooks/useNotifications.ts
git mv src/context/PeriodContext.tsx src/features/periods/PeriodContext.tsx
rmdir src/hooks src/context 2>/dev/null || true
```

- [ ] **Step 2: Rewrite importers**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|hooks/useNotifications|@/features/notifications/hooks/useNotifications|g" \
    -e "s|context/PeriodContext|@/features/periods/PeriodContext|g"
```

- [ ] **Step 3: Verify**

Run: `cd frontend && grep -rn "^import.*from.*'\\.\\./.*/hooks/useNotifications\|context/PeriodContext" src/`
Expected: zero matches.

Run: `cd frontend && ls src/hooks src/context 2>/dev/null` — directories should be gone.

- [ ] **Step 4: Type check + build + smoke**

Run: `npx tsc --noEmit && npm run build`. Verify notifications bell + period selector still work.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(frontend): move useNotifications and PeriodContext to their features"
```

### Task 2.8: Move lib into proper homes

**Files:**
- Move `frontend/src/lib/dashboardPalettes.ts` → `frontend/src/features/dashboard/palettes.ts`
- Move `frontend/src/lib/ratingZones.ts` → `frontend/src/shared/lib/ratingZones.ts`

- [ ] **Step 1: Verify cross-feature usage of ratingZones**

Run: `cd frontend && grep -rn "ratingZones" src/`

If only one feature uses it, keep it inside that feature instead. If two or more features use it, keep the `shared/lib/` destination.

- [ ] **Step 2: Move files**

```bash
cd frontend
mkdir -p src/shared/lib
git mv src/lib/dashboardPalettes.ts src/features/dashboard/palettes.ts
git mv src/lib/ratingZones.ts src/shared/lib/ratingZones.ts
rmdir src/lib 2>/dev/null || true
```

- [ ] **Step 3: Rewrite importers**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|lib/dashboardPalettes|@/features/dashboard/palettes|g" \
    -e "s|lib/ratingZones|@/shared/lib/ratingZones|g"
```

- [ ] **Step 4: Verify + type check**

Run: `cd frontend && grep -rn "from.*lib/dashboardPalettes\|from.*lib/ratingZones" src/`
Expected: zero matches outside the moved files themselves.

Run: `npx tsc --noEmit && npm run build`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(frontend): relocate lib modules (palettes→dashboard, ratingZones→shared)"
```

---

## Phase 3 — Feature Normalization

Per feature: pages into `pages/`, rename `<domain>Api.ts` → `api.ts`, slice → `slice.ts`, add barrel `index.ts`. One commit per feature.

Order from lowest to highest risk: `settings`, `calendar`, `appeals`, `notifications`, `auth`, `criteria`, `periods`, `positions` (already merged into org), `users`, `org`, `evaluations`, `analytics`, `dashboard`, `admin`.

### Task 3.1: Normalize features/settings

**Files:**
- Move: `frontend/src/features/settings/SettingsPage.tsx` → `frontend/src/features/settings/pages/SettingsPage.tsx`
- Rename: `frontend/src/features/settings/settingsApi.ts` → `frontend/src/features/settings/api.ts`
- Create: `frontend/src/features/settings/index.ts`

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/settings/pages
git mv src/features/settings/SettingsPage.tsx src/features/settings/pages/SettingsPage.tsx
git mv src/features/settings/settingsApi.ts src/features/settings/api.ts
```

- [ ] **Step 2: Rewrite imports inside the moved page**

Inside `frontend/src/features/settings/pages/SettingsPage.tsx`, any `./settingsApi` → `../api`. Any `./settingsApi` style imports updated accordingly.

- [ ] **Step 3: Rewrite external importers**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/settings/SettingsPage|@/features/settings|g" \
    -e "s|features/settings/settingsApi|@/features/settings/api|g"
```

- [ ] **Step 4: Create barrel**

Create `frontend/src/features/settings/index.ts`:

```ts
export { default as SettingsPage } from './pages/SettingsPage';
export * from './api';
```

If `SettingsPage` is a named export (not default), use:
```ts
export { SettingsPage } from './pages/SettingsPage';
```

(Verify named vs default by reading the page file first.)

- [ ] **Step 5: Type check + build**

Run: `cd frontend && npx tsc --noEmit && npm run build`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(frontend): normalize features/settings (pages/, api.ts, barrel)"
```

### Task 3.2: Normalize features/calendar

Same steps as 3.1 with these substitutions:
- Page: `CalendarPage.tsx`
- API: `calendarApi.ts` → `api.ts`

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/calendar/pages
git mv src/features/calendar/CalendarPage.tsx src/features/calendar/pages/CalendarPage.tsx
git mv src/features/calendar/calendarApi.ts src/features/calendar/api.ts
```

- [ ] **Step 2: Fix internal imports + external imports**

Inside the moved page: `./calendarApi` → `../api`.

External rewrites:
```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/calendar/CalendarPage|@/features/calendar|g" \
    -e "s|features/calendar/calendarApi|@/features/calendar/api|g"
```

- [ ] **Step 3: Create barrel**

`frontend/src/features/calendar/index.ts`:

```ts
export { CalendarPage } from './pages/CalendarPage';
export * from './api';
```

(Adjust `default`/named per actual export.)

- [ ] **Step 4: Type check + build + commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/calendar"
```

### Task 3.3: Normalize features/appeals

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/appeals/pages
git mv src/features/appeals/AppealPage.tsx src/features/appeals/pages/AppealPage.tsx
git mv src/features/appeals/appealsApi.ts src/features/appeals/api.ts
```

- [ ] **Step 2: Internal + external import rewrites**

Inside moved page: `./appealsApi` → `../api`.

External:
```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/appeals/AppealPage|@/features/appeals|g" \
    -e "s|features/appeals/appealsApi|@/features/appeals/api|g"
```

- [ ] **Step 3: Create barrel**

`frontend/src/features/appeals/index.ts`:

```ts
export { AppealPage } from './pages/AppealPage';
export * from './api';
```

- [ ] **Step 4: Type check + commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/appeals"
```

### Task 3.4: Normalize features/notifications

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/notifications/pages
git mv src/features/notifications/NotificationsPage.tsx src/features/notifications/pages/NotificationsPage.tsx
git mv src/features/notifications/notificationsSlice.ts src/features/notifications/slice.ts
```

- [ ] **Step 2: External import rewrites**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/notifications/NotificationsPage|@/features/notifications|g" \
    -e "s|features/notifications/notificationsSlice|@/features/notifications/slice|g"
```

Update `frontend/src/app/store.ts` (or wherever the slice is registered): change `notificationsSlice` import path to `@/features/notifications/slice`.

- [ ] **Step 3: Create barrel**

`frontend/src/features/notifications/index.ts`:

```ts
export { NotificationsPage } from './pages/NotificationsPage';
export { default as notificationsReducer } from './slice';
export * from './slice';
export { useNotifications } from './hooks/useNotifications';
```

(Match actual default/named exports of slice; if slice exports a `default` reducer plus named action creators, this pattern is correct. Adjust based on actual file.)

- [ ] **Step 4: Type check + build + commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/notifications"
```

### Task 3.5: Normalize features/auth

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/auth/pages
git mv src/features/auth/LoginPage.tsx src/features/auth/pages/LoginPage.tsx
git mv src/features/auth/ChangePasswordPage.tsx src/features/auth/pages/ChangePasswordPage.tsx
git mv src/features/auth/ForgotPasswordPage.tsx src/features/auth/pages/ForgotPasswordPage.tsx
git mv src/features/auth/ResetPasswordPage.tsx src/features/auth/pages/ResetPasswordPage.tsx
git mv src/features/auth/PdpaConsentPage.tsx src/features/auth/pages/PdpaConsentPage.tsx
git mv src/features/auth/authSlice.ts src/features/auth/slice.ts
```

- [ ] **Step 2: External + store import rewrites**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/auth/LoginPage|@/features/auth/pages/LoginPage|g" \
    -e "s|features/auth/ChangePasswordPage|@/features/auth/pages/ChangePasswordPage|g" \
    -e "s|features/auth/ForgotPasswordPage|@/features/auth/pages/ForgotPasswordPage|g" \
    -e "s|features/auth/ResetPasswordPage|@/features/auth/pages/ResetPasswordPage|g" \
    -e "s|features/auth/PdpaConsentPage|@/features/auth/pages/PdpaConsentPage|g" \
    -e "s|features/auth/authSlice|@/features/auth/slice|g"
```

Then collapse to the barrel manually in `App.tsx`:
Replace per-page imports from `@/features/auth/pages/*` with one line:
```ts
import { LoginPage, ChangePasswordPage, ForgotPasswordPage, ResetPasswordPage, PdpaConsentPage } from '@/features/auth';
```

Update `app/store.ts` slice import to `@/features/auth/slice`.

- [ ] **Step 3: Create barrel**

`frontend/src/features/auth/index.ts`:

```ts
export { LoginPage } from './pages/LoginPage';
export { ChangePasswordPage } from './pages/ChangePasswordPage';
export { ForgotPasswordPage } from './pages/ForgotPasswordPage';
export { ResetPasswordPage } from './pages/ResetPasswordPage';
export { PdpaConsentPage } from './pages/PdpaConsentPage';
export { default as authReducer } from './slice';
export * from './slice';
```

(Match default/named per actual exports.)

- [ ] **Step 4: Type check + build + smoke**

Run: `npx tsc --noEmit && npm run build`. Then log in, hit forgot password, hit pdpa flow.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(frontend): normalize features/auth"
```

### Task 3.6: Normalize features/criteria

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/criteria/pages
git mv src/features/criteria/CriteriaPage.tsx src/features/criteria/pages/CriteriaPage.tsx
git mv src/features/criteria/criteriaApi.ts src/features/criteria/api.ts
```

- [ ] **Step 2: External imports**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/criteria/CriteriaPage|@/features/criteria|g" \
    -e "s|features/criteria/criteriaApi|@/features/criteria/api|g"
```

Inside moved page + any criteria/components/*: `../criteriaApi` → `../../api`.

- [ ] **Step 3: Barrel**

`frontend/src/features/criteria/index.ts`:
```ts
export { CriteriaPage } from './pages/CriteriaPage';
export * from './api';
```

- [ ] **Step 4: Type check + commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/criteria"
```

### Task 3.7: Normalize features/periods

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/periods/pages
git mv src/features/periods/PeriodsPage.tsx src/features/periods/pages/PeriodsPage.tsx
git mv src/features/periods/periodsApi.ts src/features/periods/api.ts
```

- [ ] **Step 2: External imports**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/periods/PeriodsPage|@/features/periods|g" \
    -e "s|features/periods/periodsApi|@/features/periods/api|g"
```

Internal: `../periodsApi` → `../../api`. `./PeriodContext` references unchanged (PeriodContext lives at `features/periods/PeriodContext.tsx`).

- [ ] **Step 3: Barrel**

`frontend/src/features/periods/index.ts`:
```ts
export { PeriodsPage } from './pages/PeriodsPage';
export { PeriodProvider, usePeriod } from './PeriodContext';
export * from './api';
```

(Adjust to actual exports of PeriodContext.tsx — read it first.)

- [ ] **Step 4: Commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/periods"
```

### Task 3.8: Normalize features/users

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/users/pages
git mv src/features/users/UsersPage.tsx src/features/users/pages/UsersPage.tsx
git mv src/features/users/UserDetailPage.tsx src/features/users/pages/UserDetailPage.tsx
git mv src/features/users/usersApi.ts src/features/users/api.ts
```

- [ ] **Step 2: External imports**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/users/UsersPage|@/features/users/pages/UsersPage|g" \
    -e "s|features/users/UserDetailPage|@/features/users/pages/UserDetailPage|g" \
    -e "s|features/users/usersApi|@/features/users/api|g"
```

Then in `App.tsx` collapse to barrel:
```ts
import { UsersPage, UserDetailPage } from '@/features/users';
```

Internal: `./usersApi` → `../api`. `../../positions/positionsApi` (already fixed to `../../org/positionsApi` in Phase 1) — verify still correct.

- [ ] **Step 3: Barrel**

`frontend/src/features/users/index.ts`:
```ts
export { UsersPage } from './pages/UsersPage';
export { UserDetailPage } from './pages/UserDetailPage';
export * from './api';
```

- [ ] **Step 4: Commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/users"
```

### Task 3.9: Normalize features/org

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/org/pages
git mv src/features/org/OrgPage.tsx src/features/org/pages/OrgPage.tsx
git mv src/features/org/OrgUnitDetailPage.tsx src/features/org/pages/OrgUnitDetailPage.tsx
git mv src/features/org/DelegationsPage.tsx src/features/org/pages/DelegationsPage.tsx
git mv src/features/org/orgApi.ts src/features/org/api.ts
git mv src/features/org/delegationsApi.ts src/features/org/delegationsApi.ts # keep file as-is (separate API surface)
```

Note: `delegationsApi.ts` and `positionsApi.ts` stay as named API modules alongside `api.ts` because they represent distinct sub-domains. Only the org-core API renames.

- [ ] **Step 2: External imports**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/org/OrgPage|@/features/org/pages/OrgPage|g" \
    -e "s|features/org/OrgUnitDetailPage|@/features/org/pages/OrgUnitDetailPage|g" \
    -e "s|features/org/DelegationsPage|@/features/org/pages/DelegationsPage|g" \
    -e "s|features/org/orgApi|@/features/org/api|g"
```

`App.tsx` collapse to barrel: `import { OrgPage, OrgUnitDetailPage, DelegationsPage } from '@/features/org';`

Internal: inside moved pages, `./orgApi` → `../api`; `./positionsApi` → `../positionsApi`; `./delegationsApi` → `../delegationsApi`.

- [ ] **Step 3: Barrel**

`frontend/src/features/org/index.ts`:
```ts
export { OrgPage } from './pages/OrgPage';
export { OrgUnitDetailPage } from './pages/OrgUnitDetailPage';
export { DelegationsPage } from './pages/DelegationsPage';
export * from './api';
export { positionsApi } from './positionsApi';
export type { Position } from './positionsApi';
export { delegationsApi } from './delegationsApi';
```

(Adjust types per actual delegations export.)

- [ ] **Step 4: Smoke + commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Load /org, /org/units/:id, /delegations.

```bash
git add -A
git commit -m "refactor(frontend): normalize features/org (with positions, delegations)"
```

### Task 3.10: Normalize features/evaluations

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/evaluations/pages
git mv src/features/evaluations/EvaluationsPage.tsx src/features/evaluations/pages/EvaluationsPage.tsx
git mv src/features/evaluations/EvaluationDetailPage.tsx src/features/evaluations/pages/EvaluationDetailPage.tsx
git mv src/features/evaluations/EvaluationFormPage.tsx src/features/evaluations/pages/EvaluationFormPage.tsx
git mv src/features/evaluations/MyTasksPage.tsx src/features/evaluations/pages/MyTasksPage.tsx
git mv src/features/evaluations/evaluationsApi.ts src/features/evaluations/api.ts
```

(`form/` directory stays as-is — it holds form-specific subcomponents, not pages.)

- [ ] **Step 2: External imports**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/evaluations/EvaluationsPage|@/features/evaluations/pages/EvaluationsPage|g" \
    -e "s|features/evaluations/EvaluationDetailPage|@/features/evaluations/pages/EvaluationDetailPage|g" \
    -e "s|features/evaluations/EvaluationFormPage|@/features/evaluations/pages/EvaluationFormPage|g" \
    -e "s|features/evaluations/MyTasksPage|@/features/evaluations/pages/MyTasksPage|g" \
    -e "s|features/evaluations/evaluationsApi|@/features/evaluations/api|g"
```

`App.tsx` collapse to barrel.

Internal: `./evaluationsApi` → `../api`; `./form/...` → `../form/...`; `./components/...` → `../components/...`.

- [ ] **Step 3: Barrel**

`frontend/src/features/evaluations/index.ts`:
```ts
export { EvaluationsPage } from './pages/EvaluationsPage';
export { EvaluationDetailPage } from './pages/EvaluationDetailPage';
export { EvaluationFormPage } from './pages/EvaluationFormPage';
export { MyTasksPage } from './pages/MyTasksPage';
export * from './api';
```

- [ ] **Step 4: Smoke + commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
```
Load list, detail, form, my-tasks.

```bash
git add -A
git commit -m "refactor(frontend): normalize features/evaluations"
```

### Task 3.11: Normalize features/analytics

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/analytics/pages
git mv src/features/analytics/AntiBonusAnalyticsPage.tsx src/features/analytics/pages/AntiBonusAnalyticsPage.tsx
git mv src/features/analytics/HierarchicalAnalyticsPage.tsx src/features/analytics/pages/HierarchicalAnalyticsPage.tsx
git mv src/features/analytics/ManagerDashboardPage.tsx src/features/analytics/pages/ManagerDashboardPage.tsx
git mv src/features/analytics/PersonalDashboardPage.tsx src/features/analytics/pages/PersonalDashboardPage.tsx
git mv src/features/analytics/analyticsApi.ts src/features/analytics/api.ts
```

- [ ] **Step 2: External imports**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/analytics/AntiBonusAnalyticsPage|@/features/analytics/pages/AntiBonusAnalyticsPage|g" \
    -e "s|features/analytics/HierarchicalAnalyticsPage|@/features/analytics/pages/HierarchicalAnalyticsPage|g" \
    -e "s|features/analytics/ManagerDashboardPage|@/features/analytics/pages/ManagerDashboardPage|g" \
    -e "s|features/analytics/PersonalDashboardPage|@/features/analytics/pages/PersonalDashboardPage|g" \
    -e "s|features/analytics/analyticsApi|@/features/analytics/api|g"
```

`App.tsx` collapse imports to barrel.

Internal: `./analyticsApi` → `../api`; `./components/...` → `../components/...`.

- [ ] **Step 3: Barrel**

```ts
export { AntiBonusAnalyticsPage } from './pages/AntiBonusAnalyticsPage';
export { HierarchicalAnalyticsPage } from './pages/HierarchicalAnalyticsPage';
export { ManagerDashboardPage } from './pages/ManagerDashboardPage';
export { PersonalDashboardPage } from './pages/PersonalDashboardPage';
export * from './api';
```

- [ ] **Step 4: Smoke + commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/analytics"
```

### Task 3.12: Normalize features/dashboard

- [ ] **Step 1: Restructure**

```bash
cd frontend
mkdir -p src/features/dashboard/pages
git mv src/features/dashboard/DashboardPage.tsx src/features/dashboard/pages/DashboardPage.tsx
mkdir -p src/features/dashboard/components
git mv src/features/dashboard/AppealsPanel.tsx src/features/dashboard/components/AppealsPanel.tsx
git mv src/features/dashboard/DelegationsPanel.tsx src/features/dashboard/components/DelegationsPanel.tsx
git mv src/features/dashboard/EvalCyclePanel.tsx src/features/dashboard/components/EvalCyclePanel.tsx
git mv src/features/dashboard/RatingPanel.tsx src/features/dashboard/components/RatingPanel.tsx
```

(`styles.ts` and `palettes.ts` stay at feature root.)

- [ ] **Step 2: Imports inside DashboardPage.tsx**

Update internal references:
- `./AppealsPanel` → `../components/AppealsPanel`
- `./DelegationsPanel` → `../components/DelegationsPanel`
- `./EvalCyclePanel` → `../components/EvalCyclePanel`
- `./RatingPanel` → `../components/RatingPanel`
- `./styles` → `../styles`
- `./palettes` → `../palettes`

- [ ] **Step 3: External imports**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/dashboard/DashboardPage|@/features/dashboard/pages/DashboardPage|g"
```

`App.tsx` collapse to barrel.

- [ ] **Step 4: Barrel**

```ts
export { DashboardPage } from './pages/DashboardPage';
```

- [ ] **Step 5: Smoke + commit**

Load `/dashboard`. Verify panels render.

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/dashboard"
```

### Task 3.13: Normalize features/admin

`AdminLayout`, `AdminHero`, `AdminStatsCards`, `AdminRangeContext` already moved to `layouts/admin/` in Phase 2.4. Now normalize remaining admin pages and dedupe `AdminAppealsPage`.

- [ ] **Step 1: Inspect AdminAppealsPage vs AppealPage**

Run: `cd frontend && diff src/features/admin/AdminAppealsPage.tsx src/features/appeals/pages/AppealPage.tsx`

If functionally identical: delete `AdminAppealsPage.tsx`, update `App.tsx` route to render `AppealPage` from `@/features/appeals`.

If different (admin-specific UI/permissions): keep but rewrite to import shared logic from `@/features/appeals` instead of duplicating.

- [ ] **Step 2: Restructure remaining admin pages**

```bash
cd frontend
mkdir -p src/features/admin/pages
git mv src/features/admin/AdminDashboardPage.tsx src/features/admin/pages/AdminDashboardPage.tsx
git mv src/features/admin/AdminEvaluationsPage.tsx src/features/admin/pages/AdminEvaluationsPage.tsx
git mv src/features/admin/AdminMonitoringPage.tsx src/features/admin/pages/AdminMonitoringPage.tsx
git mv src/features/admin/AuditLogPage.tsx src/features/admin/pages/AuditLogPage.tsx
git mv src/features/admin/adminApi.ts src/features/admin/api.ts
# Conditionally move AdminAppealsPage if kept:
[ -f src/features/admin/AdminAppealsPage.tsx ] && git mv src/features/admin/AdminAppealsPage.tsx src/features/admin/pages/AdminAppealsPage.tsx
```

- [ ] **Step 3: External imports**

```bash
cd frontend && \
  find src -name '*.tsx' -o -name '*.ts' | xargs sed -i \
    -e "s|features/admin/AdminDashboardPage|@/features/admin/pages/AdminDashboardPage|g" \
    -e "s|features/admin/AdminEvaluationsPage|@/features/admin/pages/AdminEvaluationsPage|g" \
    -e "s|features/admin/AdminMonitoringPage|@/features/admin/pages/AdminMonitoringPage|g" \
    -e "s|features/admin/AdminAppealsPage|@/features/admin/pages/AdminAppealsPage|g" \
    -e "s|features/admin/AuditLogPage|@/features/admin/pages/AuditLogPage|g" \
    -e "s|features/admin/adminApi|@/features/admin/api|g"
```

`App.tsx` collapse to barrel.

Internal page imports: `./adminApi` → `../api`.

- [ ] **Step 4: Barrel**

`frontend/src/features/admin/index.ts`:
```ts
export { AdminDashboardPage } from './pages/AdminDashboardPage';
export { AdminEvaluationsPage } from './pages/AdminEvaluationsPage';
export { AdminMonitoringPage } from './pages/AdminMonitoringPage';
export { AuditLogPage } from './pages/AuditLogPage';
// AdminAppealsPage only if it was kept in Step 1:
// export { AdminAppealsPage } from './pages/AdminAppealsPage';
export * from './api';
```

- [ ] **Step 5: Smoke**

Load `/admin`, `/admin/users`, `/admin/evaluations`, `/admin/monitoring`, `/admin/audit`. If kept, also `/admin/appeals`.

- [ ] **Step 6: Commit**

```bash
cd frontend && npx tsc --noEmit && npm run build
git add -A
git commit -m "refactor(frontend): normalize features/admin"
```

---

## Phase 4 — CSS Split

Carve 2070-line `src/index.css` into `styles/{tokens, base, utilities, index}.css`.

### Task 4.1: Inventory current index.css

**Files:**
- Read: `frontend/src/index.css`

- [ ] **Step 1: Categorize blocks**

Read `frontend/src/index.css` end to end. Tag each section with one of: `TOKENS` (CSS variables, theme vars), `BASE` (resets, `html`/`body`, typography, scrollbar, focus), `UTILITIES` (custom `.cls` utility classes), `TAILWIND` (`@tailwind` directives), `COMPONENTS` (ad-hoc component styles — these should ideally migrate to CSS modules later but stay in `utilities.css` for now).

Produce a quick mental map of which line ranges belong where. No code change in this step.

### Task 4.2: Create styles directory and split

**Files:**
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/styles/base.css`
- Create: `frontend/src/styles/utilities.css`
- Create: `frontend/src/styles/index.css`
- Delete: `frontend/src/index.css`
- Modify: `frontend/src/main.tsx` (update import path)

- [ ] **Step 1: Make directory**

Run: `cd frontend && mkdir -p src/styles`

- [ ] **Step 2: Carve files**

Based on Task 4.1 inventory, write each section to its target file. Suggested contents:

`frontend/src/styles/tokens.css`:
```css
:root {
  /* color, spacing, radius, shadow tokens — moved from old index.css */
}

:root[data-theme="dark"] {
  /* dark theme overrides — moved from old index.css */
}
```

`frontend/src/styles/base.css`:
```css
/* resets, html, body, typography, scrollbar, focus rings — moved from old index.css */
```

`frontend/src/styles/utilities.css`:
```css
/* custom app utility classes (and any ad-hoc component CSS) — moved from old index.css */
```

`frontend/src/styles/index.css`:
```css
@import './tokens.css';
@import './base.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@import './utilities.css';
```

- [ ] **Step 3: Update entry import**

In `frontend/src/main.tsx`, change `import './index.css'` → `import './styles/index.css'`.

- [ ] **Step 4: Delete old index.css**

Run: `cd frontend && git rm src/index.css`

- [ ] **Step 5: Build + smoke**

Run: `cd frontend && npm run build`

Then `./scripts/dev-start.sh`. Open `/login`, `/dashboard`, `/admin`. Toggle theme dark/light. Toggle language ru/kg. Visual diff: no regressions in colors, spacing, scrollbar, focus rings.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(frontend): split index.css into styles/{tokens,base,utilities,index}"
```

---

## Phase 5 — Conventions Documentation

ESLint not currently installed; full enforcement deferred. Document conventions so contributors follow the new layout.

### Task 5.1: Add frontend conventions doc

**Files:**
- Create: `frontend/CONVENTIONS.md`

- [ ] **Step 1: Write doc**

Write `frontend/CONVENTIONS.md`:

```markdown
# Frontend Conventions

## Directory layout

- `src/app/` — bootstrap: API client, Redux store, router, providers, route guards.
- `src/shared/` — cross-cutting primitives: UI components, datapanel, hooks, lib, types. No domain logic.
- `src/layouts/` — top-level chrome: shell, admin layout.
- `src/features/<domain>/` — one folder per business domain.
- `src/styles/` — global CSS split into tokens, base, utilities.

## Per-feature layout

Every `features/<domain>/` folder must follow this shape:

- `api.ts` — axios calls (single API surface; rename historical `<domain>Api.ts` to this).
- `slice.ts` — Redux Toolkit slice (only when feature has Redux state).
- `types.ts` — domain types and enums (when present).
- `pages/<Name>Page.tsx` — page-level components mounted by the router.
- `components/` — feature-only subcomponents (not for cross-feature use).
- `hooks/` — feature-only hooks.
- `index.ts` — public barrel; cross-feature imports go through this file.

## Imports

- Use the `@/` path alias for everything outside the current directory.
- Cross-feature imports must hit the barrel: `import { X } from '@/features/foo'` — never `from '@/features/foo/pages/Foo'`.
- Same-feature relative imports (`./api`, `../components/Bar`) are fine.

## CSS

- Global styles live in `src/styles/`.
- Component styles use CSS Modules (`Component.module.css`) colocated with the component.
- Tailwind utilities are imported once via `styles/index.css`; use them inline in JSX.

## Naming

- Pages: `<Name>Page.tsx`.
- Slices: `slice.ts` (single per feature).
- API: `api.ts` (single per feature; named sub-APIs like `positionsApi.ts`, `delegationsApi.ts` are allowed only when they represent distinct sub-domains).
- No version suffixes (`V2`, `V3`). Canonical name wins; legacy must be deleted.

## Adding a new feature

1. Create `src/features/<domain>/` with `api.ts`, `pages/`, `index.ts` at minimum.
2. Add the page route in `src/app/router.tsx` (or `App.tsx`) importing through the barrel.
3. Register any slice in `src/app/store.ts`.
```

- [ ] **Step 2: Commit**

```bash
git add frontend/CONVENTIONS.md
git commit -m "docs(frontend): document directory + import conventions"
```

---

## Final Verification

After all phases complete:

- [ ] **Step 1: Full type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Full build**

Run: `cd frontend && npm run build`
Expected: succeeds.

- [ ] **Step 3: Full manual smoke**

Run: `./scripts/dev-start.sh`. Then exercise:

1. Login as `admin@gfh.kg`
2. Navigate dashboard, verify all panels (Rating, Appeals, Delegations, EvalCycle)
3. Admin → Users (CRUD modal opens, positions load)
4. Admin → Periods (list + create dialog)
5. Admin → Org (tree renders, unit detail loads positions)
6. Admin → Calendar, Audit, Monitoring (all render)
7. Evaluations → list, detail, form, my-tasks
8. Analytics → personal, manager (role-gated), hierarchical, anti-bonus
9. Notifications bell shows count; click opens menu
10. Toggle theme dark/light
11. Toggle language ru → kg → ru
12. Logout

Browser console: no new errors, no failed asset loads.

- [ ] **Step 4: Final commit (only if anything tweaked during smoke)**

```bash
git add -A
git commit -m "chore(frontend): final smoke fixes after restructure"
```

- [ ] **Step 5: Push branch and open PR**

Branch name: `refactor/frontend-restructure`.

```bash
git push -u origin refactor/frontend-restructure
gh pr create --title "refactor(frontend): restructure src into app/shared/layouts/features" --body "$(cat <<'EOF'
## Summary
- Move-only refactor of `frontend/src/`: introduces `app/`, `shared/`, `layouts/` and consistent per-feature layout
- Removes dead code: legacy EvaluationFormPage, V1 DashboardPage + `/dashboard-v1` route, dv3 style duplicates
- Splits 2070-line `index.css` into `styles/{tokens,base,utilities,index}.css`
- Adds `frontend/CONVENTIONS.md`

## Test plan
- [ ] `npx tsc --noEmit` green
- [ ] `npm run build` green
- [ ] Manual smoke: login, dashboard, admin pages, evaluations, analytics, theme + lang toggle

Spec: `docs/superpowers/specs/2026-05-31-frontend-restructure-design.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Results

**Spec coverage:**
- Phase 1 covers dead code removal (spec §"Phase 1") ✓
- Phase 2 covers shared/layouts extraction (spec §"Phase 3") ✓ — note: spec's "Phase 2" path-alias/ESLint setup was reduced because alias already exists and ESLint isn't installed; documented under Phase 5 conventions instead
- Phase 3 covers feature normalization (spec §"Phase 4") ✓
- Phase 4 covers CSS split (spec §"Phase 5") ✓
- Phase 5 covers conventions doc (replaces spec §"Phase 6" ESLint enforcement, which is out of scope without eslint dependency) ✓
- File mapping table from spec fully represented across tasks ✓

**Placeholder scan:** none. All steps have concrete paths, commands, and code.

**Type/name consistency:** API filename `api.ts` used consistently; slice filename `slice.ts` used consistently; barrel filename `index.ts` used consistently; page suffix `<Name>Page.tsx` used consistently.

**Known caveats engineer should expect:**
- Sed-based codemods can leave residual relative imports (`../../...`) untouched. Always grep for the old token after sed and fix any leftovers by hand.
- `git mv` does not rewrite imports — imports are rewritten in the same task as the move.
- Barrel exports assume default vs named conventions that the engineer must verify by reading each file before writing `index.ts`. Each barrel task includes a note to verify.
