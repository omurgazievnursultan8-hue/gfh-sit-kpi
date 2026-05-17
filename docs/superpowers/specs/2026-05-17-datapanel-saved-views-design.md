# DataPanel: Saved Views, Columns Config, Active Filter Chips

**Date:** 2026-05-17
**Status:** Approved
**Scope:** Shared `DataPanel` component + `CriteriaPageV2` as first consumer.

## Goal

Add three table-management features to the shared `DataPanel`:

1. **Saved views** — named, persisted combinations of filters, search, sort, column visibility, and table/cards mode.
2. **Columns config** — show/hide table columns via a toolbar dropdown.
3. **Active filter chips** — a removable readout of currently-applied filters below the toolbar.

All three are built into `DataPanel` so every page that uses it can opt in. `CriteriaPageV2` is the first consumer.

## Decisions

- Features live in the shared `DataPanel` (not duplicated per page).
- Saved views persist in `localStorage` (per-browser). No backend work.
- Columns config supports show/hide only — no reordering.
- A saved view captures: filters, search, sort, column visibility, table/cards mode.
- Saved-views UI: a dropdown button in the toolbar.
- A built-in, non-deletable default view ("Все") exists.
- Active-filter chips render on their own row below the toolbar.

## Architecture

New internal `DataPanel` state:

- `hiddenColumns: string[]` — keys of columns hidden from the table view.
- `savedViews: SavedView[]` — user-created views (loaded from localStorage).
- `activeViewId: string` — id of the currently-applied view (`__default__` when none).

New components (in `frontend/src/components/`):

- `SavedViewsMenu.tsx` — toolbar dropdown: view list, save, delete.
- `ColumnsMenu.tsx` — toolbar gear dropdown: show/hide checklist.
- `ActiveFilterChips.tsx` — chip row below the toolbar.

`DataTable` is unchanged — it receives a column array already filtered by `hiddenColumns`.

## 1. Saved Views

### Data model

```ts
export interface SavedView {
  id: string            // crypto.randomUUID(); built-in default uses '__default__'
  name: string
  state: {
    search: string
    filters: Record<string, string>
    sort: { key: string; dir: SortDir } | null
    hiddenColumns: string[]
    view: ViewKind
  }
}
```

### Built-in default view

- `id: '__default__'`, `name: 'Все'`.
- Represents the reset state: empty search, no filters, `defaultSort`, no hidden columns, `views[0]` mode.
- Cannot be deleted. Always first in the list.

### Persistence

- New prop `panelStorageKey: string`.
- Two localStorage keys derived from it:
  - `${panelStorageKey}:views` — JSON array of user `SavedView`s (default view not stored).
  - `${panelStorageKey}:state` — last working state (the five `state` fields), restored on mount so a reload preserves filters/sort/columns/mode.
- The legacy `viewStorageKey` prop is left untouched for other pages still using it. `CriteriaPageV2` migrates to `panelStorageKey`. A page passes one or the other, not both.

### Behavior

- Dropdown lists the default view plus all custom views, with a ✓ on the active view.
- "Сохранить как…" prompts for a name, captures the current working state into a new `SavedView`, appends it, and makes it active.
- Each custom view has a trash control to delete it; deleting the active view falls back to `__default__`.
- When the working state diverges from the active view's stored state, the dropdown label shows a "• изменено" suffix.
- Applying a view sets search, filters, sort, hiddenColumns, and view mode.
- When `filterValues` is controlled (passed as a prop), filter changes — including those from applying a view — route through `onFilterValuesChange`. When uncontrolled, `DataPanel` sets its internal filter state.

## 2. Columns Config

- `Column<T>` gains an optional field `hideable?: boolean` (default `true`).
- New prop `columnConfig?: boolean`. When true, the toolbar renders a gear dropdown listing every hideable column with a checkbox. Non-hideable columns are omitted from the list and always shown.
- `DataPanel` removes hidden columns from the `columns` array before passing it to `DataTable`.
- Hiding affects the **table view only**. Cards use the consumer's custom `renderCard` and are unaffected.
- `CriteriaPageV2`: the `name` and `actions` columns are marked `hideable: false`; `scope`, `weight`, `status` remain hideable.

## 3. Active Filter Chips

- New component `ActiveFilterChips`, rendered on its own row directly below the toolbar.
- The row only appears when at least one filter value is active. Search is not represented as a chip (it has its own visible input).
- Each chip shows `<filter label>: <option label>` and an × control that clears that one filter.
- The chip's option label is resolved from `FilterDef.options` by matching the active value.
- A "Очистить все" action clears all filter values (search is left intact).
- Chips are on by default whenever `filters` is non-empty; a consumer opts out with `showFilterChips={false}`.

## Files Touched

- `frontend/src/components/DataPanel.tsx` — new state, apply-view logic, prop plumbing, render chip row.
- `frontend/src/components/DataPanelToolbar.tsx` — mount Views menu and Columns gear.
- `frontend/src/components/DataTable.tsx` — no change (receives pre-filtered columns).
- `frontend/src/components/SavedViewsMenu.tsx` — new.
- `frontend/src/components/ColumnsMenu.tsx` — new.
- `frontend/src/components/ActiveFilterChips.tsx` — new.
- `frontend/src/features/criteria/CriteriaPageV2.tsx` — new props, `hideable` flags, storage-key swap.

## Out of Scope

- Backend-persisted / cross-device saved views.
- Column reordering.
- Renaming an existing saved view (delete + re-save instead).
- Applying saved views to the cards layout's content (only table/cards mode is captured, not card columns).

## Testing

- `npx tsc --noEmit` passes.
- Manual: on `/criteria-v2`, save a view with filters + hidden columns, reload, confirm restore; switch views; delete a view; verify default view non-deletable; verify chips appear/clear; verify hidden columns absent from table but cards intact.
