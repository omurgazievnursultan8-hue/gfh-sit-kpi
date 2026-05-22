// Dashboard palette presets — full set of .dv3-* token overrides.
// Shared between ThemeCustomizer (sidebar) and DashboardPage (period bar).

export type Dv3Palette = {
  bg: string; bg2: string; bg3: string
  text: string; text2: string; text3: string; text4: string
  border: string; border2: string; borderHi: string
  accent: string; accentBg: string
  zoneUp: string; zoneWarn: string; zoneDown: string; zoneInfo: string
}

// All palettes share family DNA: pale cool backgrounds, low-chroma text, single
// muted aqua/teal/sky/sage accent. Semantic zone colors kept consistent.
export const dv3Palettes: Record<string, Dv3Palette> = {
  'mint-cream': {
    bg: '#eef7f1', bg2: '#f8fdfa', bg3: '#dceee4',
    text: '#0a1f14', text2: '#2e4d3a', text3: '#587a64', text4: '#86a892',
    border: '#c4dccd', border2: '#a8c4b3', borderHi: '#7a9c87',
    accent: '#0f9b6b', accentBg: 'rgba(15,155,107,0.08)',
    zoneUp: '#0f9b6b', zoneWarn: '#b8801f', zoneDown: '#c0392b', zoneInfo: '#2d8aa8',
  },
  'fog-slate': {
    bg: '#eef2f6', bg2: '#fafcfe', bg3: '#dde4ec',
    text: '#0f172a', text2: '#334155', text3: '#5a6478', text4: '#8590a4',
    border: '#cbd5e1', border2: '#a8b4c4', borderHi: '#7a8aa0',
    accent: '#0e7490', accentBg: 'rgba(14,116,144,0.08)',
    zoneUp: '#0f766e', zoneWarn: '#c2410c', zoneDown: '#be123c', zoneInfo: '#0e7490',
  },
  'pearl-teal': {
    bg: '#eff7f7', bg2: '#fafdfd', bg3: '#dcedee',
    text: '#062028', text2: '#1e4d52', text3: '#4d7a7e', text4: '#82a8aa',
    border: '#c4dcde', border2: '#a8c4c8', borderHi: '#7a9ca0',
    accent: '#0f766e', accentBg: 'rgba(15,118,110,0.08)',
    zoneUp: '#0f766e', zoneWarn: '#c2410c', zoneDown: '#be123c', zoneInfo: '#0369a1',
  },
  'ice-sky': {
    bg: '#eff5fb', bg2: '#fafcfe', bg3: '#dce8f3',
    text: '#061528', text2: '#1e3a5c', text3: '#4d6a8c', text4: '#8298b8',
    border: '#c4d4e8', border2: '#a8bcd6', borderHi: '#7a96b8',
    accent: '#0369a1', accentBg: 'rgba(3,105,161,0.08)',
    zoneUp: '#15803d', zoneWarn: '#b45309', zoneDown: '#dc2626', zoneInfo: '#0369a1',
  },
  'ocean-fog': {
    bg: '#edf2f4', bg2: '#f8fbfc', bg3: '#dae3e8',
    text: '#081822', text2: '#1e3a48', text3: '#4a6878', text4: '#7e96a4',
    border: '#bed0d8', border2: '#a0b4be', borderHi: '#728894',
    accent: '#286680', accentBg: 'rgba(40,102,128,0.08)',
    zoneUp: '#0f766e', zoneWarn: '#b45309', zoneDown: '#be123c', zoneInfo: '#286680',
  },
  'azure-paper': {
    bg: '#f4f7fa', bg2: '#fdfeff', bg3: '#e4eaf0',
    text: '#0a1828', text2: '#28405a', text3: '#586e88', text4: '#8898ae',
    border: '#cdd6e2', border2: '#b0bcca', borderHi: '#828ea0',
    accent: '#1d72d0', accentBg: 'rgba(29,114,208,0.08)',
    zoneUp: '#0f766e', zoneWarn: '#b45309', zoneDown: '#be123c', zoneInfo: '#1d72d0',
  },
}

export const dv3PaletteOptions: { label: string; value: string }[] = [
  { label: 'default (built-in)', value: 'default' },
  { label: 'Mint Cream', value: 'mint-cream' },
  { label: 'Fog Slate', value: 'fog-slate' },
  { label: 'Pearl Teal', value: 'pearl-teal' },
  { label: 'Ice Sky', value: 'ice-sky' },
  { label: 'Ocean Fog', value: 'ocean-fog' },
  { label: 'Azure Paper', value: 'azure-paper' },
]

// ── Main dashboard background colors (26) ──────────────────────────────────
// Overrides --dv3-bg on .dv3-root (the outer canvas behind cards).
export const mainBgOptions: { label: string; value: string; color: string }[] = [
  { label: 'default (palette)', value: 'default',    color: '' },
  { label: 'Pure White',       value: 'white',       color: '#ffffff' },
  { label: 'Paper',            value: 'paper',       color: '#fafaf7' },
  { label: 'Ivory',            value: 'ivory',       color: '#fbf9f0' },
  { label: 'Snow',             value: 'snow',        color: '#fdfdfd' },
  { label: 'Pearl',            value: 'pearl',       color: '#f7f8f9' },
  { label: 'Ice',              value: 'ice',         color: '#f3f7fa' },
  { label: 'Frost',            value: 'frost',       color: '#eef4f8' },
  { label: 'Linen',            value: 'linen',       color: '#faf6ee' },
  { label: 'Eggshell',         value: 'eggshell',    color: '#f4f0e6' },
  { label: 'Oat',              value: 'oat',         color: '#f0ecdf' },
  { label: 'Sand',             value: 'sand',        color: '#f3eee0' },
  { label: 'Fog',              value: 'fog',         color: '#eef1f4' },
  { label: 'Mist',             value: 'mist',        color: '#eef4f4' },
  { label: 'Alabaster',        value: 'alabaster',   color: '#f6f4ee' },
  { label: 'Porcelain',        value: 'porcelain',   color: '#f5f6f7' },
  { label: 'Mint Tint',        value: 'mint-tint',   color: '#eef7f1' },
  { label: 'Sky Tint',         value: 'sky-tint',    color: '#eef5fb' },
  { label: 'Sage Tint',        value: 'sage-tint',   color: '#eff3ee' },
  { label: 'Peach Tint',       value: 'peach-tint',  color: '#fbf2ec' },
  { label: 'Lilac Tint',       value: 'lilac-tint',  color: '#f3f1f7' },
  { label: 'Slate Tint',       value: 'slate-tint',  color: '#eff2f6' },
  { label: 'Cream',            value: 'cream',       color: '#fbf7ea' },
  { label: 'Smoke',            value: 'smoke',       color: '#ededef' },
  { label: 'Bone',             value: 'bone',        color: '#f7f4ec' },
  { label: 'Stone',            value: 'stone',       color: '#ececea' },
]

const DV3_PALETTE_STYLE_ID = 'gfh-dv3-palette'
const DV3_MAINBG_STYLE_ID  = 'gfh-dv3-mainbg'
export const DV3_PALETTE_EVENT = 'gfh:dv3-palette-change'
export const DV3_MAINBG_EVENT  = 'gfh:dv3-mainbg-change'
export const DV3_PALETTE_STORAGE_KEY = 'gfh_theme_customizer_v1'

export function applyDv3Palette(key: string) {
  let el = document.getElementById(DV3_PALETTE_STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = DV3_PALETTE_STYLE_ID
  }
  document.body.appendChild(el)
  if (key === 'default' || !dv3Palettes[key]) {
    el.textContent = ''
    return
  }
  const p = dv3Palettes[key]
  // Also bridge to global app tokens so .dv3-root descendants (TableCard,
  // panels) that read --surface / --ink / --accent / --line-soft pick up the
  // palette. Without this, only the dv3-scoped chrome would re-color.
  // Palette is light-only — dark theme's [data-theme="dark"] rules must win,
  // so guard with html:not([data-theme="dark"]). Otherwise !important here
  // clobbers the dark cascade and toggling dark has no visible effect.
  el.textContent = `html:not([data-theme="dark"]),html:not([data-theme="dark"]) .dv3-root{` +
    `--dv3-bg:${p.bg} !important;` +
    `--dv3-bg2:${p.bg2} !important;` +
    `--dv3-bg3:${p.bg3} !important;` +
    `--dv3-text:${p.text} !important;` +
    `--dv3-text2:${p.text2} !important;` +
    `--dv3-text3:${p.text3} !important;` +
    `--dv3-text4:${p.text4} !important;` +
    `--dv3-border:${p.border} !important;` +
    `--dv3-border2:${p.border2} !important;` +
    `--dv3-border-hi:${p.borderHi} !important;` +
    `--dv3-accent:${p.accent} !important;` +
    `--dv3-accent-bg:${p.accentBg} !important;` +
    `--dv3-zone-up:${p.zoneUp} !important;` +
    `--dv3-zone-warn:${p.zoneWarn} !important;` +
    `--dv3-zone-down:${p.zoneDown} !important;` +
    `--dv3-zone-info:${p.zoneInfo} !important;` +
    // Bridge → global tokens
    `--surface:${p.bg2} !important;` +
    `--surface-mute:${p.bg3} !important;` +
    `--ink:${p.text} !important;` +
    `--ink-soft:${p.text2} !important;` +
    `--ink-faint:${p.text3} !important;` +
    `--ink-dim:${p.text4} !important;` +
    `--line:${p.border} !important;` +
    `--line-soft:${p.border} !important;` +
    `--line-strong:${p.borderHi} !important;` +
    `--accent:${p.accent} !important;` +
    `--accent-2:${p.accent} !important;` +
    `--accent-soft:${p.accentBg} !important;` +
    `--accent-mute:${p.accentBg} !important;` +
    `--success:${p.zoneUp} !important;` +
    `--warn:${p.zoneWarn} !important;` +
    `--danger:${p.zoneDown} !important;` +
    `--info:${p.zoneInfo} !important;` +
  `}`
}

export function loadDv3Palette(): string {
  try {
    const s = JSON.parse(localStorage.getItem(DV3_PALETTE_STORAGE_KEY) || '{}')
    return s.dashboardPalette || 'azure-paper'
  } catch { return 'azure-paper' }
}

// Updates localStorage, applies palette, broadcasts so other consumers (e.g.
// ThemeCustomizer sidebar) re-sync their internal state.
export function setDv3Palette(key: string) {
  try {
    const s = JSON.parse(localStorage.getItem(DV3_PALETTE_STORAGE_KEY) || '{}')
    s.dashboardPalette = key
    localStorage.setItem(DV3_PALETTE_STORAGE_KEY, JSON.stringify(s))
  } catch { /* ignore */ }
  applyDv3Palette(key)
  window.dispatchEvent(new CustomEvent(DV3_PALETTE_EVENT, { detail: key }))
}

// ── Main dashboard background ──────────────────────────────────────────────
function ensureStyleEl(id: string): HTMLStyleElement {
  let el = document.getElementById(id) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = id
  }
  document.body.appendChild(el)
  return el
}

// Overrides --dv3-bg on .dv3-root. .dv3-root has `background: transparent`
// so the var alone isn't enough — also set background-color explicitly.
export function applyDv3MainBg(key: string) {
  const el = ensureStyleEl(DV3_MAINBG_STYLE_ID)
  const opt = mainBgOptions.find(o => o.value === key)
  if (!opt || !opt.color) { el.textContent = ''; return }
  el.textContent =
    `.dv3-root{` +
      `--dv3-bg:${opt.color} !important;` +
      `--bg:${opt.color} !important;` +
      `background-color:${opt.color} !important;` +
    `}`
}
export function loadDv3MainBg(): string {
  try {
    const s = JSON.parse(localStorage.getItem(DV3_PALETTE_STORAGE_KEY) || '{}')
    return s.dashboardMainBg || 'bone'
  } catch { return 'bone' }
}
export function setDv3MainBg(key: string) {
  try {
    const s = JSON.parse(localStorage.getItem(DV3_PALETTE_STORAGE_KEY) || '{}')
    s.dashboardMainBg = key
    localStorage.setItem(DV3_PALETTE_STORAGE_KEY, JSON.stringify(s))
  } catch { /* ignore */ }
  applyDv3MainBg(key)
  window.dispatchEvent(new CustomEvent(DV3_MAINBG_EVENT, { detail: key }))
}
