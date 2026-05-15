import React from 'react'

/**
 * Cream card chrome for a table: surface + optional 3px accent stripe +
 * optional padded header / footer regions. The table (`children`) renders
 * full-bleed between header and footer so it touches the card edges.
 */
export interface TableCardProps {
  /** Padded region above the table, with a divider beneath it. */
  header?: React.ReactNode
  /** Padded region below the table, with a divider above it. */
  footer?: React.ReactNode
  /** 3px var(--accent) stripe across the top. Default true. */
  accent?: boolean
  /** The table — rendered full-bleed. */
  children: React.ReactNode
  className?: string
}

export function TableCard({ header, footer, accent = true, children, className }: TableCardProps) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      {accent && (
        <div
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)' }}
        />
      )}
      {header && (
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}>
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line-soft)' }}>
          {footer}
        </div>
      )}
    </div>
  )
}
