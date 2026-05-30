export const FORM_CSS = `
/* ===== Evaluation form — focus-mode v2 (design from GFH evaluation reference) =====
   Layout: topbar / 2-col work grid (checklist+rating | focus card with in-card footer).
   Colours bound to dv3-* theme tokens — no new hues introduced. */

.efm-shell {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 24px 120px;
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  color: var(--dv3-text);
  min-height: 100vh;
  position: relative;
}

/* === Page shell — boxed === */
.efm-page-v2 {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--dv3-text);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  background: var(--dv3-bg);
}
.efm-box {
  flex: 1; min-height: 0;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 20px 24px 24px;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.efm-box-inner {
  flex: 1; min-height: 0;
  border: 1px solid var(--dv3-border);
  border-radius: 16px;
  background: var(--dv3-bg);
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1px 0 var(--dv3-border), 0 12px 32px -20px rgba(0,0,0,.12);
}
@media (max-width: 700px) {
  .efm-box { padding: 8px; }
  .efm-box-inner { border-radius: 10px; }
}

/* === Topbar === */
.efm-topbar-v2 {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg);
  flex-wrap: wrap;
}
.efm-tb-ttl { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.efm-tb-c {
  font-size: 10.5px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3); font-weight: 600;
}
.efm-tb-h1 {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 28px; line-height: 1.05; letter-spacing: -0.01em;
  color: var(--dv3-text);
  margin: 0;
}
.efm-grow { flex: 1; }

.efm-chip-pill {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11.5px; font-weight: 500;
  padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--dv3-border-hi);
  color: var(--dv3-text2);
  background: var(--dv3-bg2);
  white-space: nowrap;
}
.efm-chip-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.efm-chip-pill--accent { color: var(--dv3-accent); border-color: var(--dv3-accent); }
.efm-chip-pill--warn { color: var(--dv3-zone-warn); border-color: var(--dv3-zone-warn); }

.efm-progwrap { display: flex; align-items: center; gap: 10px; }
.efm-progwrap .efm-pg-lbl {
  font-size: 11.5px; color: var(--dv3-text3);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-variant-numeric: tabular-nums;
}
.efm-progtrack {
  width: 150px; height: 8px; border-radius: 6px;
  background: var(--dv3-bg3);
  overflow: hidden; border: 1px solid var(--dv3-border);
}
.efm-progtrack i {
  display: block; height: 100%; border-radius: 6px;
  background: var(--dv3-accent);
  transition: width .35s;
}

/* === Employee stepper (sibling evaluatees) === */
.efm-stepper {
  display: flex; align-items: stretch; gap: 10px;
  padding: 12px 24px;
  overflow-x: auto;
  border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg2);
}
.efm-step {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 14px 7px 8px;
  border-radius: 12px;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg);
  cursor: pointer;
  white-space: nowrap;
  flex: 0 0 auto;
  color: var(--dv3-text2);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  transition: border-color .12s, transform .12s, background .12s;
}
.efm-step:hover { border-color: var(--dv3-border-hi); transform: translateY(-1px); }
.efm-step.is-active {
  border-color: var(--dv3-accent);
  background: var(--dv3-accent-bg);
  box-shadow: 0 0 0 1px var(--dv3-accent);
  color: var(--dv3-text);
  cursor: default;
}
.efm-step.is-done { border-color: var(--dv3-border-hi); }
.efm-step-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center;
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 600; font-size: 14px;
  background: var(--dv3-bg3);
  color: var(--dv3-text2);
  border: 1px solid var(--dv3-border);
}
.efm-step.is-active .efm-step-avatar {
  background: var(--dv3-accent); color: var(--dv3-bg);
  border-color: var(--dv3-accent);
}
.efm-step.is-done .efm-step-avatar {
  background: var(--dv3-zone-up);
  color: var(--dv3-bg);
  border-color: var(--dv3-zone-up);
}
.efm-step-info { display: flex; flex-direction: column; gap: 2px; line-height: 1.1; min-width: 0; }
.efm-step-name {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 14px; color: inherit;
}
.efm-step-prog {
  font-size: 10px; letter-spacing: .12em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.efm-step.is-active .efm-step-prog { color: var(--dv3-accent); }
.efm-step.is-done .efm-step-prog { color: var(--dv3-zone-up); }
.efm-step-done {
  display: grid; place-items: center;
  color: var(--dv3-zone-up);
  margin-left: 4px;
}

/* === Workspace 2-col === */
.efm-work {
  flex: 1;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
  padding: 18px 28px;
  min-height: 0;
  overflow: hidden;
}
@media (max-width: 1180px) { .efm-work { grid-template-columns: 248px minmax(0,1fr); } }
@media (max-width: 900px) {
  .efm-work { grid-template-columns: minmax(0,1fr); padding: 14px; }
  .efm-lcol { max-height: none; }
}

.efm-lcol, .efm-rcol { min-width: 0; }
.efm-lcol {
  display: flex; flex-direction: column; gap: 18px;
  min-height: 0;
}

.efm-card {
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 14px;
  display: flex; flex-direction: column;
  min-height: 0;
}
.efm-card-head {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--dv3-border);
}
.efm-card-head .t {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 18px; color: var(--dv3-text);
}
.efm-card-head .s {
  font-size: 10.5px; color: var(--dv3-text3);
  text-transform: uppercase; letter-spacing: .12em;
  margin-top: 3px; font-weight: 600;
}

/* === Checklist card === */
.efm-checklist {
  padding: 10px; flex: 1;
  display: flex; flex-direction: column; gap: 4px;
  overflow-y: auto;
}
.efm-cl-group {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em;
  color: var(--dv3-text3); font-weight: 700;
  margin: 8px 8px 4px;
}
.efm-cl-group.is-anti { color: var(--dv3-zone-down); }
.efm-cl-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 9px;
  cursor: pointer; border: 1px solid transparent;
  transition: background .12s, border-color .12s;
  background: none; width: 100%; text-align: left;
  color: var(--dv3-text2);
}
.efm-cl-item:hover { background: var(--dv3-bg3); color: var(--dv3-text); }
.efm-cl-item.is-active {
  background: var(--dv3-accent-bg);
  border-color: var(--dv3-border-hi);
  color: var(--dv3-text);
}
.efm-cl-mk {
  width: 20px; height: 20px; flex: 0 0 20px;
  border-radius: 6px; border: 1.5px solid var(--dv3-border-hi);
  display: grid; place-items: center;
  font-size: 11px; color: var(--dv3-text3);
  background: var(--dv3-bg);
}
.efm-cl-item.is-done .efm-cl-mk {
  background: var(--dv3-accent); border-color: var(--dv3-accent);
  color: var(--dv3-bg);
}
.efm-cl-item.is-anti.is-done .efm-cl-mk {
  background: var(--dv3-zone-warn); border-color: var(--dv3-zone-warn);
}
.efm-cl-txt {
  flex: 1; min-width: 0; font-size: 13px; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic;
}
.efm-cl-w {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 10.5px; color: var(--dv3-text3);
  font-variant-numeric: tabular-nums;
}
.efm-cl-item.is-anti .efm-cl-w { color: var(--dv3-zone-down); }

/* === Live rating card === */
.efm-rating-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.efm-bignum { display: flex; align-items: baseline; gap: 8px; }
.efm-bignum .v {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 44px; line-height: 1;
  color: var(--dv3-accent);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.efm-bignum .u { font-size: 14px; color: var(--dv3-text3); }
.efm-gauge {
  height: 9px; border-radius: 6px;
  background: var(--dv3-bg3); overflow: hidden;
  border: 1px solid var(--dv3-border);
}
.efm-gauge i {
  display: block; height: 100%; border-radius: 6px;
  background: var(--dv3-accent); transition: width .35s;
}
.efm-rsplit { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; }
.efm-rsplit .r { display: flex; justify-content: space-between; color: var(--dv3-text3); }
.efm-rsplit .r b {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  color: var(--dv3-text2); font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.efm-rsplit .r.is-minus b { color: var(--dv3-zone-down); }
.efm-rsplit .r.is-total {
  border-top: 1px dashed var(--dv3-border);
  padding-top: 7px;
  color: var(--dv3-text); font-weight: 600;
  text-transform: uppercase; letter-spacing: .1em; font-size: 11px;
}
.efm-rsplit .r.is-total b { color: var(--dv3-accent); font-size: 14px; }

/* === Focus card (right column) === */
.efm-rcol { display: flex; flex-direction: column; min-height: 0; }
.efm-focus {
  flex: 1; min-width: 0;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 14px;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.efm-focus-scroll {
  padding: 28px 32px;
  overflow-y: auto;
  flex: 1;
  display: flex; flex-direction: column; gap: 20px;
}

.efm-fmeta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.efm-scope-chip {
  font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
  padding: 3px 9px; border-radius: 7px;
  text-transform: uppercase;
  border: 1px solid var(--dv3-border-hi);
  color: var(--dv3-accent);
}
.efm-wchip {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 11px; color: var(--dv3-text2);
  border: 1px solid var(--dv3-border-hi);
  border-radius: 7px; padding: 3px 9px;
  font-variant-numeric: tabular-nums;
}
.efm-wchip.is-anti { color: var(--dv3-zone-down); border-color: var(--dv3-zone-down); }
.efm-auto-chip {
  font-size: 10px; font-weight: 700; letter-spacing: .06em;
  color: var(--dv3-zone-info);
  border: 1px dashed var(--dv3-zone-info);
  border-radius: 6px; padding: 2px 7px;
  text-transform: uppercase;
}
.efm-fcount {
  margin-left: auto;
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 12px; color: var(--dv3-text3);
  font-variant-numeric: tabular-nums;
}

.efm-fname {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: clamp(26px, 3.4vw, 34px);
  line-height: 1.1; letter-spacing: -0.02em;
  color: var(--dv3-text);
  margin: 0;
  max-width: 28ch;
}
.efm-fdesc {
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 15.5px; line-height: 1.55;
  color: var(--dv3-text2);
  max-width: 64ch;
  margin: 0;
}

.efm-pen-banner {
  display: flex; gap: 11px; align-items: flex-start;
  background: color-mix(in srgb, var(--dv3-zone-down) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--dv3-zone-down) 35%, transparent);
  border-left: 3px solid var(--dv3-zone-down);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--dv3-text2);
}
.efm-pen-banner b { color: var(--dv3-zone-down); }

/* === Score box === */
.efm-field { display: flex; flex-direction: column; }
.efm-flabel {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em;
  color: var(--dv3-text3); font-weight: 700;
  margin-bottom: 10px;
  display: flex; align-items: center; gap: 8px;
}
.efm-flabel-hint {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 400;
  text-transform: none; letter-spacing: 0;
  color: var(--dv3-text3); font-size: 13px;
}

.efm-ratebox {
  display: flex; align-items: center; gap: 28px; flex-wrap: wrap;
  background: var(--dv3-bg3);
  border: 1px solid var(--dv3-border);
  border-radius: 12px;
  padding: 18px 22px;
}
.efm-stars { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.efm-star {
  background: none; border: none; padding: 2px 2px;
  line-height: 1; cursor: pointer;
  transition: transform .08s;
}
.efm-star:hover:not(:disabled) { transform: scale(1.08); }
.efm-star:disabled { opacity: .4; cursor: not-allowed; }
.efm-star:focus-visible { outline: 2px solid var(--dv3-accent); outline-offset: 2px; }
.efm-star-wrap { position: relative; display: inline-block; line-height: 1; }
.efm-star-bg, .efm-star-fg {
  font-size: 38px; line-height: 1; display: block;
}
.efm-star-bg { color: var(--dv3-border2); }
.efm-star-fg {
  color: var(--dv3-zone-warn);
  position: absolute; top: 0; left: 0;
  overflow: hidden; white-space: nowrap; width: 0;
}
.efm-stars.is-neg .efm-star-fg { color: var(--dv3-zone-down); }

.efm-rate-readout { display: flex; flex-direction: column; gap: 6px; }
.efm-nrow { display: flex; align-items: center; gap: 10px; }
.efm-numinput {
  display: flex; align-items: center;
  border: 1px solid var(--dv3-border-hi);
  border-radius: 9px; overflow: hidden;
  background: var(--dv3-bg);
}
.efm-numinput input {
  width: 64px; background: transparent; border: 0;
  color: var(--dv3-zone-warn);
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 26px; text-align: center;
  padding: 6px 4px; outline: none;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
}
.efm-page-v2[data-phase="antibonus"] .efm-numinput input { color: var(--dv3-zone-down); }
.efm-numinput input::-webkit-outer-spin-button,
.efm-numinput input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.efm-numinput .u {
  padding: 0 11px; color: var(--dv3-text3);
  font-size: 12px; border-left: 1px solid var(--dv3-border);
  align-self: stretch; display: grid; place-items: center;
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
}
.efm-star-val {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 12px; color: var(--dv3-text3);
  font-variant-numeric: tabular-nums;
}
.efm-star-val b { color: var(--dv3-zone-warn); }
.efm-ratehint { font-size: 11.5px; color: var(--dv3-text3); }
.efm-readout-pending {
  color: var(--dv3-text4); font-size: 14px;
  letter-spacing: .22em; text-transform: uppercase;
}

/* === Note & files === */
.efm-note {
  width: 100%; min-height: 84px; resize: vertical;
  background: var(--dv3-bg);
  border: 1px solid var(--dv3-border-hi);
  border-radius: 10px;
  color: var(--dv3-text);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 13px; line-height: 1.55;
  padding: 12px 14px; outline: none;
  transition: border-color .15s;
}
.efm-note:focus { border-color: var(--dv3-accent); }
.efm-note.is-error { border-color: var(--dv3-zone-warn); }
.efm-note::placeholder { color: var(--dv3-text4); }
.efm-note-error { font-size: 11px; color: var(--dv3-zone-warn); margin-top: 6px; }

.efm-files-drop {
  display: flex; align-items: center; gap: 12px;
  border: 1.5px dashed var(--dv3-border-hi);
  border-radius: 10px; padding: 14px 16px;
  color: var(--dv3-text2); font-size: 13px;
  cursor: pointer; background: var(--dv3-bg3);
  transition: border-color .15s, color .15s;
}
.efm-files-drop:hover, .efm-files-drop.is-drag {
  border-color: var(--dv3-accent); color: var(--dv3-text);
  background: var(--dv3-accent-bg);
}
.efm-files-drop .ic { color: var(--dv3-accent); display: inline-flex; }

.efm-file-row {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 12px; align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed var(--dv3-border);
  font-size: 12.5px;
}
.efm-file-row:last-child { border-bottom: 0; }
.efm-file-del { background: none; border: 0; color: var(--dv3-text3); cursor: pointer; padding: 4px; }
.efm-file-del:hover { color: var(--dv3-zone-down); }

/* === In-card footer (replaces fixed bottombar) === */
.efm-fnav {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 24px;
  border-top: 1px solid var(--dv3-border);
  background: var(--dv3-bg2);
  flex-wrap: wrap;
}
.efm-savehint {
  font-size: 11.5px; color: var(--dv3-text3);
  display: flex; align-items: center; gap: 7px;
  letter-spacing: .04em;
}
.efm-savehint .d {
  width: 6px; height: 6px; border-radius: 50%; background: var(--dv3-accent);
}
.efm-savehint.is-err .d { background: var(--dv3-zone-down); }
.efm-savehint.is-saving .d { background: var(--dv3-zone-warn); }

.efm-btn {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 12px; letter-spacing: .14em; text-transform: uppercase;
  padding: 10px 16px; border-radius: 10px;
  border: 1px solid var(--dv3-border-hi);
  background: var(--dv3-bg);
  color: var(--dv3-text);
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
  transition: background .14s, border-color .14s;
}
.efm-btn:hover:not(:disabled) { background: var(--dv3-bg3); border-color: var(--dv3-accent); }
.efm-btn.is-primary {
  background: var(--dv3-accent); border-color: var(--dv3-accent); color: var(--dv3-bg);
}
.efm-btn.is-primary:hover:not(:disabled) {
  filter: brightness(1.08);
}
.efm-page-v2[data-phase="antibonus"] .efm-btn.is-primary {
  background: var(--dv3-zone-down); border-color: var(--dv3-zone-down);
}
.efm-btn.is-ghost { background: transparent; border-color: transparent; color: var(--dv3-text3); }
.efm-btn.is-ghost:hover:not(:disabled) { color: var(--dv3-text); background: var(--dv3-bg3); }
.efm-btn:disabled { opacity: .4; cursor: not-allowed; }

/* === Review step (centered summary) === */
.efm-review {
  text-align: center;
  padding: 48px 32px;
  display: flex; flex-direction: column; align-items: center; gap: 24px;
}
.efm-review-tag {
  font-size: 10.5px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.efm-review-num {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 96px; line-height: 1; letter-spacing: -0.03em;
  color: var(--dv3-accent);
  font-variant-numeric: tabular-nums;
}
.efm-review-num span {
  font-size: 18px; margin-left: 10px; color: var(--dv3-text3);
}
.efm-review-rows {
  display: inline-flex; flex-direction: column; gap: 6px;
  text-align: left;
  font-size: 13px; color: var(--dv3-text3);
  letter-spacing: .04em;
}
.efm-review-rows .r { display: flex; justify-content: space-between; gap: 32px; }
.efm-review-rows .r b { font-family: 'Geist Mono', ui-monospace, Menlo, monospace; }
.efm-review-rows .r.up b { color: var(--dv3-zone-up); }
.efm-review-rows .r.down b { color: var(--dv3-zone-down); }
.efm-review-rows .r.total {
  border-top: 1px dashed var(--dv3-border); padding-top: 8px; margin-top: 4px;
  color: var(--dv3-text);
}
.efm-review-rows .r.total b { color: var(--dv3-accent); }
.efm-review-actions { display: flex; gap: 12px; justify-content: center; }

/* === Banner shell === */
.efm-banner {
  text-align: center; padding: 120px 24px;
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-size: 22px;
}

/* === Shortcuts overlay (kept as-is for compatibility) === */
.efm-shortcuts {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.5); z-index: 10; padding: 24px;
}
.efm-shortcuts-card {
  background: var(--dv3-bg); border: 1px solid var(--dv3-border); padding: 32px; max-width: 480px;
  border-radius: 14px;
}

@media (max-width: 700px) {
  .efm-topbar-v2 { padding: 12px 16px; gap: 10px; }
  .efm-tb-h1 { font-size: 22px; }
  .efm-focus-scroll { padding: 20px 18px; gap: 16px; }
  .efm-ratebox { padding: 14px 16px; gap: 18px; }
  .efm-star-bg, .efm-star-fg { font-size: 30px; }
  .efm-fnav { padding: 12px 16px; }
}
`
