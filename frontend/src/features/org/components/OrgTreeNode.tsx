import { useState } from 'react'
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react'
import { OrgUnit } from '../orgApi'

const TYPE_LABELS: Record<OrgUnit['type'], string> = {
  BLOCK: 'Блок',
  DEPARTMENT: 'Отдел',
  UNIT: 'Подразделение',
}

const TYPE_COLORS: Record<OrgUnit['type'], string> = {
  BLOCK: 'bg-blue-100 text-blue-800',
  DEPARTMENT: 'bg-green-100 text-green-800',
  UNIT: 'bg-gray-100 text-gray-700',
}

interface Props {
  node: OrgUnit
  isAdmin: boolean
  onEdit: (node: OrgUnit) => void
  onDelete: (node: OrgUnit) => void
  onAddChild: (parent: OrgUnit) => void
  depth?: number
}

export function OrgTreeNode({ node, isAdmin, onEdit, onDelete, onAddChild, depth = 0 }: Props) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-gray-200 pl-4' : ''}>
      <div className="flex items-center gap-2 py-2 group">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <span className="w-4" />
          )}
        </button>

        <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[node.type]}`}>
          {TYPE_LABELS[node.type]}
        </span>

        <span className="font-medium text-gray-900">{node.nameRu}</span>

        {isAdmin && (
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onAddChild(node)} title="Добавить дочернее"
              className="p-1 text-gray-400 hover:text-blue-600">
              <Plus size={14} />
            </button>
            <button onClick={() => onEdit(node)} title="Редактировать"
              className="p-1 text-gray-400 hover:text-blue-600">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(node)} title="Удалить"
              className="p-1 text-gray-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <OrgTreeNode
              key={child.id}
              node={child}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              depth={(depth ?? 0) + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
