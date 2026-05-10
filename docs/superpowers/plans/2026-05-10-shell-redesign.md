# Shell Redesign — Sidebar & Topbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current flat Sidebar + white Header with a two-panel navigation shell (72px icon rail + 244px sliding nav panel + 56px topbar) matching the reference design, with dark/light theme toggle and breadcrumb context.

**Architecture:** `AppShell` wraps the entire app at `main.tsx` level, reads auth state, and conditionally renders the shell (hidden on auth/change-password pages). `Layout` is simplified to a content-padding wrapper. All nav config lives in `navConfig.ts` with role-based item visibility. Old `Sidebar`, `Header`, `AdminSidebar` are deleted.

**Tech Stack:** React 18, Redux Toolkit, React Router v6, Tailwind CSS, lucide-react, react-i18next, CSS custom properties.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `public/index.html` | Add Google Fonts (Inter, Source Serif Pro, JetBrains Mono) |
| Modify | `src/index.css` | CSS design tokens + dark theme + shell CSS classes |
| Modify | `frontend/public/locales/ru/translation.json` | Add nav.cabinet, nav.home, group keys, subtitles |
| Modify | `frontend/public/locales/kg/translation.json` | Same in Kyrgyz |
| Create | `src/context/PageContext.tsx` | Breadcrumb title context |
| Create | `src/hooks/useTheme.ts` | Dark/light theme toggle via localStorage |
| Create | `src/components/shell/navConfig.ts` | Sections → groups → items with roles |
| Create | `src/components/shell/IconRail.tsx` | 72px sticky icon rail |
| Create | `src/components/shell/NavPanel.tsx` | 244px sliding nav panel + user footer |
| Create | `src/components/shell/Topbar.tsx` | 56px topbar: crumbs + lang + bell + avatar |
| Create | `src/components/shell/AppShell.tsx` | Root layout, composes all shell pieces |
| Modify | `src/main.tsx` | Wrap `<App>` with `<AppShell>` |
| Modify | `src/components/Layout.tsx` | Simplify to content-padding div |
| Modify | `src/features/admin/AdminLayout.tsx` | Remove AdminSidebar, render Outlet |
| Modify | `src/features/admin/AdminDashboardPage.tsx` | Add `<Layout>` wrapper |
| Modify | `src/features/admin/AuditLogPage.tsx` | Add `<Layout>` wrapper |
| Modify | `src/features/admin/AdminMonitoringPage.tsx` | Add `<Layout>` wrapper |
| Delete | `src/components/Sidebar.tsx` | Replaced by IconRail + NavPanel |
| Delete | `src/components/Header.tsx` | Replaced by Topbar |
| Delete | `src/components/LanguageSwitcher.tsx` | Inlined into Topbar |
| Delete | `src/features/admin/AdminSidebar.tsx` | Merged into navConfig |

---

## Task 1: Google Fonts + Design Tokens

**Files:**
- Modify: `public/index.html`
- Modify: `src/index.css`

- [ ] **Step 1: Add Google Fonts to index.html**

Replace `public/index.html` with:
```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GFH KPI</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;550;600;700&family=Source+Serif+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Add CSS design tokens to the TOP of `src/index.css`** (before existing rules)

Prepend:
```css
/* ===== Design Tokens ===== */
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
  --shadow-sm: 0 1px 2px rgba(15,23,20,0.06);
  --shadow-md: 0 4px 12px -4px rgba(15,23,20,0.10),0 2px 4px -2px rgba(15,23,20,0.06);
  --shadow-lg: 0 24px 60px -20px rgba(8,22,18,0.18),0 8px 20px -8px rgba(8,22,18,0.10);
  --radius: 6px;
  --radius-lg: 10px;
  --radius-xl: 14px;
  --font-text: "Inter","Segoe UI",system-ui,-apple-system,sans-serif;
  --font-mono: "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --font-display: "Source Serif Pro","Georgia",serif;
  --rail-w: 72px;
  --nav-w: 244px;
  --rail-bg-1: #082420;
  --rail-bg-2: #061814;
  --nav-bg-1: #163b34;
  --nav-bg-2: #11302a;
  --nav-ink: #d6dfdc;
  --nav-ink-soft: #b6c3bf;
  --nav-ink-faint: #6f8884;
  --nav-ink-dim: #5b716c;
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

html, body {
  margin: 0; padding: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-text);
  font-size: 14px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

*, *::before, *::after { box-sizing: border-box; }
```

- [ ] **Step 3: Verify type check passes**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors (no TS files changed yet).

- [ ] **Step 4: Commit**

```bash
git add public/index.html src/index.css
git commit -m "feat(shell): add design tokens and Google Fonts"
```

---

## Task 2: Shell CSS Classes

**Files:**
- Modify: `src/index.css` (append to end)

- [ ] **Step 1: Append shell CSS to `src/index.css`**

```css
/* ===== Shell CSS ===== */

/* Layout grid */
.app-shell {
  display: grid;
  grid-template-columns: var(--rail-w) 1fr;
  min-height: 100vh;
}
.app-shell-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: radial-gradient(circle at 100% 0, rgba(13,77,63,0.05), transparent 50%), var(--bg);
}

/* ===== Icon Rail ===== */
.icon-rail {
  background: linear-gradient(180deg, var(--rail-bg-1) 0%, var(--rail-bg-2) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 0 16px;
  gap: 6px;
  position: sticky;
  top: 0;
  height: 100vh;
  border-right: 1px solid #04100c;
  z-index: 25;
  overflow: hidden;
}
.icon-rail::before {
  content: "";
  position: absolute; inset: 0;
  background-image:
    repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.014) 0 1px, transparent 1px 4px);
  pointer-events: none;
}
.icon-rail > * { position: relative; }

.rail-logo {
  width: 52px; height: 52px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-2) 0%, var(--accent) 100%);
  display: grid; place-items: center;
  margin-bottom: 16px; flex: none;
  border: 1px solid rgba(245,236,210,0.20);
  position: relative; cursor: pointer;
  transition: transform 0.15s ease;
  text-decoration: none;
}
.rail-logo:hover { transform: scale(1.04); }
.rail-logo span {
  font-family: var(--font-display);
  font-size: 17px; font-weight: 600;
  color: var(--gold-soft);
  letter-spacing: 0.02em;
}

.rail-divider {
  width: 24px; height: 1px;
  background: rgba(255,255,255,0.06);
  margin-bottom: 10px;
  flex: none;
}

.rail-icon {
  width: 54px; height: 54px;
  border-radius: 11px;
  display: grid; place-items: center;
  color: #8a9d99; cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  position: relative;
  background: none; border: none; padding: 0;
  flex: none;
}
.rail-icon:hover { background: rgba(255,255,255,0.05); color: #e5ece9; }
.rail-icon.active {
  background: linear-gradient(135deg, rgba(26,117,88,0.32), rgba(26,117,88,0.10));
  color: var(--gold-soft);
}
.rail-icon.active::after {
  content: "";
  position: absolute; left: -9px; top: 13px; bottom: 13px;
  width: 2.5px;
  background: var(--gold);
  border-radius: 0 2px 2px 0;
}
.rail-icon svg { width: 27px; height: 27px; stroke-width: 1.6; }

.rail-tooltip {
  position: absolute;
  left: calc(100% + 12px); top: 50%;
  transform: translateY(-50%);
  background: #0e1714; color: var(--gold-soft);
  font-family: var(--font-mono);
  font-size: 11px; white-space: nowrap;
  padding: 5px 10px; border-radius: 6px;
  border: 1px solid rgba(245,236,210,0.10);
  pointer-events: none; z-index: 100;
  letter-spacing: 0.04em; text-transform: uppercase;
  opacity: 0; transition: opacity 0.15s ease 0.4s;
}
.rail-icon:hover .rail-tooltip,
.rail-logo:hover .rail-tooltip,
.rail-action:hover .rail-tooltip,
.rail-avatar-btn:hover .rail-tooltip { opacity: 1; transition-delay: 0.5s; }

.rail-spacer { flex: 1; }

.rail-action {
  width: 50px; height: 50px;
  border-radius: 10px;
  display: grid; place-items: center;
  color: #5b716c; cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  position: relative;
  background: none; border: none; padding: 0; flex: none;
}
.rail-action:hover { background: rgba(255,255,255,0.05); color: #e5ece9; }
.rail-action svg { width: 22px; height: 22px; stroke-width: 1.7; }
.rail-action.logout:hover { color: #f5b8b8; }

.rail-avatar-btn {
  width: 50px; height: 50px;
  border-radius: 999px;
  background: var(--gold); color: #1a1306;
  font-family: var(--font-display);
  font-weight: 600; font-size: 17px;
  display: grid; place-items: center;
  cursor: pointer; flex: none;
  position: relative; margin-top: 4px;
  border: none; padding: 0;
}
.rail-avatar-btn::after {
  content: "";
  position: absolute; bottom: -1px; right: -1px;
  width: 13px; height: 13px; border-radius: 999px;
  background: var(--accent-2);
  border: 2px solid var(--rail-bg-2);
}

/* ===== Nav Panel ===== */
.nav-panel {
  background: linear-gradient(180deg, var(--nav-bg-1) 0%, var(--nav-bg-2) 100%);
  color: var(--nav-ink);
  display: flex; flex-direction: column;
  border-right: 1px solid #06120f;
  position: fixed; top: 0; left: var(--rail-w);
  height: 100vh; width: var(--nav-w);
  z-index: 24;
  transform: translateX(-100%);
  transition: transform 0.24s cubic-bezier(0.4,0,0.2,1), box-shadow 0.24s ease;
  pointer-events: none;
}
.nav-panel.nav-panel--visible {
  transform: translateX(0);
  box-shadow: 8px 0 32px rgba(8,22,18,0.30);
  pointer-events: auto;
}
.nav-panel > * { position: relative; }

.nav-brand {
  padding: 16px 4px 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: relative; flex: none;
}
.nav-brand::before {
  content: "";
  position: absolute; left: 0; top: 18px; bottom: 24px;
  width: 2px; background: var(--gold); border-radius: 2px;
}
.nav-brand-name {
  font-family: var(--font-display);
  font-size: 18px; font-weight: 600;
  color: var(--gold-soft);
  white-space: nowrap; line-height: 1.2;
}
.nav-brand-sub {
  font-family: var(--font-mono);
  font-size: 10px; color: var(--nav-ink-faint);
  letter-spacing: 0.05em; text-transform: uppercase;
  margin-top: 5px; white-space: nowrap;
}

.nav-scroll {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 4px 14px 14px;
}

.nav-group { margin-bottom: 6px; }
.nav-group + .nav-group {
  border-top: 1px solid rgba(255,255,255,0.05);
  margin-top: 8px; padding-top: 6px;
}
.nav-group-title {
  font-family: var(--font-mono);
  font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--nav-ink-dim);
  padding: 12px 10px 6px; font-weight: 500;
}

.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 10px; border-radius: 7px;
  color: var(--nav-ink-soft);
  font-size: 13.5px;
  position: relative;
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap; overflow: hidden;
  cursor: pointer; text-decoration: none;
  background: none; border: none; width: 100%;
  text-align: left; font-family: inherit;
}
.nav-item:hover { background: rgba(255,255,255,0.04); color: #ecf2f0; }
.nav-item.nav-item--active {
  background: linear-gradient(90deg, rgba(26,117,88,0.22), rgba(26,117,88,0.06));
  color: var(--gold-soft);
}
.nav-item.nav-item--active::before {
  content: "";
  position: absolute; left: -14px; top: 8px; bottom: 8px;
  width: 2px; background: var(--gold); border-radius: 2px;
}
.nav-item svg { width: 18px; height: 18px; stroke-width: 1.5; flex: none; }
.nav-item-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.nav-footer {
  flex: none;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 10px; position: relative;
}
.me-card {
  display: flex; gap: 10px; align-items: center;
  padding: 8px; border-radius: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  transition: background 0.12s ease;
  width: 100%; text-align: left;
  color: inherit; font-family: inherit;
}
.me-card:hover { background: rgba(255,255,255,0.06); }
.me-avatar {
  width: 34px; height: 34px; border-radius: 999px;
  background: var(--gold); color: #1a1306;
  font-weight: 600; font-size: 13px;
  display: grid; place-items: center;
  flex: none; font-family: var(--font-display);
}
.me-name {
  color: var(--gold-soft); font-size: 13px; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.me-role {
  font-family: var(--font-mono); color: #7e9591;
  font-size: 10px; text-transform: uppercase;
  letter-spacing: 0.06em; margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.me-more { color: #5b716c; flex: none; margin-left: auto; }

.profile-popover {
  position: absolute; bottom: calc(100% + 8px); left: 10px; right: 10px;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: 0 -4px 24px rgba(8,22,18,0.18);
  padding: 6px;
  opacity: 0; transform: translateY(8px);
  transition: opacity 0.16s ease, transform 0.16s ease;
  pointer-events: none; z-index: 60;
}
.profile-popover.profile-popover--visible {
  opacity: 1; transform: translateY(0); pointer-events: auto;
}
.profile-popover-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 6px;
  color: var(--ink); font-size: 13px; font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease;
  width: 100%; text-align: left;
  background: none; border: 0; font-family: inherit;
}
.profile-popover-item:hover { background: var(--bg-soft); }
.profile-popover-item.danger { color: var(--danger); }
.profile-popover-divider { height: 1px; background: var(--line-soft); margin: 4px 6px; }

/* ===== Topbar ===== */
.app-topbar {
  height: 56px;
  border-bottom: 1px solid var(--line-soft);
  padding: 0 24px;
  display: flex; align-items: center; gap: 14px;
  flex: none; position: sticky; top: 0; z-index: 5;
  backdrop-filter: blur(8px);
  background: color-mix(in srgb, var(--bg) 85%, transparent);
}
.topbar-crumbs {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-mono); font-size: 12px;
  color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.06em;
  overflow: hidden; white-space: nowrap;
}
.topbar-crumbs .sep { color: var(--ink-dim); margin: 0 2px; }
.topbar-crumbs .current { color: var(--ink); font-weight: 600; }
.topbar-actions { margin-left: auto; display: flex; gap: 6px; align-items: center; }

.lang-toggle {
  display: inline-flex;
  background: var(--surface); border: 1px solid var(--line-soft);
  border-radius: 999px; padding: 2px;
  font-family: var(--font-mono); margin-right: 4px;
}
.lang-toggle button {
  padding: 4px 11px; font-size: 11px; font-weight: 600;
  color: var(--ink-faint); border-radius: 999px;
  background: none; border: 0; cursor: pointer;
  font-family: inherit; letter-spacing: 0.05em;
}
.lang-toggle button.lang-active { background: var(--accent); color: var(--gold-soft); }

.topbar-iconbtn {
  width: 36px; height: 36px; border-radius: 8px;
  display: grid; place-items: center;
  color: var(--ink-soft); position: relative;
  transition: background 0.15s ease;
  background: none; border: none; cursor: pointer;
}
.topbar-iconbtn:hover { background: var(--bg-soft); }
.topbar-iconbtn svg { width: 18px; height: 18px; }
.topbar-dot-notif {
  position: absolute; top: 8px; right: 9px;
  width: 7px; height: 7px; border-radius: 999px;
  background: var(--danger); border: 1.5px solid var(--bg);
}

.topbar-avatar {
  width: 30px; height: 30px; border-radius: 999px;
  background: var(--gold); color: #1a1306;
  font-family: var(--font-display); font-weight: 600; font-size: 12px;
  display: grid; place-items: center;
  margin-left: 4px; flex: none; border: none; cursor: default;
}

.hamburger {
  width: 36px; height: 36px; border-radius: 8px;
  display: none; align-items: center; justify-content: center;
  color: var(--ink-soft); background: none; border: 0;
  cursor: pointer; transition: background 0.15s ease;
}
.hamburger:hover { background: var(--bg-soft); }
.hamburger svg { width: 20px; height: 20px; stroke: currentColor; fill: none; stroke-width: 1.6; stroke-linecap: round; }

/* Mobile overlay */
.mobile-overlay {
  position: fixed; inset: 0;
  background: rgba(8,22,18,0.50);
  z-index: 22;
}

/* Responsive */
@media (max-width: 768px) {
  .app-shell { grid-template-columns: 1fr; }
  .icon-rail {
    position: fixed; left: 0;
    transform: translateX(-100%);
    transition: transform 0.24s ease;
  }
  .icon-rail.icon-rail--mobile-open { transform: translateX(0); }
  .nav-panel { left: var(--rail-w); }
  .hamburger { display: flex; }
}
```

- [ ] **Step 2: Verify no CSS syntax errors by checking the dev server starts**

```bash
cd frontend && npm run dev &
sleep 3 && kill %1
```
Expected: server starts without errors (Vite reports no issues).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(shell): add shell CSS classes (icon-rail, nav-panel, topbar)"
```

---

## Task 3: i18n — New Keys

**Files:**
- Modify: `frontend/public/locales/ru/translation.json`
- Modify: `frontend/public/locales/kg/translation.json`

- [ ] **Step 1: Add keys to Russian translation**

In `frontend/public/locales/ru/translation.json`, inside the `"nav"` object, add these entries:
```json
"home": "Главная",
"cabinet": "Мой кабинет",
"cabinetSub": "Личный кабинет",
"analyticsSub": "Отчёты и аналитика",
"adminSub": "Управление системой",
"groupMain": "Основное",
"groupTasks": "Задачи",
"groupAnalytics": "Отчёты",
"groupAdmin": "Управление",
"groupSystem": "Система"
```

- [ ] **Step 2: Add keys to Kyrgyz translation**

In `frontend/public/locales/kg/translation.json`, inside the `"nav"` object, add:
```json
"home": "Башкы",
"cabinet": "Менин кабинетим",
"cabinetSub": "Жеке кабинет",
"analyticsSub": "Отчёттор жана аналитика",
"adminSub": "Системаны башкаруу",
"groupMain": "Негизги",
"groupTasks": "Тапшырмалар",
"groupAnalytics": "Отчёттор",
"groupAdmin": "Башкаруу",
"groupSystem": "Система"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/public/locales/ru/translation.json frontend/public/locales/kg/translation.json
git commit -m "feat(shell): add shell i18n keys (ru + kg)"
```

---

## Task 4: PageContext + useTheme

**Files:**
- Create: `src/context/PageContext.tsx`
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Create `src/context/PageContext.tsx`**

```tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface PageContextValue {
  titleKey: string
  setTitleKey: (key: string) => void
}

const PageContext = createContext<PageContextValue>({ titleKey: '', setTitleKey: () => {} })

export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [titleKey, setTitleKey] = useState('')
  const set = useCallback((key: string) => setTitleKey(key), [])
  return (
    <PageContext.Provider value={{ titleKey, setTitleKey: set }}>
      {children}
    </PageContext.Provider>
  )
}

export function usePageTitle(key: string) {
  const { setTitleKey } = useContext(PageContext)
  useEffect(() => {
    setTitleKey(key)
    return () => setTitleKey('')
  }, [key, setTitleKey])
}

export function usePageTitleKey(): string {
  return useContext(PageContext).titleKey
}
```

- [ ] **Step 2: Create `src/hooks/useTheme.ts`**

```ts
import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('gfh_theme') as 'light' | 'dark') ?? 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gfh_theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  return { theme, toggle }
}
```

- [ ] **Step 3: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/context/PageContext.tsx src/hooks/useTheme.ts
git commit -m "feat(shell): add PageContext and useTheme hook"
```

---

## Task 5: navConfig.ts

**Files:**
- Create: `src/components/shell/navConfig.ts`

- [ ] **Step 1: Create `src/components/shell/navConfig.ts`**

```ts
import type { ElementType } from 'react'
import {
  Home, BarChart2, Shield,
  LayoutDashboard, Target, FileCheck, ClipboardCheck, CheckSquare, ListTodo,
  ListChecks, TrendingUp, Building2, BarChart3,
  Users, GitBranch, Settings, CalendarDays, ClipboardList, Activity, Calendar,
} from 'lucide-react'

export type Role =
  | 'ADMIN'
  | 'CHAIRMAN'
  | 'DEPUTY_CHAIRMAN'
  | 'HEAD_OF_DEPARTMENT'
  | 'HEAD_OF_DEPARTMENT_UNIT'
  | 'EMPLOYEE'

export type SectionKey = 'cabinet' | 'analytics' | 'admin'

export interface NavItem {
  to: string
  labelKey: string
  icon: ElementType
  end?: boolean
  roles: Role[]
}

export interface NavGroup {
  groupKey: string
  items: NavItem[]
}

export interface NavSection {
  key: SectionKey
  labelKey: string
  subKey: string
  icon: ElementType
  roles: Role[]
  groups: NavGroup[]
}

const ALL_ROLES: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT', 'EMPLOYEE']
const MANAGERS: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT', 'HEAD_OF_DEPARTMENT_UNIT']
const TOP: Role[] = ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN']
const ADMIN_ONLY: Role[] = ['ADMIN']

export const NAV_SECTIONS: NavSection[] = [
  {
    key: 'cabinet',
    labelKey: 'nav.cabinet',
    subKey: 'nav.cabinetSub',
    icon: Home,
    roles: ALL_ROLES,
    groups: [
      {
        groupKey: 'nav.groupMain',
        items: [
          { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true, roles: ALL_ROLES },
          { to: '/my-kpi', labelKey: 'nav.myKpi', icon: Target, roles: ['EMPLOYEE', 'HEAD_OF_DEPARTMENT_UNIT', 'HEAD_OF_DEPARTMENT', 'DEPUTY_CHAIRMAN', 'CHAIRMAN'] },
          { to: '/my-evaluations', labelKey: 'nav.myEvaluations', icon: FileCheck, roles: ALL_ROLES },
          { to: '/evaluations', labelKey: 'nav.evaluations', icon: ClipboardCheck, roles: ALL_ROLES },
        ],
      },
      {
        groupKey: 'nav.groupTasks',
        items: [
          { to: '/my-tasks', labelKey: 'nav.myTasks', icon: CheckSquare, roles: MANAGERS },
          { to: '/manager-tasks', labelKey: 'nav.managerTasks', icon: ListTodo, roles: MANAGERS },
        ],
      },
    ],
  },
  {
    key: 'analytics',
    labelKey: 'nav.analytics',
    subKey: 'nav.analyticsSub',
    icon: BarChart2,
    roles: MANAGERS,
    groups: [
      {
        groupKey: 'nav.groupAnalytics',
        items: [
          { to: '/criteria', labelKey: 'nav.criteria', icon: ListChecks, roles: MANAGERS },
          { to: '/manager-dashboard', labelKey: 'nav.managerDashboard', icon: TrendingUp, roles: MANAGERS },
          { to: '/analytics', labelKey: 'nav.analytics', icon: BarChart2, end: true, roles: MANAGERS },
          { to: '/analytics/hierarchical', labelKey: 'nav.hierarchical', icon: Building2, roles: TOP },
          { to: '/analytics/anti-bonus', labelKey: 'nav.antiBonusAnalytics', icon: BarChart3, roles: ['ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'HEAD_OF_DEPARTMENT'] },
        ],
      },
    ],
  },
  {
    key: 'admin',
    labelKey: 'nav.adminPanel',
    subKey: 'nav.adminSub',
    icon: Shield,
    roles: ADMIN_ONLY,
    groups: [
      {
        groupKey: 'nav.groupAdmin',
        items: [
          { to: '/admin', labelKey: 'admin.stats', icon: BarChart3, end: true, roles: ADMIN_ONLY },
          { to: '/admin/users', labelKey: 'admin.users', icon: Users, roles: ADMIN_ONLY },
          { to: '/admin/org', labelKey: 'admin.orgStructure', icon: Building2, roles: ADMIN_ONLY },
          { to: '/admin/criteria', labelKey: 'admin.criteria', icon: ListChecks, roles: ADMIN_ONLY },
          { to: '/admin/periods', labelKey: 'admin.periods', icon: Calendar, roles: ADMIN_ONLY },
          { to: '/admin/delegations', labelKey: 'admin.delegations', icon: GitBranch, roles: ADMIN_ONLY },
        ],
      },
      {
        groupKey: 'nav.groupSystem',
        items: [
          { to: '/admin/settings', labelKey: 'admin.settings', icon: Settings, roles: ADMIN_ONLY },
          { to: '/admin/calendar', labelKey: 'admin.calendar', icon: CalendarDays, roles: ADMIN_ONLY },
          { to: '/admin/audit', labelKey: 'admin.auditLog', icon: ClipboardList, roles: ADMIN_ONLY },
          { to: '/admin/monitoring', labelKey: 'admin.monitoring', icon: Activity, roles: ADMIN_ONLY },
        ],
      },
    ],
  },
]
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/navConfig.ts
git commit -m "feat(shell): add navConfig with three sections and role-gated items"
```

---

## Task 6: IconRail.tsx

**Files:**
- Create: `src/components/shell/IconRail.tsx`

- [ ] **Step 1: Create `src/components/shell/IconRail.tsx`**

```tsx
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role } from './navConfig'
import { RootState, AppDispatch } from '../../app/store'
import { logoutAction } from '../../features/auth/authSlice'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from 'react-i18next'

function getInitials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split('.')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

interface IconRailProps {
  activeSection: SectionKey | null
  onSectionClick: (section: SectionKey) => void
  mobileOpen: boolean
}

export function IconRail({ activeSection, onSectionClick, mobileOpen }: IconRailProps) {
  const { t } = useTranslation()
  const { role, email } = useSelector((s: RootState) => s.auth)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  const visibleSections = NAV_SECTIONS.filter(
    s => role && s.roles.includes(role as Role)
  )
  const initials = email ? getInitials(email) : '?'

  const handleLogout = async () => {
    await dispatch(logoutAction())
    navigate('/login')
  }

  return (
    <aside className={`icon-rail${mobileOpen ? ' icon-rail--mobile-open' : ''}`}>
      <a href="/dashboard" className="rail-logo">
        <span>АСУ</span>
        <div className="rail-tooltip">АСУ КПИ</div>
      </a>

      <div className="rail-divider" />

      {visibleSections.map(section => {
        const Icon = section.icon
        return (
          <button
            key={section.key}
            className={`rail-icon${activeSection === section.key ? ' active' : ''}`}
            onClick={() => onSectionClick(section.key)}
            type="button"
          >
            <Icon />
            <div className="rail-tooltip">{t(section.labelKey)}</div>
          </button>
        )
      })}

      <div className="rail-spacer" />

      <button className="rail-action" onClick={toggle} type="button">
        {theme === 'dark' ? <Sun /> : <Moon />}
        <div className="rail-tooltip">{theme === 'dark' ? t('nav.lightTheme', 'Светлая') : t('nav.darkTheme', 'Тёмная')}</div>
      </button>

      <button className="rail-action logout" onClick={handleLogout} type="button">
        <LogOut />
        <div className="rail-tooltip">{t('nav.logout')}</div>
      </button>

      <button className="rail-avatar-btn" type="button" title={email ?? ''}>
        {initials}
        <div className="rail-tooltip">{email}</div>
      </button>
    </aside>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/IconRail.tsx
git commit -m "feat(shell): add IconRail component"
```

---

## Task 7: NavPanel.tsx

**Files:**
- Create: `src/components/shell/NavPanel.tsx`

- [ ] **Step 1: Create `src/components/shell/NavPanel.tsx`**

```tsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, User, Lock, LogOut } from 'lucide-react'
import { NAV_SECTIONS, SectionKey, Role } from './navConfig'
import { RootState, AppDispatch } from '../../app/store'
import { logoutAction } from '../../features/auth/authSlice'

function getInitials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split('.')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'Администратор',
    CHAIRMAN: 'Председатель',
    DEPUTY_CHAIRMAN: 'Зам. председателя',
    HEAD_OF_DEPARTMENT: 'Нач. отдела',
    HEAD_OF_DEPARTMENT_UNIT: 'Нач. подотдела',
    EMPLOYEE: 'Сотрудник',
  }
  return map[role] ?? role
}

interface NavPanelProps {
  activeSection: SectionKey | null
  onClose: () => void
}

export function NavPanel({ activeSection, onClose }: NavPanelProps) {
  const { t } = useTranslation()
  const { role, email } = useSelector((s: RootState) => s.auth)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [popoverOpen, setPopoverOpen] = useState(false)

  const section = activeSection ? NAV_SECTIONS.find(s => s.key === activeSection) ?? null : null

  const visibleGroups = section
    ? section.groups.map(g => ({
        ...g,
        items: g.items.filter(item => role && item.roles.includes(role as Role)),
      })).filter(g => g.items.length > 0)
    : []

  const initials = email ? getInitials(email) : '?'

  const handleLogout = async () => {
    setPopoverOpen(false)
    onClose()
    await dispatch(logoutAction())
    navigate('/login')
  }

  return (
    <div className={`nav-panel${section ? ' nav-panel--visible' : ''}`}>
      {section && (
        <>
          <div className="nav-brand">
            <div className="nav-brand-name">{t(section.labelKey)}</div>
            <div className="nav-brand-sub">{t(section.subKey)}</div>
          </div>

          <div className="nav-scroll">
            {visibleGroups.map(group => (
              <div key={group.groupKey} className="nav-group">
                <div className="nav-group-title">{t(group.groupKey)}</div>
                {group.items.map(item => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `nav-item${isActive ? ' nav-item--active' : ''}`
                      }
                    >
                      <Icon />
                      <span className="nav-item-label">{t(item.labelKey)}</span>
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="nav-footer">
            <div className={`profile-popover${popoverOpen ? ' profile-popover--visible' : ''}`}>
              <button className="profile-popover-item" type="button"
                onClick={() => setPopoverOpen(false)}>
                <User size={16} />
                Профиль
              </button>
              <button className="profile-popover-item" type="button"
                onClick={() => { navigate('/change-password'); setPopoverOpen(false); onClose() }}>
                <Lock size={16} />
                Сменить пароль
              </button>
              <div className="profile-popover-divider" />
              <button className="profile-popover-item danger" type="button" onClick={handleLogout}>
                <LogOut size={16} />
                {t('nav.logout')}
              </button>
            </div>

            <button className="me-card" type="button" onClick={() => setPopoverOpen(o => !o)}>
              <div className="me-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="me-name">{email}</div>
                <div className="me-role">{role ? roleLabel(role) : ''}</div>
              </div>
              <div className="me-more"><MoreHorizontal size={16} /></div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/NavPanel.tsx
git commit -m "feat(shell): add NavPanel with role-filtered groups and profile popover"
```

---

## Task 8: Topbar.tsx

**Files:**
- Create: `src/components/shell/Topbar.tsx`

- [ ] **Step 1: Create `src/components/shell/Topbar.tsx`**

```tsx
import { useState, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, Menu } from 'lucide-react'
import { AppDispatch, RootState } from '../../app/store'
import { markAllRead, fetchNotifications } from '../../features/notifications/notificationsSlice'
import { usePageTitleKey } from '../../context/PageContext'
import { NAV_SECTIONS, Role } from './navConfig'

function getInitials(email: string): string {
  const local = email.split('@')[0]
  const parts = local.split('.')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

interface TopbarProps {
  onHamburgerClick: () => void
}

export function Topbar({ onHamburgerClick }: TopbarProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { email } = useSelector((s: RootState) => s.auth)
  const { items, unreadCount } = useSelector((s: RootState) => s.notifications)
  const dispatch = useDispatch<AppDispatch>()
  const contextTitleKey = usePageTitleKey()
  const [bellOpen, setBellOpen] = useState(false)

  const derivedLabel = useMemo(() => {
    for (const section of NAV_SECTIONS) {
      for (const group of section.groups) {
        const item = group.items.find(i =>
          i.end
            ? location.pathname === i.to
            : location.pathname.startsWith(i.to)
        )
        if (item) return t(item.labelKey)
      }
    }
    return ''
  }, [location.pathname, t])

  const pageLabel = contextTitleKey ? t(contextTitleKey) : derivedLabel

  const handleBellClick = () => {
    if (!bellOpen) dispatch(fetchNotifications())
    setBellOpen(o => !o)
  }

  const handleLang = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('gfh_lang', lng)
  }

  const currentLang = i18n.language.startsWith('kg') ? 'kg' : 'ru'
  const initials = email ? getInitials(email) : '?'

  return (
    <header className="app-topbar">
      <button className="hamburger" onClick={onHamburgerClick} type="button">
        <svg viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="topbar-crumbs">
        <span>{t('nav.home')}</span>
        {pageLabel && (
          <>
            <span className="sep">/</span>
            <span className="current">{pageLabel}</span>
          </>
        )}
      </div>

      <div className="topbar-actions">
        <div className="lang-toggle">
          <button
            className={currentLang === 'ru' ? 'lang-active' : ''}
            onClick={() => handleLang('ru')}
            type="button"
          >
            RU
          </button>
          <button
            className={currentLang === 'kg' ? 'lang-active' : ''}
            onClick={() => handleLang('kg')}
            type="button"
          >
            KG
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button className="topbar-iconbtn" onClick={handleBellClick} type="button">
            <Bell />
            {unreadCount > 0 && <span className="topbar-dot-notif" />}
          </button>

          {bellOpen && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                onClick={() => setBellOpen(false)}
              />
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 320, background: 'var(--surface)',
                border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)', zIndex: 50,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderBottom: '1px solid var(--line-soft)',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                    Уведомления
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => dispatch(markAllRead())}
                      style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                      type="button"
                    >
                      Отметить все
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {items.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
                      Нет уведомлений
                    </div>
                  ) : (
                    items.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--line-soft)',
                          background: !n.read ? 'var(--accent-mute)' : undefined,
                        }}
                      >
                        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>{n.titleRu}</div>
                        {n.bodyRu && (
                          <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{n.bodyRu}</div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4 }}>
                          {new Date(n.createdAt).toLocaleString('ru-RU')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--line-soft)' }}>
                  <a href="/notifications" style={{ fontSize: 12, color: 'var(--accent)' }}
                    onClick={() => setBellOpen(false)}>
                    Все уведомления →
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="topbar-avatar" title={email ?? ''}>{initials}</div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/Topbar.tsx
git commit -m "feat(shell): add Topbar with breadcrumbs, lang toggle, notification bell"
```

---

## Task 9: AppShell.tsx

**Files:**
- Create: `src/components/shell/AppShell.tsx`

- [ ] **Step 1: Create `src/components/shell/AppShell.tsx`**

```tsx
import { useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'
import { IconRail } from './IconRail'
import { NavPanel } from './NavPanel'
import { Topbar } from './Topbar'
import { PageTitleProvider } from '../../context/PageContext'
import type { SectionKey } from './navConfig'

const NO_SHELL_PATHS = ['/login', '/forgot-password', '/reset-password', '/change-password', '/pdpa-consent']

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const { isAuthenticated, passwordExpired, pdpaRequired } = useSelector((s: RootState) => s.auth)
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const showShell =
    isAuthenticated &&
    !passwordExpired &&
    !pdpaRequired &&
    !NO_SHELL_PATHS.includes(location.pathname)

  const handleSectionClick = useCallback((section: SectionKey) => {
    setActiveSection(prev => prev === section ? null : section)
  }, [])

  const closePanel = useCallback(() => {
    setActiveSection(null)
    setMobileOpen(false)
  }, [])

  if (!showShell) {
    return <PageTitleProvider>{children}</PageTitleProvider>
  }

  const overlayVisible = activeSection !== null || mobileOpen

  return (
    <PageTitleProvider>
      <div className="app-shell">
        <IconRail
          activeSection={activeSection}
          onSectionClick={handleSectionClick}
          mobileOpen={mobileOpen}
        />

        <NavPanel activeSection={activeSection} onClose={closePanel} />

        {overlayVisible && (
          <div className="mobile-overlay" onClick={closePanel} />
        )}

        <div className="app-shell-main">
          <Topbar onHamburgerClick={() => setMobileOpen(o => !o)} />
          <div style={{ flex: 1, overflow: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </PageTitleProvider>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/AppShell.tsx
git commit -m "feat(shell): add AppShell root layout component"
```

---

## Task 10: Wire AppShell + Simplify Layout + Update AdminLayout

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/components/Layout.tsx`
- Modify: `src/features/admin/AdminLayout.tsx`

- [ ] **Step 1: Update `src/main.tsx` to wrap App with AppShell**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './app/store'
import App from './App'
import { AppShell } from './components/shell/AppShell'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppShell>
          <App />
        </AppShell>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
```

- [ ] **Step 2: Simplify `src/components/Layout.tsx`**

```tsx
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Update `src/features/admin/AdminLayout.tsx`**

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'

export function AdminLayout() {
  const role = useSelector((s: RootState) => s.auth.role)
  if (role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
```

- [ ] **Step 4: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/components/Layout.tsx src/features/admin/AdminLayout.tsx
git commit -m "feat(shell): wire AppShell into main.tsx, simplify Layout and AdminLayout"
```

---

## Task 11: Add Layout to Admin-Only Pages

**Files:**
- Modify: `src/features/admin/AdminDashboardPage.tsx`
- Modify: `src/features/admin/AuditLogPage.tsx`
- Modify: `src/features/admin/AdminMonitoringPage.tsx`

These three pages render as `<Outlet>` children of `AdminLayout` and currently have no padding wrapper.

- [ ] **Step 1: Read the return statement of `AdminDashboardPage.tsx`**

Run:
```bash
grep -n "return\|</div>" frontend/src/features/admin/AdminDashboardPage.tsx | tail -20
```

- [ ] **Step 2: Wrap `AdminDashboardPage` with Layout**

Add `import { Layout } from '../../components/Layout'` at the top of `AdminDashboardPage.tsx`.

Wrap the JSX root element:
```tsx
return (
  <Layout>
    {/* existing JSX here unchanged */}
  </Layout>
)
```

- [ ] **Step 3: Wrap `AuditLogPage` with Layout**

Add `import { Layout } from '../../components/Layout'` to `AuditLogPage.tsx`.

Wrap the root element:
```tsx
return (
  <Layout>
    {/* existing JSX here unchanged */}
  </Layout>
)
```

- [ ] **Step 4: Wrap `AdminMonitoringPage` with Layout**

Add `import { Layout } from '../../components/Layout'` to `AdminMonitoringPage.tsx`.

Wrap the root element:
```tsx
return (
  <Layout>
    {/* existing JSX here unchanged */}
  </Layout>
)
```

- [ ] **Step 5: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/AdminDashboardPage.tsx src/features/admin/AuditLogPage.tsx src/features/admin/AdminMonitoringPage.tsx
git commit -m "feat(shell): wrap admin-only pages with Layout for padding"
```

---

## Task 12: Delete Old Files + Visual Verify

**Files:**
- Delete: `src/components/Sidebar.tsx`
- Delete: `src/components/Header.tsx`
- Delete: `src/components/LanguageSwitcher.tsx`
- Delete: `src/features/admin/AdminSidebar.tsx`

- [ ] **Step 1: Confirm no remaining imports of deleted files**

```bash
grep -rn "from.*Sidebar'\|from.*Header'\|from.*LanguageSwitcher'\|from.*AdminSidebar'" frontend/src/
```
Expected: zero matches (or only matches within the files being deleted themselves).

- [ ] **Step 2: Delete the four old files**

```bash
rm frontend/src/components/Sidebar.tsx
rm frontend/src/components/Header.tsx
rm frontend/src/components/LanguageSwitcher.tsx
rm frontend/src/features/admin/AdminSidebar.tsx
```

- [ ] **Step 3: Type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Start dev server and visually verify**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` in browser. Check:
- [ ] Login page renders without nav shell
- [ ] After login, icon rail (72px dark-green) appears on left
- [ ] Clicking Home section icon opens nav panel (slides in from left of rail)
- [ ] Nav items are role-filtered, NavLink active state shows gold highlight
- [ ] Analytics section icon only shows for MANAGER+ roles
- [ ] Admin section icon only shows for ADMIN role
- [ ] Topbar: breadcrumbs update on navigation, lang toggle switches RU/KG, bell opens notification dropdown
- [ ] Theme toggle in rail bottom switches dark/light, persists on refresh
- [ ] Profile popover in nav panel footer: shows logout button that works
- [ ] Mobile breakpoint (≤768px): hamburger appears in topbar, clicking it slides in the rail + panel

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(shell): remove old Sidebar, Header, LanguageSwitcher, AdminSidebar"
```
