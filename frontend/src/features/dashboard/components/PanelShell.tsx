import type { ReactNode } from 'react'

export type PanelTone = 'ok' | 'warn' | 'crit' | 'accent'

export interface PanelShellProps {
  tone: PanelTone
  head: {
    icon: ReactNode
    title: string
    sub: string
    tag: string
  }
  stat: {
    value: ReactNode
    unit?: ReactNode
    trail?: ReactNode
  }
  viz: ReactNode
  peek?: ReactNode
  foot: {
    more: ReactNode
    cta: { label: string; onClick: () => void; icon?: ReactNode }
  }
  className?: string
}

export function PanelShell({ tone, head, stat, viz, peek, foot, className }: PanelShellProps) {
  return (
    <section className="psh-wrap" style={{ gridColumn: 'span 4' }}>
      <style>{PSH_CSS}</style>
      <article className={`psh-card tone-${tone}${className ? ' ' + className : ''}`}>
        <div className="psh-head">
          <div className="psh-ico">{head.icon}</div>
          <div className="psh-ht">
            <div className="lbl">{head.title}</div>
            <div className="sub">{head.sub}</div>
          </div>
          <span className="psh-tag">{head.tag}</span>
        </div>

        <div className="psh-stat">
          <b>{stat.value}</b>
          {stat.unit !== undefined && <span className="of">{stat.unit}</span>}
          {stat.trail !== undefined && <span className="tr">{stat.trail}</span>}
        </div>

        <div className="psh-viz">{viz}</div>

        <div className="psh-peek">{peek}</div>

        <div className="psh-foot">
          <span className="more">{foot.more}</span>
          <button type="button" className="all" onClick={foot.cta.onClick}>
            {foot.cta.label}
            {foot.cta.icon}
          </button>
        </div>
      </article>
    </section>
  )
}

const PSH_CSS = `
.psh-wrap {
  --ps-surface: #ffffff;
  --ps-surface-2: #f2f5fa;
  --ps-surface-3: #e6ebf3;
  --ps-ink: #16202e;
  --ps-ink-2: #48566a;
  --ps-ink-3: #8893a6;
  --ps-border: #e1e7f0;
  --ps-border-2: #cfd8e6;
  --ps-accent: #2456a6;
  --ps-accent-soft: #e2eaf6;
  --ps-crit: #c2392b;
  --ps-crit-soft: #fbe9e6;
  --ps-crit-ink: #8f261b;
  --ps-warn: #b07d16;
  --ps-warn-soft: #fbf2da;
  --ps-warn-ink: #7e5908;
  --ps-ok: #2f8a52;
  --ps-ok-soft: #e6f3ea;
  --ps-ok-ink: #1f6b3d;
  --ps-info: #2c5cc5;
  --ps-info-soft: #e8eefb;
  --ps-info-ink: #1f4296;
  --ps-shadow-sm: 0 1px 2px rgba(14,23,38,.06), 0 1px 3px rgba(14,23,38,.05);
  --ps-shadow-md: 0 2px 6px rgba(14,23,38,.07), 0 8px 24px rgba(14,23,38,.06);
}
[data-theme="dark"] .psh-wrap {
  --ps-surface: #1a2433;
  --ps-surface-2: #20293a;
  --ps-surface-3: #2a3447;
  --ps-ink: #e6ecf5;
  --ps-ink-2: #aab6c8;
  --ps-ink-3: #7c8699;
  --ps-border: #2d3a51;
  --ps-border-2: #3a4660;
  --ps-accent-soft: rgba(36,86,166,0.22);
  --ps-crit-soft: rgba(194,57,43,0.18);
  --ps-warn-soft: rgba(176,125,22,0.18);
  --ps-ok-soft: rgba(47,138,82,0.20);
  --ps-info-soft: rgba(44,92,197,0.18);
}

.psh-wrap .psh-card {
  width: 100%;
  background: var(--ps-surface);
  border: 1px solid var(--ps-border);
  border-top: 3px solid var(--ps-accent);
  border-radius: 4px;
  box-shadow: var(--ps-shadow-sm);
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  transition: box-shadow .14s, transform .14s, border-color .14s;
  font-family: var(--font-sans, 'Fira Sans', system-ui, sans-serif);
  color: var(--ps-ink);
  min-height: 360px;
}
.psh-wrap .psh-card.tone-ok { border-top-color: var(--ps-ok); }
.psh-wrap .psh-card.tone-warn { border-top-color: var(--ps-warn); }
.psh-wrap .psh-card.tone-crit { border-top-color: var(--ps-crit); }
.psh-wrap .psh-card.tone-accent { border-top-color: var(--ps-accent); }
.psh-wrap .psh-card:hover { box-shadow: var(--ps-shadow-md); transform: translateY(-1px); }
.psh-wrap :where(.ic) { display: inline-block; vertical-align: middle; }

.psh-wrap .psh-head {
  display: flex; align-items: center; gap: 11px;
  padding: 16px 18px 0;
  min-height: 50px;
  box-sizing: border-box;
}
.psh-wrap .psh-ico {
  width: 34px; height: 34px; border-radius: 9px;
  background: var(--ps-accent-soft); color: var(--ps-accent);
  display: grid; place-items: center; flex: none;
}
.psh-wrap .psh-card.tone-ok .psh-ico { background: var(--ps-ok-soft); color: var(--ps-ok); }
.psh-wrap .psh-card.tone-warn .psh-ico { background: var(--ps-warn-soft); color: var(--ps-warn); }
.psh-wrap .psh-card.tone-crit .psh-ico { background: var(--ps-crit-soft); color: var(--ps-crit); }
.psh-wrap .psh-ht { min-width: 0; flex: 1; }
.psh-wrap .psh-ht .lbl { font-size: 13px; font-weight: 600; line-height: 1.2; }
.psh-wrap .psh-ht .sub {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase;
  color: var(--ps-ink-3); margin-top: 2px;
}
.psh-wrap .psh-tag {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10px; font-weight: 600; letter-spacing: .04em;
  color: var(--ps-ink-3);
  border: 1px solid var(--ps-border-2);
  border-radius: 5px; padding: 2px 6px;
}

.psh-wrap .psh-stat {
  display: flex; align-items: flex-end; gap: 10px;
  padding: 13px 18px 12px;
  min-height: 70px;
  box-sizing: border-box;
}
.psh-wrap .psh-stat b {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 42px; font-weight: 600; line-height: .9; letter-spacing: -.02em;
}
.psh-wrap .psh-stat .of {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 14px; color: var(--ps-ink-3); margin-bottom: 5px;
}
.psh-wrap .psh-stat .tr {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 11.5px; font-weight: 600;
  margin-left: auto; margin-bottom: 7px;
}

.psh-wrap .psh-viz {
  padding: 0 18px 12px;
  min-height: 72px;
  box-sizing: border-box;
}

.psh-wrap .psh-peek {
  border-top: 1px solid var(--ps-border);
  display: flex; flex-direction: column;
  min-height: 0;
}

.psh-wrap .psh-foot {
  display: flex; align-items: center; gap: 9px;
  padding: 13px 18px;
  min-height: 48px;
  box-sizing: border-box;
}
.psh-wrap .psh-foot .more {
  font-size: 12px; color: var(--ps-ink-3);
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
}
.psh-wrap .psh-foot .all {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 600;
  color: var(--ps-accent);
  background: none; border: none; cursor: pointer;
  font-family: inherit; padding: 4px 0;
}
.psh-wrap .psh-foot .all .ic { transition: transform .14s; }
.psh-wrap .psh-foot .all:hover .ic { transform: translateX(2px); }

.psh-wrap .psh-peek .peek {
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 11px; align-items: center;
  padding: 11px 18px;
  border-bottom: 1px solid var(--ps-border);
  transition: background .12s; position: relative;
  min-height: 56px;
  box-sizing: border-box;
  outline: none;
}
.psh-wrap .psh-peek .peek:last-child { border-bottom: none; }
.psh-wrap .psh-peek .peek[role="button"] { cursor: pointer; }
.psh-wrap .psh-peek .peek[role="button"]:hover { background: var(--ps-surface-2); }
.psh-wrap .psh-peek .peek[role="button"]:focus-visible {
  background: var(--ps-surface-2); box-shadow: inset 0 0 0 2px var(--ps-accent);
}
.psh-wrap .psh-peek .peek::before {
  content: ""; position: absolute; left: 0; top: 9px; bottom: 9px;
  width: 3px; border-radius: 0 3px 3px 0; background: var(--ps-ink-3);
}
.psh-wrap .psh-peek .peek.ok::before { background: var(--ps-ok); }
.psh-wrap .psh-peek .peek.warn::before { background: var(--ps-warn); }
.psh-wrap .psh-peek .peek.crit::before { background: var(--ps-crit); }
.psh-wrap .psh-peek .peek.info::before { background: var(--ps-info); }
.psh-wrap .psh-peek .peek.empty { pointer-events: none; }
.psh-wrap .psh-peek .peek.empty::before { background: transparent; }
.psh-wrap .psh-peek .peek .pk-ico {
  width: 28px; height: 28px; border-radius: 7px;
  display: grid; place-items: center; background: var(--ps-surface-3);
  flex: none; color: var(--ps-ink-2);
}
.psh-wrap .psh-peek .peek.ok .pk-ico { background: var(--ps-ok-soft); color: var(--ps-ok); }
.psh-wrap .psh-peek .peek.warn .pk-ico { background: var(--ps-warn-soft); color: var(--ps-warn); }
.psh-wrap .psh-peek .peek.crit .pk-ico { background: var(--ps-crit-soft); color: var(--ps-crit); }
.psh-wrap .psh-peek .peek.info .pk-ico { background: var(--ps-info-soft); color: var(--ps-info); }
.psh-wrap .psh-peek .peek .pk-mid { min-width: 0; display: flex; flex-direction: column; }
.psh-wrap .psh-peek .peek .pk-t {
  font-size: 13px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.psh-wrap .psh-peek .peek .pk-m {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10.5px; letter-spacing: .03em; color: var(--ps-ink-3);
  text-transform: uppercase; margin-top: 1px;
}
.psh-wrap .psh-peek .peek .pk-right {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 12px; font-weight: 600; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 6px;
  background: var(--ps-surface-3); color: var(--ps-ink-2);
}
.psh-wrap .psh-peek .peek.ok .pk-right { background: var(--ps-ok-soft); color: var(--ps-ok-ink); }
.psh-wrap .psh-peek .peek.warn .pk-right { background: var(--ps-warn-soft); color: var(--ps-warn-ink); }
.psh-wrap .psh-peek .peek.crit .pk-right { background: var(--ps-crit-soft); color: var(--ps-crit-ink); }
.psh-wrap .psh-peek .peek.info .pk-right { background: transparent; color: var(--ps-ink-3); padding: 0; }
`
