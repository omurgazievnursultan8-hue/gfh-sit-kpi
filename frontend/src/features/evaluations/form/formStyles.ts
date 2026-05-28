export const FORM_CSS = `
.efm-shell {
  max-width: 880px;
  margin: 0 auto;
  padding: 24px 24px 120px;
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  color: var(--dv3-text);
  min-height: 100vh;
  position: relative;
}
.efm-topbar {
  position: sticky; top: 0; z-index: 5;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px;
  background: var(--dv3-bg);
  border-bottom: 1px solid var(--dv3-border);
  margin: -24px -24px 32px;
  font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.efm-back { background: none; border: 0; color: inherit; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; padding: 0; }
.efm-back:hover { color: var(--dv3-accent); }

.efm-phase-tag {
  display: flex; align-items: center; gap: 10px;
  font-size: 10px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--dv3-text3);
  margin-bottom: 8px;
}
.efm-phase-tag::before { content: ''; width: 28px; height: 1px; background: var(--dv3-text4); }
.efm-phase-tag.is-anti { color: var(--dv3-zone-down); }
.efm-phase-tag.is-anti::before { background: var(--dv3-zone-down); }

.efm-step-dots { display: flex; gap: 6px; margin-bottom: 24px; flex-wrap: wrap; }
.efm-step-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--dv3-bg3); border: 1px solid var(--dv3-border);
  transition: background .15s;
}
.efm-step-dot.is-done { background: var(--dv3-accent); border-color: var(--dv3-accent); }
.efm-step-dot.is-current { background: var(--dv3-text); border-color: var(--dv3-text); transform: scale(1.25); }
.efm-step-dot.is-anti.is-done { background: var(--dv3-zone-down); border-color: var(--dv3-zone-down); }

.efm-criterion-tag {
  font-size: 10px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--dv3-text3); margin-bottom: 12px;
}
.efm-criterion-name {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: clamp(32px, 4.5vw, 48px);
  letter-spacing: -0.02em; line-height: 1.05;
  color: var(--dv3-text);
  margin: 0 0 16px;
  max-width: 24ch;
}
.efm-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 32px; }
.efm-chip {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 9px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
  padding: 3px 8px;
  border: 1px solid var(--dv3-border);
}
.efm-chip--w { color: var(--dv3-text); border-color: var(--dv3-border-hi); }
.efm-chip--anti { color: var(--dv3-zone-down); border-color: var(--dv3-zone-down); }
.efm-chip--auto { color: var(--dv3-zone-info); border-color: var(--dv3-zone-info); }

.efm-rubric {
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 16px; line-height: 1.6;
  color: var(--dv3-text2);
  max-width: 60ch;
  margin: 0 0 32px;
  padding: 16px 0;
  border-top: 1px solid var(--dv3-border);
  border-bottom: 1px solid var(--dv3-border);
}
.efm-rubric-empty {
  font-style: italic; color: var(--dv3-text4);
  font-size: 13px;
}

.efm-label {
  display: block;
  font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--dv3-text3);
  margin-bottom: 12px;
}

.efm-presets { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.efm-preset {
  min-width: 64px;
  padding: 12px 14px;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  color: var(--dv3-text2);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 12px; letter-spacing: .04em;
  cursor: pointer;
  transition: all .12s;
}
.efm-preset:hover:not(:disabled) { border-color: var(--dv3-border-hi); color: var(--dv3-text); }
.efm-preset.is-selected {
  background: var(--dv3-accent); border-color: var(--dv3-accent); color: var(--dv3-bg);
}
.efm-page[data-phase="antibonus"] .efm-preset.is-selected {
  background: var(--dv3-zone-down); border-color: var(--dv3-zone-down);
}
.efm-preset:disabled { opacity: .4; cursor: not-allowed; }
.efm-preset:focus-visible {
  outline: 2px solid var(--dv3-accent); outline-offset: 2px;
}

.efm-custom-num {
  width: 140px; padding: 12px 14px;
  background: var(--dv3-bg);
  border: 1px solid var(--dv3-border);
  color: var(--dv3-text);
  font: italic 22px/1 'EB Garamond', Georgia, serif;
  text-align: right;
  font-variant-numeric: tabular-nums;
  margin-bottom: 16px;
}
.efm-custom-num:focus { border-color: var(--dv3-accent); outline: none; }
.efm-page[data-phase="antibonus"] .efm-custom-num:focus { border-color: var(--dv3-zone-down); }

.efm-readout {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 36px; line-height: 1;
  color: var(--dv3-accent);
  margin-bottom: 32px;
}
.efm-readout.is-pending { color: var(--dv3-text4); font-size: 14px; letter-spacing: .22em; text-transform: uppercase; font-style: normal; }
.efm-page[data-phase="antibonus"] .efm-readout { color: var(--dv3-zone-down); }

.efm-note {
  width: 100%;
  min-height: 60px;
  padding: 12px 14px;
  background: transparent;
  border: 1px dashed var(--dv3-border);
  color: var(--dv3-text);
  font: 13px/1.5 'Geist Mono', ui-monospace, Menlo, monospace;
  outline: none;
  resize: vertical;
  transition: border-color .15s;
  margin-bottom: 32px;
}
.efm-note:focus { border-color: var(--dv3-accent); border-style: solid; }
.efm-note.is-error { border-color: var(--dv3-zone-warn); border-style: solid; }
.efm-note-error {
  font-size: 11px; color: var(--dv3-zone-warn); margin-top: -24px; margin-bottom: 32px;
}

.efm-files-drop {
  border: 1px dashed var(--dv3-border);
  padding: 24px;
  text-align: center;
  font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
  cursor: pointer;
  transition: border-color .15s, background .15s;
  margin-bottom: 12px;
}
.efm-files-drop.is-drag { border-color: var(--dv3-accent); background: var(--dv3-accent-bg); }
.efm-file-row {
  display: grid; grid-template-columns: 1fr auto auto;
  gap: 12px; align-items: center;
  padding: 8px 0;
  border-bottom: 1px dashed var(--dv3-border);
  font-size: 12px;
}
.efm-file-row:last-child { border-bottom: 0; }
.efm-file-del { background: none; border: 0; color: var(--dv3-text3); cursor: pointer; padding: 4px; }
.efm-file-del:hover { color: var(--dv3-zone-down); }

.efm-bottombar {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: grid; grid-template-columns: auto 1fr auto auto;
  gap: 12px; align-items: center;
  padding: 12px 24px;
  background: var(--dv3-bg);
  border-top: 1px solid var(--dv3-border);
  z-index: 6;
}
.efm-bottombar-status {
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3); text-align: center;
}
.efm-bottombar-status strong {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace; color: var(--dv3-text); letter-spacing: 0;
}
.efm-bb-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  font: 12px/1 'Geist Mono', ui-monospace, Menlo, monospace;
  letter-spacing: .18em; text-transform: uppercase;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg);
  color: var(--dv3-text);
  cursor: pointer;
}
.efm-bb-btn:disabled { opacity: .4; cursor: not-allowed; }
.efm-bb-btn--primary { background: var(--dv3-accent); border-color: var(--dv3-accent); color: var(--dv3-bg); }
.efm-page[data-phase="antibonus"] .efm-bb-btn--primary { background: var(--dv3-zone-down); border-color: var(--dv3-zone-down); }

.efm-drawer-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 7;
  opacity: 0; transition: opacity .2s;
  pointer-events: none;
}
.efm-drawer-backdrop.is-open { opacity: 1; pointer-events: auto; }
.efm-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 360px; max-width: 100%;
  background: var(--dv3-bg);
  border-left: 1px solid var(--dv3-border);
  transform: translateX(100%);
  transition: transform .25s ease;
  z-index: 8;
  overflow-y: auto;
}
.efm-drawer.is-open { transform: translateX(0); }

.efm-shortcuts {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.5); z-index: 10; padding: 24px;
}
.efm-shortcuts-card {
  background: var(--dv3-bg); border: 1px solid var(--dv3-border); padding: 32px; max-width: 480px;
}

@media (prefers-reduced-motion: reduce) {
  .efm-drawer, .efm-drawer-backdrop { transition: none; }
  .efm-preset { transition: none; }
}
@media (max-width: 640px) {
  .efm-shell { padding: 16px 16px 100px; }
  .efm-topbar { padding: 10px 16px; margin: -16px -16px 24px; }
  .efm-bottombar { padding: 10px 12px; }
  .efm-preset { min-width: 56px; padding: 10px 12px; }
  .efm-criterion-name { font-size: 28px; }
}
`
