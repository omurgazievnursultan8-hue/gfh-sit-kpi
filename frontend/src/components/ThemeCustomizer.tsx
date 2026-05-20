import { useEffect, useState, useMemo } from 'react'

type Option = { label: string; value: string }
type Setting = {
  key: string
  label: string
  group: string
  options: Option[]
  apply: (val: string) => Record<string, string>
  default: string
}

const STORAGE_KEY = 'gfh_theme_customizer_v1'

const accentPresets: Record<string, { accent: string; accent2: string; accentSoft: string; accentMute: string; accentInk: string }> = {
  emerald: { accent: '#0d4d3f', accent2: '#1a7558', accentSoft: '#d6e9e0', accentMute: '#ebf5f0', accentInk: '#08362b' },
  indigo:  { accent: '#3730a3', accent2: '#4f46e5', accentSoft: '#dcdcfb', accentMute: '#eeeefc', accentInk: '#1e1b4b' },
  rose:    { accent: '#9f1239', accent2: '#be123c', accentSoft: '#fcdce5', accentMute: '#fdeef2', accentInk: '#4c0519' },
  amber:   { accent: '#b45309', accent2: '#d97706', accentSoft: '#fde4b8', accentMute: '#fef3dc', accentInk: '#451a03' },
  cyan:    { accent: '#0e7490', accent2: '#0891b2', accentSoft: '#bee9f3', accentMute: '#dff3f9', accentInk: '#083344' },
  violet:  { accent: '#6d28d9', accent2: '#7c3aed', accentSoft: '#e0d2fb', accentMute: '#efe9fd', accentInk: '#2e1065' },
  slate:   { accent: '#334155', accent2: '#475569', accentSoft: '#dde3eb', accentMute: '#eef2f6', accentInk: '#0f172a' },
  fuchsia: { accent: '#a21caf', accent2: '#c026d3', accentSoft: '#f6d3fa', accentMute: '#fbe7fc', accentInk: '#4a044e' },
  lime:    { accent: '#4d7c0f', accent2: '#65a30d', accentSoft: '#dcf0bb', accentMute: '#edf7d8', accentInk: '#1a2e05' },
  teal:    { accent: '#0f766e', accent2: '#14b8a6', accentSoft: '#c6efe8', accentMute: '#e0f5f2', accentInk: '#042f2e' },
}

const bgPresets: Record<string, { bg: string; bgSoft: string; surface: string; surfaceMute: string }> = {
  parchment: { bg: '#f4f1ea', bgSoft: '#ebe6db', surface: '#ffffff', surfaceMute: '#faf8f3' },
  porcelain: { bg: '#f7f7f5', bgSoft: '#eeeeea', surface: '#ffffff', surfaceMute: '#fbfbf9' },
  fog:       { bg: '#eef2f6', bgSoft: '#e2e8ef', surface: '#ffffff', surfaceMute: '#f6f9fc' },
  mint:      { bg: '#eef5f0', bgSoft: '#dfece4', surface: '#ffffff', surfaceMute: '#f5faf7' },
  blush:     { bg: '#f7eff1', bgSoft: '#ebe0e3', surface: '#ffffff', surfaceMute: '#fbf6f7' },
  midnight:  { bg: '#0d1714', bgSoft: '#122019', surface: '#182a23', surfaceMute: '#14241e' },
  obsidian:  { bg: '#0b0b10', bgSoft: '#15151d', surface: '#1d1d28', surfaceMute: '#161620' },
  navy:      { bg: '#0c1426', bgSoft: '#121d36', surface: '#172643', surfaceMute: '#13203a' },
}

const inkPresets: Record<string, { ink: string; inkSoft: string; inkFaint: string; inkDim: string }> = {
  charcoal: { ink: '#0e1714', inkSoft: '#344843', inkFaint: '#6b7c77', inkDim: '#98a8a3' },
  black:    { ink: '#000000', inkSoft: '#262626', inkFaint: '#525252', inkDim: '#737373' },
  brown:    { ink: '#2b1d12', inkSoft: '#4a3826', inkFaint: '#7a6a55', inkDim: '#a89a85' },
  navy:     { ink: '#0c1426', inkSoft: '#26334d', inkFaint: '#5a6884', inkDim: '#8a96ac' },
  light:    { ink: '#e8efec', inkSoft: '#b6c3bf', inkFaint: '#7e9591', inkDim: '#5b716c' },
}

const settings: Setting[] = [
  // Theme
  { key: 'theme', label: 'Theme mode', group: 'Theme', default: 'light',
    options: [{ label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }],
    apply: (v) => { document.documentElement.setAttribute('data-theme', v); return {} } },

  // Color presets
  { key: 'accent', label: 'Accent color', group: 'Colors', default: 'emerald',
    options: Object.keys(accentPresets).map(k => ({ label: k, value: k })),
    apply: (v) => {
      const p = accentPresets[v] || accentPresets.emerald
      return { '--accent': p.accent, '--accent-2': p.accent2, '--accent-soft': p.accentSoft, '--accent-mute': p.accentMute, '--accent-ink': p.accentInk }
    } },
  { key: 'background', label: 'Background palette', group: 'Colors', default: 'parchment',
    options: Object.keys(bgPresets).map(k => ({ label: k, value: k })),
    apply: (v) => {
      const p = bgPresets[v] || bgPresets.parchment
      return { '--bg': p.bg, '--bg-soft': p.bgSoft, '--surface': p.surface, '--surface-mute': p.surfaceMute }
    } },
  { key: 'ink', label: 'Text/ink color', group: 'Colors', default: 'charcoal',
    options: Object.keys(inkPresets).map(k => ({ label: k, value: k })),
    apply: (v) => {
      const p = inkPresets[v] || inkPresets.charcoal
      return { '--ink': p.ink, '--ink-soft': p.inkSoft, '--ink-faint': p.inkFaint, '--ink-dim': p.inkDim }
    } },
  { key: 'gold', label: 'Gold accent', group: 'Colors', default: 'classic',
    options: [
      { label: 'classic', value: 'classic' }, { label: 'champagne', value: 'champagne' },
      { label: 'bronze', value: 'bronze' }, { label: 'silver', value: 'silver' }, { label: 'copper', value: 'copper' },
    ],
    apply: (v) => {
      const m: Record<string, [string, string]> = {
        classic: ['#a8852b', '#f5ecd2'], champagne: ['#c9a558', '#faf0d6'],
        bronze: ['#7a5b1e', '#e9d6a8'], silver: ['#8a8a8a', '#e4e4e4'], copper: ['#b87333', '#f3dcc2'],
      }
      const [g, s] = m[v] || m.classic
      return { '--gold': g, '--gold-soft': s }
    } },
  { key: 'danger', label: 'Danger color', group: 'Colors', default: 'red',
    options: [
      { label: 'red', value: 'red' }, { label: 'crimson', value: 'crimson' },
      { label: 'rose', value: 'rose' }, { label: 'orange-red', value: 'oranged' }, { label: 'magenta', value: 'magenta' },
    ],
    apply: (v) => {
      const m: Record<string, [string, string]> = {
        red: ['#a31f1f', '#fadcdc'], crimson: ['#7f1d1d', '#fdd9d9'],
        rose: ['#be123c', '#fcdce5'], oranged: ['#c2410c', '#fde3d4'], magenta: ['#a21caf', '#f6d3fa'],
      }
      const [c, s] = m[v] || m.red
      return { '--danger': c, '--danger-soft': s }
    } },
  { key: 'warn', label: 'Warning color', group: 'Colors', default: 'orange',
    options: [
      { label: 'orange', value: 'orange' }, { label: 'amber', value: 'amber' },
      { label: 'yellow', value: 'yellow' }, { label: 'tangerine', value: 'tangerine' },
    ],
    apply: (v) => {
      const m: Record<string, [string, string]> = {
        orange: ['#b25a16', '#f8e9d8'], amber: ['#b45309', '#fde4b8'],
        yellow: ['#a16207', '#fde68a'], tangerine: ['#c2410c', '#fed7aa'],
      }
      const [c, s] = m[v] || m.orange
      return { '--warn': c, '--warn-soft': s }
    } },
  { key: 'info', label: 'Info color', group: 'Colors', default: 'blue',
    options: [
      { label: 'blue', value: 'blue' }, { label: 'sky', value: 'sky' },
      { label: 'cyan', value: 'cyan' }, { label: 'indigo', value: 'indigo' }, { label: 'teal', value: 'teal' },
    ],
    apply: (v) => {
      const m: Record<string, [string, string]> = {
        blue: ['#1f4e85', '#d8e4f3'], sky: ['#0369a1', '#dbeafe'],
        cyan: ['#0e7490', '#bee9f3'], indigo: ['#3730a3', '#dcdcfb'], teal: ['#0f766e', '#c6efe8'],
      }
      const [c, s] = m[v] || m.blue
      return { '--info': c, '--info-soft': s }
    } },
  { key: 'line', label: 'Border color', group: 'Colors', default: 'warm',
    options: [
      { label: 'warm', value: 'warm' }, { label: 'cool', value: 'cool' },
      { label: 'neutral', value: 'neutral' }, { label: 'strong', value: 'strong' }, { label: 'faint', value: 'faint' },
    ],
    apply: (v) => {
      const m: Record<string, [string, string, string]> = {
        warm: ['#d8d2c2', '#e7e2d4', '#b9b1a0'], cool: ['#cbd5e1', '#e2e8f0', '#94a3b8'],
        neutral: ['#d4d4d4', '#e5e5e5', '#a3a3a3'], strong: ['#9ca3af', '#cbd5e1', '#6b7280'],
        faint: ['#ececec', '#f4f4f4', '#d4d4d4'],
      }
      const [l, ls, lst] = m[v] || m.warm
      return { '--line': l, '--line-soft': ls, '--line-strong': lst }
    } },
  { key: 'navBg', label: 'Sidebar shade', group: 'Colors', default: 'forest',
    options: [
      { label: 'forest', value: 'forest' }, { label: 'midnight', value: 'midnight' },
      { label: 'plum', value: 'plum' }, { label: 'graphite', value: 'graphite' },
      { label: 'royal', value: 'royal' }, { label: 'wine', value: 'wine' },
    ],
    apply: (v) => {
      const m: Record<string, [string, string, string, string]> = {
        forest:    ['#082420', '#061814', '#1d5a48', '#144235'],
        midnight:  ['#0b1220', '#06090f', '#1e293b', '#0f172a'],
        plum:      ['#2a1530', '#1a0d20', '#4c1d5e', '#321142'],
        graphite:  ['#1f1f1f', '#141414', '#3a3a3a', '#262626'],
        royal:     ['#0a1638', '#050d26', '#1e3a8a', '#172554'],
        wine:      ['#3a0a18', '#22050d', '#7f1d1d', '#4c0a18'],
      }
      const [r1, r2, n1, n2] = m[v] || m.forest
      return { '--rail-bg-1': r1, '--rail-bg-2': r2, '--nav-bg-1': n1, '--nav-bg-2': n2 }
    } },

  // Typography
  { key: 'fontText', label: 'Body font', group: 'Typography', default: 'geist',
    options: [
      { label: 'Geist', value: 'geist' }, { label: 'Inter', value: 'inter' },
      { label: 'System', value: 'system' }, { label: 'IBM Plex', value: 'plex' },
      { label: 'Roboto', value: 'roboto' }, { label: 'Mono', value: 'mono' },
    ],
    apply: (v) => {
      const m: Record<string, string> = {
        geist: '"Geist","IBM Plex Sans","Söhne","Segoe UI",system-ui,sans-serif',
        inter: '"Inter","Segoe UI",system-ui,sans-serif',
        system: 'system-ui,-apple-system,"Segoe UI",sans-serif',
        plex: '"IBM Plex Sans",system-ui,sans-serif',
        roboto: '"Roboto","Segoe UI",system-ui,sans-serif',
        mono: '"JetBrains Mono",ui-monospace,Menlo,monospace',
      }
      return { '--font-text': m[v] || m.geist }
    } },
  { key: 'fontDisplay', label: 'Display font', group: 'Typography', default: 'serif',
    options: [
      { label: 'Serif Pro', value: 'serif' }, { label: 'Georgia', value: 'georgia' },
      { label: 'Playfair', value: 'playfair' }, { label: 'Sans Heavy', value: 'sansheavy' },
    ],
    apply: (v) => {
      const m: Record<string, string> = {
        serif: '"Source Serif Pro","Georgia",serif', georgia: 'Georgia,serif',
        playfair: '"Playfair Display","Georgia",serif', sansheavy: '"Geist",system-ui,sans-serif',
      }
      return { '--font-display': m[v] || m.serif }
    } },
  { key: 'fontMono', label: 'Mono font', group: 'Typography', default: 'jetbrains',
    options: [
      { label: 'JetBrains', value: 'jetbrains' }, { label: 'SF Mono', value: 'sfmono' },
      { label: 'Consolas', value: 'consolas' }, { label: 'Fira', value: 'fira' },
    ],
    apply: (v) => {
      const m: Record<string, string> = {
        jetbrains: '"JetBrains Mono",ui-monospace,Menlo,monospace',
        sfmono: 'SFMono-Regular,Menlo,monospace', consolas: 'Consolas,Menlo,monospace',
        fira: '"Fira Code",ui-monospace,monospace',
      }
      return { '--font-mono': m[v] || m.jetbrains }
    } },
  { key: 'fontSize', label: 'Base font size', group: 'Typography', default: '14',
    options: [
      { label: '12px', value: '12' }, { label: '13px', value: '13' },
      { label: '14px', value: '14' }, { label: '15px', value: '15' },
      { label: '16px', value: '16' }, { label: '17px', value: '17' }, { label: '18px', value: '18' },
    ],
    apply: (v) => { document.documentElement.style.fontSize = v + 'px'; return {} } },
  { key: 'lineHeight', label: 'Line height', group: 'Typography', default: '1.45',
    options: [
      { label: 'tight 1.2', value: '1.2' }, { label: 'snug 1.3', value: '1.3' },
      { label: 'normal 1.45', value: '1.45' }, { label: 'relaxed 1.6', value: '1.6' },
      { label: 'loose 1.8', value: '1.8' },
    ],
    apply: (v) => { document.body.style.lineHeight = v; return {} } },
  { key: 'letterSpacing', label: 'Letter spacing', group: 'Typography', default: '0',
    options: [
      { label: 'tight -0.02', value: '-0.02em' }, { label: 'normal', value: '0' },
      { label: 'wide 0.02', value: '0.02em' }, { label: 'wider 0.05', value: '0.05em' },
    ],
    apply: (v) => { document.body.style.letterSpacing = v; return {} } },
  { key: 'fontWeight', label: 'Body weight', group: 'Typography', default: '400',
    options: [
      { label: 'light 300', value: '300' }, { label: 'normal 400', value: '400' },
      { label: 'medium 500', value: '500' }, { label: 'semibold 600', value: '600' },
    ],
    apply: (v) => { document.body.style.fontWeight = v; return {} } },

  // Shape
  { key: 'radius', label: 'Corner radius', group: 'Shape', default: 'md',
    options: [
      { label: 'sharp', value: 'sharp' }, { label: 'sm', value: 'sm' },
      { label: 'md', value: 'md' }, { label: 'lg', value: 'lg' },
      { label: 'xl', value: 'xl' }, { label: 'pill', value: 'pill' },
    ],
    apply: (v) => {
      const m: Record<string, [string, string, string]> = {
        sharp: ['0px', '0px', '0px'], sm: ['3px', '5px', '7px'],
        md: ['6px', '10px', '14px'], lg: ['10px', '16px', '22px'],
        xl: ['14px', '22px', '30px'], pill: ['999px', '999px', '999px'],
      }
      const [r, rl, rxl] = m[v] || m.md
      return { '--radius': r, '--radius-lg': rl, '--radius-xl': rxl }
    } },
  { key: 'shadow', label: 'Shadow depth', group: 'Shape', default: 'normal',
    options: [
      { label: 'none', value: 'none' }, { label: 'subtle', value: 'subtle' },
      { label: 'normal', value: 'normal' }, { label: 'strong', value: 'strong' },
      { label: 'dramatic', value: 'dramatic' },
    ],
    apply: (v) => {
      const m: Record<string, [string, string, string]> = {
        none: ['none', 'none', 'none'],
        subtle: ['0 1px 1px rgba(0,0,0,.04)', '0 2px 6px rgba(0,0,0,.05)', '0 8px 20px rgba(0,0,0,.06)'],
        normal: ['0 1px 2px rgba(15,23,20,0.06)', '0 4px 12px -4px rgba(15,23,20,0.10),0 2px 4px -2px rgba(15,23,20,0.06)', '0 24px 60px -20px rgba(8,22,18,0.18),0 8px 20px -8px rgba(8,22,18,0.10)'],
        strong: ['0 2px 4px rgba(0,0,0,.10)', '0 8px 24px rgba(0,0,0,.15)', '0 30px 80px rgba(0,0,0,.25)'],
        dramatic: ['0 4px 8px rgba(0,0,0,.18)', '0 14px 40px rgba(0,0,0,.22)', '0 40px 100px rgba(0,0,0,.35)'],
      }
      const [s, m2, l] = m[v] || m.normal
      return { '--shadow-sm': s, '--shadow-md': m2, '--shadow-lg': l }
    } },
  { key: 'borderWidth', label: 'Border width', group: 'Shape', default: '1',
    options: [
      { label: '0px', value: '0' }, { label: '1px', value: '1' },
      { label: '2px', value: '2' }, { label: '3px', value: '3' },
    ],
    apply: (v) => ({ '--border-w': v + 'px' }) },

  // Layout
  { key: 'density', label: 'UI density', group: 'Layout', default: 'normal',
    options: [
      { label: 'compact', value: 'compact' }, { label: 'normal', value: 'normal' },
      { label: 'comfortable', value: 'comfortable' }, { label: 'spacious', value: 'spacious' },
    ],
    apply: (v) => {
      const m: Record<string, string> = { compact: '0.85', normal: '1', comfortable: '1.15', spacious: '1.3' }
      return { '--density-scale': m[v] || '1' }
    } },
  { key: 'topbarH', label: 'Topbar height', group: 'Layout', default: '52',
    options: [
      { label: '44px', value: '44' }, { label: '52px', value: '52' },
      { label: '60px', value: '60' }, { label: '72px', value: '72' },
    ],
    apply: (v) => ({ '--topbar-h': v + 'px' }) },
  { key: 'railW', label: 'Sidebar rail', group: 'Layout', default: '72',
    options: [
      { label: '56px', value: '56' }, { label: '64px', value: '64' },
      { label: '72px', value: '72' }, { label: '88px', value: '88' },
    ],
    apply: (v) => ({ '--rail-w': v + 'px' }) },
  { key: 'navW', label: 'Sidebar width', group: 'Layout', default: '288',
    options: [
      { label: '240px', value: '240' }, { label: '264px', value: '264' },
      { label: '288px', value: '288' }, { label: '320px', value: '320' }, { label: '360px', value: '360' },
    ],
    apply: (v) => ({ '--nav-w': v + 'px' }) },
  { key: 'contentMax', label: 'Content max-width', group: 'Layout', default: '1280',
    options: [
      { label: '1024px', value: '1024' }, { label: '1280px', value: '1280' },
      { label: '1440px', value: '1440' }, { label: '1680px', value: '1680' }, { label: 'full', value: 'full' },
    ],
    apply: (v) => ({ '--content-max': v === 'full' ? '100%' : v + 'px' }) },

  // Effects
  { key: 'animSpeed', label: 'Animation speed', group: 'Effects', default: 'normal',
    options: [
      { label: 'off', value: 'off' }, { label: 'fast', value: 'fast' },
      { label: 'normal', value: 'normal' }, { label: 'slow', value: 'slow' },
    ],
    apply: (v) => {
      const m: Record<string, string> = { off: '0ms', fast: '80ms', normal: '160ms', slow: '320ms' }
      return { '--anim-dur': m[v] || '160ms' }
    } },
  { key: 'cursor', label: 'Cursor style', group: 'Effects', default: 'default',
    options: [
      { label: 'default', value: 'default' }, { label: 'pointer-friendly', value: 'pointer' },
      { label: 'crosshair', value: 'crosshair' },
    ],
    apply: (v) => { document.body.style.cursor = v === 'default' ? '' : v; return {} } },
  { key: 'scrollbar', label: 'Scrollbar', group: 'Effects', default: 'auto',
    options: [
      { label: 'auto', value: 'auto' }, { label: 'thin', value: 'thin' }, { label: 'none', value: 'none' },
    ],
    apply: (v) => {
      const html = document.documentElement
      html.style.scrollbarWidth = v === 'none' ? 'none' : v === 'thin' ? 'thin' : 'auto'
      return {}
    } },
  { key: 'backdrop', label: 'Backdrop blur', group: 'Effects', default: 'none',
    options: [
      { label: 'none', value: 'none' }, { label: 'subtle 4px', value: '4' },
      { label: 'medium 8px', value: '8' }, { label: 'heavy 16px', value: '16' },
    ],
    apply: (v) => ({ '--backdrop-blur': v === 'none' ? '0px' : v + 'px' }) },
  { key: 'saturation', label: 'Color saturation', group: 'Effects', default: '1',
    options: [
      { label: 'mono 0', value: '0' }, { label: 'muted 0.7', value: '0.7' },
      { label: 'normal', value: '1' }, { label: 'vivid 1.3', value: '1.3' }, { label: 'wild 1.6', value: '1.6' },
    ],
    apply: (v) => { document.documentElement.style.filter = v === '1' ? '' : `saturate(${v})`; return {} } },
  { key: 'contrast', label: 'Contrast', group: 'Effects', default: '1',
    options: [
      { label: 'soft 0.85', value: '0.85' }, { label: 'normal', value: '1' },
      { label: 'high 1.15', value: '1.15' }, { label: 'extreme 1.3', value: '1.3' },
    ],
    apply: (v) => {
      const cur = document.documentElement.style.filter
      const base = cur.replace(/contrast\([^)]*\)\s*/g, '').trim()
      document.documentElement.style.filter = v === '1' ? base : `${base} contrast(${v})`.trim()
      return {}
    } },
]

function applySetting(s: Setting, val: string) {
  const vars = s.apply(val)
  const root = document.documentElement
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
}

function loadStored(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

export function ThemeCustomizer() {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const stored = loadStored()
    const init: Record<string, string> = {}
    for (const s of settings) init[s.key] = stored[s.key] ?? s.default
    return init
  })

  useEffect(() => {
    for (const s of settings) applySetting(s, values[s.key])
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
  }, [values])

  const groups = useMemo(() => {
    const map: Record<string, Setting[]> = {}
    for (const s of settings) (map[s.group] ||= []).push(s)
    return map
  }, [])

  function setVal(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function reset() {
    const init: Record<string, string> = {}
    for (const s of settings) init[s.key] = s.default
    setValues(init)
    document.documentElement.style.fontSize = ''
    document.body.style.lineHeight = ''
    document.body.style.letterSpacing = ''
    document.body.style.fontWeight = ''
    document.body.style.cursor = ''
    document.documentElement.style.filter = ''
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="Customize UI"
        style={{
          position: 'fixed', right: 16, top: '50%', transform: 'translateY(-50%)',
          zIndex: 9998, width: 44, height: 44, borderRadius: 22,
          background: 'var(--accent, #0d4d3f)', color: '#fff', border: 'none',
          boxShadow: '0 6px 18px rgba(0,0,0,0.18)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Open theme customizer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 9998 }}
          />
          <aside
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '95vw',
              background: 'var(--surface, #fff)', color: 'var(--ink, #111)',
              borderLeft: '1px solid var(--line, #ddd)', zIndex: 9999,
              boxShadow: '-12px 0 40px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <header style={{ padding: '14px 16px', borderBottom: '1px solid var(--line, #ddd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>UI Customizer</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint, #666)' }}>{settings.length} options · saved automatically</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={reset} style={btnStyle}>Reset</button>
                <button onClick={() => setOpen(false)} style={btnStyle}>Close</button>
              </div>
            </header>

            <div style={{ overflow: 'auto', padding: '8px 16px 24px', flex: 1 }}>
              {Object.entries(groups).map(([group, items]) => (
                <section key={group} style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-faint, #666)', marginBottom: 8 }}>{group}</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {items.map(s => (
                      <label key={s.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ color: 'var(--ink-soft, #333)' }}>{s.label}</span>
                        <select
                          value={values[s.key]}
                          onChange={(e) => setVal(s.key, e.target.value)}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid var(--line, #ccc)',
                            borderRadius: 6, background: 'var(--surface-mute, #fafafa)',
                            color: 'var(--ink, #111)', fontSize: 13,
                          }}
                        >
                          {s.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </>
      )}
    </>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12, fontWeight: 500,
  border: '1px solid var(--line, #ccc)', borderRadius: 6,
  background: 'var(--surface-mute, #fafafa)', color: 'var(--ink, #111)', cursor: 'pointer',
}
