import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Users, UserX, ChevronRight } from 'lucide-react'
import { OrgUnit } from '../api'

const TYPE_LABEL: Record<OrgUnit['type'], string> = {
  BLOCK: 'BLOCK',
  DEPARTMENT: 'DEPT',
  SLUZHBA: 'SLUZH',
  OTDEL: 'OTDEL',
  SEKTOR: 'SECT',
}

const TYPE_COLOR: Record<OrgUnit['type'], string> = {
  BLOCK: 'var(--dv3-zone-warn)',
  DEPARTMENT: 'var(--dv3-zone-info)',
  SLUZHBA: 'var(--dv3-zone-info)',
  OTDEL: 'var(--dv3-zone-up)',
  SEKTOR: 'var(--dv3-zone-up)',
}

interface Data {
  unit: OrgUnit
  headName: string | null
  selected: boolean
  depth: number
  dimmed?: boolean
  highlighted?: boolean
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

// Stable hue from id → consistent per-person avatar tint.
function hueFromId(id: number): number {
  let h = id * 2654435761 % 360
  if (h < 0) h += 360
  return h
}

function OrgNodeCardImpl({ data }: NodeProps<Data>) {
  const { unit, headName, selected, dimmed, highlighted } = data
  const rail = TYPE_COLOR[unit.type]
  const vacant = !headName

  const avatarBg = vacant
    ? 'var(--dv3-bg3)'
    : `hsl(${hueFromId(unit.headUserId!)} 38% 92%)`
  const avatarFg = vacant
    ? 'var(--dv3-text3)'
    : `hsl(${hueFromId(unit.headUserId!)} 55% 28%)`

  return (
    <div
      className={`org-card ${selected ? 'org-card--sel' : ''} ${dimmed ? 'org-card--dim' : ''} ${highlighted ? 'org-card--hit' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="org-card-handle" />
      <span className="org-card-rail" style={{ background: rail }} />

      <div className="org-card-row">
        <div
          className="org-card-avatar"
          style={{ borderColor: rail, background: avatarBg, color: avatarFg }}
        >
          {vacant ? <UserX size={14} /> : initials(headName!)}
          {vacant && <span className="org-card-vac-dot" />}
        </div>

        <div className="org-card-main">
          <div className="org-card-name" title={unit.nameRu}>{unit.nameRuShort || unit.nameRu}</div>
          <div className="org-card-meta">
            <span className="org-card-type" style={{ color: rail }}>{TYPE_LABEL[unit.type]}</span>
            <span className="org-card-dot">·</span>
            <span className="org-card-children" title="Сотрудников (всего)">
              <Users size={10} /> {unit.headcountTotal}
            </span>
            {vacant && (
              <>
                <span className="org-card-dot">·</span>
                <span className="org-card-vac">VAC</span>
              </>
            )}
          </div>
        </div>

        <ChevronRight size={12} className="org-card-chev" />
      </div>

      {/* Hover popover — full detail */}
      <div className="org-card-pop">
        <div className="org-card-pop-title">{unit.nameRu}</div>
        {unit.nameKg && unit.nameKg !== unit.nameRu && (
          <div className="org-card-pop-sub">{unit.nameKg}</div>
        )}
        <div className="org-card-pop-row">
          <span>Тип</span><span style={{ color: rail }}>{TYPE_LABEL[unit.type]}</span>
        </div>
        {unit.code && (
          <div className="org-card-pop-row">
            <span>Код</span><span style={{ fontFamily: 'monospace' }}>{unit.code}</span>
          </div>
        )}
        <div className="org-card-pop-row">
          <span>Руководитель</span>
          <span style={{ color: vacant ? 'var(--dv3-zone-warn)' : 'var(--dv3-text)' }}>
            {headName ?? 'не назначен'}
          </span>
        </div>
        <div className="org-card-pop-row">
          <span>Дочерних</span><span>{unit.children.length}</span>
        </div>
        <div className="org-card-pop-row">
          <span>Сотрудников</span>
          <span>{unit.headcountDirect} / {unit.headcountTotal}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="org-card-handle" />
    </div>
  )
}

export const OrgNodeCard = memo(OrgNodeCardImpl)

export const ORG_NODE_CSS = `
.org-canvas-wrap {
  position: relative;
  height: calc(100vh - 200px);
  min-height: 520px;
  background: var(--dv3-bg);
  border: 1px solid var(--dv3-border);
  border-radius: 12px;
  overflow: hidden;
}

.react-flow__renderer { background: transparent; }
.react-flow__attribution { display: none !important; }

.react-flow__edge-path {
  transition: stroke-opacity 160ms ease, stroke-width 160ms ease;
}
.react-flow__edge.animated .react-flow__edge-path {
  stroke-dasharray: 6 4;
}
.react-flow__edge:hover .react-flow__edge-path {
  stroke-opacity: 1 !important;
  stroke-width: 1.5 !important;
}

.org-card {
  position: relative;
  width: 220px;
  min-height: 76px;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 12px;
  padding: 12px 14px;
  color: var(--dv3-text);
  transition: border-color 120ms ease, box-shadow 120ms ease;
  cursor: pointer;
}
.org-card:hover {
  border-color: var(--dv3-border2);
  box-shadow: 0 6px 16px -8px rgba(0,0,0,0.18);
  z-index: 5;
}
.org-card--sel {
  border-color: var(--dv3-accent);
  box-shadow: 0 0 0 2px var(--dv3-accent-bg);
}
.org-card--dim {
  opacity: 0.35;
}
.org-card--dim:hover { opacity: 0.9; }
.org-card--hit {
  border-color: var(--dv3-zone-up);
}

.org-card-rail {
  position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px;
  border-radius: 2px;
}

.org-card-handle {
  width: 6px !important; height: 6px !important;
  background: var(--dv3-accent) !important;
  border: none !important;
  opacity: 0;
}

.org-card-row { display: flex; align-items: center; gap: 10px; padding-left: 6px; }

.org-card-avatar {
  position: relative;
  width: 36px; height: 36px;
  border: 1px solid var(--dv3-border2);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
  flex-shrink: 0;
}
.org-card-vac-dot {
  position: absolute; top: -2px; right: -2px;
  width: 8px; height: 8px;
  background: var(--dv3-zone-warn);
  border: 1.5px solid var(--dv3-bg2);
  border-radius: 50%;
}

.org-card-main { flex: 1; min-width: 0; }
.org-card-name {
  font-size: 13px; font-weight: 600; color: var(--dv3-text);
  line-height: 1.3;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.org-card-meta {
  margin-top: 4px;
  display: flex; align-items: center; gap: 6px;
  font-size: 11px;
  color: var(--dv3-text3);
}
.org-card-type { font-weight: 600; }
.org-card-dot { color: var(--dv3-text4); }
.org-card-children { display: inline-flex; align-items: center; gap: 3px; }
.org-card-vac { color: var(--dv3-zone-warn); font-weight: 600; }

.org-card-chev {
  color: var(--dv3-text4);
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 120ms ease;
}
.org-card:hover .org-card-chev,
.org-card--sel .org-card-chev {
  opacity: 1;
  color: var(--dv3-accent);
}

/* Hover popover — flat surface */
.org-card-pop {
  position: absolute;
  left: 100%;
  top: -4px;
  margin-left: 10px;
  width: 220px;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 10px;
  padding: 10px 12px;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 140ms ease, transform 140ms ease;
  z-index: 20;
  box-shadow: 0 10px 24px -10px rgba(0,0,0,0.2);
}
.org-card:hover .org-card-pop {
  opacity: 1;
  transform: translateX(0);
}
.org-card-pop-title {
  font-size: 12.5px; font-weight: 600; color: var(--dv3-text);
  line-height: 1.3;
}
.org-card-pop-sub {
  font-size: 11px; color: var(--dv3-text3);
  margin-top: 2px;
}
.org-card-pop-row {
  display: flex; justify-content: space-between; align-items: baseline;
  gap: 8px;
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--dv3-text3);
}
.org-card-pop-row > span:first-child {
  color: var(--dv3-text4);
}
.org-card-pop-row > span:last-child {
  color: var(--dv3-text); font-weight: 500;
  text-align: right;
}

.org-canvas-controls {
  background: var(--dv3-bg2) !important;
  border: 1px solid var(--dv3-border) !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px -6px rgba(0,0,0,0.12) !important;
  overflow: hidden;
}
.org-canvas-controls button {
  background: var(--dv3-bg2) !important;
  border-bottom: 1px solid var(--dv3-border) !important;
  color: var(--dv3-text2) !important;
  fill: var(--dv3-text2) !important;
}
.org-canvas-controls button:hover {
  background: var(--dv3-bg3) !important;
  color: var(--dv3-accent) !important;
  fill: var(--dv3-accent) !important;
}

.org-canvas-minimap {
  background: var(--dv3-bg2) !important;
  border: 1px solid var(--dv3-border) !important;
  border-radius: 8px !important;
}

/* === Floating HUD — flat surface === */
.org-hud {
  position: absolute;
  z-index: 8;
  pointer-events: auto;
}
.org-hud--tl {
  top: 16px; left: 16px; width: 340px; max-width: calc(100% - 32px);
}
.org-hud--tc {
  top: 16px; left: 50%; transform: translateX(-50%);
  max-width: calc(100% - 380px);
}

.org-hud-search {
  position: relative;
  display: flex; align-items: center;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 10px;
  padding: 0 8px 0 30px;
  box-shadow: 0 4px 12px -6px rgba(0,0,0,0.12);
}
.org-hud-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--dv3-text3);
}
.org-hud-input {
  flex: 1;
  background: transparent;
  border: none; outline: none;
  padding: 9px 0;
  font-family: inherit;
  font-size: 13px;
  color: var(--dv3-text);
}
.org-hud-input::placeholder { color: var(--dv3-text4); }
.org-hud-clear {
  background: transparent;
  border: none;
  color: var(--dv3-text3);
  cursor: pointer;
  padding: 4px;
  display: flex; align-items: center;
  border-radius: 4px;
}
.org-hud-clear:hover { color: var(--dv3-accent); }

.org-hud-chips {
  margin-top: 8px;
  display: flex; flex-wrap: wrap; gap: 4px;
}
.org-chip {
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 999px;
  color: var(--dv3-text2);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 10px;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
}
.org-chip:hover { color: var(--dv3-text); border-color: var(--dv3-border2); }
.org-chip--on {
  background: var(--dv3-accent-bg);
  border-color: var(--dv3-accent);
  color: var(--dv3-accent);
}

.org-hud-result {
  margin-top: 6px;
  font-size: 11px;
  color: var(--dv3-text4);
  padding-left: 4px;
}

/* === Breadcrumb HUD === */
.org-bc {
  display: flex; align-items: center; gap: 6px;
  background: var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 10px;
  padding: 7px 12px;
  box-shadow: 0 4px 12px -6px rgba(0,0,0,0.12);
  max-width: 100%;
  overflow: hidden;
}
.org-bc-seg { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.org-bc-btn {
  background: transparent; border: none; padding: 0;
  font-family: inherit;
  font-size: 12px;
  color: var(--dv3-text3);
  cursor: pointer;
  max-width: 180px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  transition: color 120ms ease;
}
.org-bc-btn:hover { color: var(--dv3-accent); }
.org-bc-btn--cur { color: var(--dv3-text); font-weight: 600; cursor: default; }
.org-bc-btn--cur:hover { color: var(--dv3-text); }
.org-bc-sep { color: var(--dv3-text4); flex-shrink: 0; }

@media (max-width: 720px) {
  .org-hud--tc { display: none; }
  .org-hud--tl { width: calc(100% - 32px); }
}
`
