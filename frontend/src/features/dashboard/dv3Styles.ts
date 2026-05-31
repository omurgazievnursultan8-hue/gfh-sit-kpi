// Visual styling for DashboardPageV3 — "Обзор" reference port.
// Keep classnames scoped under .dv3-root so this never collides with v1/v2.
export const DV3_CSS = `
.dv3-root {
  --bg: #f4f1ea;
  --bg-soft: #ebe6db;
  --surface: #ffffff;
  --surface-mute: #faf8f3;
  --ink: #0e1714;
  --ink-soft: #344843;
  --ink-faint: #6b7c77;
  --ink-dim: #98a8a3;
  --line: #d8d2c2;
  --line-soft: #e7e2d4;
  --line-strong: #b9b1a0;
  --accent: #0d4d3f;
  --accent-2: #1a7558;
  --accent-soft: #d6e9e0;
  --accent-mute: #ebf5f0;
  --accent-ink: #08362b;
  --gold: #a8852b;
  --gold-soft: #f5ecd2;
  --warn: #b25a16;
  --warn-soft: #f8e9d8;
  --danger: #a31f1f;
  --danger-soft: #fadcdc;
  --info: #1f4e85;
  --info-soft: #d8e4f3;
  --radius: 6px;
  --radius-lg: 10px;
  --radius-xl: 14px;
  --shadow-md: 0 4px 12px -4px rgba(15,23,20,0.10),0 2px 4px -2px rgba(15,23,20,0.06);
  --font-text: "Inter","Segoe UI",system-ui,-apple-system,sans-serif;
  --font-mono: "JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --font-display: "Source Serif Pro","Source Serif 4","Georgia",serif;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-text);
  font-size: 14px;
  line-height: 1.45;
  padding: 28px 32px 60px;
  min-height: 100%;
  -webkit-font-smoothing: antialiased;
}
.dv3-root * { box-sizing: border-box; }
.dv3-root svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; flex: none; }
.dv3-root [class*="mono"], .dv3-root .num, .dv3-root .scr { font-variant-numeric: tabular-nums; }
.dv3-inner { max-width: 1280px; margin: 0 auto; }

/* warn banner */
.dv3-warn { background: var(--warn-soft); border: 1px solid color-mix(in srgb, var(--warn) 30%, transparent); color: var(--warn); border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; }

/* ===== HERO ===== */
.dv3-hero {
  position: relative;
  background: linear-gradient(135deg, #0e2724 0%, #0d4d3f 55%, #1a7558 100%);
  color: #ecf2f0;
  border-radius: var(--radius-xl);
  padding: 28px 32px 26px;
  margin-bottom: 22px;
  overflow: hidden;
  border: 1px solid #06120f;
  box-shadow: var(--shadow-md);
}
.dv3-hero::before {
  content: ""; position: absolute; inset: 0;
  background-image:
    repeating-linear-gradient(0deg, rgba(245,236,210,0.025) 0 1px, transparent 1px 6px),
    repeating-linear-gradient(90deg, rgba(245,236,210,0.018) 0 1px, transparent 1px 6px);
  pointer-events: none;
}
.dv3-hero::after {
  content: ""; position: absolute; right: -120px; top: -120px;
  width: 380px; height: 380px; border-radius: 999px;
  background: radial-gradient(circle, rgba(168,133,43,0.18) 0%, transparent 65%);
  pointer-events: none;
}
.dv3-hero-inner { position: relative; display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px; align-items: center; }
.dv3-greet { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #8fa6a1; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.dv3-greet .dot { width: 7px; height: 7px; border-radius: 999px; background: var(--gold); box-shadow: 0 0 0 0 rgba(168,133,43,0.7); animation: dv3-pulse 1.8s infinite; }
@keyframes dv3-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(168,133,43,0.55); } 50% { box-shadow: 0 0 0 7px rgba(168,133,43,0); } }
.dv3-hero h1 { font-family: var(--font-display); font-size: 38px; font-weight: 600; margin: 0 0 10px; color: #f5ecd2; letter-spacing: -0.015em; line-height: 1.1; }
.dv3-hero h1 .name { color: var(--gold); }
.dv3-hero-sub { color: #b6c3bf; font-size: 14.5px; line-height: 1.55; max-width: 480px; }
.dv3-hero-sub strong { color: #f5ecd2; font-weight: 600; }
.dv3-hero-period { display: inline-flex; align-items: center; gap: 10px; margin-top: 18px; padding: 6px 12px 6px 8px; background: rgba(245,236,210,0.08); border: 1px solid rgba(245,236,210,0.16); border-radius: 999px; font-family: var(--font-mono); font-size: 11.5px; color: #f5ecd2; letter-spacing: 0.04em; }
.dv3-hero-period .tag { background: var(--gold); color: #1a1306; padding: 2px 7px; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.dv3-hero-stats { display: flex; align-items: center; gap: 22px; justify-content: flex-end; }
.dv3-ring { position: relative; width: 158px; height: 158px; flex: none; }
.dv3-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.dv3-ring .bg { stroke: rgba(245,236,210,0.10); }
.dv3-ring .fg { stroke: var(--gold); transition: stroke-dashoffset 0.6s ease; }
.dv3-ring-num { position: absolute; inset: 0; display: grid; place-items: center; font-family: var(--font-display); color: #f5ecd2; line-height: 1; text-align: center; }
.dv3-ring-num .big { font-size: 44px; font-weight: 600; letter-spacing: -0.02em; }
.dv3-ring-num .max { font-family: var(--font-mono); font-size: 11px; color: #8fa6a1; margin-top: 4px; letter-spacing: 0.08em; }
.dv3-hero-side { display: flex; flex-direction: column; gap: 14px; min-width: 180px; }
.dv3-hero-side-row { display: flex; flex-direction: column; padding: 10px 14px; background: rgba(245,236,210,0.05); border: 1px solid rgba(245,236,210,0.10); border-radius: 8px; }
.dv3-hero-side-row .lbl { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #8fa6a1; }
.dv3-hero-side-row .val { font-family: var(--font-display); font-size: 22px; color: #f5ecd2; font-weight: 600; letter-spacing: -0.01em; margin-top: 2px; display: flex; align-items: baseline; gap: 6px; }
.dv3-hero-side-row .val .delta { font-family: var(--font-mono); font-size: 12px; color: var(--gold); font-weight: 500; }
.dv3-hero-side-row .val .delta.down { color: #d97f7f; }

/* ===== Quicklinks ===== */
.dv3-quicklinks { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
.dv3-qlink { display: flex; flex-direction: column; gap: 6px; padding: 18px 20px 16px; background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--radius-lg); color: inherit; position: relative; overflow: hidden; transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; min-height: 132px; text-decoration: none; }
.dv3-qlink::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--line); transition: background 0.15s ease; }
.dv3-qlink.accent::before { background: var(--accent); }
.dv3-qlink.gold::before { background: var(--gold); }
.dv3-qlink.info::before { background: var(--info); }
.dv3-qlink.danger::before { background: var(--danger); }
.dv3-qlink:hover { border-color: var(--line-strong); transform: translateY(-1px); box-shadow: var(--shadow-md); }
.dv3-qlink-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dv3-qlink-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); display: flex; align-items: center; gap: 6px; }
.dv3-qlink-label svg { width: 13px; height: 13px; opacity: 0.75; }
.dv3-qlink-tag { font-family: var(--font-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; background: var(--bg-soft); color: var(--ink-faint); border: 1px solid var(--line-soft); }
.dv3-qlink-tag.urgent { background: var(--danger-soft); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 25%, transparent); }
.dv3-qlink-tag.warn { background: var(--gold-soft); color: #6f5610; border-color: color-mix(in srgb, var(--gold) 32%, transparent); }
.dv3-qlink-tag.ok { background: var(--accent-mute); color: var(--accent-ink); border-color: var(--accent-soft); }
.dv3-qlink-num { font-family: var(--font-display); font-size: 44px; font-weight: 600; line-height: 1; color: var(--ink); letter-spacing: -0.02em; margin-top: 10px; display: flex; align-items: baseline; gap: 4px; }
.dv3-qlink-num .frac, .dv3-qlink-num .unit { font-family: var(--font-mono); font-size: 14px; font-weight: 400; color: var(--ink-faint); letter-spacing: 0; }
.dv3-qlink.accent .dv3-qlink-num { color: var(--accent); }
.dv3-qlink.danger .dv3-qlink-num { color: var(--danger); }
.dv3-qlink.gold .dv3-qlink-num { color: #6f5610; }
.dv3-qlink.info .dv3-qlink-num { color: var(--info); }
.dv3-qlink-foot { margin-top: auto; padding-top: 8px; font-size: 12px; color: var(--ink-faint); line-height: 1.4; }
.dv3-qlink-foot strong { color: var(--ink); font-weight: 600; }

/* ===== Cards / grid ===== */
.dv3-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; margin-bottom: 22px; }
.dv3-card { background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--radius-lg); overflow: hidden; }
.dv3-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 14px 20px; border-bottom: 1px solid var(--line-soft); background: var(--surface-mute); }
.dv3-card-head h2 { font-family: var(--font-display); font-size: 16px; font-weight: 600; margin: 0; color: var(--ink); letter-spacing: -0.005em; display: flex; align-items: center; gap: 8px; }
.dv3-card-head h2 .badge-num { font-family: var(--font-mono); font-size: 10.5px; background: var(--accent); color: #f5ecd2; padding: 1px 7px; border-radius: 4px; font-weight: 500; letter-spacing: 0.04em; }
.dv3-card-head .meta { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
.dv3-card-head .link { font-size: 12.5px; color: var(--accent); font-weight: 500; text-decoration: none; cursor: pointer; }
.dv3-card-head .link:hover { color: var(--accent-2); text-decoration: underline; }

/* ===== Scorecard ===== */
.dv3-score-top { display: grid; grid-template-columns: auto 1fr; gap: 22px; align-items: center; padding: 22px 22px 18px; }
.dv3-score-head { font-family: var(--font-display); font-size: 56px; font-weight: 600; line-height: 1; color: var(--accent); letter-spacing: -0.02em; display: flex; align-items: baseline; gap: 4px; }
.dv3-score-head .out { font-family: var(--font-mono); font-size: 18px; color: var(--ink-faint); font-weight: 400; }
.dv3-score-meta { display: flex; flex-direction: column; gap: 6px; }
.dv3-score-meta .ptype { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
.dv3-score-meta .grade-row { font-size: 14.5px; color: var(--ink); font-weight: 500; }
.dv3-score-meta .grade-row .grade { font-family: var(--font-display); font-size: 18px; font-weight: 600; color: var(--accent); margin-right: 6px; }
.dv3-score-meta .delta-row { display: flex; gap: 14px; font-family: var(--font-mono); font-size: 12px; margin-top: 4px; flex-wrap: wrap; }
.dv3-score-meta .delta-row .up { color: var(--accent-2); font-weight: 600; }
.dv3-score-meta .delta-row .down { color: var(--danger); font-weight: 600; }
.dv3-breakdown { border-top: 1px solid var(--line-soft); padding: 16px 22px 20px; }
.dv3-breakdown-title { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 12px; }
.dv3-crit { display: grid; grid-template-columns: 1fr 60px 60px; gap: 14px; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--line-soft); font-size: 13px; min-height: 44px; }
.dv3-crit:last-child { border-bottom: 0; }
.dv3-crit .nm { color: var(--ink); font-weight: 500; }
.dv3-crit .nm small { display: block; font-family: var(--font-mono); font-size: 10px; color: var(--ink-faint); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; font-weight: 400; }
.dv3-crit .meter { height: 5px; background: var(--bg-soft); border-radius: 999px; overflow: hidden; }
.dv3-crit .meter > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius: 999px; }
.dv3-crit.warn .meter > span { background: linear-gradient(90deg, var(--warn), #d97f1f); }
.dv3-crit.low .meter > span { background: linear-gradient(90deg, var(--danger), #d23737); }
.dv3-crit.penalty .nm { color: var(--warn); }
.dv3-crit .scr { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--ink); text-align: right; }
.dv3-crit.warn .scr { color: var(--warn); }
.dv3-crit.low .scr { color: var(--danger); }
.dv3-crit.penalty .scr { color: var(--danger); }

/* ===== Action queue ===== */
.dv3-actions { display: flex; flex-direction: column; }
.dv3-action { display: grid; grid-template-columns: 38px 1fr auto; gap: 14px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--line-soft); transition: background 0.12s ease; cursor: pointer; min-height: 64px; text-decoration: none; color: inherit; }
.dv3-action:hover { background: var(--surface-mute); }
.dv3-action:last-child { border-bottom: 0; }
.dv3-action-ico { width: 38px; height: 38px; border-radius: 8px; display: grid; place-items: center; flex: none; border: 1px solid transparent; }
.dv3-action-ico svg { width: 17px; height: 17px; }
.dv3-action-ico.urgent { background: var(--danger-soft); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 22%, transparent); }
.dv3-action-ico.warn { background: var(--gold-soft); color: #6f5610; border-color: color-mix(in srgb, var(--gold) 32%, transparent); }
.dv3-action-ico.info { background: var(--info-soft); color: var(--info); border-color: color-mix(in srgb, var(--info) 22%, transparent); }
.dv3-action-ico.ok { background: var(--accent-mute); color: var(--accent-ink); border-color: var(--accent-soft); }
.dv3-action-text strong { display: block; font-size: 13.5px; font-weight: 600; color: var(--ink); margin-bottom: 2px; }
.dv3-action-text .desc { font-size: 12px; color: var(--ink-faint); line-height: 1.4; }
.dv3-action-text .desc .num { color: var(--ink); font-weight: 600; font-family: var(--font-mono); }
.dv3-action-due { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-faint); text-align: right; flex: none; white-space: nowrap; width: 84px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.dv3-action-due .v { color: var(--ink); font-size: 11.5px; font-weight: 600; }
.dv3-action-due.urgent .v { color: var(--danger); }
.dv3-action-due.warn .v { color: var(--warn); }

/* ===== Team table ===== */
.dv3-team-head, .dv3-team-row {
  display: grid;
  grid-template-columns: minmax(220px, 1.7fr) minmax(160px, 1.2fr) 110px minmax(140px, 1fr) 72px 20px;
  gap: 16px; align-items: center; padding: 12px 20px; min-height: 56px;
}
.dv3-team-head { background: var(--surface-mute); border-bottom: 1px solid var(--line-soft); font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); font-weight: 500; min-height: 36px; padding: 9px 20px; }
.dv3-team-head .col-delta { text-align: right; }
.dv3-team-row { border-bottom: 1px solid var(--line-soft); cursor: pointer; transition: background 0.12s ease; text-decoration: none; color: inherit; }
.dv3-team-row:last-of-type { border-bottom: 0; }
.dv3-team-row:hover { background: var(--surface-mute); }
.dv3-team-row > * { min-width: 0; }
.dv3-cell-user { display: flex; align-items: center; gap: 10px; min-width: 0; }
.dv3-avatar { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; color: #fff; font-weight: 600; font-size: 11px; flex: none; font-family: var(--font-display); background: linear-gradient(135deg, #1a7558, #0d4d3f); }
.dv3-avatar.c1 { background: linear-gradient(135deg,#2a6f8a,#174a5e); }
.dv3-avatar.c2 { background: linear-gradient(135deg,#a8852b,#7a5e15); }
.dv3-avatar.c3 { background: linear-gradient(135deg,#1a7558,#0d4d3f); }
.dv3-avatar.c4 { background: linear-gradient(135deg,#8f4329,#5e2a17); }
.dv3-avatar.c5 { background: linear-gradient(135deg,#5b3a8f,#3a1f6b); }
.dv3-avatar.c6 { background: linear-gradient(135deg,#2a6f8a,#1a7558); color: #f5ecd2; }
.dv3-avatar.c7 { background: linear-gradient(135deg,#b25a16,#7a3c0c); }
.dv3-avatar.c8 { background: linear-gradient(135deg,#2c4f8a,#143264); }
.dv3-name-block { min-width: 0; flex: 1; }
.dv3-name-block strong { display: block; font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dv3-name-block .sub { font-size: 11.5px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink-faint); }
.dv3-pos { font-size: 12.5px; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dv3-kpi-mini { display: flex; align-items: center; gap: 10px; }
.dv3-kpi-mini .bar { flex: 1; height: 4px; background: var(--bg-soft); border-radius: 999px; overflow: hidden; min-width: 56px; }
.dv3-kpi-mini .bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); border-radius: 999px; }
.dv3-kpi-mini.warn .bar > span { background: linear-gradient(90deg, var(--warn), #d97f1f); }
.dv3-kpi-mini.low .bar > span { background: linear-gradient(90deg, var(--danger), #d23737); }
.dv3-kpi-mini .num { font-family: var(--font-mono); font-size: 12.5px; font-weight: 600; width: 28px; text-align: right; color: var(--ink); flex: none; }
.dv3-kpi-mini.warn .num { color: var(--warn); }
.dv3-kpi-mini.low .num { color: var(--danger); }
.dv3-delta-cell { text-align: right; }
.dv3-delta-pill { font-family: var(--font-mono); font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: flex-end; gap: 3px; background: var(--accent-mute); color: var(--accent-ink); min-width: 44px; }
.dv3-delta-pill.down { background: var(--danger-soft); color: var(--danger); }
.dv3-delta-pill.flat { background: var(--bg-soft); color: var(--ink-faint); }
.dv3-delta-pill svg { width: 10px; height: 10px; }

/* status pills */
.dv3-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px 3px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; font-family: var(--font-mono); letter-spacing: 0.02em; border: 1px solid transparent; white-space: nowrap; }
.dv3-pill::before { content: ""; width: 6px; height: 6px; border-radius: 999px; }
.dv3-pill.todo { background: var(--bg-soft); color: var(--ink-soft); border-color: var(--line); }
.dv3-pill.todo::before { background: var(--ink-dim); }
.dv3-pill.in_progress { background: var(--info-soft); color: var(--info); border-color: color-mix(in srgb, var(--info) 25%, transparent); }
.dv3-pill.in_progress::before { background: var(--info); }
.dv3-pill.awaiting { background: var(--gold-soft); color: #6f5610; border-color: color-mix(in srgb, var(--gold) 35%, transparent); }
.dv3-pill.awaiting::before { background: var(--gold); }
.dv3-pill.disagreed { background: var(--danger-soft); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 25%, transparent); }
.dv3-pill.disagreed::before { background: var(--danger); }
.dv3-pill.closed { background: var(--accent-mute); color: var(--accent-ink); border-color: var(--accent-soft); }
.dv3-pill.closed::before { background: var(--accent); }

.dv3-table-foot { padding: 14px 20px; background: var(--surface-mute); border-top: 1px solid var(--line-soft); display: flex; justify-content: space-between; align-items: center; }
.dv3-table-foot .info { font-family: var(--font-mono); font-size: 11px; color: var(--ink-faint); letter-spacing: 0.06em; text-transform: uppercase; }
.dv3-table-foot .info strong { color: var(--ink); font-weight: 600; }

.dv3-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 7px; background: var(--surface); border: 1px solid var(--line); color: var(--ink); font-size: 13px; font-weight: 500; text-decoration: none; }
.dv3-btn:hover { background: var(--bg-soft); border-color: var(--line-strong); }

/* ===== Chart + feed ===== */
.dv3-lower { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
.dv3-chart-wrap { position: relative; padding: 24px 12px 6px; }
.dv3-chart { width: 100%; height: 200px; display: block; }
.dv3-chart-legend { display: flex; gap: 18px; padding: 10px 22px 18px; font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-faint); letter-spacing: 0.06em; text-transform: uppercase; border-top: 1px solid var(--line-soft); }
.dv3-chart-legend .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
.dv3-chart-legend .swatch.me { background: var(--accent); }
.dv3-chart-legend .swatch.dept { background: var(--gold); }
.dv3-chart-legend .swatch.target { background: var(--ink-dim); }

/* feed */
.dv3-feed { padding: 6px 0; }
.dv3-feed-item { display: grid; grid-template-columns: 28px 1fr; gap: 12px; padding: 12px 20px; position: relative; }
.dv3-feed-item:not(:last-child)::after { content: ""; position: absolute; left: 33px; top: 32px; bottom: -10px; width: 1px; background: var(--line-soft); }
.dv3-feed-dot { width: 28px; height: 28px; border-radius: 999px; background: var(--surface); border: 1.5px solid var(--line); display: grid; place-items: center; color: var(--ink-faint); z-index: 1; flex: none; }
.dv3-feed-dot svg { width: 13px; height: 13px; }
.dv3-feed-dot.appeal { background: var(--danger-soft); border-color: color-mix(in srgb, var(--danger) 30%, transparent); color: var(--danger); }
.dv3-feed-dot.approve { background: var(--accent-mute); border-color: var(--accent-soft); color: var(--accent); }
.dv3-feed-dot.submit { background: var(--info-soft); border-color: color-mix(in srgb, var(--info) 25%, transparent); color: var(--info); }
.dv3-feed-dot.system { background: var(--gold-soft); border-color: color-mix(in srgb, var(--gold) 30%, transparent); color: #6f5610; }
.dv3-feed-text { font-size: 13px; line-height: 1.5; color: var(--ink-soft); min-width: 0; }
.dv3-feed-text strong { color: var(--ink); font-weight: 600; }
.dv3-feed-time { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.05em; color: var(--ink-faint); margin-top: 4px; text-transform: uppercase; }

.dv3-empty { padding: 28px 20px; text-align: center; color: var(--ink-faint); font-size: 13px; }

@media (max-width: 1100px) {
  .dv3-hero-inner { grid-template-columns: 1fr; }
  .dv3-hero-stats { justify-content: flex-start; }
  .dv3-grid, .dv3-lower { grid-template-columns: 1fr; }
  .dv3-quicklinks { grid-template-columns: repeat(2, 1fr); }
  .dv3-team-head, .dv3-team-row {
    grid-template-columns: minmax(180px, 1.7fr) 100px minmax(120px, 1fr) 72px 20px;
  }
  .dv3-team-head .col-pos, .dv3-team-row .dv3-pos { display: none; }
}
`
