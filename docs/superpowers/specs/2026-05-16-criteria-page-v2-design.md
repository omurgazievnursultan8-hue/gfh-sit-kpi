# Criteria Page V2 — Design

Date: 2026-05-16
Status: Approved (pending spec review)

## Goal

Build a new criteria management page on the shared `DataPanel` component,
mirroring `UsersPageV2`. Add a sidebar link. The page coexists with the
existing `/admin/criteria` page (`CriteriaPage`) — old page is not removed.

## Scope

UsersPageV2 parity:

- In scope: searchable/filterable/sortable list, table + cards views,
  create/edit via modal, activate/deactivate with confirmation.
- Out of scope (dropped vs old `CriteriaPage`): inline editing, bulk
  operations, history drawer.

## Files

### New

- `frontend/src/features/criteria/CriteriaPageV2.tsx` — page component.
- `frontend/src/features/criteria/components/CriteriaRowMenu.tsx` — row
  action menu, mirrors `users/components/UserRowMenu.tsx`.

### Modified

- `frontend/src/App.tsx` — add route `/criteria-v2`.
- `frontend/src/components/shell/navConfig.ts` — add nav item.
- `frontend/public/locales/ru/translation.json` — add `admin.criteriaV2`.
- `frontend/public/locales/kg/translation.json` — add `admin.criteriaV2`.

### Reused unchanged

- `criteriaApi` (`criteriaApi.ts`) — `list`, `create`, `update`,
  `deactivate`, `reactivate`.
- `components/CriteriaFormModal.tsx` — create/edit form, as-is.
- `components/WeightBar.tsx` — weight visualization.
- `components/DataPanel.tsx`, `ConfirmDialog`, `Layout`.
- `users/components/usersMeta` — import `StatusPill` (active/inactive).

## CriteriaPageV2 structure

State: `criteria: Criteria[]`, `loading`, `activeTab: CriteriaType`,
`editing: Criteria | null`, `showCreate`, `filterValues`, `confirmDialog`.

Data load: `criteriaApi.list(0, 500)` on mount; reload after every mutation.
Client mode — `DataPanel` filters/sorts the in-memory list.

### Tab strip

Above `DataPanel`. Two tabs: `Положительные` (POSITIVE) /
`Антибонус` (ANTI_BONUS). Owns `activeTab`. `DataPanel` receives only rows
matching `activeTab`. Switching tabs does not clear `filterValues`.

### DataPanel<Criteria> config

- `mode="client"`, `rowKey={c => c.id}`.
- `columns`:
  - `name` — `nameRu`, sortable. Card/table primary text.
  - `scope` — "Глобальный" if `orgUnitId == null`, else "Локальный" with
    `orgUnitNameRu`. Sortable.
  - `weight` — `WeightBar` + numeric value, sortable.
  - `status` — `StatusPill active={c.active}` (imported from usersMeta).
    Sortable.
  - `actions` — `CriteriaRowMenu`, `align: 'right'`, `srOnlyHeader`.
- `searchText`: `${nameRu} ${nameKg} ${orgUnitNameRu ?? ''}`.
- `filters` (`FilterDef[]`):
  - `scope` — select: Все области / Глобальные / Локальные.
  - `status` — select: Любой статус / Активные / Неактивные.
- `clientFilter`: applies scope + status against `filterValues`.
- `comparator`: name (default), scope, weight (numeric), status.
- `defaultSort`: `{ key: 'weight', dir: 'desc' }`.
- `views: ['table', 'cards']`, `renderCard`,
  `viewStorageKey: 'gfh_criteria_v2_view'`.
- `toolbarActions`: "Добавить" button → opens `CriteriaFormModal` (create).
- `onRowClick`: opens `CriteriaFormModal` (edit) for that row.
- `empty`: "Совпадений не найдено".

### CriteriaRowMenu

Mirrors `UserRowMenu`. Actions:

- Edit — disabled when `criterion.frozen` is true.
- Deactivate (when `active`) — `ConfirmDialog`, calls
  `criteriaApi.deactivate`.
- Reactivate (when `!active`) — calls `criteriaApi.reactivate`.

`stopPropagation` on the menu wrapper so row click does not also fire.

### Modals

- `CriteriaFormModal` open when `showCreate || editing != null`.
  `onSave`: `editing ? update(id, data) : create(data)`, then reload.
- `ConfirmDialog` for deactivate, `variant="danger"`.

Russian strings hardcoded in the component, consistent with `UsersPageV2`
(which does not use `t()`).

## Wiring

### App.tsx

Add after the `/criteria` / near other admin routes:

```tsx
<Route path="/criteria-v2" element={
  <ProtectedRoute allowedRoles={['ADMIN']}><CriteriaPageV2 /></ProtectedRoute>
} />
```

Import `CriteriaPageV2` from `./features/criteria/CriteriaPageV2`.

### navConfig.ts

Add to the admin section (`NAV_SECTIONS[2]`), after the existing
`/admin/criteria` item:

```ts
{ to: '/criteria-v2', labelKey: 'admin.criteriaV2', icon: ListChecks, roles: ADMIN_ONLY }
```

`ListChecks` imported from `lucide-react`.

### Translations

`admin.criteriaV2`:
- ru: "Критерии V2"
- kg: "Критерийлер V2"

## Verification

- `npx tsc --noEmit` passes.
- `/criteria-v2` renders for ADMIN; sidebar link navigates to it.
- Tabs switch POSITIVE/ANTI_BONUS rows.
- Search, scope/status filters, sorting, table/cards toggle work.
- Create/edit via modal, deactivate (confirm) / reactivate, list reloads.
- Frozen criterion: edit disabled.
