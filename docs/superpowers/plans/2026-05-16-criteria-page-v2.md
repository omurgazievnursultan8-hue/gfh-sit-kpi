# Criteria Page V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `DataPanel`-based criteria management page (`/criteria-v2`) mirroring `UsersPageV2`, with a sidebar link, coexisting with the old `/admin/criteria` page.

**Architecture:** New `CriteriaPageV2` page renders a POSITIVE/ANTI_BONUS tab strip above a client-mode `DataPanel<Criteria>`. Criteria are fetched wide once and filtered/sorted client-side. Create/edit reuse the existing `CriteriaFormModal`; row actions use a new `CriteriaRowMenu`.

**Tech Stack:** React 18, TypeScript, Vite, react-router v6, lucide-react. No frontend test runner exists — verification is `npx tsc --noEmit` plus the production build.

---

## File Structure

- Create: `frontend/src/features/criteria/components/CriteriaRowMenu.tsx` — `⋯` overflow menu (Edit / Deactivate / Reactivate).
- Create: `frontend/src/features/criteria/CriteriaPageV2.tsx` — the page.
- Modify: `frontend/src/App.tsx` — add `/criteria-v2` route.
- Modify: `frontend/src/components/shell/navConfig.ts` — add nav item.
- Modify: `frontend/public/locales/ru/translation.json` — add `admin.criteriaV2`.
- Modify: `frontend/public/locales/kg/translation.json` — add `admin.criteriaV2`.

All commands run from `frontend/`.

---

## Task 1: CriteriaRowMenu component

**Files:**
- Create: `frontend/src/features/criteria/components/CriteriaRowMenu.tsx`

- [ ] **Step 1: Create the component**

This mirrors `users/components/UserRowMenu.tsx` (same outside-click / Escape handling, same `MenuItem` styling). Edit is disabled for `frozen` criteria.

```tsx
import { useState, useRef, useEffect } from 'react'
import type { Criteria } from '../criteriaApi'

export interface CriteriaActions {
  onEdit: (c: Criteria) => void
  onDeactivate: (c: Criteria) => void
  onReactivate: (c: Criteria) => void
}

// Compact `⋯` overflow menu — quick row actions.
export function CriteriaRowMenu({ criterion, actions }: { criterion: Criteria; actions: CriteriaActions }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (fn: () => void) => { setOpen(false); fn() }

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        aria-label="Действия"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="font-mono inline-flex items-center justify-center transition-colors"
        style={{
          width: 28, height: 28, borderRadius: 4,
          background: open ? 'var(--surface-mute)' : 'transparent',
          color: 'var(--ink-faint)',
          border: `1px solid ${open ? 'var(--line)' : 'transparent'}`,
          cursor: 'pointer', fontSize: 15, lineHeight: 1, fontWeight: 700,
        }}
      >
        ⋯
      </button>

      {open && (
        <div
          role="menu"
          className="absolute z-50 overflow-hidden rounded-lg"
          style={{
            top: 'calc(100% + 4px)', right: 0, minWidth: 180,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <MenuItem
            tone="ink"
            disabled={criterion.frozen}
            onClick={() => run(() => actions.onEdit(criterion))}
          >
            Изменить
          </MenuItem>
          {criterion.active ? (
            <MenuItem tone="danger" onClick={() => run(() => actions.onDeactivate(criterion))}>
              Деактивировать
            </MenuItem>
          ) : (
            <MenuItem tone="ok" onClick={() => run(() => actions.onReactivate(criterion))}>
              Активировать
            </MenuItem>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  children, onClick, tone, disabled = false,
}: {
  children: React.ReactNode
  onClick: () => void
  tone: 'ink' | 'ok' | 'danger'
  disabled?: boolean
}) {
  const color =
    tone === 'ok' ? 'var(--accent)' :
    tone === 'danger' ? 'var(--danger)' : 'var(--ink-soft)'
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={e => { e.stopPropagation(); if (!disabled) onClick() }}
      className="criteria-menu-item w-full text-left transition-colors"
      style={{
        display: 'block', padding: '8px 12px', fontSize: 13, fontWeight: 500,
        fontFamily: 'inherit',
        color: disabled ? 'var(--ink-dim)' : color,
        background: 'transparent', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
      <style>{`.criteria-menu-item:not(:disabled):hover { background: var(--surface-mute); }`}</style>
    </button>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). `CriteriaRowMenu` is not yet imported anywhere — that is fine.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/criteria/components/CriteriaRowMenu.tsx
git commit -m "feat(criteria): add CriteriaRowMenu overflow menu"
```

---

## Task 2: CriteriaPageV2 page

**Files:**
- Create: `frontend/src/features/criteria/CriteriaPageV2.tsx`

Depends on Task 1 (`CriteriaRowMenu`, `CriteriaActions`).

- [ ] **Step 1: Create the page**

```tsx
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Layout } from '../../components/Layout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { StatusPill } from '../users/components/usersMeta'
import { CriteriaFormModal } from './components/CriteriaFormModal'
import { CriteriaRowMenu, type CriteriaActions } from './components/CriteriaRowMenu'
import { Criteria, CriteriaType, criteriaApi } from './criteriaApi'
import { OrgUnit, orgApi } from '../org/orgApi'

const VIEW_KEY = 'gfh_criteria_v2_view'

const TABS: { value: CriteriaType; label: string }[] = [
  { value: 'POSITIVE',   label: 'Положительные' },
  { value: 'ANTI_BONUS', label: 'Антибонус' },
]

const SCOPE_OPTIONS = [
  { value: '',       label: 'Все области' },
  { value: 'global', label: 'Глобальные' },
  { value: 'local',  label: 'Локальные' },
]
const STATUS_OPTIONS = [
  { value: '',         label: 'Любой статус' },
  { value: 'active',   label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
]

const FILTERS: FilterDef[] = [
  { key: 'scope',  label: 'Область', type: 'select', options: SCOPE_OPTIONS },
  { key: 'status', label: 'Статус',  type: 'select', options: STATUS_OPTIONS },
]

function flattenOrgTree(units: OrgUnit[]): OrgUnit[] {
  return units.flatMap(u => [u, ...flattenOrgTree(u.children || [])])
}

const scopeLabel = (c: Criteria) => (c.orgUnitId == null ? 'Глобальный' : (c.orgUnitNameRu ?? 'Локальный'))

export function CriteriaPageV2() {
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<CriteriaType>('POSITIVE')
  const [editing, setEditing] = useState<Criteria | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; description: string; onConfirm: () => void
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  const loadCriteria = useCallback(async () => {
    setLoading(true)
    try {
      // ~dozens of criteria — fetch wide, DataPanel filters/sorts client-side.
      const data = await criteriaApi.list(0, 500)
      setCriteria(data.content)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCriteria() }, [loadCriteria])
  useEffect(() => { orgApi.getStructure().then(tree => setOrgUnits(flattenOrgTree(tree))) }, [])

  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }))

  const actions: CriteriaActions = {
    onEdit: (c) => setEditing(c),
    onDeactivate: (c) => setConfirmDialog({
      open: true,
      title: 'Деактивировать критерий?',
      description: `«${c.nameRu}» больше не будет применяться к новым оценкам.`,
      onConfirm: async () => {
        try { await criteriaApi.deactivate(c.id); loadCriteria() }
        finally { closeConfirm() }
      },
    }),
    onReactivate: (c) => {
      criteriaApi.reactivate(c.id).then(loadCriteria)
    },
  }

  const columns: Column<Criteria>[] = [
    {
      key: 'name', header: 'Критерий', sortable: true,
      render: (c) => (
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{c.nameRu}</span>
      ),
    },
    {
      key: 'scope', header: 'Область', sortable: true,
      render: (c) => (
        <span style={{ fontSize: 13, color: c.orgUnitId == null ? 'var(--ink-dim)' : 'var(--ink-soft)' }}>
          {scopeLabel(c)}
        </span>
      ),
    },
    {
      key: 'weight', header: 'Вес', sortable: true, align: 'right',
      render: (c) => (
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }} className="tabular-nums">
          {c.weight}%
        </span>
      ),
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (c) => <StatusPill active={c.active} />,
    },
    {
      key: 'actions', header: 'Действия', align: 'right', srOnlyHeader: true,
      render: (c) => (
        <div onClick={e => e.stopPropagation()}>
          <CriteriaRowMenu criterion={c} actions={actions} />
        </div>
      ),
    },
  ]

  const searchText = (c: Criteria) => `${c.nameRu} ${c.nameKg} ${c.orgUnitNameRu ?? ''}`

  const clientFilter = (c: Criteria, v: Record<string, string>) => {
    if (v.scope === 'global' && c.orgUnitId != null) return false
    if (v.scope === 'local' && c.orgUnitId == null) return false
    if (v.status === 'active' && !c.active) return false
    if (v.status === 'inactive' && c.active) return false
    return true
  }

  const comparator = (key: string) => (a: Criteria, b: Criteria): number => {
    switch (key) {
      case 'scope':  return scopeLabel(a).localeCompare(scopeLabel(b), 'ru')
      case 'weight': return a.weight - b.weight
      case 'status': return Number(b.active) - Number(a.active)
      default:       return a.nameRu.localeCompare(b.nameRu, 'ru')
    }
  }

  const renderCard = (c: Criteria): ReactNode => (
    <div
      className="criteria-card"
      onClick={() => setEditing(c.frozen ? null : c)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
        cursor: c.frozen ? 'default' : 'pointer',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            {c.nameRu}
          </div>
          <div className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {c.nameKg}
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <CriteriaRowMenu criterion={c} actions={actions} />
        </div>
      </div>
      <div className="flex flex-col gap-2.5" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
        <CardMetaRow k="Область">
          <span style={{ color: c.orgUnitId == null ? 'var(--ink-dim)' : 'var(--ink)' }}>{scopeLabel(c)}</span>
        </CardMetaRow>
        <CardMetaRow k="Вес"><span className="tabular-nums">{c.weight}%</span></CardMetaRow>
        <CardMetaRow k="Статус"><StatusPill active={c.active} /></CardMetaRow>
      </div>
      <style>{`
        .criteria-card { transition: border-color 120ms ease, box-shadow 120ms ease; }
        .criteria-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-md); }
      `}</style>
    </div>
  )

  const addButton = (
    <button
      onClick={() => setShowCreate(true)}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        fontSize: 13.5, fontWeight: 500, height: 38, padding: '0 14px', borderRadius: 10,
        background: 'var(--accent)', color: 'var(--surface)',
        border: '1px solid var(--accent-ink)', cursor: 'pointer',
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: 15, height: 15, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      Добавить
    </button>
  )

  const visibleRows = criteria.filter(c => c.type === activeTab)

  return (
    <Layout>
      <div style={{ padding: '8px 0 32px' }}>
        <div className="mb-5">
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '-0.01em' }}>
            Критерии оценки
          </h1>
          <p style={{ marginTop: 5, fontSize: 14, color: 'var(--ink-soft)', maxWidth: 600, lineHeight: 1.5 }}>
            Управление критериями KPI: положительными показателями и антибонусами.
          </p>
        </div>

        <div className="flex gap-1 mb-4" role="tablist">
          {TABS.map(tab => {
            const on = tab.value === activeTab
            return (
              <button
                key={tab.value}
                role="tab"
                aria-selected={on}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  fontSize: 13.5, fontWeight: 500, height: 36, padding: '0 16px', borderRadius: 8,
                  background: on ? 'var(--accent-mute)' : 'transparent',
                  color: on ? 'var(--accent)' : 'var(--ink-soft)',
                  border: `1px solid ${on ? 'var(--accent-soft)' : 'var(--line)'}`,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <DataPanel<Criteria>
          mode="client"
          columns={columns}
          rows={visibleRows}
          rowKey={(c) => c.id}
          loading={loading}
          caption="Список критериев"
          empty="Совпадений не найдено"
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по названию…"
          filters={FILTERS}
          filterValues={filterValues}
          onFilterValuesChange={setFilterValues}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'weight', dir: 'desc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          viewStorageKey={VIEW_KEY}
          onRowClick={(c) => { if (!c.frozen) setEditing(c) }}
          toolbarActions={addButton}
        />
      </div>

      <CriteriaFormModal
        open={showCreate || editing != null}
        editing={editing}
        prefill={null}
        orgUnits={orgUnits}
        onSave={async (data) => {
          if (editing) await criteriaApi.update(editing.id, data)
          else await criteriaApi.create(data)
          loadCriteria()
        }}
        onClose={() => { setShowCreate(false); setEditing(null) }}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
    </Layout>
  )
}

function CardMetaRow({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ minHeight: 22 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{k}</span>
      <span className="truncate" style={{ fontSize: 13, textAlign: 'right' }}>{children}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify ConfirmDialog prop names**

Run: `grep -n "interface\|Props\|onConfirm\|onCancel\|variant" frontend/src/components/ConfirmDialog.tsx | head`
Expected: confirm `ConfirmDialog` accepts `open`, `title`, `description`, `variant`, `onConfirm`, `onCancel`. If a prop name differs (e.g. `message` instead of `description`), adjust the `<ConfirmDialog>` usage above to match. `UsersPageV2.tsx:291` spreads the same shape, so the names should already match.

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS. `CriteriaPageV2` is not yet routed — that is fine.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/criteria/CriteriaPageV2.tsx
git commit -m "feat(criteria): add CriteriaPageV2 built on DataPanel"
```

---

## Task 3: Wire route, sidebar link, translations

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/shell/navConfig.ts`
- Modify: `frontend/public/locales/ru/translation.json`
- Modify: `frontend/public/locales/kg/translation.json`

- [ ] **Step 1: Add the route to App.tsx**

In `frontend/src/App.tsx`, add the import next to the existing `UsersPageV2` import (line 16):

```tsx
import { CriteriaPageV2 } from './features/criteria/CriteriaPageV2'
```

Add the route immediately after the `/users-v2` route (line 53):

```tsx
<Route path="/criteria-v2" element={<ProtectedRoute allowedRoles={['ADMIN']}><CriteriaPageV2 /></ProtectedRoute>} />
```

- [ ] **Step 2: Add the sidebar nav item**

In `frontend/src/components/shell/navConfig.ts`, in `NAV_SECTIONS[2]` (admin section) → `groups[0]` (`nav.groupAdmin`) → `items`, add a new item directly after the `/admin/criteria` item (line 116):

```ts
{ to: '/criteria-v2', labelKey: 'admin.criteriaV2', icon: ListChecks, roles: ADMIN_ONLY },
```

`ListChecks` is already imported in this file (line 6) — no import change needed.

- [ ] **Step 3: Add the ru translation**

In `frontend/public/locales/ru/translation.json`, find the `"admin"` object and the existing `"usersV2"` key inside it. Add a sibling key:

```json
"criteriaV2": "Критерии V2",
```

Place it next to `"usersV2"` so JSON stays valid (mind trailing commas).

- [ ] **Step 4: Add the kg translation**

In `frontend/public/locales/kg/translation.json`, in the same `"admin"` object next to `"usersV2"`, add:

```json
"criteriaV2": "Критерийлер V2",
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Validate JSON**

Run: `cd frontend && node -e "JSON.parse(require('fs').readFileSync('public/locales/ru/translation.json'));JSON.parse(require('fs').readFileSync('public/locales/kg/translation.json'));console.log('json ok')"`
Expected: prints `json ok`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/shell/navConfig.ts frontend/public/locales/ru/translation.json frontend/public/locales/kg/translation.json
git commit -m "feat(criteria): route /criteria-v2 and add sidebar link"
```

---

## Task 4: Final verification

- [ ] **Step 1: Production build**

Run: `cd frontend && npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 2: Manual smoke test**

Start the dev stack (`./scripts/dev-start.sh` from repo root) and, logged in as ADMIN:

- Sidebar admin section shows a "Критерии V2" link → navigates to `/criteria-v2`.
- Tabs switch between Положительные (POSITIVE) and Антибонус (ANTI_BONUS) rows.
- Search box filters by name; scope and status filter dropdowns work; column sorting works; table/cards toggle works.
- "Добавить" opens the form modal; saving creates a criterion and the list reloads.
- Row menu Edit opens the modal pre-filled; Edit is disabled for a frozen criterion.
- Row menu Deactivate shows the confirm dialog; confirming deactivates and reloads. Reactivate works on an inactive criterion.

- [ ] **Step 3: No commit**

Verification only — nothing to commit unless a fix was needed.

---

## Self-Review Notes

- **Spec coverage:** tab strip (T2), DataPanel columns/filters/search/sort/views (T2), CriteriaRowMenu with frozen-edit guard (T1), CriteriaFormModal reuse + orgUnits flatten (T2), route + nav + translations (T3) — all covered.
- **Type consistency:** `CriteriaActions` defined in T1 (`onEdit`/`onDeactivate`/`onReactivate`) and consumed unchanged in T2. `CriteriaFormModal` props (`open`/`editing`/`prefill`/`orgUnits`/`onSave`/`onClose`) match `CriteriaFormModal.tsx`. `Criteria` fields (`active`, `frozen`, `orgUnitId`, `orgUnitNameRu`, `weight`, `type`) match `criteriaApi.ts`.
- **Known cosmetic:** imported `StatusPill` renders "Заблокирован" for inactive — accepted per spec.
