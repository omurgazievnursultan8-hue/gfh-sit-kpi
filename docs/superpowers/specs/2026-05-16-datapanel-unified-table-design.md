# DataPanel — Unified Table Component (Design)

Date: 2026-05-16
Status: Approved

## Goal

One reusable component that bundles a table with search, declarative filters,
pagination, and a table/cards view switch. Usable on every page that currently
hand-wires its own table toolbar + pager. First consumer: a new users page
(`UsersPageV2`) built at feature parity with the existing `UsersPage`.

The existing `UsersPage.tsx` is **not** deleted or modified.

## Scope

In scope:
- New component `frontend/src/components/DataPanel.tsx` + internal sub-components.
- New page `frontend/src/features/users/UsersPageV2.tsx` at feature parity.
- New route for the v2 page.

Out of scope:
- Migrating other table pages (audit log, monitoring, analytics) onto `DataPanel`.
  The component supports server mode so they *can* migrate later; this design does
  not do it.
- Changes to the existing `DataTable.tsx` (reused unchanged as the table-body
  renderer).

## Architecture

`DataPanel<T>` wraps the existing `DataTable<T>` and adds the toolbar + pager +
card-view shell around it.

```
┌─ DataPanelToolbar ─────────────────────────────┐
│ [search] [filter1▾][filter2▾][filterSlot]  [⊞|☰]│
├────────────────────────────────────────────────┤
│ table view → <DataTable columns rows .../>      │
│ cards view → grid of renderCard(row)            │
├─ DataPanelPager ───────────────────────────────┤
│ Показано N–M из T              [←][01][02][→]   │
└────────────────────────────────────────────────┘
```

Sub-components, all in `DataPanel.tsx` (or co-located files if it grows large):
- `DataPanelToolbar` — search input, declarative filter renderer, custom filter
  slot, view switch.
- `DataPanelPager` — range label + page buttons. Extracted from the existing
  `UsersPage.PagerButton` block; same cream-theme styling.
- Card grid — responsive grid rendering `renderCard(row)` per visible row.

Filter UI (select / toggle) reuses the cream-theme filter-select styling
established in recent `style(tables)` commits.

## Data modes

`mode?: 'client' | 'server'` — default `'client'`.

### Client mode
Panel owns all interaction state internally: search text, filter values, sort
key/dir, current page. Page passes the full `rows` array. Panel applies, in
order: search (`searchText`) → filters (`clientFilter`) → sort (`comparator`) →
slice by `pageSize`. Page resets to 0 whenever search/filter/sort changes.

### Server mode
Panel is controlled. It holds the *input* UI state (search box value, filter
selections, sort, page) and emits `onStateChange(state)` on every change. The
page fetches data and passes back the current-page `rows` plus `totalElements`.
Panel does not slice or filter in server mode.

`PanelState = { search: string; filters: Record<string,string>; sort: {key,dir} | null; page: number }`

## Component API

```ts
type ViewKind = 'table' | 'cards'

interface FilterDef {
  key: string
  label: string
  type: 'select' | 'toggle'
  options?: { value: string; label: string }[]   // required for type 'select'
}

interface PanelState {
  search: string
  filters: Record<string, string>
  sort: { key: string; dir: SortDir } | null
  page: number
}

interface DataPanelProps<T> {
  // data
  mode?: 'client' | 'server'                       // default 'client'
  columns: Column<T>[]                             // reuse DataTable Column<T>
  rows: T[]
  rowKey: (r: T) => string | number
  loading?: boolean
  caption: string
  empty?: React.ReactNode

  // search
  searchable?: boolean                             // default false
  searchText?: (r: T) => string                    // client mode search source
  searchPlaceholder?: string

  // filters
  filters?: FilterDef[]
  clientFilter?: (r: T, values: Record<string,string>) => boolean
  filterSlot?: React.ReactNode                     // custom extra filter JSX

  // sort
  comparator?: (key: string) => (a: T, b: T) => number   // client mode
  defaultSort?: { key: string; dir: SortDir }

  // view switch
  views?: ViewKind[]                               // default ['table','cards']
  renderCard?: (r: T) => React.ReactNode           // required if 'cards' enabled
  viewStorageKey?: string                          // localStorage persist key

  // pagination
  pageSize?: number                                // default 25
  page?: number                                    // server mode (controlled)
  totalElements?: number                           // server mode

  // server-mode callback
  onStateChange?: (s: PanelState) => void

  // misc
  onRowClick?: (r: T) => void
  toolbarActions?: React.ReactNode                 // page-level actions, e.g. Add btn
}
```

Notes:
- `Column<T>`, `SortDir` imported from existing `DataTable.tsx`.
- If `views` has only one entry, the view switch is hidden.
- `viewStorageKey` omitted → view state is in-memory only (default).
- In client mode `page`/`totalElements`/`onStateChange` are ignored; in server
  mode `searchText`/`clientFilter`/`comparator` are ignored.

## New users page — UsersPageV2

`frontend/src/features/users/UsersPageV2.tsx`, client mode, **feature parity**
with `UsersPage.tsx`:
- Page header + "Добавить пользователя" button → passed via `toolbarActions`.
- Saved-view tabs (`UsersSavedViews`) — rendered above the panel as today.
- Search + role filter + status filter → `DataPanel` (`filters` declarative
  config; `clientFilter` predicate).
- Table view via `UserTable` columns / cards view via `UserCardGrid` card
  renderer (`renderCard`).
- Detail drawer (`UserDetailDrawer`), row menus (`UserRowMenu`), create/edit
  modal (`UserFormModal`), confirm dialog — all kept, wired exactly as in
  `UsersPage`.
- View preference persisted under `viewStorageKey` (e.g. `gfh_users_v2_view`).

Routing: add a new route for the v2 page (e.g. `/users-v2`) in `App.tsx`
alongside the existing users route. Old route + page untouched.

## Error handling

- Loading: `DataPanel` shows `DataTable`'s skeleton in table view; a card
  skeleton or simple "Загрузка…" block in card view.
- Empty (no rows after filter): show `empty` node, or default "Нет данных".
- Server-mode fetch errors are the page's responsibility (panel just renders
  whatever `rows` it is given).

## Testing

- Type check: `cd frontend && npx tsc --noEmit` passes.
- Production build: `npm run build` passes.
- Manual: new users page reaches feature parity — search, both filters, sort,
  pagination, table↔card switch, drawer, row actions, create/edit all work.
- Old `/users` page still works unchanged.
