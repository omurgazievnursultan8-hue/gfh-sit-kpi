// Terminal-aesthetic form controls for dv3 pages (forms, detail views,
// settings). Scoped under .dv3-root; consumes the same --dv3-* theme vars as
// DASHBOARD_CSS / STAT_CARD_CSS, so it follows light/dark + ThemeCustomizer.
// Inject alongside DASHBOARD_CSS: <style>{DV3_FORM_CSS}</style>.
export const DV3_FORM_CSS = `
/* FORM SHELL */
.dv3-form { display: flex; flex-direction: column; gap: 18px; }
.dv3-panel {
  position: relative;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  padding: 22px;
}
.dv3-panel--accent { border-top: 2px solid var(--dv3-zone-info); }

/* SECTION HEAD — mirrors the card head bar */
.dv3-section-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--dv3-text); font-weight: 600;
  padding-bottom: 10px; margin-bottom: 16px;
  border-bottom: 1px solid var(--dv3-border);
}

/* FIELD */
.dv3-field { display: flex; flex-direction: column; gap: 6px; }
.dv3-label {
  font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.dv3-req { color: var(--dv3-zone-down); margin-left: 3px; }
.dv3-help { font-size: 10px; color: var(--dv3-text4); letter-spacing: 0.04em; }

/* INPUTS */
.dv3-input, .dv3-textarea, .dv3-select {
  width: 100%;
  background: var(--dv3-bg3);
  color: var(--dv3-text);
  border: 1px solid var(--dv3-border2);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 13px; line-height: 1.4;
  padding: 8px 11px;
}
.dv3-input::placeholder, .dv3-textarea::placeholder { color: var(--dv3-text4); }
.dv3-input:hover, .dv3-textarea:hover, .dv3-select:hover { border-color: var(--dv3-border-hi); }
.dv3-input:focus-visible, .dv3-textarea:focus-visible, .dv3-select:focus-visible {
  outline: 2px solid var(--dv3-accent); outline-offset: 1px; border-color: var(--dv3-accent);
}
.dv3-input:disabled, .dv3-textarea:disabled, .dv3-select:disabled {
  opacity: 0.5; cursor: not-allowed;
}
.dv3-textarea { resize: vertical; min-height: 96px; }
.dv3-input--num { max-width: 140px; font-variant-numeric: tabular-nums; }

/* BUTTONS */
.dv3-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font-family: inherit; font-size: 12px; letter-spacing: 0.06em;
  text-transform: uppercase; font-weight: 600;
  padding: 9px 16px; cursor: pointer;
  border: 1px solid var(--dv3-border2);
  background: var(--dv3-bg3); color: var(--dv3-text);
  transition: border-color 140ms ease, background 140ms ease, transform 120ms ease;
}
.dv3-btn:hover { border-color: var(--dv3-border-hi); }
.dv3-btn:active { transform: translateY(1px); }
.dv3-btn:focus-visible { outline: 2px solid var(--dv3-accent); outline-offset: 2px; }
.dv3-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
.dv3-btn--primary {
  background: var(--dv3-accent); border-color: var(--dv3-accent);
  color: var(--dv3-bg);
}
.dv3-btn--primary:hover { background: color-mix(in srgb, #fff 8%, var(--dv3-accent)); border-color: var(--dv3-accent); }
[data-theme="dark"] .dv3-btn--primary:hover { background: color-mix(in srgb, #000 12%, var(--dv3-accent)); }
.dv3-btn--danger { color: var(--dv3-zone-down); border-color: color-mix(in srgb, var(--dv3-zone-down) 45%, var(--dv3-border)); }
.dv3-btn--danger:hover { border-color: var(--dv3-zone-down); }
.dv3-btn-row { display: flex; gap: 10px; flex-wrap: wrap; }

/* FORM ACTION BAR — Save/Submit row at the foot of a form */
.dv3-form-actions {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin-top: 20px; padding-top: 16px;
  border-top: 1px solid var(--dv3-border);
}
.dv3-form-actions-spacer { flex: 1 1 auto; }
.dv3-form-actions-saved {
  font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--dv3-text3);
}

/* BANNER / CALLOUT */
.dv3-banner {
  border: 1px solid var(--dv3-border);
  border-left: 2px solid var(--dv3-zone-info);
  background: var(--dv3-bg2);
  padding: 12px 14px;
  font-size: 12px; line-height: 1.55; color: var(--dv3-text2);
}
.dv3-banner--warn { border-left-color: var(--dv3-zone-warn); }
.dv3-banner--error { border-left-color: var(--dv3-zone-down); color: var(--dv3-zone-down); }
.dv3-banner--ok { border-left-color: var(--dv3-zone-up); }

/* TOGGLE SWITCH (settings) */
.dv3-switch {
  appearance: none; -webkit-appearance: none;
  position: relative; width: 38px; height: 20px; flex: none;
  background: var(--dv3-bg3); border: 1px solid var(--dv3-border2);
  cursor: pointer; transition: background 160ms ease, border-color 160ms ease;
}
.dv3-switch::after {
  content: ""; position: absolute; top: 2px; left: 2px;
  width: 14px; height: 14px; background: var(--dv3-text3);
  transition: transform 160ms ease, background 160ms ease;
}
.dv3-switch:checked { background: var(--dv3-accent-bg); border-color: var(--dv3-accent); }
.dv3-switch:checked::after { transform: translateX(18px); background: var(--dv3-accent); }
.dv3-switch:focus-visible { outline: 2px solid var(--dv3-accent); outline-offset: 2px; }
.dv3-switch:disabled { opacity: 0.5; cursor: not-allowed; }

/* SETTINGS ROW — label/control split */
.dv3-setrow {
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  padding: 14px 0; border-bottom: 1px solid var(--dv3-border);
}
.dv3-setrow:last-child { border-bottom: none; }
.dv3-setrow-main { display: flex; flex-direction: column; gap: 3px; }
.dv3-setrow-title { font-size: 13px; color: var(--dv3-text); font-weight: 500; }
.dv3-setrow-desc { font-size: 11px; color: var(--dv3-text3); line-height: 1.45; }

@media (max-width: 640px) {
  .dv3-panel { padding: 16px; }
  .dv3-btn-row { flex-direction: column; }
  .dv3-btn-row .dv3-btn { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .dv3-btn, .dv3-switch, .dv3-switch::after { transition: none !important; }
}
`
