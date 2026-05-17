// Terminal / Swiss-grid aesthetic for DashboardPage.
// Scoped under .dv3-root; follows the global app theme set on <html data-theme>.
// Dark is the base/default; [data-theme="light"] overrides it.
export const DASHBOARD_CSS = `
.dv3-root {
  --dv3-green: #a3c585;

  --dv3-zone-up:   #86c46a;
  --dv3-zone-down: #e07a6a;
  --dv3-zone-warn: #e0b34f;
  --dv3-zone-info: #7fb3c4;

  --dv3-bg: #0d1410; --dv3-bg2: #141a15; --dv3-bg3: #1c241d;
  --dv3-text: #e8ece4; --dv3-text2: #9ba798; --dv3-text3: #6b756a; --dv3-text4: #454e46;
  --dv3-border: #1f2820; --dv3-border2: #2a342b; --dv3-border-hi: #3d4a3e;
  --dv3-accent: var(--dv3-green);
  --dv3-accent-bg: rgba(163,197,133,0.10);
}
[data-theme="light"] .dv3-root {
  --dv3-bg: #f4f6ee; --dv3-bg2: #fbfcf6; --dv3-bg3: #e8ecdc;
  --dv3-text: #1a2014; --dv3-text2: #4d5544; --dv3-text3: #828a76; --dv3-text4: #b0b8a3;
  --dv3-border: #d9ddc8; --dv3-border2: #c5cab2; --dv3-border-hi: #98a07f;
  --dv3-accent: #6b8a52;
  --dv3-accent-bg: rgba(107,138,82,0.10);
  --dv3-zone-up: #5a9b3e; --dv3-zone-down: #c0533f; --dv3-zone-warn: #b8902e; --dv3-zone-info: #4b8aa0;
}

.dv3-root {
  min-height: 100%;
  background: var(--dv3-bg);
  color: var(--dv3-text);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.dv3-root * { box-sizing: border-box; }
.dv3-mono { font-variant-numeric: tabular-nums; color: var(--dv3-text); }
.dv3-muted { color: var(--dv3-text3); font-size: 11px; }
.dv3-up { color: var(--dv3-zone-up); }
.dv3-down { color: var(--dv3-zone-down); }
.dv3-ml { margin-left: 8px; }

.dv3-terminal { max-width: 1280px; margin: 0 auto; padding: 28px 32px 48px; }
@media (max-width: 640px) { .dv3-terminal { padding: 12px; } }

/* HEADER */
.dv3-head {
  display: grid; grid-template-columns: auto 1fr auto;
  align-items: center; gap: 24px;
  padding: 12px 18px;
  border: 1px solid var(--dv3-border);
  margin-bottom: 16px;
  background: var(--dv3-bg2);
}
.dv3-head-brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 12px; letter-spacing: 0.1em; }
.dv3-head-logo {
  display: inline-block; padding: 3px 7px;
  background: var(--dv3-accent); color: var(--dv3-bg);
  font-weight: 700; letter-spacing: 0.08em;
}
.dv3-head-cmd { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--dv3-text3); }
.dv3-head-cmd::before { content: ">"; color: var(--dv3-accent); font-weight: 700; }
.dv3-head-caret {
  border-right: 8px solid var(--dv3-accent);
  animation: dv3-blink 1s steps(1) infinite;
}
@keyframes dv3-blink { 50% { border-color: transparent; } }
.dv3-head-right { display: flex; align-items: center; gap: 16px; font-size: 11px; color: var(--dv3-text3); letter-spacing: 0.05em; }
@media (max-width: 640px) {
  .dv3-head { grid-template-columns: 1fr; gap: 12px; }
  .dv3-head-cmd { display: none; }
}

/* TICKER */
.dv3-ticker {
  border: 1px solid var(--dv3-border); border-top: none;
  background: var(--dv3-bg2);
  overflow: hidden; height: 32px; margin-bottom: 16px;
}
.dv3-ticker-inner {
  display: flex; gap: 0; padding: 0 18px; height: 100%;
  align-items: center; white-space: nowrap;
  animation: dv3-scroll 60s linear infinite;
  font-size: 11px;
}
@keyframes dv3-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.dv3-ticker-item { display: inline-flex; align-items: center; gap: 6px; color: var(--dv3-text3); letter-spacing: 0.04em; }
.dv3-ticker-item strong { color: var(--dv3-text); font-weight: 600; }
.dv3-ticker-sep { color: var(--dv3-text4); margin: 0 14px; }

/* GRID */
.dv3-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
.dv3-col-12 { grid-column: span 12; }
.dv3-col-8 { grid-column: span 8; }
.dv3-col-6 { grid-column: span 6; }
.dv3-col-4 { grid-column: span 4; }
.dv3-col-3 { grid-column: span 3; }
@media (max-width: 1100px) {
  .dv3-col-8, .dv3-col-6 { grid-column: span 12; }
  .dv3-col-4, .dv3-col-3 { grid-column: span 6; }
}
@media (max-width: 640px) {
  .dv3-col-4, .dv3-col-3 { grid-column: span 12; }
}

/* CARD */
.dv3-card {
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  position: relative;
  display: flex; flex-direction: column;
  text-align: left;
}
.dv3-card::before, .dv3-card::after {
  content: ""; position: absolute; width: 8px; height: 8px; pointer-events: none;
}
.dv3-card::before { top: -1px; left: -1px; border-top: 1px solid var(--dv3-accent); border-left: 1px solid var(--dv3-accent); }
.dv3-card::after { bottom: -1px; right: -1px; border-bottom: 1px solid var(--dv3-accent); border-right: 1px solid var(--dv3-accent); }
.dv3-card-btn { cursor: pointer; font-family: inherit; color: inherit; }
.dv3-card-btn:hover { border-color: var(--dv3-border-hi); }
.dv3-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg3);
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--dv3-text3);
}
.dv3-card-head strong { color: var(--dv3-text); font-weight: 600; letter-spacing: 0.14em; }
.dv3-card-id { font-size: 9px; color: var(--dv3-text4); letter-spacing: 0.1em; }
.dv3-card-body { padding: 16px 18px; flex: 1; display: flex; flex-direction: column; }

.dv3-rule { border-top: 1px dashed var(--dv3-border2); margin: 16px -18px; }
.dv3-rule-thick { border-top: 1px solid var(--dv3-accent); opacity: 0.4; margin: 16px -18px; }
.dv3-empty {
  font-size: 11px; color: var(--dv3-text3); letter-spacing: 0.06em;
  padding: 14px 0; text-align: center; text-transform: uppercase;
}
.dv3-row-between { display: flex; justify-content: space-between; align-items: center; }
.dv3-row-between.dv3-baseline { align-items: baseline; }
.dv3-big-num { font-size: 30px; font-weight: 600; color: var(--dv3-text); font-variant-numeric: tabular-nums; }
.dv3-sub-cap { font-size: 10px; color: var(--dv3-text3); margin-top: 4px; letter-spacing: 0.06em; }

/* KPI */
.dv3-kpi { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: flex-end; }
.dv3-kpi-num {
  font-weight: 600; font-size: 80px; line-height: 0.9;
  letter-spacing: -0.04em; color: var(--dv3-text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.dv3-kpi-dec { color: var(--dv3-text2); font-weight: 400; }
.dv3-kpi-unit { font-size: 16px; color: var(--dv3-text3); margin-left: 8px; font-weight: 400; }
.dv3-kpi-label { font-size: 11px; color: var(--dv3-text3); margin-left: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }
.dv3-kpi-meta { display: flex; flex-direction: column; gap: 6px; text-align: right; align-items: flex-end; padding-bottom: 8px; }
.dv3-kpi-delta { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.dv3-kpi-delta-lab { font-size: 10px; color: var(--dv3-text3); letter-spacing: 0.06em; text-transform: uppercase; }
.dv3-kpi-target {
  margin-top: 4px; font-size: 11px; color: var(--dv3-text3);
  border-top: 1px solid var(--dv3-border2); padding-top: 8px;
}
.dv3-kpi-target strong { color: var(--dv3-text); }
@media (max-width: 640px) {
  .dv3-kpi { grid-template-columns: 1fr; }
  .dv3-kpi-meta { text-align: left; align-items: flex-start; }
  .dv3-kpi-num { font-size: 52px; }
}

/* DATA ROWS */
.dv3-data-rows { display: flex; flex-direction: column; }
.dv3-data-row {
  display: grid; grid-template-columns: 16px 1fr auto auto;
  gap: 12px; padding: 8px 0; align-items: baseline;
  border-bottom: 1px solid var(--dv3-border); font-size: 12px;
}
.dv3-data-row:last-child { border-bottom: none; }
.dv3-data-idx { color: var(--dv3-text4); font-size: 10px; font-variant-numeric: tabular-nums; }
.dv3-data-name { color: var(--dv3-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv3-data-sub { color: var(--dv3-text4); font-size: 10px; }
.dv3-bar-track { width: 60px; height: 4px; background: var(--dv3-bg3); overflow: hidden; }
.dv3-bar-fill { display: block; height: 100%; background: var(--dv3-accent); }
.dv3-bar-fill.dv3-up { background: var(--dv3-zone-up); }
.dv3-bar-fill.dv3-down { background: var(--dv3-zone-down); }
.dv3-data-val {
  color: var(--dv3-text); font-weight: 600; font-variant-numeric: tabular-nums;
  text-align: right; min-width: 56px; font-size: 12px;
}

/* TAG */
.dv3-tag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase;
  border: 1px solid currentColor; line-height: 1.4; width: fit-content;
}
.dv3-tag--up { color: var(--dv3-zone-up); }
.dv3-tag--down { color: var(--dv3-zone-down); }
.dv3-tag--warn { color: var(--dv3-zone-warn); }
.dv3-tag--info { color: var(--dv3-zone-info); }
.dv3-tag--gold { color: var(--dv3-accent); }
.dv3-tag--neutral { color: var(--dv3-text3); }

/* LINE CHART */
.dv3-line-chart { margin: 16px 0; height: 120px; width: 100%; }
.dv3-line-chart svg { width: 100%; height: 100%; overflow: visible; }
.dv3-line-grid line { stroke: var(--dv3-border); stroke-width: 1; stroke-dasharray: 2 4; }
.dv3-line-path { fill: none; stroke: var(--dv3-accent); stroke-width: 1.5; stroke-linejoin: round; }
.dv3-line-bg { fill: var(--dv3-accent); fill-opacity: 0.08; }
.dv3-line-dot { fill: var(--dv3-accent); }
.dv3-line-annot { font-family: 'Geist Mono', monospace; font-size: 10px; fill: var(--dv3-accent); font-weight: 600; }

/* GAUGE */
.dv3-gauge { align-self: flex-start; margin-top: 12px; font-size: 11px; color: var(--dv3-text3); }
.dv3-gauge-bar { letter-spacing: 0.05em; margin: 6px 0; line-height: 1; white-space: nowrap; }
.dv3-gauge-bar--lg { font-size: 13px; letter-spacing: 0; }
.dv3-fill { color: var(--dv3-accent); }
.dv3-dim { color: var(--dv3-border-hi); }
.dv3-gauge-meta { display: flex; justify-content: space-between; font-size: 10px; color: var(--dv3-text3); }
.dv3-gauge-meta strong { color: var(--dv3-text); font-weight: 600; }
.dv3-gauge-meta--mark { position: relative; }
.dv3-gauge-cur { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }

/* LADDER */
.dv3-ladder { font-size: 11px; margin-top: 4px; }
.dv3-ladder-row {
  display: grid; grid-template-columns: 50px 1fr 60px;
  gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--dv3-border);
  align-items: center; font-variant-numeric: tabular-nums; position: relative;
}
.dv3-ladder-bg { position: absolute; top: 0; bottom: 0; left: 0; background: var(--dv3-accent-bg); z-index: 0; }
.dv3-ladder-key, .dv3-ladder-name, .dv3-ladder-val { position: relative; z-index: 1; }
.dv3-ladder-key { color: var(--dv3-text3); }
.dv3-ladder-name { color: var(--dv3-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv3-ladder-val { text-align: right; font-weight: 600; }
.dv3-ladder-foot { padding-top: 8px; font-size: 10px; color: var(--dv3-text3); letter-spacing: 0.06em; }

/* FIELD GRID */
.dv3-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--dv3-border); margin-top: 4px; }
.dv3-field-grid--3 { grid-template-columns: 1fr 1fr 1fr; }
.dv3-field { background: var(--dv3-bg2); padding: 10px 12px; }
.dv3-field-lab { font-size: 9px; color: var(--dv3-text3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
.dv3-field-val { font-size: 18px; font-weight: 600; color: var(--dv3-text); font-variant-numeric: tabular-nums; line-height: 1.1; }
.dv3-field-sub { font-size: 10px; color: var(--dv3-text3); margin-top: 2px; }

/* CMD LIST */
.dv3-cmd-list { font-size: 11px; }
.dv3-cmd-row {
  display: grid; grid-template-columns: 48px 1fr auto;
  gap: 10px; padding: 5px 0; border-bottom: 1px solid var(--dv3-border); align-items: center;
}
.dv3-cmd-row:last-child { border-bottom: none; }
.dv3-cmd-time { color: var(--dv3-text4); font-size: 10px; font-variant-numeric: tabular-nums; }
.dv3-cmd-msg { color: var(--dv3-text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv3-cmd-tag {
  font-size: 9px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; padding: 1px 6px; border: 1px solid currentColor;
}
.dv3-cmd-tag--OK { color: var(--dv3-zone-up); }
.dv3-cmd-tag--WARN { color: var(--dv3-zone-warn); }
.dv3-cmd-tag--INFO { color: var(--dv3-zone-info); }

/* MINI */
.dv3-mini-num { display: flex; align-items: baseline; gap: 12px; }
.dv3-mini-num span:first-child { font-size: 42px; font-weight: 600; color: var(--dv3-text); line-height: 1; font-variant-numeric: tabular-nums; }
.dv3-mini-list { font-size: 11px; color: var(--dv3-text2); line-height: 1.7; }
.dv3-mini-list div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv3-nav-list { display: flex; flex-direction: column; }
.dv3-nav-list button {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; border-bottom: 1px solid var(--dv3-border);
  background: none; border-left: none; border-right: none; border-top: none;
  font-family: inherit; font-size: 11px; color: var(--dv3-text2);
  cursor: pointer;
}
.dv3-nav-list button:last-child { border-bottom: none; }
.dv3-nav-list button:hover { color: var(--dv3-accent); }

/* STATUS BAR */
.dv3-status-bar {
  margin-top: 16px; padding: 8px 18px;
  border: 1px solid var(--dv3-border); background: var(--dv3-bg2);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 10px; color: var(--dv3-text3); letter-spacing: 0.08em;
}
.dv3-status-left { display: flex; gap: 18px; flex-wrap: wrap; }
.dv3-status-item { display: flex; align-items: center; gap: 6px; }
.dv3-status-dot { width: 6px; height: 6px; background: var(--dv3-zone-up); border-radius: 50%; }
.dv3-status-dot.dv3-warn-dot { background: var(--dv3-zone-warn); }

/* HERO — copied from Dashboard V1 hero */
.dv3-hero {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid #06120f;
  background: linear-gradient(135deg, #0e2724 0%, #0d4d3f 55%, #1a7558 100%);
  color: #ecf2f0;
  box-shadow: var(--shadow-md);
  padding: 28px 32px;
  margin-bottom: 16px;
}
/* blueprint grid texture */
.dv3-hero::before {
  content: "";
  position: absolute; inset: 0;
  pointer-events: none;
  background-image:
    repeating-linear-gradient(0deg, rgba(255,255,255,.025) 0 1px, transparent 1px 24px),
    repeating-linear-gradient(90deg, rgba(255,255,255,.020) 0 1px, transparent 1px 24px);
}
/* gold radial glow */
.dv3-hero::after {
  content: "";
  position: absolute;
  top: -80px; right: -80px; width: 280px; height: 280px;
  pointer-events: none;
  background: radial-gradient(circle, rgba(168,133,43,.12), transparent 60%);
}
.dv3-hero > * { position: relative; z-index: 1; }

.dv3-hero-stamp {
  display: flex; align-items: center; gap: 8px;
  font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(245,236,210,0.7); margin-bottom: 8px;
}
.dv3-hero-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--gold);
  animation: dv3-pulse 2s ease-in-out infinite;
}
@keyframes dv3-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.dv3-hero-greet {
  font-size: 26px; font-weight: 600; letter-spacing: -0.01em;
  color: #ecf2f0; margin: 0 0 6px;
}
.dv3-hero-greet .dv3-accent { color: var(--gold); }
.dv3-hero-greet { margin-bottom: 0; }
`
