import { useEffect, useMemo, useState, useRef } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Search, X, ChevronRight } from 'lucide-react'
import { OrgUnit } from '../orgApi'
import { OrgNodeCard, ORG_NODE_CSS } from './OrgNodeCard'

interface Props {
  tree: OrgUnit[]
  selectedId: number | null
  onSelect: (id: number) => void
  headLookup: Map<number, string>
}

type TypeFilter = 'ALL' | 'BLOCK' | 'DEPARTMENT' | 'UNIT' | 'VACANT'

const TYPE_FILTER_LABEL: Record<TypeFilter, string> = {
  ALL: 'Все',
  BLOCK: 'Блоки',
  DEPARTMENT: 'Отделы',
  UNIT: 'Подразделения',
  VACANT: 'Вакантные',
}

const NODE_W = 220
const NODE_H = 76
const X_GAP = 28
const Y_GAP = 80

interface Laid {
  node: OrgUnit
  depth: number
  x: number
  y: number
  width: number
}

function layout(tree: OrgUnit[]): Laid[] {
  const out: Laid[] = []

  function measure(node: OrgUnit, depth: number): number {
    if (node.children.length === 0) return NODE_W
    let total = 0
    for (const c of node.children) total += measure(c, depth + 1)
    total += X_GAP * (node.children.length - 1)
    return Math.max(NODE_W, total)
  }

  function place(node: OrgUnit, depth: number, xStart: number): number {
    const width = measure(node, depth)
    const cx = xStart + width / 2
    out.push({ node, depth, x: cx - NODE_W / 2, y: depth * (NODE_H + Y_GAP), width })

    let cursor = xStart
    for (const c of node.children) {
      const cw = measure(c, depth + 1)
      place(c, depth + 1, cursor)
      cursor += cw + X_GAP
    }
    return width
  }

  let cursor = 0
  for (const root of tree) {
    const w = measure(root, 0)
    place(root, 0, cursor)
    cursor += w + X_GAP * 2
  }
  return out
}

function ancestorPath(tree: OrgUnit[], targetId: number): OrgUnit[] {
  const path: OrgUnit[] = []
  function dfs(node: OrgUnit, trail: OrgUnit[]): boolean {
    const next = [...trail, node]
    if (node.id === targetId) {
      path.push(...next)
      return true
    }
    for (const c of node.children) if (dfs(c, next)) return true
    return false
  }
  for (const r of tree) if (dfs(r, [])) break
  return path
}

function nodeMatches(unit: OrgUnit, headName: string | null, query: string, filter: TypeFilter): boolean {
  if (filter !== 'ALL') {
    if (filter === 'VACANT') {
      if (unit.headUserId) return false
    } else if (unit.type !== filter) return false
  }
  if (!query) return true
  const q = query.toLowerCase()
  if (unit.nameRu.toLowerCase().includes(q)) return true
  if (unit.nameKg && unit.nameKg.toLowerCase().includes(q)) return true
  if (headName && headName.toLowerCase().includes(q)) return true
  return false
}

interface BuildArgs {
  tree: OrgUnit[]
  selectedId: number | null
  headLookup: Map<number, string>
  query: string
  filter: TypeFilter
}

function buildGraph({ tree, selectedId, headLookup, query, filter }: BuildArgs): {
  nodes: Node[]
  edges: Edge[]
  matchIds: number[]
} {
  const laid = layout(tree)
  const branchArr = selectedId != null ? ancestorPath(tree, selectedId) : []
  const branch = new Set(branchArr.map(n => n.id))

  const filtering = query.length > 0 || filter !== 'ALL'
  const matchIds: number[] = []

  const nodes: Node[] = laid.map(l => {
    const headName = l.node.headUserId ? headLookup.get(l.node.headUserId) ?? null : null
    const match = nodeMatches(l.node, headName, query, filter)
    if (filtering && match) matchIds.push(l.node.id)
    return {
      id: String(l.node.id),
      type: 'orgCard',
      position: { x: l.x, y: l.y },
      data: {
        unit: l.node,
        headName,
        selected: l.node.id === selectedId,
        depth: l.depth,
        dimmed: filtering && !match,
        highlighted: filtering && match,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      draggable: false,
      selectable: true,
    }
  })

  const edges: Edge[] = []
  function walk(node: OrgUnit) {
    for (const c of node.children) {
      const onBranch = branch.has(node.id) && branch.has(c.id)
      edges.push({
        id: `e-${node.id}-${c.id}`,
        source: String(node.id),
        target: String(c.id),
        type: 'smoothstep',
        animated: onBranch,
        style: {
          stroke: 'var(--dv3-accent)',
          strokeOpacity: onBranch ? 1 : 0.3,
          strokeWidth: onBranch ? 1.5 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'var(--dv3-accent)',
          width: 12,
          height: 12,
        },
      })
      walk(c)
    }
  }
  for (const r of tree) walk(r)

  return { nodes, edges, matchIds }
}

const nodeTypes = { orgCard: OrgNodeCard }

function OrgCanvasInner({ tree, selectedId, onSelect, headLookup }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<TypeFilter>('ALL')

  const graph = useMemo(
    () => buildGraph({ tree, selectedId, headLookup, query, filter }),
    [tree, selectedId, headLookup, query, filter],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges)
  const { fitView, setCenter, getNode } = useReactFlow()

  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [graph, setNodes, setEdges])

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 80)
    return () => clearTimeout(t)
  }, [tree.length, fitView])

  useEffect(() => {
    if (selectedId == null) return
    const n = getNode(String(selectedId))
    if (!n) return
    setCenter(n.position.x + NODE_W / 2, n.position.y + NODE_H / 2, { zoom: 1, duration: 450 })
  }, [selectedId, getNode, setCenter])

  // Auto-center first match when search/filter narrows.
  const lastJumpKey = useRef<string>('')
  useEffect(() => {
    if (graph.matchIds.length === 0) return
    const key = `${query}|${filter}|${graph.matchIds[0]}`
    if (key === lastJumpKey.current) return
    lastJumpKey.current = key
    const firstId = graph.matchIds[0]
    const n = getNode(String(firstId))
    if (n) setCenter(n.position.x + NODE_W / 2, n.position.y + NODE_H / 2, { zoom: 1, duration: 380 })
  }, [graph.matchIds, query, filter, getNode, setCenter])

  const breadcrumbs = selectedId != null ? ancestorPath(tree, selectedId) : []

  return (
    <div className="org-canvas-wrap">
      <style>{ORG_NODE_CSS}</style>

      {/* Top-left HUD: search + filters */}
      <div className="org-hud org-hud--tl">
        <div className="org-hud-search">
          <Search size={12} className="org-hud-search-icon" />
          <input
            className="org-hud-input"
            placeholder="Поиск по названию или руководителю…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="org-hud-clear" onClick={() => setQuery('')} aria-label="Очистить">
              <X size={11} />
            </button>
          )}
        </div>
        <div className="org-hud-chips">
          {(Object.keys(TYPE_FILTER_LABEL) as TypeFilter[]).map(t => (
            <button
              key={t}
              className={`org-chip ${filter === t ? 'org-chip--on' : ''}`}
              onClick={() => setFilter(t)}
            >
              {TYPE_FILTER_LABEL[t]}
            </button>
          ))}
        </div>
        {(query || filter !== 'ALL') && (
          <div className="org-hud-result">
            {graph.matchIds.length} {graph.matchIds.length === 1 ? 'совпадение' : 'совпадений'}
          </div>
        )}
      </div>

      {/* Top-center HUD: breadcrumb */}
      {breadcrumbs.length > 0 && (
        <div className="org-hud org-hud--tc">
          <div className="org-bc">
            {breadcrumbs.map((n, i) => {
              const last = i === breadcrumbs.length - 1
              return (
                <span key={n.id} className="org-bc-seg">
                  <button
                    className={`org-bc-btn ${last ? 'org-bc-btn--cur' : ''}`}
                    onClick={() => onSelect(n.id)}
                    title={n.nameRu}
                  >
                    {n.nameRu}
                  </button>
                  {!last && <ChevronRight size={10} className="org-bc-sep" />}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => onSelect(Number(n.id))}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        panOnScroll
        panOnDrag
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--dv3-border2)" />
        <Controls showInteractive={false} className="org-canvas-controls" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.6)"
          nodeColor={n => (n.data?.selected ? 'var(--dv3-accent)' : n.data?.highlighted ? 'var(--dv3-zone-up)' : 'var(--dv3-text3)')}
          nodeStrokeWidth={0}
          className="org-canvas-minimap"
        />
      </ReactFlow>
    </div>
  )
}

export function OrgCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <OrgCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
