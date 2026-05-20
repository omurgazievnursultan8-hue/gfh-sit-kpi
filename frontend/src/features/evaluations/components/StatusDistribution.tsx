import type { EvaluationStatus } from '../evaluationsApi'
import { STATUS_LABELS, STATUS_VISUALS, STATUS_ORDER } from './evaluationStatus'

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

/** Status-breakdown bars. Dominant status first, status order as tiebreaker. */
export function StatusDistribution({
  counts, total,
}: {
  counts: Record<EvaluationStatus, number>
  total: number
}) {
  const rows = STATUS_ORDER
    .map(s => ({ status: s, count: counts[s] }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--surface)', border: '1px solid var(--line-soft)',
        padding: '16px 18px', boxShadow: 'var(--shadow-sm)', marginTop: 16,
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: 'var(--info)' }} />
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="font-display" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
          Распределение по статусам
        </span>
        <span className="font-mono font-semibold" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          {total} {plural(total, ['запись', 'записи', 'записей'])}
        </span>
      </div>

      {total === 0 ? (
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          Нет данных.
        </div>
      ) : (
        rows.map(r => {
          const pct = (r.count / total) * 100
          const v = STATUS_VISUALS[r.status]
          return (
            <div key={r.status} className="mb-2.5 last:mb-0">
              <div className="flex items-baseline justify-between mb-1 gap-2">
                <span className="truncate" style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>
                  {STATUS_LABELS[r.status]}
                </span>
                <span className="font-mono tabular-nums whitespace-nowrap"
                      style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>
                  {r.count}
                  <span className="ml-1" style={{ color: 'var(--ink-dim)', fontWeight: 400 }}>
                    · {pct.toFixed(0)}%
                  </span>
                </span>
              </div>
              <div className="relative overflow-hidden rounded-full"
                   style={{ height: 6, background: 'var(--bg-soft, #ebe6db)' }}>
                <div className="absolute inset-y-0 left-0 transition-all"
                     style={{ width: `${pct}%`, background: v.stripe, borderRadius: 999 }} />
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
