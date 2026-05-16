import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, Evaluation, EvaluationStatus } from './evaluationsApi'
import { periodsApi, Period } from '../periods/periodsApi'
import { usePageTitle } from '../../context/PageContext'

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

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

function todayLine(): string {
  const now = new Date()
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${datePart} · ${hh}:${mm}`
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmt(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(digits)
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
  const [statusFilter, setStatusFilter] = useState<EvaluationStatus | 'ALL'>('ALL')
  const [periodFilter, setPeriodFilter] = useState<number | 'ALL'>('ALL')
  const [page, setPage] = useState(0)

  useEffect(() => {
    Promise.allSettled([
      evaluationsApi.asEvaluator(0, 500).then(r => setAll(r.content)),
      periodsApi.list().then(setPeriods),
    ]).finally(() => setLoading(false))
  }, [])

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

  /* ── loading ───────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: '28px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
        <div className="font-mono uppercase tracking-widest animate-pulse"
             style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          Загрузка…
        </div>
      </div>
    )
  }

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <style>{`
        @keyframes ee-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .ee-rise { opacity: 0; animation: ee-rise 620ms cubic-bezier(.22,.61,.36,1) forwards }
        @media (max-width: 640px) { .ee-hero-grid { grid-template-columns: 1fr !important; gap: 20px !important } }
        @media (max-width: 880px) { .ee-stats-grid { grid-template-columns: 1fr 1fr !important } .ee-bottom-grid { grid-template-columns: 1fr !important } }
        @media (max-width: 520px) { .ee-stats-grid { grid-template-columns: 1fr !important } }
      `}</style>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl mb-6 ee-rise"
        style={{
          background: 'linear-gradient(135deg, #0e2724 0%, #0d4d3f 55%, #1a7558 100%)',
          color: '#ecf2f0',
          padding: '28px 32px',
          border: '1px solid #06120f',
          boxShadow: 'var(--shadow-md)',
          animationDelay: '0ms',
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 24px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,.020) 0 1px,transparent 1px 24px)',
        }} />
        <div className="absolute pointer-events-none" style={{
          top: -80, right: -80, width: 320, height: 320,
          background: 'radial-gradient(circle,rgba(168,133,43,.14),transparent 60%)',
        }} />

        <div className="relative grid items-center gap-8 ee-hero-grid"
             style={{ gridTemplateColumns: '1fr auto' }}>
          {/* left */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block rounded-full animate-pulse"
                    style={{ width: 6, height: 6, background: 'var(--gold)' }} />
              <span className="font-mono uppercase tracking-widest"
                    style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.7)' }}>
                {todayLine()}
              </span>
            </div>

            <h1 className="font-display mb-1.5"
                style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em', color: '#ecf2f0' }}>
              <span style={{ color: 'var(--gold)' }}>Оценки</span>
              <span style={{ color: 'rgba(245,236,210,0.55)', fontSize: 18, fontWeight: 400, marginLeft: 10 }}>
                · проведённые мной
              </span>
            </h1>

            <HeroProse
              timeGreet={timeGreeting()}
              total={all.length}
              evaluatees={uniqueEvaluatees}
              drafts={counts.DRAFT}
              appealed={counts.APPEALED}
              avgGiven={avgGiven}
            />

            <div className="flex items-center gap-2 font-mono flex-wrap"
                 style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.65)' }}>
              <span className="font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                    style={{
                      fontSize: 10,
                      background: 'rgba(120,200,150,0.14)',
                      color: '#7fd4a3',
                      border: '1px solid rgba(120,200,150,0.32)',
                    }}>
                Журнал оценщика
              </span>
              <span>{all.length} {plural(all.length, ['оценка', 'оценки', 'оценок'])}</span>
              <span>·</span>
              <span>{periodsInData.length} {plural(periodsInData.length, ['период', 'периода', 'периодов'])}</span>
              <span>·</span>
              <span>{uniqueEvaluatees} {plural(uniqueEvaluatees, ['сотрудник', 'сотрудника', 'сотрудников'])}</span>
            </div>
          </div>

          {/* right */}
          <div className="flex flex-col items-end gap-2">
            <HeroBigBadge big={String(all.length)} cap="всего" accent="#f5ecd2" />
            {counts.DRAFT > 0 && (
              <HeroPill
                label={`${counts.DRAFT} ${plural(counts.DRAFT, ['черновик', 'черновика', 'черновиков'])}`}
                tone="warn"
              />
            )}
            {counts.APPEALED > 0 && (
              <HeroPill
                label={`${counts.APPEALED} ${plural(counts.APPEALED, ['апелляция', 'апелляции', 'апелляций'])}`}
                tone="danger"
              />
            )}
          </div>
        </div>
      </div>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 mb-5 ee-stats-grid ee-rise"
           style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', animationDelay: '90ms' }}>
        <StatCard
          label="Всего проведено"
          mainText={String(all.length)}
          mainColor="var(--ink)"
          stripe="var(--accent-2)"
          delta={{ txt: `${periodsInData.length} пер.`, tone: 'flat' }}
          footer="по всем периодам"
        />
        <StatCard
          label="Сотрудников"
          mainText={String(uniqueEvaluatees)}
          mainColor="var(--ink)"
          stripe="var(--info)"
          delta={{ txt: '—', tone: 'flat' }}
          footer="уникальных оценено"
        />
        <StatCard
          label="Средний балл"
          mainText={fmt(avgGiven)}
          mainColor="var(--ink)"
          stripe="var(--gold)"
          delta={{ txt: `${scored.length}`, tone: 'flat' }}
          footer={`по ${scored.length} ${plural(scored.length, ['оценке', 'оценкам', 'оценкам'])} с баллом`}
        />
        <StatCard
          label="Открыто"
          mainText={String(counts.DRAFT + counts.SUBMITTED)}
          mainColor={(counts.DRAFT + counts.SUBMITTED) > 0 ? '#9c7416' : 'var(--ink-faint)'}
          stripe="var(--warn, #c89628)"
          delta={{ txt: `${counts.DRAFT} черн.`, tone: counts.DRAFT > 0 ? 'down' : 'flat' }}
          footer="draft + submitted"
        />
      </div>

      {/* ── LEDGER + DISTRIBUTION ─────────────────────────────────────────── */}
      <div className="grid gap-3 ee-bottom-grid ee-rise"
           style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', animationDelay: '180ms' }}>

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
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hero subcomponents
 * ────────────────────────────────────────────────────────────────────────── */

function HeroProse({ timeGreet, total, evaluatees, drafts, appealed, avgGiven }: {
  timeGreet: string
  total: number
  evaluatees: number
  drafts: number
  appealed: number
  avgGiven: number | null
}) {
  const emphasis = { color: '#f5ecd2', fontWeight: 600 } as const

  if (total === 0) {
    return (
      <div className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 620, lineHeight: 1.55 }}>
        <p style={{ margin: 0 }}>{timeGreet}. Вы ещё не проводили оценок.</p>
      </div>
    )
  }

  const totalWord = plural(total, ['оценку', 'оценки', 'оценок'])
  const empWord = plural(evaluatees, ['сотрудника', 'сотрудников', 'сотрудников'])

  return (
    <div className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 620, lineHeight: 1.55 }}>
      <p style={{ margin: 0 }}>
        {timeGreet}. Вы провели <strong style={emphasis}>{total} {totalWord}</strong>
        {' '}для <strong style={emphasis}>{evaluatees} {empWord}</strong>
        {avgGiven !== null && (
          <> · средний выставленный балл{' '}
            <strong style={emphasis}>{avgGiven.toFixed(1)}</strong></>
        )}
        .
      </p>
      {(drafts > 0 || appealed > 0) && (
        <p style={{ margin: 0, marginTop: 2 }}>
          {drafts > 0 && (
            <>В работе{' '}
              <strong style={{ color: '#f0caa4', fontWeight: 600 }}>{drafts}</strong>
              {appealed > 0 ? ', ' : '. '}
            </>
          )}
          {appealed > 0 && (
            <>в апелляции{' '}
              <strong style={{ color: '#f0a4a4', fontWeight: 600 }}>{appealed}</strong>.
            </>
          )}
        </p>
      )}
    </div>
  )
}

function HeroBigBadge({ big, cap, accent }: { big: string; cap: string; accent: string }) {
  return (
    <div
      className="rounded-lg flex flex-col items-center"
      style={{
        padding: '14px 22px',
        background: 'rgba(0,0,0,0.18)',
        border: '1px solid rgba(245,236,210,0.18)',
        boxShadow: 'inset 0 0 0 1px rgba(168,133,43,0.10)',
        minWidth: 120,
      }}
    >
      <span className="font-display tabular-nums"
            style={{ fontSize: 44, fontWeight: 600, color: accent, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {big}
      </span>
      <span className="font-mono uppercase tracking-widest mt-1"
            style={{ fontSize: 10, color: 'rgba(245,236,210,0.6)' }}>
        {cap}
      </span>
    </div>
  )
}

function HeroPill({ label, tone }: { label: string; tone: 'warn' | 'danger' }) {
  const spec = tone === 'warn'
    ? { bg: 'rgba(200,150,40,0.22)', fg: '#f0caa4', border: 'rgba(200,150,40,0.45)' }
    : { bg: 'rgba(200,80,60,0.22)', fg: '#f0a4a4', border: 'rgba(200,80,60,0.45)' }
  return (
    <span className="font-mono font-semibold uppercase tracking-widest px-2 py-1 rounded"
          style={{
            fontSize: 10,
            background: spec.bg,
            color: spec.fg,
            border: `1px solid ${spec.border}`,
          }}>
      {label}
    </span>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Card shell + StatCard (same contract as MyEvaluationsPage)
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

function StatCard({
  label, mainText, mainColor, stripe, delta, footer,
}: {
  label: string
  mainText: string
  mainColor: string
  stripe: string
  delta: { txt: string; tone: 'up' | 'down' | 'flat' }
  footer: string
}) {
  const deltaColor =
    delta.tone === 'up' ? 'var(--accent-2)' :
    delta.tone === 'down' ? 'var(--danger)' :
    'var(--ink-faint)'
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line-soft)',
        padding: '14px 16px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 3, background: stripe }} />
      <div className="font-mono uppercase tracking-widest mb-2"
           style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display tabular-nums"
              style={{ fontSize: 30, fontWeight: 600, color: mainColor, lineHeight: 1, letterSpacing: '-0.01em' }}>
          {mainText}
        </span>
        <span className="font-mono tabular-nums" style={{ fontSize: 11, color: deltaColor, fontWeight: 600 }}>
          {delta.txt}
        </span>
      </div>
      <div className="font-mono mt-2"
           style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
        {footer}
      </div>
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
