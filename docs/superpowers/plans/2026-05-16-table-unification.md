# Table Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `DelegationsPage` to the shared `DataTable` component and unify all `DataTable`-based table screens onto one cream-themed look via a shared `TableCard` wrapper.

**Architecture:** Two new presentational components (`TableCard`, `Badge`) carry the cream theme. `DataTable` gains an opt-in `rowClassName` prop. `DelegationsPage` drops its hand-rolled CSS-grid table for `DataTable`. Five gray-themed pages wrap their `DataTable` in `TableCard` and have their filter cards + cell renderers restyled from Tailwind gray classes to CSS-var cream styling.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind CSS (layout utilities only — colors come from CSS vars), inline `style` with `var(--…)` tokens (the established cream-theme pattern, see `components/DataTable.tsx`).

**No test runner:** This frontend has no vitest/jest/RTL and no component tests (`frontend/package.json` scripts: `dev`, `build`, `preview`, `typecheck`). Do **not** add a test framework. Per-task verification = `npm run typecheck`; a full `npm run build` runs once at the end (Task 10). This replaces the usual TDD loop.

**Spec:** `docs/superpowers/specs/2026-05-16-table-unification-design.md`

---

## Color Reference

Used by every restyle task. Tailwind color classes are replaced; layout classes (`flex`, `grid`, `p-4`, `rounded-lg`, `gap-*`, `mb-*`) are kept.

| Tailwind class | Replace with (inline `style`) |
|---|---|
| `text-gray-900` / `text-slate-900` | `color: 'var(--ink)'` |
| `text-gray-800` / `text-slate-800` / `text-gray-700` / `text-slate-700` | `color: 'var(--ink-soft)'` |
| `text-gray-600` / `text-gray-500` / `text-slate-600` / `text-slate-500` | `color: 'var(--ink-soft)'` |
| `text-gray-400` / `text-slate-400` / `text-slate-300` | `color: 'var(--ink-faint)'` |
| `text-red-600` / `text-red-700` | `color: 'var(--danger)'` |
| `text-green-600` / `text-emerald-700` | `color: 'var(--accent-2)'` |
| `text-yellow-600` / `text-orange-600` / `text-amber-700` | `color: 'var(--gold)'` |
| `text-blue-600` | `color: 'var(--accent-2)'` |
| card `bg-white` + `border-gray-200`/`border-slate-200` | `background: 'var(--surface)', border: '1px solid var(--line-soft)'` |
| input/select `border-gray-300`/`border-slate-300` + `bg-white` | `border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)'` |
| header strip `bg-gray-50`/`border-gray-100` | drop — `TableCard`'s header region supplies the divider |

Hover states use Tailwind arbitrary values: `hover:bg-[var(--accent-mute)]`.

Status pills (colored `bg-*-100 text-*-700` spans) become `<Badge tone="…">`.

---

## Task 1: Badge component

**Files:**
- Create: `frontend/src/components/Badge.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/Badge.tsx` with this exact content:

```tsx
import React from 'react'

/**
 * Cream-theme status pill. Tint background + colored text per tone.
 * Replaces ad-hoc Tailwind `bg-*-100 text-*-700` pills across table pages.
 */
export type BadgeTone = 'neutral' | 'success' | 'warn' | 'danger' | 'gold' | 'accent'

interface ToneSpec { fg: string; bg: string; border: string }

const TONES: Record<BadgeTone, ToneSpec> = {
  neutral: { fg: 'var(--ink-faint)', bg: 'var(--surface-mute)', border: 'var(--line)' },
  success: { fg: 'var(--accent-2)',  bg: 'var(--accent-soft)',  border: 'var(--accent-soft)' },
  accent:  { fg: 'var(--accent-2)',  bg: 'var(--accent-soft)',  border: 'var(--accent-soft)' },
  warn:    { fg: 'var(--warn)',      bg: 'var(--warn-soft)',    border: 'var(--warn-soft)' },
  danger:  { fg: 'var(--danger)',    bg: 'var(--danger-soft)',  border: 'var(--danger-soft)' },
  gold:    { fg: 'var(--gold)',      bg: 'var(--gold-soft)',    border: 'var(--gold-soft)' },
}

export interface BadgeProps {
  tone?: BadgeTone
  children: React.ReactNode
  title?: string
}

export function Badge({ tone = 'neutral', children, title }: BadgeProps) {
  const c = TONES[tone]
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Badge.tsx
git commit -m "feat(ui): add Badge component"
```

---

## Task 2: TableCard component

**Files:**
- Create: `frontend/src/components/TableCard.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/TableCard.tsx` with this exact content:

```tsx
import React from 'react'

/**
 * Cream card chrome for a table: surface + optional 3px accent stripe +
 * optional padded header / footer regions. The table (`children`) renders
 * full-bleed between header and footer so it touches the card edges.
 */
export interface TableCardProps {
  /** Padded region above the table, with a divider beneath it. */
  header?: React.ReactNode
  /** Padded region below the table, with a divider above it. */
  footer?: React.ReactNode
  /** 3px var(--accent) stripe across the top. Default true. */
  accent?: boolean
  /** The table — rendered full-bleed. */
  children: React.ReactNode
  className?: string
}

export function TableCard({ header, footer, accent = true, children, className }: TableCardProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {accent && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)' }}
        />
      )}
      {header && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line-soft)' }}>
          {footer}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TableCard.tsx
git commit -m "feat(ui): add TableCard component"
```

---

## Task 3: Add `rowClassName` to DataTable

**Files:**
- Modify: `frontend/src/components/DataTable.tsx`

- [ ] **Step 1: Add the prop to the interface**

In `frontend/src/components/DataTable.tsx`, inside `interface DataTableProps<T>`, immediately after the `totalCount?: number` property, add:

```tsx
  /** Optional per-row className — e.g. to dim or highlight rows. */
  rowClassName?: (row: T) => string | undefined
```

- [ ] **Step 2: Destructure the prop**

In the same file, the function signature destructures props. Change:

```tsx
export function DataTable<T>({
  columns, rows, rowKey, caption, loading = false,
  sort, onSort, onRowClick, density: densityProp,
  empty, skeletonRows = 8, renderExpanded, expandedKeys, totalCount,
}: DataTableProps<T>) {
```

to:

```tsx
export function DataTable<T>({
  columns, rows, rowKey, caption, loading = false,
  sort, onSort, onRowClick, density: densityProp,
  empty, skeletonRows = 8, renderExpanded, expandedKeys, totalCount,
  rowClassName,
}: DataTableProps<T>) {
```

- [ ] **Step 3: Apply it to the data row**

In the same file, the data-row `<tr>` (the one inside `rows.map(...)`, NOT the skeleton row) currently reads:

```tsx
                    <tr
                      className="dt-row"
                      onClick={clickable ? () => onRowClick!(row) : undefined}
```

Change the `className` line to:

```tsx
                    <tr
                      className={['dt-row', rowClassName?.(row)].filter(Boolean).join(' ')}
                      onClick={clickable ? () => onRowClick!(row) : undefined}
```

Leave the skeleton-row `<tr className="dt-row" aria-hidden="true">` unchanged.

- [ ] **Step 4: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DataTable.tsx
git commit -m "feat(ui): add rowClassName prop to DataTable"
```

---

## Task 4: Migrate DelegationsPage to DataTable

**Files:**
- Modify: `frontend/src/features/org/DelegationsPage.tsx`

- [ ] **Step 1: Add imports**

At the top of `frontend/src/features/org/DelegationsPage.tsx`, after the existing `import api from '../../app/api'` line, add:

```tsx
import { DataTable, type Column } from '../../components/DataTable'
import { TableCard } from '../../components/TableCard'
import { Badge, type BadgeTone } from '../../components/Badge'
```

- [ ] **Step 2: Refactor the `urgency` helper to return a Badge tone**

Replace the entire `urgency` function:

```tsx
function urgency(d: Delegation): { color: string; bg: string; border: string; label: string } {
  if (!d.isActive) {
    return { color: 'var(--ink-faint)', bg: 'transparent', border: 'var(--line)', label: 'завершено' }
  }
  const days = daysUntil(d.validTo)
  if (days < 0)  return { color: '#b04d3a', bg: 'rgba(200,80,60,0.10)',  border: 'rgba(200,80,60,0.32)',  label: `истекло ${Math.abs(days)}д` }
  if (days <= 7) return { color: '#9c7416', bg: 'rgba(200,150,40,0.10)', border: 'rgba(200,150,40,0.28)', label: `${days}д осталось` }
  return { color: 'var(--accent-2)', bg: 'rgba(26,117,88,0.08)', border: 'rgba(26,117,88,0.24)', label: `${days}д` }
}
```

with:

```tsx
function urgency(d: Delegation): { tone: BadgeTone; label: string } {
  if (!d.isActive) return { tone: 'neutral', label: 'завершено' }
  const days = daysUntil(d.validTo)
  if (days < 0)  return { tone: 'danger',  label: `истекло ${Math.abs(days)}д` }
  if (days <= 7) return { tone: 'warn',    label: `${days}д осталось` }
  return { tone: 'success', label: `${days}д` }
}
```

- [ ] **Step 3: Define the columns array**

In the `DelegationsPage` component body, immediately after the line `const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)`, add:

```tsx
  const columns: Column<Delegation>[] = [
    {
      key: 'rank',
      header: '#',
      width: '44px',
      render: (d) => (
        <span className="font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
          {String(page * PAGE_SIZE + pageRows.indexOf(d) + 1).padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'evaluatee',
      header: 'Оцениваемый',
      render: (d) => <PersonChip name={d.evaluateeName ?? '—'} tone="from" />,
    },
    {
      key: 'arrow',
      header: 'переход',
      srOnlyHeader: true,
      width: '24px',
      align: 'center',
      render: () => (
        <span className="font-mono" style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 600 }}>→</span>
      ),
    },
    {
      key: 'delegate',
      header: 'Делегат',
      render: (d) => <PersonChip name={d.delegatedToName ?? '—'} tone="to" />,
    },
    {
      key: 'period',
      header: 'Период',
      render: (d) => (
        <span className="font-mono tabular-nums" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
          {fmtDate(d.validFrom)} — {fmtDate(d.validTo)}
        </span>
      ),
    },
    {
      key: 'window',
      header: 'Окно',
      render: (d) => {
        const u = urgency(d)
        return <Badge tone={u.tone}>{u.label}</Badge>
      },
    },
    {
      key: 'action',
      header: 'Действие',
      align: 'right',
      width: '110px',
      render: (d) =>
        d.isActive ? (
          <button
            type="button"
            onClick={() => setDeactivateTarget(d)}
            className="font-mono uppercase tracking-widest transition-colors"
            style={{
              fontSize: 9.5, padding: '4px 10px', borderRadius: 4, fontWeight: 700,
              cursor: 'pointer', background: 'transparent', color: 'var(--danger)',
              border: '1px solid var(--danger-soft)',
            }}
          >
            Снять
          </button>
        ) : (
          <span className="font-mono uppercase tracking-widest" style={{ fontSize: 9.5, color: 'var(--ink-dim)', fontWeight: 600 }}>
            архив
          </span>
        ),
    },
  ]
```

- [ ] **Step 4: Replace the ledger card JSX**

Find the `{/* ── LEDGER ─── */}` block — the `<div className="relative overflow-hidden rounded-lg dl-rise" …>` element and everything inside it up to its closing `</div>`. It spans from the comment to just before `</div>` that precedes `<DelegationFormModal …>`. Replace that entire `<div className="relative overflow-hidden rounded-lg dl-rise" …> … </div>` block with:

```tsx
        {/* ── LEDGER ─────────────────────────────────────────────────────── */}
        <div className="dl-rise" style={{ animationDelay: '180ms' }}>
          <TableCard
            header={
              <>
                {/* card header */}
                <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-display"
                          style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                      Реестр делегирований
                    </span>
                    <span className="font-mono font-semibold uppercase tracking-widest"
                          style={{
                            fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
                            background: 'rgba(26,117,88,0.10)',
                            color: 'var(--accent-2)',
                            border: '1px solid rgba(26,117,88,0.24)',
                          }}>
                      Журнал
                    </span>
                  </div>
                  <span className="font-mono font-semibold"
                        style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {filtered.length}/{stats.total}
                  </span>
                </div>

                {/* filter chips + search */}
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterChips
                    value={filter}
                    onChange={setFilter}
                    counts={{
                      ALL: stats.total,
                      ACTIVE: stats.active,
                      EXPIRING: stats.expiring,
                      EXPIRED: stats.expired,
                    }}
                  />
                  <div className="ml-auto">
                    <input
                      type="search"
                      placeholder="Поиск по ФИО…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      className="font-mono"
                      style={{
                        fontSize: 12,
                        padding: '6px 10px',
                        minWidth: 220,
                        borderRadius: 4,
                        border: '1px solid var(--line)',
                        background: 'var(--surface-mute)',
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </>
            }
            footer={
              totalPages > 1
                ? <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                : undefined
            }
          >
            <DataTable<Delegation>
              caption="Реестр делегирований"
              columns={columns}
              rows={pageRows}
              rowKey={(d) => d.id}
              loading={loading}
              rowClassName={(d) => (d.isActive ? undefined : 'dl-inactive')}
              totalCount={filtered.length}
              empty={
                <div>
                  <div className="font-display mb-1"
                       style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-soft)' }}>
                    Ничего не найдено
                  </div>
                  <div className="font-mono uppercase tracking-widest"
                       style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                    попробуйте сменить фильтр или поиск
                  </div>
                </div>
              }
            />
          </TableCard>
        </div>
```

- [ ] **Step 5: Delete dead code**

Delete these two functions entirely from the file (they are no longer referenced):
- `function DelegationRow({ delegation: d, index, onDeactivate }: { … }) { … }` — the whole function.
- `function cellHeadSty(): React.CSSProperties { … }` — the whole function.

Keep `StatCard`, `FilterChips`, `PersonChip`, `Pagination`, `plural`, `fmtDate`, `daysUntil`, `initials`, `urgency`.

- [ ] **Step 6: Update the `<style>` block**

In the `<style>` block near the top of the returned JSX, delete this line:

```tsx
        @media (max-width: 720px) { .dl-row { grid-template-columns: 1fr !important; gap: 6px !important } .dl-row .dl-row-meta { justify-content: flex-start !important } }
```

and add this line in its place:

```tsx
        .dl-inactive { opacity: .65 }
```

Keep the `dl-rise` keyframes/class and the `dl-stats-grid` / `dl-strip` media queries.

- [ ] **Step 7: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors. If it reports an unused `React` import or unused symbol, remove the unused symbol and re-run.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/org/DelegationsPage.tsx
git commit -m "refactor(delegations): migrate DelegationsPage to DataTable"
```

---

## Task 5: Restyle AntiBonusAnalyticsPage

**Files:**
- Modify: `frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx`

This page has no status badges — `TableCard` + color map only.

- [ ] **Step 1: Add the TableCard import**

After the `import { DataTable, type Column } from '../../components/DataTable'` line, add:

```tsx
import { TableCard } from '../../components/TableCard'
```

- [ ] **Step 2: Replace the `top10Columns` array**

Replace the entire `const top10Columns: Column<Top10Row>[] = [ … ]` array with:

```tsx
  const top10Columns: Column<Top10Row>[] = [
    {
      key: 'rank',
      header: '#',
      width: '48px',
      render: (_r) => {
        const i = (data?.top10 ?? []).indexOf(_r)
        return <span className="font-mono font-bold" style={{ fontSize: 13, color: 'var(--ink-faint)' }}>#{i + 1}</span>
      },
    },
    {
      key: 'fullName',
      header: 'Сотрудник',
      render: (r) => <span style={{ fontSize: 13, color: 'var(--ink)' }}>{r.fullName}</span>,
    },
    {
      key: 'orgUnitName',
      header: 'Подразделение',
      render: (r) => <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{r.orgUnitName ?? '—'}</span>,
    },
    {
      key: 'incidentCount',
      header: 'Инциденты',
      render: (r) => <span className="font-mono" style={{ fontSize: 13, color: 'var(--gold)' }}>{r.incidentCount}</span>,
    },
    {
      key: 'totalDeduction',
      header: 'Удержание',
      render: (r) => (
        <span className="font-mono font-bold" style={{ fontSize: 13, color: 'var(--danger)' }}>
          -{Number(r.totalDeduction).toFixed(2)}
        </span>
      ),
    },
  ]
```

- [ ] **Step 3: Restyle the filter card**

Find the filter card `<div>` (the one containing the "Подразделение" and "Тип периода" selects). Change its opening tag:

```tsx
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex gap-4 items-end">
```

to:

```tsx
      <div className="rounded-lg p-4 mb-6 flex gap-4 items-end"
           style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}>
```

For both `<label>` elements inside, change `className="block text-xs text-gray-500 mb-1"` to `className="block text-xs mb-1" style={{ color: 'var(--ink-faint)' }}`.

For both `<select>` elements, change `className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary"` to `className="px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-primary" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }}`.

- [ ] **Step 4: Wrap the table in TableCard**

Replace this block:

```tsx
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">Топ-10 по антибонусным удержаниям</h2>
            </div>
            <DataTable<Top10Row>
              columns={top10Columns}
              rows={data.top10}
              rowKey={(e) => e.userId}
              caption="Топ-10 по антибонусным удержаниям"
              empty={<span className="text-sm text-gray-400">Нет данных</span>}
              totalCount={data.top10.length}
            />
          </div>
```

with:

```tsx
          <TableCard
            header={
              <h2 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
                Топ-10 по антибонусным удержаниям
              </h2>
            }
          >
            <DataTable<Top10Row>
              columns={top10Columns}
              rows={data.top10}
              rowKey={(e) => e.userId}
              caption="Топ-10 по антибонусным удержаниям"
              empty={<span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Нет данных</span>}
              totalCount={data.top10.length}
            />
          </TableCard>
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/analytics/AntiBonusAnalyticsPage.tsx
git commit -m "style(analytics): restyle AntiBonus table to cream theme"
```

---

## Task 6: Restyle AuditLogPage

**Files:**
- Modify: `frontend/src/features/admin/AuditLogPage.tsx`

- [ ] **Step 1: Add imports**

After the `import { DataTable, type Column } from '../../components/DataTable'` line, add:

```tsx
import { TableCard } from '../../components/TableCard'
import { Badge, type BadgeTone } from '../../components/Badge'
```

- [ ] **Step 2: Rewrite `actionTone` to return a Badge tone**

Replace the entire `actionTone` function:

```tsx
/** Map an action verb prefix to a semantic badge palette. */
function actionTone(action: string): string {
  if (/^(CREATE|SUBMIT)/.test(action)) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (/^(DELETE|DEACTIVATE)/.test(action)) return 'bg-rose-50 text-rose-700 ring-rose-600/20'
  if (/^UPDATE/.test(action)) return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  if (/^(DOWNLOAD|EXPORT)/.test(action)) return 'bg-sky-50 text-sky-700 ring-sky-600/20'
  return 'bg-slate-100 text-slate-600 ring-slate-500/20'
}
```

with:

```tsx
/** Map an action verb prefix to a semantic Badge tone. */
function actionTone(action: string): BadgeTone {
  if (/^(CREATE|SUBMIT)/.test(action)) return 'success'
  if (/^(DELETE|DEACTIVATE)/.test(action)) return 'danger'
  if (/^UPDATE/.test(action)) return 'warn'
  if (/^(DOWNLOAD|EXPORT)/.test(action)) return 'gold'
  return 'neutral'
}
```

- [ ] **Step 3: Restyle `selectCls`**

Replace:

```tsx
  const selectCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ' +
    'transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30'
```

with:

```tsx
  const selectCls =
    'w-full rounded-lg px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'
  const selectStyle = {
    border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)',
  }
```

(No type annotation on `selectStyle` — the inferred all-string object is assignable to
`style`, and avoids needing a `React` import. Each `<select>` / `<input>` using `selectCls`
also gets `style={selectStyle}` — applied in Step 5.)

- [ ] **Step 4: Restyle the `columns` array**

Replace the `actor`, `action`, `entityType`, `entityId`, `ipAddress`, `timestamp` column `render` functions. The `toggle` column keeps its structure but its button is restyled. Replace the whole `const columns: Column<AuditLogEntry>[] = [ … ]` array with:

```tsx
  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'toggle',
      header: t('audit.details'),
      srOnlyHeader: true,
      width: '40px',
      render: entry => {
        const isOpen = expanded === entry.id
        return (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={t('audit.details') as string}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-[var(--accent-mute)]"
            style={{ color: 'var(--ink-faint)' }}
            onClick={e => { e.stopPropagation(); setExpanded(isOpen ? null : entry.id) }}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        )
      },
    },
    {
      key: 'actor',
      header: t('audit.actor'),
      render: entry => (
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ background: 'var(--surface-mute)', color: 'var(--ink-soft)' }}
          >
            {initials(entry.actorEmail)}
          </span>
          <span className="font-medium" style={{ color: 'var(--ink)' }}>{entry.actorEmail}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: t('audit.action'),
      render: entry => <Badge tone={actionTone(entry.action)}>{entry.action}</Badge>,
    },
    {
      key: 'entityType',
      header: t('audit.entityType'),
      render: entry => <span style={{ color: 'var(--ink-soft)' }}>{entry.entityType ?? '—'}</span>,
    },
    {
      key: 'entityId',
      header: t('audit.entityId'),
      render: entry => <span className="tabular-nums" style={{ color: 'var(--ink-soft)' }}>{entry.entityId ?? '—'}</span>,
    },
    {
      key: 'ipAddress',
      header: t('audit.ipAddress'),
      render: entry => <span className="font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>{entry.ipAddress ?? '—'}</span>,
    },
    {
      key: 'timestamp',
      header: t('audit.timestamp'),
      render: entry => (
        <time dateTime={entry.createdAt} className="whitespace-nowrap tabular-nums" style={{ color: 'var(--ink-faint)' }}>
          {new Date(entry.createdAt).toLocaleString(dateLocale)}
        </time>
      ),
    },
  ]
```

- [ ] **Step 5: Restyle `renderExpanded`, `emptyState`, the filter card, and wrap the table**

Replace `renderExpanded`:

```tsx
  const renderExpanded = (entry: AuditLogEntry) => (
    <div className="px-12 py-3">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="font-medium" style={{ color: 'var(--ink-faint)' }}>ID:</dt>
          <dd className="tabular-nums" style={{ color: 'var(--ink-soft)' }}>{entry.id}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium" style={{ color: 'var(--ink-faint)' }}>{t('audit.details')}:</dt>
          <dd className="break-all" style={{ color: 'var(--ink-soft)' }}>{entry.details ?? '—'}</dd>
        </div>
      </dl>
    </div>
  )
```

Replace `emptyState`:

```tsx
  const emptyState = (
    <div>
      <FileSearch className="mx-auto h-10 w-10" style={{ color: 'var(--ink-faint)' }} aria-hidden="true" />
      <p className="mt-3 text-sm font-medium" style={{ color: 'var(--ink-soft)' }}>{t('common.noData')}</p>
      {hasFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="mt-2 text-sm font-medium hover:underline"
          style={{ color: 'var(--accent-2)' }}
        >
          {t('common.reset', 'Сбросить')}
        </button>
      )}
    </div>
  )
```

In the Filters block, change the filter card opening tag from:

```tsx
        <div
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          role="search"
```

to:

```tsx
        <div
          className="rounded-xl p-4 shadow-sm"
          style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}
          role="search"
```

For each of the four `<label>` elements in the filter grid, change `className="mb-1 block text-xs font-medium text-slate-600"` to `className="mb-1 block text-xs font-medium" style={{ color: 'var(--ink-faint)' }}`.

Add `style={selectStyle}` to the four filter controls that use `className={selectCls}`:
`<select id={actionId}>`, `<select id={entityTypeId}>`, `<input id={fromId}>`, and
`<input id={toId}>`.

For the "filter" apply button, leave its existing classes (it is a page action button, acceptable to keep). For the "reset" button, replace `className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-slate-400/40"` with `className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-[var(--accent-mute)] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"` and add `style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}`.

Now replace the Table block and the Pagination block. The current code is:

```tsx
        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <DataTable<AuditLogEntry>
            columns={columns}
            rows={entries}
            rowKey={entry => entry.id}
            caption={t('admin.auditLog')}
            loading={loading}
            onRowClick={entry => setExpanded(expanded === entry.id ? null : entry.id)}
            renderExpanded={renderExpanded}
            expandedKeys={expanded != null ? new Set([expanded]) : undefined}
            empty={emptyState}
            totalCount={totalElements}
          />
        </div>

        {/* Pagination */}
        <div
          className="flex items-center justify-between text-sm text-slate-600"
          role="navigation"
          aria-label={t('common.pagination', 'Пагинация') as string}
        >
          <span aria-live="polite">
            {t('common.page')} <span className="font-medium text-slate-900">{page + 1}</span> {t('common.of')}{' '}
            {Math.max(totalPages, 1)}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              aria-label={t('common.prevPage', 'Предыдущая страница') as string}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              aria-label={t('common.nextPage', 'Следующая страница') as string}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
```

Replace both blocks with a single `TableCard`:

```tsx
        {/* Table */}
        <TableCard
          footer={
            <div
              className="flex items-center justify-between text-sm"
              style={{ color: 'var(--ink-soft)' }}
              role="navigation"
              aria-label={t('common.pagination', 'Пагинация') as string}
            >
              <span aria-live="polite">
                {t('common.page')} <span className="font-medium" style={{ color: 'var(--ink)' }}>{page + 1}</span>{' '}
                {t('common.of')} {Math.max(totalPages, 1)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  aria-label={t('common.prevPage', 'Предыдущая страница') as string}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition hover:bg-[var(--accent-mute)] disabled:opacity-40"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  aria-label={t('common.nextPage', 'Следующая страница') as string}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition hover:bg-[var(--accent-mute)] disabled:opacity-40"
                  style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          }
        >
          <DataTable<AuditLogEntry>
            columns={columns}
            rows={entries}
            rowKey={entry => entry.id}
            caption={t('admin.auditLog')}
            loading={loading}
            onRowClick={entry => setExpanded(expanded === entry.id ? null : entry.id)}
            renderExpanded={renderExpanded}
            expandedKeys={expanded != null ? new Set([expanded]) : undefined}
            empty={emptyState}
            totalCount={totalElements}
          />
        </TableCard>
```

- [ ] **Step 6: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/admin/AuditLogPage.tsx
git commit -m "style(admin): restyle AuditLog table to cream theme"
```

---

## Task 7: Restyle AdminMonitoringPage

**Files:**
- Modify: `frontend/src/features/admin/AdminMonitoringPage.tsx`

Only the Quartz-jobs section is touched. The "Backend Health" and "Error Log" sections stay as-is.

- [ ] **Step 1: Add imports**

After the `import { DataTable, type Column } from '../../components/DataTable'` line, add:

```tsx
import { TableCard } from '../../components/TableCard'
import { Badge, type BadgeTone } from '../../components/Badge'
```

- [ ] **Step 2: Replace the job-state color map with a tone map**

Replace:

```tsx
const JOB_STATE_COLORS: Record<string, string> = {
  NORMAL: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  BLOCKED: 'bg-red-100 text-red-800',
  ERROR: 'bg-red-100 text-red-800',
  NONE: 'bg-gray-100 text-gray-600',
  UNKNOWN: 'bg-gray-100 text-gray-600',
}
```

with:

```tsx
const JOB_STATE_TONE: Record<string, BadgeTone> = {
  NORMAL: 'success',
  PAUSED: 'warn',
  BLOCKED: 'danger',
  ERROR: 'danger',
  NONE: 'neutral',
  UNKNOWN: 'neutral',
}
```

- [ ] **Step 3: Restyle the `jobColumns` array**

Replace the whole `const jobColumns: Column<QuartzJobInfo>[] = [ … ]` array with:

```tsx
  const jobColumns: Column<QuartzJobInfo>[] = [
    {
      key: 'name',
      header: t('monitoring.jobName'),
      render: job => <span className="font-medium" style={{ color: 'var(--ink)' }}>{job.name}</span>,
    },
    {
      key: 'group',
      header: t('monitoring.jobGroup'),
      render: job => <span style={{ color: 'var(--ink-soft)' }}>{job.group}</span>,
    },
    {
      key: 'cronExpression',
      header: t('monitoring.cronExpression'),
      render: job => <span className="font-mono text-xs" style={{ color: 'var(--ink-soft)' }}>{job.cronExpression ?? '—'}</span>,
    },
    {
      key: 'previousFireTime',
      header: t('monitoring.lastFire'),
      render: job => <span style={{ color: 'var(--ink-soft)' }}>{formatDate(job.previousFireTime)}</span>,
    },
    {
      key: 'nextFireTime',
      header: t('monitoring.nextFire'),
      render: job => <span style={{ color: 'var(--ink-soft)' }}>{formatDate(job.nextFireTime)}</span>,
    },
    {
      key: 'state',
      header: t('monitoring.state'),
      render: job => <Badge tone={JOB_STATE_TONE[job.state] ?? 'neutral'}>{job.state}</Badge>,
    },
  ]
```

- [ ] **Step 4: Wrap the jobs table in TableCard**

Replace this block:

```tsx
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">{t('admin.quartzJobs')}</h2>
        </div>
        <DataTable<QuartzJobInfo>
          caption={t('admin.quartzJobs')}
          rows={jobs}
          rowKey={job => `${job.group}.${job.name}`}
          loading={loading}
          empty={t('common.noData')}
          columns={jobColumns}
          totalCount={jobs.length}
        />
      </section>
```

with:

```tsx
      <TableCard
        header={
          <h2 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
            {t('admin.quartzJobs')}
          </h2>
        }
      >
        <DataTable<QuartzJobInfo>
          caption={t('admin.quartzJobs')}
          rows={jobs}
          rowKey={job => `${job.group}.${job.name}`}
          loading={loading}
          empty={t('common.noData')}
          columns={jobColumns}
          totalCount={jobs.length}
        />
      </TableCard>
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/admin/AdminMonitoringPage.tsx
git commit -m "style(admin): restyle AdminMonitoring jobs table to cream theme"
```

---

## Task 8: Restyle HierarchicalAnalyticsPage

**Files:**
- Modify: `frontend/src/features/analytics/HierarchicalAnalyticsPage.tsx`

The shared card holds four view modes (tree / table / bar / heatmap). It becomes a `TableCard`; the three non-table modes get their own `p-4` wrapper since `TableCard` children are full-bleed.

- [ ] **Step 1: Add the TableCard import**

After the `import { DataTable, type Column } from '../../components/DataTable'` line, add:

```tsx
import { TableCard } from '../../components/TableCard'
```

- [ ] **Step 2: Add a `scoreVar` helper**

Immediately after the existing `scoreColor` function, add:

```tsx
/** Cream-theme score color for table cells (scoreColor stays hex for charts). */
function scoreVar(score: number | null): string {
  if (score === null) return 'var(--ink-faint)'
  if (score >= 80) return 'var(--accent-2)'
  if (score >= 60) return 'var(--gold)'
  return 'var(--danger)'
}
```

- [ ] **Step 3: Restyle the `tableColumns` array**

Replace the whole `const tableColumns: Column<FlatRow>[] = [ … ]` array with:

```tsx
  const tableColumns: Column<FlatRow>[] = [
    {
      key: 'orgUnit',
      header: 'Подразделение',
      render: n => (
        <span
          className="text-sm font-medium"
          style={{ paddingLeft: n.depth * 18, display: 'inline-block', color: 'var(--ink)' }}
        >
          {n.orgUnitNameRu}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Тип',
      render: n => <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>{n.type}</span>,
    },
    {
      key: 'employeeCount',
      header: 'Сотр.',
      render: n => <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{n.employeeCount}</span>,
    },
    {
      key: 'avgScore',
      header: 'Ср. балл',
      render: n =>
        n.avgScore !== null ? (
          <span className="font-mono font-bold" style={{ color: scoreVar(n.avgScore) }}>
            {Number(n.avgScore).toFixed(1)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'minMax',
      header: 'Мин / Макс',
      render: n => (
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          {n.minScore !== null ? Number(n.minScore).toFixed(1) : '—'} /{' '}
          {n.maxScore !== null ? Number(n.maxScore).toFixed(1) : '—'}
        </span>
      ),
    },
  ]
```

- [ ] **Step 4: Restyle the filter card**

Change the filter card opening tag from:

```tsx
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
```

to:

```tsx
      <div className="rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end"
           style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)' }}>
```

For all four `<label>` elements, change `className="block text-xs text-gray-500 mb-1"` to `className="block text-xs mb-1" style={{ color: 'var(--ink-faint)' }}`.

For the two `<select>` elements, change `className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary"` to `className="px-3 py-1.5 rounded text-sm focus:ring-2 focus:ring-primary" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }}`.

For the two date `<input>` elements, change `className="px-3 py-1.5 border border-gray-300 rounded text-sm"` to `className="px-3 py-1.5 rounded text-sm" style={{ border: '1px solid var(--line)', background: 'var(--surface-mute)', color: 'var(--ink)' }}`. (Keep the `min={startDate}` attribute on the second input.)

- [ ] **Step 5: Restyle the mode-toggle buttons**

Replace the mode-toggle block:

```tsx
      {/* Mode toggle */}
      <div className="flex gap-1 mb-4">
        {modes.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm border ${
              mode === m.key
                ? 'bg-primary text-white border-primary'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>
```

with:

```tsx
      {/* Mode toggle */}
      <div className="flex gap-1.5 mb-4">
        {modes.map(m => {
          const active = mode === m.key
          return (
            <button key={m.key} onClick={() => setMode(m.key)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--bg)' : 'var(--ink-soft)',
                border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
              }}>
              {m.icon} {m.label}
            </button>
          )
        })}
      </div>
```

- [ ] **Step 6: Convert the 4-mode card into a TableCard**

Replace the entire `{loading ? ( … ) : ( … )}` block — from `{loading ? (` through its matching closing `)}` — i.e. the gray `<div className="bg-white rounded-lg border border-gray-200 p-4">` and all four mode regions inside it:

```tsx
      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {/* Tree mode */}
          {mode === 'tree' && (
            nodes.length === 0
              ? <div className="text-center py-8 text-gray-400">Нет данных</div>
              : nodes.map(n => <TreeNode key={n.orgUnitId} node={n} onDrillDown={setDrillDown} />)
          )}

          {/* Table mode */}
          {mode === 'table' && (
            <div className="overflow-x-auto">
              <DataTable<FlatRow>
                caption="Иерархическая аналитика подразделений"
                columns={tableColumns}
                rows={flatRows}
                rowKey={n => n.orgUnitId}
                onRowClick={n => setDrillDown(n)}
                empty={<div className="text-gray-400">Нет данных</div>}
              />
            </div>
          )}

          {/* Bar chart mode */}
          {mode === 'bar' && barData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ left: 10, right: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" name="Средний балл">
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={scoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Heatmap mode */}
          {mode === 'heatmap' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {flat.map(n => (
                <div key={n.orgUnitId}
                  onClick={() => setDrillDown(n)}
                  title={n.orgUnitNameRu}
                  className="rounded-lg p-3 text-white text-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: scoreColor(n.avgScore) }}>
                  <div className="text-xs font-medium truncate">{n.orgUnitNameRu}</div>
                  <div className="text-lg font-bold mt-1">
                    {n.avgScore !== null ? Number(n.avgScore).toFixed(0) : '—'}
                  </div>
                  <div className="text-xs opacity-80">{n.employeeCount} чел.</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
```

with this — the gray card becomes `<TableCard>`; the three non-table modes each get a `p-4` wrapper (because `TableCard` children render full-bleed); the table mode renders `DataTable` directly:

```tsx
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--ink-faint)' }}>Загрузка...</div>
      ) : (
        <TableCard>
          {/* Tree mode */}
          {mode === 'tree' && (
            <div className="p-4">
              {nodes.length === 0
                ? <div className="text-center py-8" style={{ color: 'var(--ink-faint)' }}>Нет данных</div>
                : nodes.map(n => <TreeNode key={n.orgUnitId} node={n} onDrillDown={setDrillDown} />)}
            </div>
          )}

          {/* Table mode */}
          {mode === 'table' && (
            <DataTable<FlatRow>
              caption="Иерархическая аналитика подразделений"
              columns={tableColumns}
              rows={flatRows}
              rowKey={n => n.orgUnitId}
              onRowClick={n => setDrillDown(n)}
              empty={<span style={{ color: 'var(--ink-faint)' }}>Нет данных</span>}
            />
          )}

          {/* Bar chart mode */}
          {mode === 'bar' && barData.length > 0 && (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ left: 10, right: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" name="Средний балл">
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={scoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Heatmap mode */}
          {mode === 'heatmap' && (
            <div className="p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {flat.map(n => (
                  <div key={n.orgUnitId}
                    onClick={() => setDrillDown(n)}
                    title={n.orgUnitNameRu}
                    className="rounded-lg p-3 text-white text-center cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: scoreColor(n.avgScore) }}>
                    <div className="text-xs font-medium truncate">{n.orgUnitNameRu}</div>
                    <div className="text-lg font-bold mt-1">
                      {n.avgScore !== null ? Number(n.avgScore).toFixed(0) : '—'}
                    </div>
                    <div className="text-xs opacity-80">{n.employeeCount} чел.</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TableCard>
      )}
```

- [ ] **Step 7: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/analytics/HierarchicalAnalyticsPage.tsx
git commit -m "style(analytics): restyle Hierarchical analytics table to cream theme"
```

---

## Task 9: Restyle ManagerDashboardPage

**Files:**
- Modify: `frontend/src/features/analytics/ManagerDashboardPage.tsx`

- [ ] **Step 1: Add imports**

After the `import { DataTable, type Column } from '../../components/DataTable'` line, add:

```tsx
import { TableCard } from '../../components/TableCard'
import { Badge } from '../../components/Badge'
```

- [ ] **Step 2: Restyle `ScoreCell`**

Replace:

```tsx
function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">—</span>
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'
  return <span className={`font-mono font-semibold ${color}`}>{score.toFixed(1)}</span>
}
```

with:

```tsx
function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>—</span>
  const color = score >= 80 ? 'var(--accent-2)' : score >= 60 ? 'var(--gold)' : 'var(--danger)'
  return <span className="font-mono font-semibold" style={{ color }}>{score.toFixed(1)}</span>
}
```

- [ ] **Step 3: Restyle the `status` and `__actions` columns**

In `buildSubordinateColumns`, replace the `status` column object:

```tsx
    {
      key: 'status', header: 'Статус',
      render: r => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          r.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
        }`}>
          {r.status === 'DRAFT' ? 'Ожидает' : 'Готово'}
        </span>
      ),
    },
```

with:

```tsx
    {
      key: 'status', header: 'Статус',
      render: r => (
        <Badge tone={r.status === 'DRAFT' ? 'warn' : 'success'}>
          {r.status === 'DRAFT' ? 'Ожидает' : 'Готово'}
        </Badge>
      ),
    },
```

and replace the `__actions` column object:

```tsx
    {
      key: '__actions', header: 'Действия', srOnlyHeader: true, align: 'right', width: '120px',
      render: r => (
        <button
          type="button"
          onClick={() => onOpen(r)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
        >
          Открыть
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      ),
    },
```

with:

```tsx
    {
      key: '__actions', header: 'Действия', srOnlyHeader: true, align: 'right', width: '120px',
      render: r => (
        <button
          type="button"
          onClick={() => onOpen(r)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition hover:bg-[var(--accent-mute)]"
          style={{ color: 'var(--accent-2)' }}
        >
          Открыть
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      ),
    },
```

- [ ] **Step 4: Wrap the subordinates table in TableCard**

Replace this block:

```tsx
      {/* Full subordinates table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
          <Users size={16} className="text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">
            Все подчинённые ({subordinates.length})
          </span>
        </div>
        <DataTable<RankedRow>
          caption="Все подчинённые"
          columns={subordinateColumns}
          rows={rankedRows}
          rowKey={r => r.userId}
          totalCount={rankedRows.length}
          empty="Нет данных для текущего периода"
        />
      </div>
```

with:

```tsx
      {/* Full subordinates table */}
      <TableCard
        header={
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: 'var(--ink-soft)' }} />
            <span className="font-display" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
              Все подчинённые ({subordinates.length})
            </span>
          </div>
        }
      >
        <DataTable<RankedRow>
          caption="Все подчинённые"
          columns={subordinateColumns}
          rows={rankedRows}
          rowKey={r => r.userId}
          totalCount={rankedRows.length}
          empty="Нет данных для текущего периода"
        />
      </TableCard>
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/analytics/ManagerDashboardPage.tsx
git commit -m "style(analytics): restyle ManagerDashboard table to cream theme"
```

---

## Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full production build**

Run: `cd frontend && npm run build`
Expected: build succeeds with no TypeScript errors and no Vite errors.

- [ ] **Step 2: Manual smoke test**

Start the dev stack (`./scripts/dev-start.sh`) and visit each screen. Confirm:

- [ ] `/admin/delegations` — table renders inside the cream `TableCard` with the 3px accent stripe; filter chips, search, and numbered pagination still work; inactive delegations render dimmed; "Снять" → `ConfirmDialog` → deactivation still works.
- [ ] `/admin/audit` — cream `TableCard`; row expand/collapse works; filters + reset work; prev/next pagination in the card footer works.
- [ ] `/admin/monitoring` — Quartz-jobs table in a cream `TableCard`; job-state `Badge`s show the right tones; Backend Health + Error Log sections still render (unchanged gray).
- [ ] Anti-bonus analytics — Топ-10 table in a cream `TableCard`; filter card is cream; distribution/dynamics charts unchanged.
- [ ] Hierarchical analytics — all four modes (tree/table/bar/heatmap) render inside the cream card with correct padding; cream filter card + mode toggle.
- [ ] Manager dashboard — subordinates table in a cream `TableCard`; status `Badge`s and score colors render; progress + top-3/bottom-3 cards unchanged.
- [ ] Density toggle (account menu) still switches comfortable/compact on every table.

- [ ] **Step 3: Confirm no regressions to untouched tables**

- [ ] `/admin/criteria` and the users table render exactly as before (not in scope, must be untouched).

---

## Self-Review Notes

- **Spec coverage:** `TableCard` (Task 2) ✓; `Badge` (Task 1) ✓; `DataTable.rowClassName` (Task 3) ✓; DelegationsPage migration incl. 7 columns, kept/removed code, `dl-inactive` dimming (Task 4) ✓; 5 gray pages restyle — AntiBonus (5), AuditLog (6), AdminMonitoring (7), Hierarchical (8), Manager (9) ✓; verification incl. `npm run build` + manual + untouched-table check (Task 10) ✓.
- **Type names** are consistent across tasks: `BadgeTone`, `BadgeProps`, `TableCardProps`, `rowClassName`, `scoreVar`, `JOB_STATE_TONE`, `actionTone`, `selectStyle`.
- **Out of scope, untouched:** `CriteriaPage`, `UserTable`, page headings, recharts charts, tree/heatmap data logic, i18n strings.
