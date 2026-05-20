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

.dv3-terminal { max-width: 1280px; margin: 0 auto; padding: 28px 32px 48px; }
@media (max-width: 640px) { .dv3-terminal { padding: 12px; } }

/* LOADING */
@keyframes dv3-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.dv3-loading { animation: dv3-pulse 1.4s ease-in-out infinite; color: var(--dv3-text3); }

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

/* PERIOD SELECTOR BAR */
.dv3-periodbar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px;
  padding: 9px 16px;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg2);
}
.dv3-periodbar-label {
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.dv3-periodbar-spacer { flex: 1 1 auto; }
.dv3-periodbar-hint {
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--dv3-text4);
}
.dv3-period-select {
  background: var(--dv3-bg3);
  color: var(--dv3-text);
  border: 1px solid var(--dv3-border2);
  font-family: inherit; font-size: 12px;
  padding: 6px 10px;
  cursor: pointer;
}
.dv3-period-select:hover { border-color: var(--dv3-border-hi); }
.dv3-period-select:focus-visible {
  outline: 2px solid var(--dv3-accent); outline-offset: 1px;
}

.dv3-hero-metric-num--zone-up   { color: var(--dv3-zone-up); }
.dv3-hero-metric-num--zone-warn { color: var(--dv3-zone-warn); }
.dv3-hero-metric-num--zone-down { color: var(--dv3-zone-down); }

/* HERO — terminal meta-bar layout */
.dv3-hero {
  position: relative;
  border: 1px solid var(--dv3-border);
  border-top: 2px solid var(--dv3-zone-info);
  background: var(--dv3-bg2);
  margin-bottom: 16px;
}
.dv3-hero-meta {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px;
  padding: 8px 18px;
  border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg3);
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
}
.dv3-hero-meta-l { color: var(--dv3-zone-info); }
.dv3-hero-meta-r { color: var(--dv3-text4); letter-spacing: 0.1em; }
.dv3-hero-main {
  display: grid; grid-template-columns: 1fr auto;
  align-items: center; gap: 24px;
  padding: 22px;
}
.dv3-hero-title {
  font-size: 26px; font-weight: 600; letter-spacing: -0.01em;
  color: var(--dv3-text); margin: 0;
}
.dv3-hero-title .dv3-accent { color: var(--dv3-accent); }
.dv3-hero-sub {
  font-size: 11px; color: var(--dv3-text3);
  margin: 6px 0 0; letter-spacing: 0.04em;
}
.dv3-hero-metrics { display: flex; gap: 28px; }
.dv3-hero-metric { display: flex; flex-direction: column; align-items: flex-end; }
.dv3-hero-metric-num {
  font-size: 38px; font-weight: 600; line-height: 1;
  color: var(--dv3-text); font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}
.dv3-hero-metric-lab {
  font-size: 9px; color: var(--dv3-text3);
  letter-spacing: 0.14em; text-transform: uppercase; margin-top: 6px;
}
.dv3-hero-foot {
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px;
  padding: 7px 18px;
  border-top: 1px solid var(--dv3-border);
  font-size: 10px; color: var(--dv3-text4);
  letter-spacing: 0.1em; text-transform: uppercase;
}
.dv3-hero-foot-ok { color: var(--dv3-zone-up); }
.dv3-hero-foot-warn { color: var(--dv3-zone-warn); }
@media (max-width: 640px) {
  .dv3-hero-main { grid-template-columns: 1fr; }
  .dv3-hero-metrics { justify-content: flex-start; }
  .dv3-hero-metric { align-items: flex-start; }
}

/* card active state when its panel is open */
.dv3-card-btn[aria-expanded="true"] { border-color: var(--dv3-accent); }
`
