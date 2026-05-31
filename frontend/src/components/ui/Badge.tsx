import React from 'react'

/**
 * Cream-theme status pill. Tint background + colored text per tone.
 * Replaces ad-hoc Tailwind `bg-*-100 text-*-700` pills across table pages.
 */
export type BadgeTone = 'neutral' | 'success' | 'warn' | 'danger' | 'gold' | 'accent'

interface ToneSpec { fg: string; bg: string; border: string }

const TONES: Record<BadgeTone, ToneSpec> = {
  neutral: { fg: 'var(--ink-faint)', bg: 'var(--surface-mute)', border: 'var(--line)' },
  success: { fg: 'var(--accent-2)',  bg: 'var(--accent-soft)',  border: 'var(--accent-soft)' },
  accent:  { fg: 'var(--accent-2)',  bg: 'var(--accent-soft)',  border: 'var(--accent-soft)' },
  warn:    { fg: 'var(--warn)',      bg: 'var(--warn-soft)',    border: 'var(--warn-soft)' },
  danger:  { fg: 'var(--danger)',    bg: 'var(--danger-soft)',  border: 'var(--danger-soft)' },
  gold:    { fg: 'var(--gold)',      bg: 'var(--gold-soft)',    border: 'var(--gold-soft)' },
}

export interface BadgeProps {
  tone?: BadgeTone
  children: React.ReactNode
  title?: string
}

export function Badge({ tone = 'neutral', children, title }: BadgeProps) {
  const c = TONES[tone]
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        color: c.fg,
        background: c.bg,
        border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
