import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, Evaluation, EvaluationStatus } from './evaluationsApi'
import { periodsApi, Period } from '../periods/periodsApi'
import { usePageTitle } from '../../context/PageContext'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'

const PLACEHOLDER = '··'

/* ────────────────────────────────────────────────────────────────────────────
 * "Оценки" — full evaluator history across all statuses.
 * Visual: same paper/cream + deep-green hero + 3px stripe surfaces as
 * MyEvaluationsPage / PersonalDashboardPage. Content: conducted-by-me list,
 * shows evaluatee + period + status + finalScore.
 * ────────────────────────────────────────────────────────────────────────── */

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Отправлено',
  ACKNOWLEDGED: 'Подтверждено',
  APPEALED: 'Апелляция',
  CLOSED: 'Завершено',
}

interface StatusVisual { bg: string; fg: string; border: string; stripe: string }
const STATUS_VISUALS: Record<EvaluationStatus, StatusVisual> = {
  DRAFT:        { bg: 'rgba(200,150,40,0.14)',  fg: '#9c7416',  border: 'rgba(200,150,40,0.32)',  stripe: 'var(--warn, #c89628)' },
  SUBMITTED:    { bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7',  border: 'rgba(120,150,200,0.32)', stripe: 'var(--info)' },
  ACKNOWLEDGED: { bg: 'rgba(26,117,88,0.14)',   fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.32)',  stripe: 'var(--accent-2)' },
  APPEALED:     { bg: 'rgba(200,80,60,0.14)',   fg: '#b04d3a',  border: 'rgba(200,80,60,0.32)',   stripe: 'var(--danger)' },
  CLOSED:       { bg: 'rgba(120,120,120,0.12)', fg: '#6b6b6b',  border: 'rgba(120,120,120,0.32)', stripe: 'var(--line-strong)' },
}

const STATUS_ORDER: EvaluationStatus[] = ['DRAFT', 'SUBMITTED', 'APPEALED', 'ACKNOWLEDGED', 'CLOSED']
const PAGE_SIZE = 12

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

function periodShortLabel(p: Period): string {
  const start = new Date(p.startDate)
  const year = start.getFullYear()
  if (p.type === 'QUARTERLY') return `Q${Math.floor(start.getMonth() / 3) + 1} ${year}`
  if (p.type === 'MONTHLY') return `${String(start.getMonth() + 1).padStart(2, '0')}.${year}`
  return `${year}`
}

/* ────────────────────────────────────────────────────────────────────────── */

export function EvaluatorEvaluationsPage() {
  const navigate = useNavigate()
  usePageTitle('nav.evaluations')

  const [all, setAll] = useState<Evaluation[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<EvaluationStatus | 'ALL'>('ALL')
  const [periodFilter, setPeriodFilter] = useState<number | 'ALL'>('ALL')
  const [page, setPage] = useState(0)

  useEffect(() => {
    Promise.allSettled([
      evaluationsApi.asEvaluator(0, 500).then(r => setAll(r.content)),
      periodsApi.list().then(setPeriods),
    ]).then(results => {
      if (results.some(r => r.status === 'rejected')) setFailed(true)
    }).finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [])

  // Live tick — refresh clock + relative time each minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── time / clock ──────────────────────────────────────────────────────── */
  const hours = now.getHours()
  const greeting = hours < 12 ? 'Доброе утро' : hours < 18 ? 'Добрый день' : 'Добрый вечер'
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const todayStr = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1 ? 'обновлено только что' : `обновлено ${mins} мин назад`
  }

  const periodById = useMemo(() => {
    const m = new Map<number, Period>()
    for (const p of periods) m.set(p.id, p)
    return m
  }, [periods])

  /* ── filter chain ──────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    return all.filter(e =>
      (statusFilter === 'ALL' || e.status === statusFilter) &&
      (periodFilter === 'ALL' || e.periodId === periodFilter)
    )
  }, [all, statusFilter, periodFilter])

  useEffect(() => { setPage(0) }, [statusFilter, periodFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  /* ── stats ─────────────────────────────────────────────────────────────── */
  const counts: Record<EvaluationStatus, number> = useMemo(() => {
    const c: Record<EvaluationStatus, number> = {
      DRAFT: 0, SUBMITTED: 0, ACKNOWLEDGED: 0, APPEALED: 0, CLOSED: 0,
    }
    for (const e of all) c[e.status] += 1
    return c
  }, [all])

  const scored = useMemo(() => all.filter(e => e.finalScore !== null), [all])
  const avgGiven = scored.length
    ? scored.reduce((s, e) => s + (e.finalScore as number), 0) / scored.length
    : null

  const uniqueEvaluatees = useMemo(
    () => new Set(all.map(e => e.evaluateeId)).size,
    [all],
  )

  const periodsInData = useMemo(() => {
    const ids = Array.from(new Set(all.map(e => e.periodId)))
    return ids
      .map(id => periodById.get(id))
      .filter((p): p is Period => !!p)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  }, [all, periodById])

  const total = all.length
  const open = counts.DRAFT + counts.SUBMITTED
  const avgWhole = avgGiven !== null ? Math.round(avgGiven) : null

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="EVAL.TOTAL" id="T01" loading={loading}
              value={total} label="оценок проведено"
              gauge={{
                pct: 1, variant: 'meta',
                left: '0',
                center: <><strong>{periodsInData.length}</strong> {plural(periodsInData.length, ['период', 'периода', 'периодов'])}</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="EVALUATEES" id="E01" loading={loading}
              value={uniqueEvaluatees} label="сотрудников оценено"
            />
            <StatCard
              className="dv3-col-3"
              title="AVG.GIVEN" id="A01" loading={loading}
              value={avgWhole} unit="/ 100" zoneScore={avgWhole}
              gauge={{
                pct: avgGiven !== null ? avgGiven / 100 : 0, variant: 'marker',
                left: '0', right: '100',
                current: avgWhole !== null ? avgWhole : '—',
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="OPEN" id="O01" loading={loading}
              value={open} label="draft + submitted"
              gauge={{
                pct: total > 0 ? open / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{counts.DRAFT}</strong> {plural(counts.DRAFT, ['черновик', 'черновика', 'черновиков'])}</>,
                right: total,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── LEDGER + DISTRIBUTION ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }}>
       <div className="grid gap-3 ee-bottom-grid"
           style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <style>{`@media (max-width: 880px) { .ee-bottom-grid { grid-template-columns: 1fr !important } }`}</style>

        <Card title="Проведённые оценки"
              pill="История"
              pillSpec={{ bg: 'rgba(168,133,43,0.14)', fg: 'var(--gold)', border: 'rgba(168,133,43,0.32)' }}
              stripe="var(--gold)"
              rightMetric={`${filtered.length}/${all.length}`}>
          <div className="space-y-2 mb-3">
            <FilterRow
              label="Статус"
              items={[
                { key: 'ALL', label: 'Все', count: all.length },
                ...STATUS_ORDER
                  .filter(s => counts[s] > 0)
                  .map(s => ({ key: s, label: STATUS_LABELS[s], count: counts[s] })),
              ]}
              value={statusFilter}
              onChange={v => setStatusFilter(v as EvaluationStatus | 'ALL')}
              colorFor={k => k !== 'ALL' ? STATUS_VISUALS[k as EvaluationStatus] : null}
            />
            {periodsInData.length > 1 && (
              <FilterRow
                label="Период"
                items={[
                  { key: 'ALL', label: 'Все', count: all.length },
                  ...periodsInData.map(p => ({
                    key: p.id,
                    label: periodShortLabel(p),
                    count: all.filter(e => e.periodId === p.id).length,
                  })),
                ]}
                value={periodFilter}
                onChange={v => setPeriodFilter(v as number | 'ALL')}
                colorFor={() => null}
              />
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="font-mono py-10 text-center"
                 style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>
              Нет оценок по выбранным фильтрам
            </div>
          ) : (
            <>
              <EvaluatorLedger
                rows={pageRows}
                offset={page * PAGE_SIZE}
                periodById={periodById}
                onOpen={(e) => {
                  // DRAFT goes to the form; everything else to detail.
                  if (e.status === 'DRAFT') navigate(`/evaluations/${e.id}`)
                  else navigate(`/my-evaluations/${e.id}`)
                }}
              />
              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              )}
            </>
          )}
        </Card>

        <Card title="Распределение"
              pill="Статусы"
              pillSpec={{ bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7', border: 'rgba(120,150,200,0.32)' }}
              stripe="var(--info)"
              rightMetric={`${all.length} ${plural(all.length, ['запись', 'записи', 'записей'])}`}>
          <StatusDistribution counts={counts} total={all.length} />
        </Card>
       </div>
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Card shell
 * ────────────────────────────────────────────────────────────────────────── */

interface PillSpec { bg: string; fg: string; border: string }

function Card({
  title, pill, pillSpec, stripe, rightMetric, children, className = '',
}: {
  title: string
  pill?: string
  pillSpec?: PillSpec
  stripe: string
  rightMetric?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '16px 18px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: stripe }} />
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display truncate"
                style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
            {title}
          </span>
          {pill && pillSpec && (
            <span className="font-mono font-semibold uppercase tracking-widest"
                  style={{
                    fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
                    background: pillSpec.bg, color: pillSpec.fg,
                    border: `1px solid ${pillSpec.border}`,
                  }}>
              {pill}
            </span>
          )}
        </div>
        {rightMetric && (
          <span className="font-mono font-semibold"
                style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            {rightMetric}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Filter row (label + chip group)
 * ────────────────────────────────────────────────────────────────────────── */

interface FilterItem { key: string | number; label: string; count: number }

function FilterRow({
  label, items, value, onChange, colorFor,
}: {
  label: string
  items: FilterItem[]
  value: string | number
  onChange: (v: string | number) => void
  colorFor: (key: string | number) => StatusVisual | null
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono uppercase tracking-widest"
            style={{ fontSize: 9.5, color: 'var(--ink-faint)', fontWeight: 600, minWidth: 56 }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map(it => {
          const active = value === it.key
          const c = colorFor(it.key)
          return (
            <button
              key={String(it.key)}
              type="button"
              onClick={() => onChange(it.key)}
              className="font-mono uppercase tracking-widest transition-all"
              style={{
                fontSize: 10,
                padding: '4px 9px',
                borderRadius: 4,
                fontWeight: 600,
                cursor: 'pointer',
                background: active ? (c ? c.bg : 'var(--ink)') : 'transparent',
                color: active ? (c ? c.fg : 'var(--bg)') : 'var(--ink-soft)',
                border: `1px solid ${active ? (c ? c.border : 'var(--ink)') : 'var(--line)'}`,
              }}
            >
              {it.label}
              <span className="ml-1.5 tabular-nums" style={{ opacity: 0.7 }}>{it.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Ledger — conducted evaluations
 * ────────────────────────────────────────────────────────────────────────── */

function EvaluatorLedger({ rows, offset, periodById, onOpen }: {
  rows: Evaluation[]
  offset: number
  periodById: Map<number, Period>
  onOpen: (e: Evaluation) => void
}) {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
      {rows.map((e, i) => {
        const v = STATUS_VISUALS[e.status]
        const p = periodById.get(e.periodId)

        return (
          <div
            key={e.id}
            onClick={() => onOpen(e)}
            onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpen(e) } }}
            role="button"
            tabIndex={0}
            className="grid grid-cols-12 items-center gap-2 py-2.5 cursor-pointer transition-colors hover:bg-black/[0.02] focus:bg-black/[0.04] focus:outline-none"
            style={{ borderColor: 'var(--line-soft)' }}
          >
            <div className="col-span-1 font-mono tabular-nums"
                 style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
              {String(offset + i + 1).padStart(2, '0')}
            </div>

            <div className="col-span-3 min-w-0">
              <div className="font-display truncate"
                   style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {e.evaluateeName}
              </div>
              <div className="font-mono"
                   style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                {fmtDateShort(e.submittedAt ?? e.createdAt)}
              </div>
            </div>

            <div className="col-span-3 min-w-0">
              <div className="font-mono uppercase tracking-wider"
                   style={{ fontSize: 9.5, color: 'var(--ink-faint)', fontWeight: 600 }}>
                Период
              </div>
              <div className="truncate"
                   style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                {p ? periodShortLabel(p) : `#${e.periodId}`}
              </div>
            </div>

            <div className="col-span-2 flex justify-start">
              <span className="font-mono font-semibold uppercase tracking-widest"
                    style={{
                      fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
                      background: v.bg, color: v.fg,
                      border: `1px solid ${v.border}`,
                    }}>
                {STATUS_LABELS[e.status]}
              </span>
            </div>

            <div className="col-span-2 font-display tabular-nums text-right"
                 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
              {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
            </div>

            <div className="col-span-1 font-mono text-right"
                 style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 600 }}>
              →
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Pagination
 * ────────────────────────────────────────────────────────────────────────── */

function Pagination({ page, totalPages, onChange }: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  // compact: show up to 7 buttons w/ ellipsis if many pages
  const items: Array<number | 'gap'> = []
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) items.push(i)
  } else {
    items.push(0)
    if (page > 2) items.push('gap')
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) items.push(i)
    if (page < totalPages - 3) items.push('gap')
    items.push(totalPages - 1)
  }

  return (
    <div className="flex justify-center gap-1 mt-4">
      {items.map((it, idx) =>
        it === 'gap' ? (
          <span key={`g${idx}`} className="font-mono"
                style={{ fontSize: 11, color: 'var(--ink-faint)', width: 18, textAlign: 'center', lineHeight: '28px' }}>
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            className="font-mono tabular-nums transition-all"
            style={{
              width: 30, height: 28,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              background: it === page ? 'var(--ink)' : 'transparent',
              color: it === page ? 'var(--bg)' : 'var(--ink-soft)',
              border: `1px solid ${it === page ? 'var(--ink)' : 'var(--line)'}`,
            }}>
            {it + 1}
          </button>
        ),
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Status distribution bars
 * ────────────────────────────────────────────────────────────────────────── */

function StatusDistribution({ counts, total }: {
  counts: Record<EvaluationStatus, number>
  total: number
}) {
  if (total === 0) {
    return (
      <div className="font-mono"
           style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
        Нет данных.
      </div>
    )
  }

  const rows = STATUS_ORDER
    .map(s => ({ status: s, count: counts[s] }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)

  return (
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
    </div>
  )
}
