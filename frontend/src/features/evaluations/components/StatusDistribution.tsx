import type { EvaluationStatus } from '../evaluationsApi'
import { STATUS_LABELS, STATUS_VISUALS, STATUS_ORDER } from './evaluationStatus'

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

/** Status-breakdown bars, rendered as StatCard-styled panel (dv3-card). */
export function StatusDistributionCard({
  counts, total, loading = false, className, id = 'D01',
}: {
  counts: Record<EvaluationStatus, number>
  total: number
  loading?: boolean
  className?: string
  id?: string
}) {
  const rows = STATUS_ORDER
    .map(s => ({ status: s, count: counts[s] }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
    <section className={`dv3-card${className ? ` ${className}` : ''}`}>
      <span className="dv3-card-tag">[ {id} ]</span>
      <div className="dv3-card-head">
        <span className="dv3-card-title"><strong>DISTRIBUTION</strong></span>
        <span className="dv3-card-status">
          <i className="dv3-dot" aria-hidden="true" />
        </span>
      </div>
      <div className="dv3-card-body">
        {loading ? (
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            Загрузка…
          </div>
        ) : total === 0 ? (
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            Нет данных.
          </div>
        ) : (
          <div>
            {rows.map(r => {
              const pct = (r.count / total) * 100
              const v = STATUS_VISUALS[r.status]
              return (
                <div key={r.status} className="mb-2.5 last:mb-0">
                  <div className="flex items-baseline justify-between mb-1 gap-2">
                    <span className="truncate"
                          style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 500 }}>
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
            })}
            <div className="font-mono uppercase tracking-widest"
                 style={{
                   fontSize: 9.5, color: 'var(--ink-faint)', fontWeight: 600,
                   marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--line)',
                 }}>
              Всего: <span className="tabular-nums" style={{ color: 'var(--ink-soft)' }}>{total}</span> {plural(total, ['запись', 'записи', 'записей'])}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
