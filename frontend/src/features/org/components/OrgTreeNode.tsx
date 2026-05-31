import { ChevronRight, ChevronDown } from 'lucide-react'
import { OrgUnit } from '../api'

const TYPE_LABELS: Record<OrgUnit['type'], string> = {
  BLOCK: 'Блок',
  DEPARTMENT: 'Департ.',
  SLUZHBA: 'Служба',
  OTDEL: 'Отдел',
  SEKTOR: 'Сектор',
}

const TYPE_ACCENT: Record<OrgUnit['type'], { bg: string; fg: string; border: string; rail: string }> = {
  BLOCK:      { bg: 'var(--gold-soft)',       fg: 'var(--gold)', border: 'color-mix(in srgb,var(--gold) 30%,transparent)', rail: 'var(--gold)' },
  DEPARTMENT: { bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7',     border: 'rgba(120,150,200,0.32)',                          rail: '#4a73c7' },
  SLUZHBA:    { bg: 'rgba(120,100,220,0.14)', fg: '#5e4ec2',     border: 'rgba(120,100,220,0.32)',                          rail: '#5e4ec2' },
  OTDEL:      { bg: 'rgba(120,200,150,0.14)', fg: '#2f9e6d',     border: 'rgba(120,200,150,0.32)',                          rail: '#2f9e6d' },
  SEKTOR:     { bg: 'rgba(180,100,180,0.14)', fg: '#a04ea0',     border: 'rgba(180,100,180,0.32)',                          rail: '#a04ea0' },
}

interface Props {
  node: OrgUnit
  isAdmin: boolean
  outline: string
  expanded: Set<number>
  selectedId: number | null
  toggleExpanded: (id: number) => void
  onSelect: (node: OrgUnit) => void
  depth?: number
}

export function OrgTreeNode({
  node, isAdmin, outline, expanded, selectedId, toggleExpanded, onSelect, depth = 0,
}: Props) {
  const isExpanded = expanded.has(node.id)
  const hasChildren = node.children.length > 0
  const accent = TYPE_ACCENT[node.type]
  const selected = selectedId === node.id

  return (
    <div style={{ marginLeft: depth > 0 ? 18 : 0, position: 'relative' }}>
      {depth > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -10, top: 0, bottom: 0,
            borderLeft: '1px solid var(--line-soft)',
          }}
        />
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node) } }}
        className="org-row flex items-center gap-2.5"
        style={{
          padding: '7px 8px 7px 6px',
          borderRadius: 5,
          margin: '1px 0',
          position: 'relative',
          cursor: 'pointer',
          background: selected ? 'var(--accent-mute)' : 'transparent',
          transition: 'background 120ms ease',
          opacity: node.archivedAt ? 0.55 : 1,
        }}
      >
        {selected && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: -2, top: 5, bottom: 5,
              width: 3, borderRadius: 2,
              background: accent.rail,
            }}
          />
        )}

        <button
          onClick={e => { e.stopPropagation(); if (hasChildren) toggleExpanded(node.id) }}
          aria-label={hasChildren ? (isExpanded ? 'Свернуть' : 'Развернуть') : undefined}
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 16, height: 16,
            color: hasChildren ? 'var(--ink-soft)' : 'var(--ink-dim)',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: hasChildren ? 'pointer' : 'default',
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
          ) : (
            <span style={{ width: 4, height: 4, borderRadius: 1, background: 'var(--line-strong)' }} />
          )}
        </button>

        <span
          className="font-mono flex-shrink-0"
          style={{
            fontSize: 10,
            color: selected ? 'var(--accent)' : 'var(--ink-dim)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            minWidth: outline.length * 6.5,
          }}
        >
          {outline}
        </span>

        <span
          className="font-mono font-semibold uppercase tracking-widest flex-shrink-0"
          style={{
            fontSize: 9, padding: '1.5px 6px', borderRadius: 3,
            background: accent.bg, color: accent.fg, border: `1px solid ${accent.border}`,
          }}
        >
          {TYPE_LABELS[node.type]}
        </span>

        {node.archivedAt && (
          <span
            className="font-mono uppercase tracking-widest flex-shrink-0"
            style={{
              fontSize: 9, padding: '1.5px 6px', borderRadius: 3,
              background: 'rgba(160,160,160,0.18)', color: 'var(--ink-dim)',
              border: '1px solid var(--line-soft)',
            }}
            title={`Архивировано: ${new Date(node.archivedAt).toLocaleDateString('ru-RU')}`}
          >
            Архив
          </span>
        )}

        <span
          className="font-display truncate flex-1"
          style={{
            fontSize: 13.5,
            fontWeight: selected ? 600 : 500,
            color: 'var(--ink)',
          }}
        >
          {node.nameRu}
        </span>

        {hasChildren && (
          <span
            className="font-mono flex-shrink-0"
            style={{ fontSize: 10, color: 'var(--ink-dim)' }}
          >
            {node.children.length}
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <OrgTreeNode
              key={child.id}
              node={child}
              isAdmin={isAdmin}
              outline={`${outline}.${i + 1}`}
              expanded={expanded}
              selectedId={selectedId}
              toggleExpanded={toggleExpanded}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
