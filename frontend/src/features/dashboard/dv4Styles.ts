// Dashboard V2 — editorial / archival aesthetic.
// Honors DESIGN_SYSTEM.md: serif title + mono eyebrow, gold L-tick corners,
// cream surface over radial-tinted main, restrained motion.
export const DV4_CSS = `
.dv4-root {
  --dv4-bg: var(--bg, #f4f1ea);
  --dv4-surface: var(--surface, #ffffff);
  --dv4-line: var(--line, #d8d2c2);
  --dv4-ink: var(--ink, #0e1714);
  --dv4-ink-soft: var(--ink-soft, #344843);
  --dv4-accent: var(--accent, #0d4d3f);
  --dv4-success: var(--success, #1a7558);
  --dv4-warn: var(--warn, #b25a16);
  --dv4-danger: var(--danger, #a31f1f);
  --dv4-gold: var(--gold, #a8852b);
  --dv4-gold-soft: var(--gold-soft, #f5ecd2);

  --dv4-display: var(--font-display, 'Source Serif Pro', Georgia, serif);
  --dv4-text: var(--font-text, 'Geist', 'IBM Plex Sans', system-ui, sans-serif);
  --dv4-mono: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace);

  font-family: var(--dv4-text);
  color: var(--dv4-ink);
  min-height: 100%;
}
.dv4-root *, .dv4-root *::before, .dv4-root *::after { box-sizing: border-box; }

.dv4-wrap {
  max-width: var(--content-max, 1280px);
  margin: 0 auto;
  padding: 28px 32px 56px;
}
@media (max-width: 640px) { .dv4-wrap { padding: 16px; } }

/* ── MASTHEAD ───────────────────────────────────────────────────────────── */
.dv4-mast {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 0;
  border: 1px solid var(--dv4-line);
  border-radius: 14px;
  background: var(--dv4-surface);
  box-shadow: 0 1px 2px rgba(15,23,20,0.06);
  overflow: hidden;
  position: relative;
}
@media (max-width: 900px) { .dv4-mast { grid-template-columns: 1fr; } }

.dv4-mast-left {
  position: relative;
  padding: 36px 40px 32px;
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(168,133,43,0.06) 0%, transparent 60%),
    linear-gradient(155deg, #0e2724 0%, #0d4d3f 55%, #1a7558 100%);
  color: var(--dv4-gold-soft);
  min-height: 280px;
}
.dv4-mast-left::before, .dv4-mast-left::after {
  content: "";
  position: absolute;
  width: 14px; height: 14px;
  border-color: var(--dv4-gold);
  border-style: solid;
}
.dv4-mast-left::before { top: 14px; right: 14px; border-width: 1px 1px 0 0; }
.dv4-mast-left::after  { bottom: 14px; left: 14px; border-width: 0 0 1px 1px; }

.dv4-eyebrow {
  font-family: var(--dv4-mono);
  text-transform: uppercase;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--dv4-gold);
  display: flex; gap: 14px; align-items: center;
}
.dv4-eyebrow span { opacity: 0.75; }
.dv4-eyebrow em { font-style: normal; color: var(--dv4-gold-soft); }

.dv4-title {
  font-family: var(--dv4-display);
  font-weight: 600;
  font-size: 34px;
  line-height: 1.1;
  letter-spacing: 0.01em;
  margin: 16px 0 8px;
  color: #f5ecd2;
}
.dv4-tag {
  font-family: var(--dv4-text);
  font-size: 13.5px;
  line-height: 1.55;
  color: rgba(245,236,210,0.78);
  max-width: 48ch;
}

.dv4-meta-row {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px 24px;
}
.dv4-meta-k {
  font-family: var(--dv4-mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dv4-gold);
  margin-bottom: 4px;
}
.dv4-meta-v {
  font-family: var(--dv4-display);
  font-size: 18px;
  font-weight: 500;
  color: #f5ecd2;
  letter-spacing: 0.01em;
}

.dv4-mast-right {
  padding: 36px 40px 32px;
  background:
    radial-gradient(80% 60% at 100% 100%, rgba(13,77,63,0.05) 0%, transparent 70%),
    #fcf9f2;
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: relative;
}

.dv4-score-row { display: flex; align-items: baseline; gap: 16px; }
.dv4-score-n {
  font-family: var(--dv4-display);
  font-size: 96px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--dv4-accent);
  font-feature-settings: "tnum" 1;
}
.dv4-score-n.is-warn { color: var(--dv4-warn); }
.dv4-score-n.is-down { color: var(--dv4-danger); }
.dv4-score-n.is-empty { color: var(--dv4-ink-soft); opacity: 0.5; font-size: 64px; }
.dv4-score-unit {
  font-family: var(--dv4-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  color: var(--dv4-ink-soft);
  text-transform: uppercase;
}
.dv4-score-zone {
  font-family: var(--dv4-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 4px 10px;
  border: 1px solid currentColor;
  border-radius: 2px;
  color: var(--dv4-accent);
}
.dv4-score-zone.is-warn { color: var(--dv4-warn); }
.dv4-score-zone.is-down { color: var(--dv4-danger); }

.dv4-delta {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--dv4-mono); font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--dv4-ink-soft);
}
.dv4-delta strong { font-weight: 700; color: var(--dv4-success); }
.dv4-delta.is-down strong { color: var(--dv4-danger); }
.dv4-delta.is-flat strong { color: var(--dv4-ink-soft); }

/* gauge: thin baseline + thresholds + marker */
.dv4-gauge { position: relative; height: 28px; margin-top: 4px; }
.dv4-gauge-bar {
  position: absolute; left: 0; right: 0; top: 13px;
  height: 2px; background: var(--dv4-line);
}
.dv4-gauge-fill {
  position: absolute; left: 0; top: 13px;
  height: 2px; background: var(--dv4-accent);
}
.dv4-gauge-tick {
  position: absolute; top: 8px; width: 1px; height: 12px;
  background: var(--dv4-line);
}
.dv4-gauge-marker {
  position: absolute; top: 4px;
  width: 2px; height: 20px;
  background: var(--dv4-gold);
  box-shadow: 0 0 0 3px rgba(168,133,43,0.18);
  transform: translateX(-1px);
}
.dv4-gauge-axis {
  display: flex; justify-content: space-between;
  font-family: var(--dv4-mono); font-size: 9.5px;
  letter-spacing: 0.14em; color: var(--dv4-ink-soft);
  text-transform: uppercase;
  margin-top: 6px;
}

.dv4-pending {
  border: 1px dashed var(--dv4-line);
  background: rgba(168,133,43,0.05);
  border-radius: 4px;
  padding: 14px 16px;
  font-size: 13px;
}
.dv4-pending-lead {
  font-family: var(--dv4-mono); font-size: 10px;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dv4-warn); margin-bottom: 6px;
}
.dv4-pending-eval {
  font-family: var(--dv4-display); font-size: 15px;
  color: var(--dv4-ink); margin-bottom: 8px;
}
.dv4-pending-pill {
  display: inline-block;
  font-family: var(--dv4-mono);
  font-size: 9px; letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 3px 8px; border-radius: 2px;
  border: 1px solid var(--dv4-line);
  background: var(--dv4-surface);
}
.dv4-pending-pill.is-submitted { color: var(--dv4-success); border-color: rgba(26,117,88,0.4); }

/* ── KPI STRIP ──────────────────────────────────────────────────────────── */
.dv4-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 18px;
}
@media (max-width: 800px) { .dv4-strip { grid-template-columns: 1fr; } }

.dv4-tile {
  position: relative;
  border: 1px solid var(--dv4-line);
  border-radius: 10px;
  background: var(--dv4-surface);
  padding: 22px 24px 20px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: border-color 140ms ease, box-shadow 140ms ease, transform 60ms ease;
  display: flex; flex-direction: column; gap: 12px;
  min-height: 168px;
}
.dv4-tile:hover { border-color: var(--dv4-ink-soft); box-shadow: 0 1px 2px rgba(15,23,20,0.06); }
.dv4-tile:focus-visible { outline: 2px solid var(--dv4-gold); outline-offset: 2px; }
.dv4-tile:active { transform: translateY(1px); }
.dv4-tile.is-active {
  border-color: var(--dv4-accent);
  box-shadow: inset 0 0 0 1px var(--dv4-accent);
}

.dv4-tile-head {
  display: flex; justify-content: space-between; align-items: baseline;
}
.dv4-tile-label {
  font-family: var(--dv4-mono); font-size: 10px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--dv4-ink-soft);
}
.dv4-tile-code {
  font-family: var(--dv4-mono); font-size: 9px;
  letter-spacing: 0.14em; color: var(--dv4-gold);
}
.dv4-tile-figure {
  display: flex; align-items: baseline; gap: 8px;
}
.dv4-tile-n {
  font-family: var(--dv4-display);
  font-size: 44px; font-weight: 600; line-height: 1;
  color: var(--dv4-ink); letter-spacing: -0.01em;
  font-feature-settings: "tnum" 1;
}
.dv4-tile-unit {
  font-family: var(--dv4-mono); font-size: 12px;
  color: var(--dv4-ink-soft); letter-spacing: 0.08em;
}
.dv4-tile-sub {
  font-family: var(--dv4-text);
  font-size: 12.5px; color: var(--dv4-ink-soft);
}
.dv4-tile-meter {
  position: relative; height: 4px;
  background: var(--dv4-line); border-radius: 2px;
  overflow: hidden;
  margin-top: auto;
}
.dv4-tile-meter > i {
  position: absolute; left: 0; top: 0; bottom: 0;
  background: var(--dv4-accent);
  border-radius: 2px;
}
.dv4-tile.is-warn .dv4-tile-meter > i { background: var(--dv4-warn); }
.dv4-tile.is-down .dv4-tile-meter > i { background: var(--dv4-danger); }

/* ── LEDGER (recent activity) ───────────────────────────────────────────── */
.dv4-ledger {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
}
@media (max-width: 1000px) { .dv4-ledger { grid-template-columns: 1fr; } }

.dv4-panel {
  border: 1px solid var(--dv4-line);
  border-radius: 10px;
  background: var(--dv4-surface);
  overflow: hidden;
}
.dv4-panel-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid var(--dv4-line);
  background: linear-gradient(180deg, rgba(13,77,63,0.03), transparent);
}
.dv4-panel-eyebrow {
  font-family: var(--dv4-mono); font-size: 9px;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--dv4-gold);
}
.dv4-panel-title {
  font-family: var(--dv4-display); font-size: 18px;
  font-weight: 600; color: var(--dv4-ink); margin-top: 2px;
}
.dv4-panel-count {
  font-family: var(--dv4-mono); font-size: 11px;
  letter-spacing: 0.12em; color: var(--dv4-ink-soft);
  text-transform: uppercase;
}

.dv4-rows { list-style: none; margin: 0; padding: 4px 0; }
.dv4-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--dv4-line) 60%, transparent);
  align-items: center;
}
.dv4-row:last-child { border-bottom: 0; }
.dv4-row-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dv4-row-title {
  font-family: var(--dv4-text); font-size: 13.5px;
  color: var(--dv4-ink); font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dv4-row-sub {
  font-family: var(--dv4-mono); font-size: 10px;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--dv4-ink-soft);
}
.dv4-row-tag {
  font-family: var(--dv4-mono); font-size: 9px;
  letter-spacing: 0.14em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 2px;
  border: 1px solid var(--dv4-line);
  color: var(--dv4-ink-soft);
  white-space: nowrap;
}
.dv4-row-tag.is-ok { color: var(--dv4-success); border-color: rgba(26,117,88,0.4); }
.dv4-row-tag.is-warn { color: var(--dv4-warn); border-color: rgba(178,90,22,0.4); }
.dv4-row-tag.is-bad { color: var(--dv4-danger); border-color: rgba(163,31,31,0.4); }

.dv4-empty {
  padding: 28px 20px;
  text-align: center;
  font-family: var(--dv4-mono);
  font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dv4-ink-soft);
}

/* ── SKELETON ───────────────────────────────────────────────────────────── */
@keyframes dv4-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
.dv4-skel { animation: dv4-pulse 1.4s ease-in-out infinite; }

/* ── PARTIAL-FAILURE banner ─────────────────────────────────────────────── */
.dv4-warn-banner {
  margin: 0 0 16px;
  padding: 10px 16px;
  border: 1px solid rgba(178,90,22,0.3);
  background: rgba(178,90,22,0.06);
  border-radius: 6px;
  font-family: var(--dv4-mono); font-size: 11px;
  color: var(--dv4-warn);
  letter-spacing: 0.10em; text-transform: uppercase;
}

/* reduced motion */
@media (prefers-reduced-motion: reduce) {
  .dv4-tile { transition: none; }
  .dv4-skel { animation: none; }
}
`
