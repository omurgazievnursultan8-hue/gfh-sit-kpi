# Shell Redesign — Sidebar & Topbar

**Date:** 2026-05-10  
**Status:** Approved  
**Reference:** `/home/azamat/Downloads/Обзор (1).html`

---

## Overview

Replace the current flat sidebar + white header with a two-panel navigation shell matching the reference design:
- **Icon rail** (72px, always visible) — section icons, bottom actions
- **Nav panel** (244px, slides in as overlay) — grouped nav items, user card footer
- **Topbar** (56px, sticky) — breadcrumbs, lang toggle, notifications, avatar

Admin sidebar merged into unified nav. Dark/light theme toggle included (functional).

---

## Design Tokens

Add CSS custom properties to `src/index.css` matching the reference palette:

```css
:root {
  --bg: #f4f1ea;
  --bg-soft: #ebe6db;
  --surface: #ffffff;
  --surface-mute: #faf8f3;
  --ink: #0e1714;
  --ink-soft: #344843;
  --ink-faint: #6b7c77;
  --ink-dim: #98a8a3;
  --line: #d8d2c2;
  --line-soft: #e7e2d4;
  --line-strong: #b9b1a0;
  --accent: #0d4d3f;
  --accent-2: #1a7558;
  --accent-soft: #d6e9e0;
  --accent-mute: #ebf5f0;
  --accent-ink: #08362b;
  --gold: #a8852b;
  --gold-soft: #f5ecd2;
  --warn: #b25a16;
  --warn-soft: #f8e9d8;
  --danger: #a31f1f;
  --danger-soft: #fadcdc;
  --info: #1f4e85;
  --info-soft: #d8e4f3;
  --rail-w: 72px;
  --nav-w: 244px;
  --rail-bg-1: #082420;
  --rail-bg-2: #061814;
  --nav-bg-1: #163b34;
  --nav-bg-2: #11302a;
  --font-text: "Inter", "Segoe UI", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --font-display: "Source Serif Pro", Georgia, serif;
}

[data-theme="dark"] {
  --bg: #0d1714;
  --bg-soft: #122019;
  --surface: #182a23;
  --surface-mute: #14241e;
  --ink: #e8efec;
  --ink-soft: #b6c3bf;
  --ink-faint: #7e9591;
  --ink-dim: #5b716c;
  --line: #1f3329;
  --line-soft: #182a23;
  --line-strong: #294539;
  --accent-soft: rgba(26,117,88,0.20);
  --accent-mute: rgba(26,117,88,0.08);
}
```

Google Fonts import (Inter + Source Serif Pro + JetBrains Mono) added to `index.html`.

---

## Nav Config (`src/components/shell/navConfig.ts`)

Three sections; each section has groups; each group has items.

### Section: cabinet — "Мой кабинет"
Icon: Home

| Route | Label key | Roles |
|-------|-----------|-------|
| /dashboard | nav.dashboard | ALL |
| /my-kpi | nav.myKpi | EMPLOYEE, HOD_UNIT, HOD, DEPUTY, CHAIRMAN |
| /my-evaluations | nav.myEvaluations | ALL |
| /evaluations | nav.evaluations | ALL |
| /my-tasks | nav.myTasks | ADMIN, CHAIRMAN, DEPUTY, HOD, HOD_UNIT |
| /manager-tasks | nav.managerTasks | ADMIN, CHAIRMAN, DEPUTY, HOD, HOD_UNIT |

### Section: analytics — "Аналитика"
Icon: BarChart2

| Route | Label key | Roles |
|-------|-----------|-------|
| /criteria | nav.criteria | ADMIN, CHAIRMAN, DEPUTY, HOD, HOD_UNIT |
| /manager-dashboard | nav.managerDashboard | ADMIN, CHAIRMAN, DEPUTY, HOD, HOD_UNIT |
| /analytics | nav.analytics | ADMIN, CHAIRMAN, DEPUTY, HOD, HOD_UNIT |
| /analytics/hierarchical | nav.hierarchical | ADMIN, CHAIRMAN, DEPUTY |
| /analytics/anti-bonus | nav.antiBonusAnalytics | ADMIN, CHAIRMAN, DEPUTY, HOD |

### Section: admin — "Администрирование"
Icon: Shield  
Roles: ADMIN only (entire section)

| Route | Label key | Icon |
|-------|-----------|------|
| /admin | admin.stats | BarChart3 |
| /admin/users | admin.users | Users |
| /admin/org | admin.orgStructure | Building2 |
| /admin/criteria | admin.criteria | ListChecks |
| /admin/periods | admin.periods | Calendar |
| /admin/delegations | admin.delegations | GitBranch |
| /admin/settings | admin.settings | Settings |
| /admin/calendar | admin.calendar | CalendarDays |
| /admin/audit | admin.auditLog | ClipboardList |
| /admin/monitoring | admin.monitoring | Activity |

Additionally `/audit` and `/users`, `/org`, `/settings`, `/calendar` from old main sidebar are removed — they are covered by admin panel routes above.

---

## Icon Rail (`src/components/shell/IconRail.tsx`)

```
[Logo square "АСУ"]
[divider]
[rail-icon: cabinet]  ← active if cabinet section open
[rail-icon: analytics]
[rail-icon: admin]    ← only shown if ADMIN role
[spacer]
[theme toggle icon]
[logout icon]
[avatar circle: initials, gold bg]
```

**Behavior:**
- Click rail icon → opens nav panel for that section (or closes if same section already open)
- Active section icon has gold left-border indicator + highlighted background
- Tooltip on hover (after 400ms delay): section name
- Avatar tooltip: user full name (derived from email until profile API added)
- Logout icon triggers `logoutAction()` directly

**Visual:**
- Background: `linear-gradient(180deg, var(--rail-bg-1) 0%, var(--rail-bg-2) 100%)`
- Grid texture overlay via `::before` pseudo-element (repeating-linear-gradient)
- Rail width: 72px, sticky, full height
- Logo: 52px square, rounded-12, gradient accent bg, "АСУ" in gold serif font

---

## Nav Panel (`src/components/shell/NavPanel.tsx`)

Slides in from left at `left: var(--rail-w)`, `position: fixed`, `width: var(--nav-w)`, `height: 100vh`, `z-index: 24`.

Transform: `translateX(-100%)` hidden → `translateX(0)` visible, `transition: 0.24s cubic-bezier(0.4,0,0.2,1)`.

**Structure:**
```
[brand header: section name + subtitle]
[scrollable nav items — grouped]
[footer: user card → profile popover]
```

**Nav item active state:** Gold left-border + gold text + semi-transparent green bg.

**Footer user card:** Shows avatar + name (from email) + role label. Clicking opens `profile-popover`:
- Профиль
- Сменить пароль
- divider
- Выход (danger, triggers `logoutAction()`)

**Close behavior:** Click outside nav panel (on overlay or content area) closes panel. ESC key also closes.

---

## Topbar (`src/components/shell/Topbar.tsx`)

Height: 56px, `position: sticky; top: 0; z-index: 5`.  
Background: `color-mix(in srgb, var(--bg) 85%, transparent)` + `backdrop-filter: blur(8px)`.

**Left:**
- Hamburger button (mobile only, hidden ≥768px) — opens nav panel
- Breadcrumbs: `ГЛАВНАЯ / <CURRENT PAGE>` in mono font, uppercase, 12px

**Right:**
- Lang toggle pill: `[RU] [KG]` — calls `i18n.changeLanguage()`, active option has accent bg
- Notification bell icon + red dot if `unreadCount > 0`
- Avatar circle (30px, gold, initials) — clicking opens profile popover (same as nav panel footer)

---

## AppShell (`src/components/shell/AppShell.tsx`)

Replaces `Layout.tsx`. Provides the grid structure:

```
<div style="display: grid; grid-template-columns: var(--rail-w) 1fr; min-height: 100vh">
  <IconRail />
  <NavPanel />            ← fixed overlay, not in grid flow
  <MobileOverlay />       ← backdrop when panel open on mobile
  <main style="display: flex; flex-direction: column; min-width: 0">
    <Topbar />
    <div style="flex: 1; overflow: auto">
      {children}
    </div>
  </main>
</div>
```

State: `activeSection: 'cabinet' | 'analytics' | 'admin' | null` — controlled in AppShell, passed down via props. Opening a section sets `activeSection`; clicking same section or outside closes it.

---

## PageContext (`src/context/PageContext.tsx`)

```ts
const PageContext = createContext<{ setTitle: (key: string) => void }>()

export function PageTitleProvider({ children }) { ... }

export function usePageTitle(key: string) {
  const { setTitle } = useContext(PageContext)
  useEffect(() => { setTitle(key) }, [key])
}
```

`Topbar` reads `title` from context and translates it for the breadcrumb. `AppShell` wraps children with `PageTitleProvider`.

---

## Theme Hook (`src/hooks/useTheme.ts`)

```ts
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('gfh_theme') ?? 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gfh_theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')
  return { theme, toggle }
}
```

---

## Layout Changes

**`src/components/Layout.tsx`** → replace contents: render `<AppShell>{children}</AppShell>`.

**`src/features/admin/AdminLayout.tsx`** → remove `AdminSidebar`. The layout from AppShell already handles nav. AdminLayout just renders `<Outlet />` (or is removed entirely if App.tsx can use Layout directly for admin routes).

**Deleted files:**
- `src/components/Sidebar.tsx`
- `src/components/Header.tsx`
- `src/features/admin/AdminSidebar.tsx`

---

## Mobile Behavior

At `max-width: 768px`:
- Grid becomes `1fr` (rail hidden via `position: fixed; transform: translateX(-100%)`)
- Hamburger in topbar triggers mobile nav open: rail slides in + nav panel follows
- `MobileOverlay` (semi-transparent backdrop) covers content, click closes panel

---

## Constraints

- No changes to main page content (deferred)
- Keep all existing routes unchanged
- Keep existing i18n keys; do not add new translation keys unless nav items need them
- `LanguageSwitcher` component replaced by inline pill in Topbar (can delete `LanguageSwitcher.tsx` if unused elsewhere)
- Notifications dropdown from old Header preserved in Topbar bell
