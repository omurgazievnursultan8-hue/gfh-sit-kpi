# M4-FE-05: Export Buttons on All Analytics Pages + Responsive Layout (Mobile-First Tailwind)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Excel and PDF export buttons to all analytics pages (personal dashboard, manager dashboard, hierarchical analytics, anti-bonus analytics), and ensure all pages are responsive down to 375px width using mobile-first Tailwind utility classes.

**Architecture:** A shared `ExportButtons` component handles the download logic — it navigates to the report endpoint which triggers browser download. Responsive layout: sidebar collapses to a bottom tab bar on mobile, cards switch from multi-column to single-column, tables gain horizontal scroll wrappers.

**Tech Stack:** React 18, Tailwind CSS (responsive prefixes), TypeScript.

**Depends on:** m4-analytics/fe-04-anti-bonus-analytics-ui.md

---

### Task 1: ExportButtons component + sidebar responsive

**Files:**
- Create: `frontend/src/components/ExportButtons.tsx`
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Create ExportButtons component**

`frontend/src/components/ExportButtons.tsx`:
```tsx
import { Download } from 'lucide-react'

interface ExportButtonsProps {
  periodId?: number
  type?: 'period' | 'personal'
  className?: string
}

export function ExportButtons({ periodId, type = 'period', className = '' }: ExportButtonsProps) {
  const handleExport = (format: 'excel' | 'pdf') => {
    const baseUrl = type === 'period' && periodId
      ? `/api/v1/reports/periods/${periodId}`
      : `/api/v1/reports/personal`

    const suffix = format === 'excel' ? '/excel' : '/pdf'
    // Navigate to download URL — browser handles Content-Disposition attachment
    window.open(baseUrl + suffix, '_blank')
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <button
        onClick={() => handleExport('excel')}
        title="Экспорт в Excel"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-500 text-green-700 rounded-md hover:bg-green-50 transition-colors"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Excel</span>
      </button>
      <button
        onClick={() => handleExport('pdf')}
        title="Экспорт в PDF"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-500 text-red-700 rounded-md hover:bg-red-50 transition-colors"
      >
        <Download size={14} />
        <span className="hidden sm:inline">PDF</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Make Layout responsive**

In `frontend/src/components/Layout.tsx`, update to use responsive sidebar:
```tsx
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-14 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-40
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <Sidebar onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <main className="pt-14 lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
```

Update `Header.tsx` to accept and call `onMenuClick`:
```tsx
// Add to Header props:
interface HeaderProps { onMenuClick?: () => void }

// Add hamburger button inside Header (visible on mobile only):
<button
  onClick={onMenuClick}
  className="lg:hidden p-2 text-gray-500 hover:text-gray-800 mr-2"
>
  <Menu size={20} />
</button>
```

- [ ] **Step 3: Add table scroll wrappers**

For all analytics tables, wrap `<table>` in:
```tsx
<div className="overflow-x-auto">
  <table className="min-w-full ...">
    ...
  </table>
</div>
```

This ensures horizontal scroll on mobile for wide tables.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ExportButtons.tsx \
        frontend/src/components/Layout.tsx \
        frontend/src/components/Header.tsx
git commit -m "feat(fe/ux): add ExportButtons component and responsive sidebar with mobile hamburger menu"
```

---

### Task 2: Add export buttons to analytics pages

**Files:**
- Modify: `frontend/src/features/analytics/PersonalDashboardPage.tsx`
- Modify: `frontend/src/features/analytics/ManagerDashboardPage.tsx`
- Modify: `frontend/src/features/analytics/HierarchicalAnalyticsPage.tsx`
- Modify: `frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx`

- [ ] **Step 1: Add export buttons**

In each analytics page, add `ExportButtons` in the page header:

`PersonalDashboardPage.tsx` — add below the `<h1>`:
```tsx
import { ExportButtons } from '../../components/ExportButtons'

// In JSX header area:
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-gray-900">Мой KPI</h1>
  <ExportButtons type="personal" />
</div>
```

`ManagerDashboardPage.tsx` — same pattern. Export type depends on selected period (pass `periodId` from active period if available):
```tsx
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-gray-900">Операционный дашборд</h1>
  <ExportButtons type="period" />
</div>
```

`HierarchicalAnalyticsPage.tsx` and `AntiBonusAnalyticsPage.tsx` — same pattern with `type="period"`.

- [ ] **Step 2: Responsive grid classes audit**

Review all analytics pages and ensure:
- Multi-column grids use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` pattern
- Cards use `p-4 sm:p-6`
- Text sizes use `text-sm sm:text-base` where appropriate
- Buttons show icon-only on mobile (`<span className="hidden sm:inline">label</span>`)

- [ ] **Step 3: Manual verification — mobile view**

```bash
cd frontend && npm run dev
```

Open browser DevTools → toggle device toolbar → set to iPhone SE (375×667):
1. Header shows hamburger menu → click → sidebar slides in
2. `/my-kpi` — rating badge and chart fit within 375px
3. `/analytics/hierarchical` — table has horizontal scroll
4. Export buttons show only icons on mobile

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/analytics/
git commit -m "feat(fe/ux): add export buttons to all analytics pages and mobile-first responsive layout"
```
