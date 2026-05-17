import type { SortDir } from './DataTable'
import type { ViewKind } from './DataPanelToolbar'

/** The five fields a saved view / persisted working state captures. */
export interface PanelViewState {
  search: string
  filters: Record<string, string>
  sort: { key: string; dir: SortDir } | null
  hiddenColumns: string[]
  view: ViewKind
}

export interface SavedView {
  id: string
  name: string
  state: PanelViewState
}

/** Id of the built-in, non-deletable default view. */
export const DEFAULT_VIEW_ID = '__default__'

const stateKey = (k: string) => `${k}:state`
const viewsKey = (k: string) => `${k}:views`

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function loadPanelState(key: string): PanelViewState | null {
  return readJson<PanelViewState>(stateKey(key))
}

export function savePanelState(key: string, state: PanelViewState): void {
  try {
    localStorage.setItem(stateKey(key), JSON.stringify(state))
  } catch {
    /* quota / disabled storage — ignore, persistence is best-effort */
  }
}

export function loadSavedViews(key: string): SavedView[] {
  const v = readJson<SavedView[]>(viewsKey(key))
  return Array.isArray(v) ? v : []
}

export function saveSavedViews(key: string, views: SavedView[]): void {
  try {
    localStorage.setItem(viewsKey(key), JSON.stringify(views))
  } catch {
    /* ignore — best-effort */
  }
}

/** Structural equality of two working states (field order independent). */
export function panelStateEquals(a: PanelViewState, b: PanelViewState): boolean {
  if (a.search !== b.search) return false
  if (a.view !== b.view) return false
  if ((a.sort?.key ?? '') !== (b.sort?.key ?? '')) return false
  if ((a.sort?.dir ?? '') !== (b.sort?.dir ?? '')) return false
  const fa = Object.keys(a.filters), fb = Object.keys(b.filters)
  if (fa.length !== fb.length) return false
  if (fa.some(k => a.filters[k] !== b.filters[k])) return false
  const ha = [...a.hiddenColumns].sort(), hb = [...b.hiddenColumns].sort()
  if (ha.length !== hb.length) return false
  return ha.every((k, i) => k === hb[i])
}
