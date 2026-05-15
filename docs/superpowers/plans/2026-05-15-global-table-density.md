# Global Table Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give users one app-wide table row-density preference, selectable from the account menu and applied identically to every table.

**Architecture:** A React context (`DensityProvider`) backed by a localStorage-persisted hook is the single source of truth. `DataTable` reads density from the context; the account-menu selector writes to it. All hardcoded per-table density props are removed, and `UserTable`'s separate local density picker is deleted in favour of the global one.

**Tech Stack:** React 18, TypeScript, Vite, react-i18next, localStorage.

**Testing note:** This frontend has **no test framework** (`package.json` scripts are `dev`, `build`, `preview`, `typecheck` only — no vitest/jest). Per the existing codebase convention, verification for every task is `npx tsc --noEmit` (zero output = pass) plus `npm run build`, and the final task includes manual browser verification. Do **not** add a test framework — that is out of scope.

All commands run from `frontend/`.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `frontend/src/hooks/useDensity.tsx` | Density hook + context + provider; localStorage persistence; cross-tab sync | Create |
| `frontend/src/main.tsx` | Mount `DensityProvider` around the app | Modify |
| `frontend/src/components/DataTable.tsx` | Read density from context when no prop given | Modify |
| `frontend/src/components/shell/IconRail.tsx` | Density segmented control in the account menu | Modify |
| `frontend/public/locales/ru/translation.json` | RU density labels | Modify |
| `frontend/public/locales/kg/translation.json` | KG density labels | Modify |
| `frontend/src/features/users/components/UsersFilters.tsx` | Remove local density picker + `Density` type | Modify |
| `frontend/src/features/users/components/UserTable.tsx` | Read global density instead of a prop | Modify |
| `frontend/src/features/users/UsersPage.tsx` | Remove density state + threading | Modify |
| `frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx` | Drop hardcoded `density="compact"` | Modify |
| `frontend/src/features/analytics/HierarchicalAnalyticsPage.tsx` | Drop hardcoded `density="compact"` | Modify |
| `frontend/src/features/criteria/CriteriaPage.tsx` | Drop hardcoded `density="compact"` | Modify |

---

## Task 1: Density hook, context, and provider

**Files:**
- Create: `frontend/src/hooks/useDensity.tsx`

The file is `.tsx` (not `.ts`) because `DensityProvider` returns JSX. It imports the `Density` type from `DataTable.tsx` as a **type-only import** — type-only imports are erased at compile time, so this does not create a runtime circular dependency even though `DataTable.tsx` will import `useDensity` as a value in Task 3.

- [ ] **Step 1: Create the hook file**

Create `frontend/src/hooks/useDensity.tsx` with exactly this content:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Density } from '../components/DataTable'

export type { Density }

// Safari private mode + locked-down profiles throw on localStorage access.
function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}

const STORAGE_KEY = 'gfh_density'
const DEFAULT_DENSITY: Density = 'comfortable'

function isDensity(v: string | null): v is Density {
  return v === 'comfortable' || v === 'compact'
}

interface DensityContextValue {
  density: Density
  setDensity: (d: Density) => void
}

const DensityContext = createContext<DensityContextValue>({
  density: DEFAULT_DENSITY,
  setDensity: () => { /* noop — rendered outside DensityProvider */ },
})

// Internal: owns the localStorage-backed density state. Used only by
// DensityProvider so the whole app shares a single instance.
function useDensityState(): DensityContextValue {
  const [density, setDensityState] = useState<Density>(() => {
    const stored = safeGet(STORAGE_KEY)
    return isDensity(stored) ? stored : DEFAULT_DENSITY
  })

  const setDensity = (next: Density) => {
    setDensityState(next)
    safeSet(STORAGE_KEY, next)
  }

  // Cross-tab sync: another tab changing density propagates to this one.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setDensityState(isDensity(e.newValue) ? e.newValue : DEFAULT_DENSITY)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { density, setDensity }
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const value = useDensityState()
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
}

// Public accessor — every consumer (DataTable, UserTable, IconRail) uses this
// so they all read and write the same shared density value.
export function useDensity(): DensityContextValue {
  return useContext(DensityContext)
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useDensity.tsx
git commit -m "feat(density): add useDensity hook, context and provider"
```

---

## Task 2: Mount DensityProvider at the app root

**Files:**
- Modify: `frontend/src/main.tsx`

`DensityProvider` must wrap both `AppShell` (which renders `IconRail`, the selector) and `App` (which renders the pages with tables), so it goes around `<AppShell>`.

- [ ] **Step 1: Add the import**

In `frontend/src/main.tsx`, find:

```tsx
import { AppShell } from './components/shell/AppShell'
import './index.css'
import './i18n'
```

Replace with:

```tsx
import { AppShell } from './components/shell/AppShell'
import { DensityProvider } from './hooks/useDensity'
import './index.css'
import './i18n'
```

- [ ] **Step 2: Wrap the app tree**

In the same file, find:

```tsx
    <Provider store={store}>
      <BrowserRouter>
        <AppShell>
          <App />
        </AppShell>
      </BrowserRouter>
    </Provider>
```

Replace with:

```tsx
    <Provider store={store}>
      <BrowserRouter>
        <DensityProvider>
          <AppShell>
            <App />
          </AppShell>
        </DensityProvider>
      </BrowserRouter>
    </Provider>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat(density): mount DensityProvider at app root"
```

---

## Task 3: DataTable reads density from context

**Files:**
- Modify: `frontend/src/components/DataTable.tsx`

The `density` prop stays optional and still wins when passed; when omitted, the table follows the global context density. After this task no table passes `density` explicitly (Task 6 removes the last hardcoded uses), but the prop is kept as an override escape hatch.

- [ ] **Step 1: Add the import**

In `frontend/src/components/DataTable.tsx`, find the first line:

```tsx
import React, { Fragment } from 'react'
```

Replace with:

```tsx
import React, { Fragment } from 'react'
import { useDensity } from '../hooks/useDensity'
```

- [ ] **Step 2: Document the prop**

Find:

```tsx
  onRowClick?: (row: T) => void
  density?: Density
```

Replace with:

```tsx
  onRowClick?: (row: T) => void
  /** Row density. Omit to follow the app-wide density preference. */
  density?: Density
```

- [ ] **Step 3: Resolve density from prop-or-context**

Find:

```tsx
  sort, onSort, onRowClick, density = 'comfortable',
  empty, skeletonRows = 8, renderExpanded, expandedKeys, totalCount,
}: DataTableProps<T>) {
  const d = DENSITY[density]
```

Replace with:

```tsx
  sort, onSort, onRowClick, density: densityProp,
  empty, skeletonRows = 8, renderExpanded, expandedKeys, totalCount,
}: DataTableProps<T>) {
  const { density: contextDensity } = useDensity()
  const density = densityProp ?? contextDensity
  const d = DENSITY[density]
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DataTable.tsx
git commit -m "feat(density): DataTable follows global density when no prop given"
```

---

## Task 4: Density selector in the account menu

**Files:**
- Modify: `frontend/src/components/shell/IconRail.tsx`
- Modify: `frontend/public/locales/ru/translation.json`
- Modify: `frontend/public/locales/kg/translation.json`

Add a segmented control beneath the existing theme toggle, styled with the same `rail-menu-toggle` / `rail-menu-seg` / `rail-menu-seg-btn` classes the theme and language toggles already use — no new CSS needed.

- [ ] **Step 1: Add RU translation keys**

In `frontend/public/locales/ru/translation.json`, find:

```json
    "darkTheme": "Тёмная",
    "groupMain": "Основное",
```

Replace with:

```json
    "darkTheme": "Тёмная",
    "density": "Плотность",
    "densityComfortable": "Просторно",
    "densityCompact": "Компактно",
    "groupMain": "Основное",
```

- [ ] **Step 2: Add KG translation keys**

In `frontend/public/locales/kg/translation.json`, find:

```json
    "darkTheme": "Караңгы",
    "groupMain": "Негизги",
```

Replace with:

```json
    "darkTheme": "Караңгы",
    "density": "Тыгыздык",
    "densityComfortable": "Кенен",
    "densityCompact": "Тыгыз",
    "groupMain": "Негизги",
```

- [ ] **Step 3: Read density in IconRail**

In `frontend/src/components/shell/IconRail.tsx`, find:

```tsx
import { useTheme } from '../../hooks/useTheme'
```

Replace with:

```tsx
import { useTheme } from '../../hooks/useTheme'
import { useDensity } from '../../hooks/useDensity'
```

Then find:

```tsx
  const { theme, toggle } = useTheme()
```

Replace with:

```tsx
  const { theme, toggle } = useTheme()
  const { density, setDensity } = useDensity()
```

- [ ] **Step 4: Add the density toggle markup**

In the same file, find the end of the theme toggle block (it is the last `rail-menu-toggle` div inside the prefs section):

```tsx
            <div className="rail-menu-toggle" role="group" aria-label={t('nav.theme', 'Тема') as string}>
              <span className="rail-menu-toggle-label">{t('nav.theme', 'Тема')}</span>
              <div className="rail-menu-seg">
                <button
                  type="button"
                  className={`rail-menu-seg-btn${theme === 'light' ? ' active' : ''}`}
                  aria-pressed={theme === 'light'}
                  onClick={() => { if (theme !== 'light') toggle() }}
                >{t('nav.lightTheme', 'Светлая')}</button>
                <button
                  type="button"
                  className={`rail-menu-seg-btn${theme === 'dark' ? ' active' : ''}`}
                  aria-pressed={theme === 'dark'}
                  onClick={() => { if (theme !== 'dark') toggle() }}
                >{t('nav.darkTheme', 'Тёмная')}</button>
              </div>
            </div>
          </div>
```

Replace with:

```tsx
            <div className="rail-menu-toggle" role="group" aria-label={t('nav.theme', 'Тема') as string}>
              <span className="rail-menu-toggle-label">{t('nav.theme', 'Тема')}</span>
              <div className="rail-menu-seg">
                <button
                  type="button"
                  className={`rail-menu-seg-btn${theme === 'light' ? ' active' : ''}`}
                  aria-pressed={theme === 'light'}
                  onClick={() => { if (theme !== 'light') toggle() }}
                >{t('nav.lightTheme', 'Светлая')}</button>
                <button
                  type="button"
                  className={`rail-menu-seg-btn${theme === 'dark' ? ' active' : ''}`}
                  aria-pressed={theme === 'dark'}
                  onClick={() => { if (theme !== 'dark') toggle() }}
                >{t('nav.darkTheme', 'Тёмная')}</button>
              </div>
            </div>
            <div className="rail-menu-toggle" role="group" aria-label={t('nav.density', 'Плотность') as string}>
              <span className="rail-menu-toggle-label">{t('nav.density', 'Плотность')}</span>
              <div className="rail-menu-seg">
                <button
                  type="button"
                  className={`rail-menu-seg-btn${density === 'comfortable' ? ' active' : ''}`}
                  aria-pressed={density === 'comfortable'}
                  onClick={() => { if (density !== 'comfortable') setDensity('comfortable') }}
                >{t('nav.densityComfortable', 'Просторно')}</button>
                <button
                  type="button"
                  className={`rail-menu-seg-btn${density === 'compact' ? ' active' : ''}`}
                  aria-pressed={density === 'compact'}
                  onClick={() => { if (density !== 'compact') setDensity('compact') }}
                >{t('nav.densityCompact', 'Компактно')}</button>
              </div>
            </div>
          </div>
```

(The only change is the inserted `rail-menu-toggle` block for density, immediately before the `</div>` that closes the prefs `rail-menu-section`.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/shell/IconRail.tsx frontend/public/locales/ru/translation.json frontend/public/locales/kg/translation.json
git commit -m "feat(density): add density selector to account menu"
```

---

## Task 5: Remove UserTable's local density picker

**Files:**
- Modify: `frontend/src/features/users/components/UsersFilters.tsx`
- Modify: `frontend/src/features/users/components/UserTable.tsx`
- Modify: `frontend/src/features/users/UsersPage.tsx`

These three files are interdependent (UserTable's `density` prop, the `Density` type, UsersPage's threading). They are changed together in one task so the tree compiles only after all three edits. `UserTable` keeps its own `DENSITY` token map (avatar/name/pad sizing) — only the *source* of the density value changes from a prop to the global hook.

### UsersFilters.tsx

- [ ] **Step 1: Remove the `Density` type export**

Find:

```tsx
export type StatusFilter = 'all' | 'active' | 'inactive'
export type ViewMode = 'table' | 'cards'
export type Density = 'comfortable' | 'compact'
```

Replace with:

```tsx
export type StatusFilter = 'all' | 'active' | 'inactive'
export type ViewMode = 'table' | 'cards'
```

- [ ] **Step 2: Remove density from the props interface**

Find:

```tsx
  status: StatusFilter
  onStatus: (v: StatusFilter) => void
  density: Density
  onDensity: (v: Density) => void
  view: ViewMode
  onView: (v: ViewMode) => void
```

Replace with:

```tsx
  status: StatusFilter
  onStatus: (v: StatusFilter) => void
  view: ViewMode
  onView: (v: ViewMode) => void
```

- [ ] **Step 3: Remove density from the destructured params**

Find:

```tsx
export function UsersFilters({
  search, onSearch, role, onRole, status, onStatus,
  density, onDensity, view, onView, matchedCount, totalCount,
}: UsersFiltersProps) {
```

Replace with:

```tsx
export function UsersFilters({
  search, onSearch, role, onRole, status, onStatus,
  view, onView, matchedCount, totalCount,
}: UsersFiltersProps) {
```

- [ ] **Step 4: Remove the density `<Segmented>` control**

Find:

```tsx
      <Segmented
        ariaLabel="Плотность строк"
        value={density}
        options={[
          { value: 'comfortable', icon: <IconDensityRoomy />,   title: 'Просторно' },
          { value: 'compact',     icon: <IconDensityCompact />, title: 'Плотно' },
        ]}
        onChange={onDensity}
      />
      <Segmented
        ariaLabel="Режим отображения"
```

Replace with:

```tsx
      <Segmented
        ariaLabel="Режим отображения"
```

- [ ] **Step 5: Remove the now-unused density icons**

Find and delete this entire block (the two density icon components and their leading comment):

```tsx
/* Density: stacked bars — 2 roomy rows vs 4 tight rows. Reads as row-height,
   intentionally unlike the bordered-table / grid view-switch icons. */
function IconDensityRoomy() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'currentColor' }}>
      <rect x="3" y="5"  width="18" height="6" rx="1.6" />
      <rect x="3" y="13" width="18" height="6" rx="1.6" />
    </svg>
  )
}
function IconDensityCompact() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: 14, height: 14, fill: 'currentColor' }}>
      <rect x="3" y="4"  width="18" height="2.6" rx="1" />
      <rect x="3" y="9"  width="18" height="2.6" rx="1" />
      <rect x="3" y="14" width="18" height="2.6" rx="1" />
      <rect x="3" y="19" width="18" height="2.6" rx="1" />
    </svg>
  )
}
function IconViewTable() {
```

Replace with (keep `IconViewTable` — only the density icons and comment are removed):

```tsx
function IconViewTable() {
```

### UserTable.tsx

- [ ] **Step 6: Swap the density import**

Find the first two lines:

```tsx
import type { User } from '../usersApi'
import type { Density } from './UsersFilters'
```

Replace with:

```tsx
import type { User } from '../usersApi'
import { useDensity } from '../../../hooks/useDensity'
```

- [ ] **Step 7: Remove `density` from `Props`**

Find:

```tsx
  onRowClick: (user: User) => void
  actions: UserActions
  density: Density
}
```

Replace with:

```tsx
  onRowClick: (user: User) => void
  actions: UserActions
}
```

- [ ] **Step 8: Read density from the global hook**

Find:

```tsx
export function UserTable({ users, sortKey, sortDir, onSort, onRowClick, actions, density }: Props) {
  if (users.length === 0) {
```

Replace with:

```tsx
export function UserTable({ users, sortKey, sortDir, onSort, onRowClick, actions }: Props) {
  const { density } = useDensity()
  if (users.length === 0) {
```

(The existing `const d = DENSITY[density]` line further down is unchanged — `density` is now a local const from the hook instead of a prop.)

### UsersPage.tsx

- [ ] **Step 9: Drop the `Density` import**

Find:

```tsx
import { UsersFilters, type StatusFilter, type ViewMode, type Density } from './components/UsersFilters'
```

Replace with:

```tsx
import { UsersFilters, type StatusFilter, type ViewMode } from './components/UsersFilters'
```

- [ ] **Step 10: Remove the density storage key**

Find:

```tsx
const VIEW_KEY = 'gfh_users_view'
const DENSITY_KEY = 'gfh_users_density'
const PAGE_SIZE = 25
```

Replace with:

```tsx
const VIEW_KEY = 'gfh_users_view'
const PAGE_SIZE = 25
```

- [ ] **Step 11: Remove the `loadDensity` helper**

Find:

```tsx
function loadView(): ViewMode {
  return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'table'
}
function loadDensity(): Density {
  return localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable'
}
```

Replace with:

```tsx
function loadView(): ViewMode {
  return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'table'
}
```

- [ ] **Step 12: Remove the density state**

Find:

```tsx
  const [view, setView] = useState<ViewMode>(loadView)
  const [density, setDensity] = useState<Density>(loadDensity)
  const [sortKey, setSortKey] = useState<SortKey>('name')
```

Replace with:

```tsx
  const [view, setView] = useState<ViewMode>(loadView)
  const [sortKey, setSortKey] = useState<SortKey>('name')
```

- [ ] **Step 13: Remove the density persistence effect**

Find:

```tsx
  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])
  useEffect(() => { localStorage.setItem(DENSITY_KEY, density) }, [density])
```

Replace with:

```tsx
  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])
```

- [ ] **Step 14: Stop passing density to `UsersFilters`**

Find:

```tsx
          status={status}
          onStatus={setStatus}
          density={density}
          onDensity={setDensity}
          view={view}
          onView={setView}
```

Replace with:

```tsx
          status={status}
          onStatus={setStatus}
          view={view}
          onView={setView}
```

- [ ] **Step 15: Stop passing density to `UserTable`**

Find:

```tsx
              onRowClick={openDrawer}
              actions={actions}
              density={density}
            />
```

Replace with:

```tsx
              onRowClick={openDrawer}
              actions={actions}
            />
```

- [ ] **Step 16: Type-check**

Run: `npx tsc --noEmit`
Expected: no output. (If an error mentions `density` or `Density`, a reference was missed above — re-check Steps 1-15.)

- [ ] **Step 17: Commit**

```bash
git add frontend/src/features/users/components/UsersFilters.tsx frontend/src/features/users/components/UserTable.tsx frontend/src/features/users/UsersPage.tsx
git commit -m "feat(density): remove UserTable local picker, use global density"
```

---

## Task 6: Drop hardcoded `density="compact"` props

**Files:**
- Modify: `frontend/src/features/analytics/HierarchicalAnalyticsPage.tsx`
- Modify: `frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx`
- Modify: `frontend/src/features/criteria/CriteriaPage.tsx`

Each file has exactly one `density="compact"` line. Removing it makes the table follow the global density like every other table.

- [ ] **Step 1: HierarchicalAnalyticsPage**

In `frontend/src/features/analytics/HierarchicalAnalyticsPage.tsx`, find:

```tsx
                rowKey={n => n.orgUnitId}
                onRowClick={n => setDrillDown(n)}
                density="compact"
                empty={<div className="text-gray-400">Нет данных</div>}
```

Replace with:

```tsx
                rowKey={n => n.orgUnitId}
                onRowClick={n => setDrillDown(n)}
                empty={<div className="text-gray-400">Нет данных</div>}
```

- [ ] **Step 2: AntiBonusAnalyticsPage**

In `frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx`, find:

```tsx
              caption="Топ-10 по антибонусным удержаниям"
              density="compact"
              empty={<span className="text-sm text-gray-400">Нет данных</span>}
```

Replace with:

```tsx
              caption="Топ-10 по антибонусным удержаниям"
              empty={<span className="text-sm text-gray-400">Нет данных</span>}
```

- [ ] **Step 3: CriteriaPage (bulk-edit preview)**

In `frontend/src/features/criteria/CriteriaPage.tsx`, find:

```tsx
            <DataTable<Criteria>
              caption="Предпросмотр массовых изменений"
              density="compact"
              rowKey={(c) => c.id}
```

Replace with:

```tsx
            <DataTable<Criteria>
              caption="Предпросмотр массовых изменений"
              rowKey={(c) => c.id}
```

- [ ] **Step 4: Verify no hardcoded density remains**

Run: `grep -rn 'density=' frontend/src`
Expected: no output (zero matches).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/analytics/HierarchicalAnalyticsPage.tsx frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx frontend/src/features/criteria/CriteriaPage.tsx
git commit -m "feat(density): drop hardcoded density props so all tables follow global"
```

---

## Task 7: Full build and manual verification

**Files:** none (verification only).

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds with no TypeScript or Vite errors.

- [ ] **Step 2: Manual browser verification**

Run `npm run dev` and confirm:

- [ ] Account menu (click the avatar in the icon rail) shows a **Плотность** toggle with **Просторно / Компактно**, below the theme toggle.
- [ ] Switching to **Компактно** tightens row height on every table: Users, Audit Log, Monitoring, Criteria list, Criteria bulk-edit preview, Calendar special days, AntiBonus top-10, Hierarchical analytics, Manager dashboard subordinates.
- [ ] Switching back to **Просторно** restores comfortable rows everywhere.
- [ ] The Users page toolbar no longer has its own density (two-row / four-row) icon control; the view-mode (table/cards) control is still present.
- [ ] Reload the page — the chosen density persists.
- [ ] Open a second tab — changing density in one tab updates the other.
- [ ] Switch language to KG — the toggle label reads **Тыгыздык** with **Кенен / Тыгыз**.

- [ ] **Step 3: Commit (if any fix was needed)**

If Steps 1-2 surfaced a fix, commit it:

```bash
git add -A
git commit -m "fix(density): address verification findings"
```

If nothing needed fixing, skip this step.

---

## Self-Review

**Spec coverage:**
- Spec §1 `useDensity` hook → Task 1.
- Spec §2 `DensityContext` + `DensityProvider` → Task 1 (definitions) + Task 2 (mounting).
- Spec §3 DataTable change → Task 3.
- Spec §4 account-menu selector → Task 4.
- Spec §5 UserTable / UsersFilters cleanup + `Density` type consolidation → Task 5. (Note: the spec said UserTable would read density "via `useDensity()`"; the plan has it read via the same exported `useDensity()` accessor — which is the context consumer — so all consumers share one value. This matches the spec's §2 "context is the single source of truth".)
- Spec §6 remove hardcoded density props → Task 6.
- Spec §7 i18n keys → Task 4 Steps 1-2.

**Placeholder scan:** none — all steps contain exact code and exact commands.

**Type consistency:** `Density` type sourced from `DataTable.tsx` throughout; `useDensity()` returns `{ density, setDensity }` consistently in Tasks 1, 3, 4, 5; `DensityContextValue` shape matches the context default and the `useDensityState` return.

**Testing-strategy note:** No unit tests because the frontend has no test framework; verification is `tsc` + `build` + the manual checklist in Task 7, consistent with the existing codebase.
