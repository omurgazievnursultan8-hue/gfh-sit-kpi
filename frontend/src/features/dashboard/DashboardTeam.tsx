import { useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'
import type { TeamResponse, TeamMemberDto } from '../analytics/analyticsApi'

interface Props {
  team: TeamResponse | null
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #0d4d3f, #1a7558)',
      color: '#fff', fontSize: 11, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {initials}
    </div>
  )
}

function reasonColor(status: string): string {
  if (status === 'appeal' || status === 'low') return 'var(--danger, #dc2626)'
  if (status === 'unevaluated') return 'var(--warn, #d97706)'
  return '#16a34a'
}

function scoreColor(score: number | null): string {
  if (score === null) return '#6b7280'
  if (score < 70) return 'var(--danger, #dc2626)'
  if (score >= 90) return '#16a34a'
  return 'var(--ink, #1a1a2e)'
}

function MemberRow({ member, highlight }: { member: TeamMemberDto; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 20px', borderBottom: '1px solid #f3f4f6',
      background: highlight ? '#f0fdf4' : undefined,
    }}>
      <Avatar initials={member.initials} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink, #1a1a2e)' }}>{member.fullName}</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>{member.position}</div>
        <div style={{ fontSize: 11, color: reasonColor(member.status), marginTop: 1 }}>
          {member.reasonLabel}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Georgia, serif', color: scoreColor(member.latestScore) }}>
          {member.latestScore !== null ? member.latestScore.toFixed(0) : '—'}
        </div>
        {member.scoreDelta !== null && (
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {member.scoreDelta >= 0 ? '+' : ''}{member.scoreDelta.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardTeam({ team }: Props) {
  const [expanded, setExpanded] = useState(false)
  const role = useSelector((s: RootState) => s.auth.role)

  if (role !== 'MANAGER' && role !== 'ADMIN') return null
  if (!team) return null

  const { attention, bestPerformer, totalCount, teamAvg } = team
  const appealCount = attention.filter(m => m.status === 'appeal').length
  const unevaluatedCount = attention.filter(m => m.status === 'unevaluated').length

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      marginTop: 20, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600,
          letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          Команда
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif', color: 'var(--danger, #dc2626)', lineHeight: 1 }}>
            {attention.length}
          </span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>требуют внимания</span>
          {teamAvg !== null && (
            <span style={{
              fontSize: 12, background: '#f1f5f9', padding: '4px 10px',
              borderRadius: 20, color: '#6b7280', marginLeft: 4,
            }}>
              Средний балл: <strong style={{ color: 'var(--ink, #1a1a2e)' }}>{teamAvg.toFixed(0)}</strong>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {appealCount > 0 && (
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500, background: '#fee2e2', color: '#991b1b' }}>
              {appealCount} апелляции
            </span>
          )}
          {unevaluatedCount > 0 && (
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500, background: '#f1f5f9', color: '#475569' }}>
              {unevaluatedCount} не оценён
            </span>
          )}
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--accent, #1a7558)', background: 'none',
            border: '1px solid #d1fae5', borderRadius: 20, padding: '4px 12px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {expanded ? 'Скрыть' : 'Детали'} <span>{expanded ? '▴' : '▾'}</span>
        </button>
      </div>

      {/* Expanded: member rows */}
      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          {attention.length === 0 && !bestPerformer && (
            <div style={{ padding: '16px 20px', fontSize: 13, color: '#6b7280' }}>
              Команда в норме
            </div>
          )}
          {attention.map(m => <MemberRow key={m.userId} member={m} />)}
          {bestPerformer && <MemberRow member={bestPerformer} highlight />}
          <div style={{
            padding: '10px 20px', fontSize: 12, color: '#6b7280',
            display: 'flex', justifyContent: 'space-between',
            background: '#fafafa', borderTop: '1px solid #e5e7eb',
          }}>
            <span>Всего {totalCount} сотрудников</span>
            {role === 'ADMIN' && (
              <a href="/admin/org" style={{ color: 'var(--accent, #1a7558)', fontSize: 12 }}>
                Вся команда →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
