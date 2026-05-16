// Terminal / Swiss-grid aesthetic for DashboardV2Page.
// Scoped entirely under .dv2-root; theme switched via [data-dv2-theme].
export const DASHBOARD_V2_CSS = `
.dv2-root {
  --dv2-green: #a3c585;

  --dv2-zone-up:   #86c46a;
  --dv2-zone-down: #e07a6a;
  --dv2-zone-warn: #e0b34f;
  --dv2-zone-info: #7fb3c4;
}
.dv2-root[data-dv2-theme="dark"] {
  --dv2-bg: #0d1410; --dv2-bg2: #141a15; --dv2-bg3: #1c241d;
  --dv2-text: #e8ece4; --dv2-text2: #9ba798; --dv2-text3: #6b756a; --dv2-text4: #454e46;
  --dv2-border: #1f2820; --dv2-border2: #2a342b; --dv2-border-hi: #3d4a3e;
  --dv2-accent: var(--dv2-green);
  --dv2-accent-bg: rgba(163,197,133,0.10);
}
.dv2-root[data-dv2-theme="light"] {
  --dv2-bg: #f4f6ee; --dv2-bg2: #fbfcf6; --dv2-bg3: #e8ecdc;
  --dv2-text: #1a2014; --dv2-text2: #4d5544; --dv2-text3: #828a76; --dv2-text4: #b0b8a3;
  --dv2-border: #d9ddc8; --dv2-border2: #c5cab2; --dv2-border-hi: #98a07f;
  --dv2-accent: #6b8a52;
  --dv2-accent-bg: rgba(107,138,82,0.10);
  --dv2-zone-up: #5a9b3e; --dv2-zone-down: #c0533f; --dv2-zone-warn: #b8902e; --dv2-zone-info: #4b8aa0;
}

.dv2-root {
  min-height: 100%;
  background: var(--dv2-bg);
  color: var(--dv2-text);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.dv2-root * { box-sizing: border-box; }
.dv2-mono { font-variant-numeric: tabular-nums; color: var(--dv2-text); }
.dv2-muted { color: var(--dv2-text3); font-size: 11px; }
.dv2-up { color: var(--dv2-zone-up); }
.dv2-down { color: var(--dv2-zone-down); }
.dv2-ml { margin-left: 8px; }

.dv2-terminal { max-width: 1440px; margin: 0 auto; padding: 24px; }
@media (max-width: 640px) { .dv2-terminal { padding: 12px; } }

/* HEADER */
.dv2-head {
  display: grid; grid-template-columns: auto 1fr auto;
  align-items: center; gap: 24px;
  padding: 12px 18px;
  border: 1px solid var(--dv2-border);
  margin-bottom: 16px;
  background: var(--dv2-bg2);
}
.dv2-head-brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 12px; letter-spacing: 0.1em; }
.dv2-head-logo {
  display: inline-block; padding: 3px 7px;
  background: var(--dv2-accent); color: var(--dv2-bg);
  font-weight: 700; letter-spacing: 0.08em;
}
.dv2-head-cmd { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--dv2-text3); }
.dv2-head-cmd::before { content: ">"; color: var(--dv2-accent); font-weight: 700; }
.dv2-head-caret {
  border-right: 8px solid var(--dv2-accent);
  animation: dv2-blink 1s steps(1) infinite;
}
@keyframes dv2-blink { 50% { border-color: transparent; } }
.dv2-head-right { display: flex; align-items: center; gap: 16px; font-size: 11px; color: var(--dv2-text3); letter-spacing: 0.05em; }
.dv2-theme-btn {
  border: 1px solid var(--dv2-border2); background: var(--dv2-bg);
  color: var(--dv2-text2); padding: 5px 10px;
  font-family: inherit; font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.1em;
  cursor: pointer; transition: all 0.15s ease;
}
.dv2-theme-btn:hover { color: var(--dv2-accent); border-color: var(--dv2-accent); }
@media (max-width: 640px) {
  .dv2-head { grid-template-columns: 1fr; gap: 12px; }
  .dv2-head-cmd { display: none; }
}

/* TICKER */
.dv2-ticker {
  border: 1px solid var(--dv2-border); border-top: none;
  background: var(--dv2-bg2);
  overflow: hidden; height: 32px; margin-bottom: 16px;
}
.dv2-ticker-inner {
  display: flex; gap: 0; padding: 0 18px; height: 100%;
  align-items: center; white-space: nowrap;
  animation: dv2-scroll 60s linear infinite;
  font-size: 11px;
}
@keyframes dv2-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.dv2-ticker-item { display: inline-flex; align-items: center; gap: 6px; color: var(--dv2-text3); letter-spacing: 0.04em; }
.dv2-ticker-item strong { color: var(--dv2-text); font-weight: 600; }
.dv2-ticker-sep { color: var(--dv2-text4); margin: 0 14px; }

/* GRID */
.dv2-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
.dv2-col-12 { grid-column: span 12; }
.dv2-col-8 { grid-column: span 8; }
.dv2-col-6 { grid-column: span 6; }
.dv2-col-4 { grid-column: span 4; }
.dv2-col-3 { grid-column: span 3; }
@media (max-width: 1100px) {
  .dv2-col-8, .dv2-col-6 { grid-column: span 12; }
  .dv2-col-4, .dv2-col-3 { grid-column: span 6; }
}
@media (max-width: 640px) {
  .dv2-col-4, .dv2-col-3 { grid-column: span 12; }
}

/* CARD */
.dv2-card {
  background: var(--dv2-bg2);
  border: 1px solid var(--dv2-border);
  position: relative;
  display: flex; flex-direction: column;
  text-align: left;
}
.dv2-card::before, .dv2-card::after {
  content: ""; position: absolute; width: 8px; height: 8px; pointer-events: none;
}
.dv2-card::before { top: -1px; left: -1px; border-top: 1px solid var(--dv2-accent); border-left: 1px solid var(--dv2-accent); }
.dv2-card::after { bottom: -1px; right: -1px; border-bottom: 1px solid var(--dv2-accent); border-right: 1px solid var(--dv2-accent); }
.dv2-card-btn { cursor: pointer; font-family: inherit; color: inherit; }
.dv2-card-btn:hover { border-color: var(--dv2-border-hi); }
.dv2-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--dv2-border);
  background: var(--dv2-bg3);
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--dv2-text3);
}
.dv2-card-head strong { color: var(--dv2-text); font-weight: 600; letter-spacing: 0.14em; }
.dv2-card-id { font-size: 9px; color: var(--dv2-text4); letter-spacing: 0.1em; }
.dv2-card-body { padding: 16px 18px; flex: 1; display: flex; flex-direction: column; }

.dv2-rule { border-top: 1px dashed var(--dv2-border2); margin: 16px -18px; }
.dv2-rule-thick { border-top: 1px solid var(--dv2-accent); opacity: 0.4; margin: 16px -18px; }
.dv2-empty {
  font-size: 11px; color: var(--dv2-text3); letter-spacing: 0.06em;
  padding: 14px 0; text-align: center; text-transform: uppercase;
}
.dv2-row-between { display: flex; justify-content: space-between; align-items: center; }
.dv2-row-between.dv2-baseline { align-items: baseline; }
.dv2-big-num { font-size: 30px; font-weight: 600; color: var(--dv2-text); font-variant-numeric: tabular-nums; }
.dv2-sub-cap { font-size: 10px; color: var(--dv2-text3); margin-top: 4px; letter-spacing: 0.06em; }

/* KPI */
.dv2-kpi { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: flex-end; }
.dv2-kpi-num {
  font-weight: 600; font-size: 80px; line-height: 0.9;
  letter-spacing: -0.04em; color: var(--dv2-text);
  font-variant-numeric: tabular-nums;
}
.dv2-kpi-dec { color: var(--dv2-text2); font-weight: 400; }
.dv2-kpi-unit { font-size: 16px; color: var(--dv2-text3); margin-left: 8px; font-weight: 400; }
.dv2-kpi-meta { display: flex; flex-direction: column; gap: 6px; text-align: right; align-items: flex-end; padding-bottom: 8px; }
.dv2-kpi-delta { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
.dv2-kpi-delta-lab { font-size: 10px; color: var(--dv2-text3); letter-spacing: 0.06em; text-transform: uppercase; }
.dv2-kpi-target {
  margin-top: 4px; font-size: 11px; color: var(--dv2-text3);
  border-top: 1px solid var(--dv2-border2); padding-top: 8px;
}
.dv2-kpi-target strong { color: var(--dv2-text); }
@media (max-width: 640px) {
  .dv2-kpi { grid-template-columns: 1fr; }
  .dv2-kpi-meta { text-align: left; align-items: flex-start; }
  .dv2-kpi-num { font-size: 52px; }
}

/* DATA ROWS */
.dv2-data-rows { display: flex; flex-direction: column; }
.dv2-data-row {
  display: grid; grid-template-columns: 16px 1fr auto auto;
  gap: 12px; padding: 8px 0; align-items: baseline;
  border-bottom: 1px solid var(--dv2-border); font-size: 12px;
}
.dv2-data-row:last-child { border-bottom: none; }
.dv2-data-idx { color: var(--dv2-text4); font-size: 10px; font-variant-numeric: tabular-nums; }
.dv2-data-name { color: var(--dv2-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv2-data-sub { color: var(--dv2-text4); font-size: 10px; }
.dv2-bar-track { width: 60px; height: 4px; background: var(--dv2-bg3); overflow: hidden; }
.dv2-bar-fill { display: block; height: 100%; background: var(--dv2-accent); }
.dv2-bar-fill.dv2-up { background: var(--dv2-zone-up); }
.dv2-bar-fill.dv2-down { background: var(--dv2-zone-down); }
.dv2-data-val {
  color: var(--dv2-text); font-weight: 600; font-variant-numeric: tabular-nums;
  text-align: right; min-width: 56px; font-size: 12px;
}

/* TAG */
.dv2-tag {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 8px; font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase;
  border: 1px solid currentColor; line-height: 1.4; width: fit-content;
}
.dv2-tag--up { color: var(--dv2-zone-up); }
.dv2-tag--down { color: var(--dv2-zone-down); }
.dv2-tag--warn { color: var(--dv2-zone-warn); }
.dv2-tag--info { color: var(--dv2-zone-info); }
.dv2-tag--gold { color: var(--dv2-accent); }
.dv2-tag--neutral { color: var(--dv2-text3); }

/* LINE CHART */
.dv2-line-chart { margin: 16px 0; height: 120px; width: 100%; }
.dv2-line-chart svg { width: 100%; height: 100%; overflow: visible; }
.dv2-line-grid line { stroke: var(--dv2-border); stroke-width: 1; stroke-dasharray: 2 4; }
.dv2-line-path { fill: none; stroke: var(--dv2-accent); stroke-width: 1.5; stroke-linejoin: round; }
.dv2-line-bg { fill: var(--dv2-accent); fill-opacity: 0.08; }
.dv2-line-dot { fill: var(--dv2-accent); }
.dv2-line-annot { font-family: 'Geist Mono', monospace; font-size: 10px; fill: var(--dv2-accent); font-weight: 600; }

/* GAUGE */
.dv2-gauge { margin-top: 12px; font-size: 11px; color: var(--dv2-text3); }
.dv2-gauge-bar { letter-spacing: 0.05em; margin: 6px 0; line-height: 1; word-break: break-all; }
.dv2-gauge-bar--lg { font-size: 13px; letter-spacing: 0; }
.dv2-fill { color: var(--dv2-accent); }
.dv2-dim { color: var(--dv2-border-hi); }
.dv2-gauge-meta { display: flex; justify-content: space-between; font-size: 10px; color: var(--dv2-text3); }
.dv2-gauge-meta strong { color: var(--dv2-text); font-weight: 600; }

/* LADDER */
.dv2-ladder { font-size: 11px; margin-top: 4px; }
.dv2-ladder-row {
  display: grid; grid-template-columns: 50px 1fr 60px;
  gap: 8px; padding: 5px 0; border-bottom: 1px solid var(--dv2-border);
  align-items: center; font-variant-numeric: tabular-nums; position: relative;
}
.dv2-ladder-bg { position: absolute; top: 0; bottom: 0; left: 0; background: var(--dv2-accent-bg); z-index: 0; }
.dv2-ladder-key, .dv2-ladder-name, .dv2-ladder-val { position: relative; z-index: 1; }
.dv2-ladder-key { color: var(--dv2-text3); }
.dv2-ladder-name { color: var(--dv2-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv2-ladder-val { text-align: right; font-weight: 600; }
.dv2-ladder-foot { padding-top: 8px; font-size: 10px; color: var(--dv2-text3); letter-spacing: 0.06em; }

/* FIELD GRID */
.dv2-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--dv2-border); margin-top: 4px; }
.dv2-field-grid--3 { grid-template-columns: 1fr 1fr 1fr; }
.dv2-field { background: var(--dv2-bg2); padding: 10px 12px; }
.dv2-field-lab { font-size: 9px; color: var(--dv2-text3); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
.dv2-field-val { font-size: 18px; font-weight: 600; color: var(--dv2-text); font-variant-numeric: tabular-nums; line-height: 1.1; }
.dv2-field-sub { font-size: 10px; color: var(--dv2-text3); margin-top: 2px; }

/* CMD LIST */
.dv2-cmd-list { font-size: 11px; }
.dv2-cmd-row {
  display: grid; grid-template-columns: 48px 1fr auto;
  gap: 10px; padding: 5px 0; border-bottom: 1px solid var(--dv2-border); align-items: center;
}
.dv2-cmd-row:last-child { border-bottom: none; }
.dv2-cmd-time { color: var(--dv2-text4); font-size: 10px; font-variant-numeric: tabular-nums; }
.dv2-cmd-msg { color: var(--dv2-text2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv2-cmd-tag {
  font-size: 9px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; padding: 1px 6px; border: 1px solid currentColor;
}
.dv2-cmd-tag--OK { color: var(--dv2-zone-up); }
.dv2-cmd-tag--WARN { color: var(--dv2-zone-warn); }
.dv2-cmd-tag--INFO { color: var(--dv2-zone-info); }

/* MINI */
.dv2-mini-num { display: flex; align-items: baseline; gap: 12px; }
.dv2-mini-num span:first-child { font-size: 42px; font-weight: 600; color: var(--dv2-text); line-height: 1; font-variant-numeric: tabular-nums; }
.dv2-mini-list { font-size: 11px; color: var(--dv2-text2); line-height: 1.7; }
.dv2-mini-list div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dv2-nav-list { display: flex; flex-direction: column; }
.dv2-nav-list button {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; border-bottom: 1px solid var(--dv2-border);
  background: none; border-left: none; border-right: none; border-top: none;
  font-family: inherit; font-size: 11px; color: var(--dv2-text2);
  cursor: pointer;
}
.dv2-nav-list button:last-child { border-bottom: none; }
.dv2-nav-list button:hover { color: var(--dv2-accent); }

/* STATUS BAR */
.dv2-status-bar {
  margin-top: 16px; padding: 8px 18px;
  border: 1px solid var(--dv2-border); background: var(--dv2-bg2);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 10px; color: var(--dv2-text3); letter-spacing: 0.08em;
}
.dv2-status-left { display: flex; gap: 18px; flex-wrap: wrap; }
.dv2-status-item { display: flex; align-items: center; gap: 6px; }
.dv2-status-dot { width: 6px; height: 6px; background: var(--dv2-zone-up); border-radius: 50%; }
.dv2-status-dot.dv2-warn-dot { background: var(--dv2-zone-warn); }
`
