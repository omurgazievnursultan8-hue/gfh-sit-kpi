import { useState } from 'react'
import type { ScorecardResponse, CriteriaScore } from '../analytics/analyticsApi'

interface Props {
  scorecard: ScorecardResponse | null
}

function sign(n: number): string {
  return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

function MeterBar({ pct, warn }: { pct: number; warn: boolean }) {
  return (
    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 4, height: 6 }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, pct))}%`,
        height: 6, borderRadius: 4,
        background: warn ? 'var(--warn, #d97706)' : 'var(--accent, #1a7558)',
      }} />
    </div>
  )
}

function CriteriaRow({ row, isAntiBonus }: { row: CriteriaScore; isAntiBonus: boolean }) {
  const pct = row.maxScore > 0 ? (row.score / row.maxScore) * 100 : 0
  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '10px 14px', width: 58 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
          background: isAntiBonus ? '#fee2e2' : '#f1f5f9',
          color: isAntiBonus ? '#991b1b' : '#374151',
          padding: '3px 7px', borderRadius: 5,
        }}>
          {isAntiBonus ? row.score.toFixed(0) : `${row.weight.toFixed(0)}%`}
        </span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink, #1a1a2e)' }}>{row.nameRu}</div>
        {row.levelLabel && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint, #6b7280)', marginTop: 1 }}>
            {row.levelLabel}
          </div>
        )}
      </td>
      <td style={{ padding: '10px 14px', width: 140 }}>
        <MeterBar pct={pct} warn={!isAntiBonus && pct < 70} />
      </td>
      <td style={{ padding: '10px 14px', width: 90, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {row.score.toFixed(1)}/{row.maxScore.toFixed(0)}
        </span>
        {row.delta !== null && (
          <span style={{ fontSize: 11, color: row.delta >= 0 ? '#16a34a' : 'var(--danger, #dc2626)', marginLeft: 4 }}>
            {sign(row.delta)}
          </span>
        )}
      </td>
    </tr>
  )
}

export function DashboardScorecard({ scorecard }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (!scorecard) return null

  const { periodLabel, totalScore, grade, vsGoal, vsPrevPeriod, prevPeriodLabel,
          rank, antiBonusTotal, criteria, antiBonuses } = scorecard

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
          Мой KPI · {periodLabel}
        </span>

        {/* Score summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', lineHeight: 1 }}>
            {totalScore.toFixed(0)}
          </span>
          <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'flex-end', marginBottom: 2 }}>/100</span>
          <span style={{
            background: 'var(--accent, #1a7558)', color: '#fff',
            fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
          }}>
            {grade}
          </span>
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {vsPrevPeriod !== null && prevPeriodLabel && (
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
              background: vsPrevPeriod >= 0 ? '#dcfce7' : '#fee2e2',
              color: vsPrevPeriod >= 0 ? '#166534' : '#991b1b',
            }}>
              vs {prevPeriodLabel} {sign(vsPrevPeriod)}
            </span>
          )}
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
            background: vsGoal >= 0 ? '#dcfce7' : '#fee2e2',
            color: vsGoal >= 0 ? '#166534' : '#991b1b',
          }}>
            vs цель {sign(vsGoal)}
          </span>
          {rank !== null && (
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
              background: '#f1f5f9', color: '#475569',
            }}>
              #{rank} в отделе
            </span>
          )}
          {antiBonusTotal < 0 && (
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
              background: '#fee2e2', color: '#991b1b',
            }}>
              штрафы {antiBonusTotal.toFixed(1)}
            </span>
          )}
        </div>

        {/* Expand button */}
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

      {/* Expanded: criteria table */}
      {expanded && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #e5e7eb' }}>
            <tbody>
              {criteria.map(row => (
                <CriteriaRow key={row.criteriaId} row={row} isAntiBonus={false} />
              ))}
            </tbody>
          </table>

          {antiBonuses.length > 0 && (
            <>
              <div style={{
                background: '#fef2f2', padding: '8px 14px',
                fontSize: 11, fontWeight: 600, color: 'var(--danger, #dc2626)',
                letterSpacing: '.05em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                Штрафные баллы
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {antiBonuses.map(row => (
                    <CriteriaRow key={row.criteriaId} row={row} isAntiBonus={true} />
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  )
}
