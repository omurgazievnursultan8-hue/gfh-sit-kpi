# Frontend Conventions

## Directory layout

- `src/app/` — bootstrap: API client, Redux store, router, providers, route guards.
- `src/shared/` — cross-cutting primitives: UI components, datapanel, hooks, lib, types. No domain logic.
- `src/layouts/` — top-level chrome: shell, admin layout.
- `src/features/<domain>/` — one folder per business domain.
- `src/styles/` — global CSS split into tokens, base, utilities.

## Per-feature layout

Every `features/<domain>/` folder follows this shape:

- `api.ts` — axios calls (single API surface; historical `<domain>Api.ts` renamed to this).
- `slice.ts` — Redux Toolkit slice (only when feature has Redux state).
- `types.ts` — domain types and enums (when present).
- `pages/<Name>Page.tsx` — page-level components mounted by the router.
- `components/` — feature-only subcomponents (not for cross-feature use).
- `hooks/` — feature-only hooks.
- `index.ts` — public barrel; cross-feature imports go through this file.

Special case (`features/org`): keeps `positionsApi.ts` and `delegationsApi.ts` at the feature root alongside `api.ts` because they represent distinct sub-domains.

## Imports

- Use the `@/` path alias for everything outside the current directory.
- Cross-feature imports must hit the barrel: `import { X } from '@/features/foo'` — never `from '@/features/foo/pages/Foo'`.
- Same-feature relative imports (`./api`, `../components/Bar`) are fine.

## CSS

- Global styles live in `src/styles/`:
  - `tokens.css` — CSS custom properties (colors, spacing, theme variants)
  - `base.css` — resets, html/body, base typography
  - `utilities.css` — custom app utility classes and ad-hoc component styles
  - `index.css` — entry: imports the above and Tailwind directives in CSS-valid order (`@import` rules before `@tailwind`)
- Component styles use CSS Modules (`Component.module.css`) colocated with the component.
- Tailwind utilities are loaded once via `styles/index.css`; use them inline in JSX.

## Naming

- Pages: `<Name>Page.tsx`.
- Slices: `slice.ts` (one per feature).
- API: `api.ts` (one per feature; named sub-APIs allowed only for distinct sub-domains like `positionsApi.ts`).
- No version suffixes (`V2`, `V3`). Canonical name wins; legacy must be deleted.

## Adding a new feature

1. Create `src/features/<domain>/` with `api.ts`, `pages/`, `index.ts` at minimum.
2. Add the page route in `src/App.tsx` (or future `src/app/router.tsx`) importing through the barrel.
3. Register any slice in `src/app/store.ts`.
