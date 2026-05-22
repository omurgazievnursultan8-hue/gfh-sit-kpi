import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'
import { evaluationsApi, Evaluation, EvaluationStatus } from './evaluationsApi'
import { periodsApi, Period, AppealPending } from '../periods/periodsApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { usePageTitle } from '../../context/PageContext'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'

/* ────────────────────────────────────────────────────────────────────────────
 * "Мои задачи" — evaluator queue (merged with manager-tasks).
 * dv3 terminal aesthetic: meta-bar hero (TASK.QUEUE) + gauge StatCards,
 * dp-dash-skinned cards below. Features: list/periods toggle, pending
 * appeals panel, admin force-close.
 * ────────────────────────────────────────────────────────────────────────── */

const PLACEHOLDER = '··'

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

const PERIOD_TYPE_LABEL: Record<string, string> = {
  MONTHLY: 'Ежемесячная',
  QUARTERLY: 'Квартальная',
  ANNUAL: 'Годовая',
}

const PAGE_SIZE = 10

type ViewMode = 'list' | 'periods'

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function hoursUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60))
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

function urgencyTone(days: number | null): { color: string; bg: string; border: string; label: string } {
  if (days === null) return { color: 'var(--ink-faint)', bg: 'transparent', border: 'var(--line)', label: '—' }
  if (days < 0)  return { color: '#b04d3a', bg: 'rgba(200,80,60,0.10)',  border: 'rgba(200,80,60,0.32)',  label: `просрочено ${Math.abs(days)}д` }
  if (days <= 3) return { color: '#b04d3a', bg: 'rgba(200,80,60,0.08)',  border: 'rgba(200,80,60,0.28)',  label: `${days}д осталось` }
  if (days <= 7) return { color: '#9c7416', bg: 'rgba(200,150,40,0.10)', border: 'rgba(200,150,40,0.28)', label: `${days}д осталось` }
  return { color: 'var(--accent-2)', bg: 'rgba(26,117,88,0.08)', border: 'rgba(26,117,88,0.24)', label: `${days}д осталось` }
}

interface PeriodGroup {
  periodId: number
  period: Period | null
  evaluations: Evaluation[]
  drafts: Evaluation[]
  submitted: number
  total: number
  pct: number
  days: number | null
  isPastDeadline: boolean
}

/* ────────────────────────────────────────────────────────────────────────── */

export function MyTasksPage() {
  const navigate = useNavigate()
  const { role } = useSelector((s: RootState) => s.auth)
  const isAdmin = role === 'ADMIN'
  usePageTitle('nav.myTasks')

  const [tasks, setTasks] = useState<Evaluation[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState<number | 'ALL'>('ALL')
  const [page, setPage] = useState(0)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [closeTarget, setCloseTarget] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  const load = async () => {
    setLoading(true)
    try {
      const [t, ps, ap] = await Promise.all([
        evaluationsApi.myTasks(0, 200),
        periodsApi.list().catch(() => [] as Period[]),
        periodsApi.pendingAppeals().catch(() => [] as AppealPending[]),
      ])
      setTasks(t.content)
      setPeriods(ps)
      setPendingAppeals(ap)
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
      setLoadedAt(new Date())
    }
  }

  useEffect(() => { load() }, [])

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
  const today = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1 ? 'обновлено только что' : `обновлено ${mins} мин назад`
  }

  const handleForceClose = async () => {
    if (!closeTarget) return
    try {
      await periodsApi.close(closeTarget)
      setCloseTarget(null)
      await load()
    } catch {}
  }

  const periodById = useMemo(() => {
    const m = new Map<number, Period>()
    for (const p of periods) m.set(p.id, p)
    return m
  }, [periods])

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const pa = periodById.get(a.periodId)
      const pb = periodById.get(b.periodId)
      const da = pa ? new Date(pa.submissionDeadline).getTime() : Number.POSITIVE_INFINITY
      const db = pb ? new Date(pb.submissionDeadline).getTime() : Number.POSITIVE_INFINITY
      return da - db
    })
  }, [tasks, periodById])

  const visible = useMemo(
    () => filterPeriod === 'ALL' ? sorted : sorted.filter(e => e.periodId === filterPeriod),
    [sorted, filterPeriod],
  )

  useEffect(() => { setPage(0) }, [filterPeriod, viewMode])

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const pageRows = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  /* ── period groups (for "periods" view) ────────────────────────────────── */
  const groups: PeriodGroup[] = useMemo(() => {
    const by: Record<number, Evaluation[]> = {}
    for (const e of tasks) {
      if (!by[e.periodId]) by[e.periodId] = []
      by[e.periodId].push(e)
    }
    const out: PeriodGroup[] = Object.entries(by).map(([pid, evals]) => {
      const p = periodById.get(Number(pid)) ?? null
      const drafts = evals.filter(e => e.status === 'DRAFT')
      const submitted = evals.length - drafts.length
      const pct = evals.length === 0 ? 0 : Math.round((submitted / evals.length) * 100)
      const days = p ? daysUntil(p.submissionDeadline) : null
      return {
        periodId: Number(pid),
        period: p,
        evaluations: evals,
        drafts,
        submitted,
        total: evals.length,
        pct,
        days,
        isPastDeadline: days !== null && days < 0,
      }
    })
    out.sort((a, b) => (a.days ?? 9e9) - (b.days ?? 9e9))
    return out
  }, [tasks, periodById])

  /* ── stats ─────────────────────────────────────────────────────────────── */
  const drafts = tasks.filter(e => e.status === 'DRAFT').length
  const hotDeadline = tasks.filter(e => {
    const p = periodById.get(e.periodId)
    if (!p) return false
    const d = daysUntil(p.submissionDeadline)
    return d <= 3 && d >= 0 && e.status === 'DRAFT'
  }).length
  const overdue = tasks.filter(e => {
    const p = periodById.get(e.periodId)
    if (!p) return false
    return daysUntil(p.submissionDeadline) < 0 && e.status === 'DRAFT'
  }).length
  const appealsHot = pendingAppeals.filter(a => hoursUntil(a.deadline) <= 24).length

  const periodsInTasks = useMemo(() => {
    const ids = Array.from(new Set(tasks.map(t => t.periodId)))
    return ids
      .map(id => periodById.get(id))
      .filter((p): p is Period => !!p)
      .sort((a, b) => new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime())
  }, [tasks, periodById])

  const totalTasks = tasks.length
  const urgent = hotDeadline + overdue

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>

        <div className="dv3-terminal">
          {/* HERO */}
          <div className="dv3-hero">
            <div className="dv3-hero-meta">
              <span className="dv3-hero-meta-l">TASK.QUEUE</span>
              <span className="dv3-hero-meta-r">KGT {clockKgt}</span>
            </div>
            <div className="dv3-hero-main">
              <div>
                <h1 className="dv3-hero-title">
                  {greeting}. <span className="dv3-accent">Мои задачи</span>
                </h1>
                <p className="dv3-hero-sub">{today} · очередь оценщика</p>
              </div>
              <div className="dv3-hero-metrics">
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : drafts}
                  </span>
                  <span className="dv3-hero-metric-lab">к заполнению</span>
                </div>
                <div className="dv3-hero-metric">
                  <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                    {loading ? PLACEHOLDER : pendingAppeals.length}
                  </span>
                  <span className="dv3-hero-metric-lab">апелляции</span>
                </div>
              </div>
            </div>
            <div className="dv3-hero-foot">
              <span className={failed ? 'dv3-hero-foot-warn' : 'dv3-hero-foot-ok'}>
                STATUS · {failed ? 'ошибка загрузки' : 'ок'}
              </span>
              <span>{updatedLabel}</span>
            </div>
          </div>

          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-3"
              title="TASKS.TOTAL" id="T01" loading={loading}
              value={totalTasks} label="в очереди"
              gauge={{
                pct: totalTasks > 0 ? drafts / totalTasks : 0, variant: 'meta',
                left: '0',
                center: <><strong>{drafts}</strong> черновиков</>,
                right: totalTasks,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="APPEALS" id="X01" loading={loading}
              value={pendingAppeals.length} label="требуют ответа"
              gauge={{
                pct: pendingAppeals.length > 0 ? appealsHot / pendingAppeals.length : 0, variant: 'meta',
                left: '0',
                center: <><strong>{appealsHot}</strong> {'< 24ч'}</>,
                right: pendingAppeals.length,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="DRAFTS" id="D01" loading={loading}
              value={drafts} label="статус DRAFT"
              gauge={{
                pct: totalTasks > 0 ? (totalTasks - drafts) / totalTasks : 0, variant: 'meta',
                left: '0',
                center: <><strong>{totalTasks - drafts}</strong> отправлено</>,
                right: totalTasks,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="URGENT" id="U01" loading={loading}
              value={urgent} label="дедлайн под угрозой"
              gauge={{
                pct: totalTasks > 0 ? urgent / totalTasks : 0, variant: 'meta',
                left: '0',
                center: <><strong>{overdue}</strong> просрочено</>,
                right: totalTasks,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 48px' }}>
      {/* ── QUEUE + APPEALS ───────────────────────────────────────────────── */}
      <div className="grid gap-3 tk-bottom-grid"
           style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <style>{`
          @media (max-width: 880px) { .tk-bottom-grid { grid-template-columns: 1fr !important } }
        `}</style>

        <Card title="Очередь задач"
              pill="К работе"
              pillSpec={{ bg: 'rgba(200,150,40,0.14)', fg: '#9c7416', border: 'rgba(200,150,40,0.32)' }}
              stripe="var(--warn, #c89628)"
              rightMetric={viewMode === 'list' ? `${visible.length}/${tasks.length}` : `${groups.length} ${plural(groups.length, ['период', 'периода', 'периодов'])}`}>
          <ViewToggle value={viewMode} onChange={setViewMode} />

          {viewMode === 'list' ? (
            <>
              <PeriodChips
                value={filterPeriod}
                onChange={setFilterPeriod}
                periods={periodsInTasks}
                tasks={tasks}
              />
              {visible.length === 0 ? (
                <div className="font-mono py-10 text-center"
                     style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>
                  Нет задач в выбранном периоде
                </div>
              ) : (
                <>
                  <TaskLedger
                    rows={pageRows}
                    offset={page * PAGE_SIZE}
                    periodById={periodById}
                    onOpen={id => navigate(`/evaluations/${id}`)}
                  />
                  {totalPages > 1 && (
                    <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                  )}
                </>
              )}
            </>
          ) : (
            groups.length === 0 ? (
              <EmptyState title="Очередь пуста" hint="Все оценки выполнены — нет ожидающих задач." />
            ) : (
              <div className="space-y-3">
                {groups.map(g => (
                  <PeriodRow
                    key={g.periodId}
                    group={g}
                    onOpenEval={id => navigate(`/evaluations/${id}`)}
                    onForceClose={isAdmin && g.isPastDeadline ? () => setCloseTarget(g.periodId) : undefined}
                  />
                ))}
              </div>
            )
          )}
        </Card>

        <Card title="Апелляции"
              pill={pendingAppeals.length > 0 ? 'Срочно' : 'Спокойно'}
              pillSpec={pendingAppeals.length > 0
                ? { bg: 'rgba(200,80,60,0.14)', fg: '#b04d3a', border: 'rgba(200,80,60,0.32)' }
                : { bg: 'rgba(26,117,88,0.10)', fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.24)' }}
              stripe={pendingAppeals.length > 0 ? 'var(--danger)' : 'var(--accent-2)'}
              rightMetric={pendingAppeals.length > 0
                ? `${pendingAppeals.length} ${plural(pendingAppeals.length, ['апелл.', 'апелл.', 'апелл.'])}`
                : '0'}>
          {pendingAppeals.length === 0 ? (
            <div className="font-mono py-6 text-center"
                 style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>
              Нет ожидающих апелляций
            </div>
          ) : (
            <div className="space-y-2">
              {pendingAppeals.map((a, i) => (
                <AppealRow
                  key={a.id}
                  appeal={a}
                  index={i}
                  onOpen={() => navigate(`/evaluations/${a.evaluationId}`)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!closeTarget}
        title="Принудительно закрыть период?"
        description="Все неотправленные черновики будут закрыты. Это действие необратимо."
        variant="danger"
        onConfirm={handleForceClose}
        onCancel={() => setCloseTarget(null)}
      />
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Card shell — dv3 surface
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
      className={`dp-dash relative overflow-hidden ${className}`}
      style={{
        background: 'var(--dv3-bg2)',
        border: '1px solid var(--dv3-border)',
        borderRadius: 0,
        padding: '16px 18px',
        fontFamily: "'Geist Mono', ui-monospace, monospace",
      }}
    >
      <div className="absolute top-0 left-0 right-0" style={{ height: 2, background: stripe }} />
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono uppercase tracking-widest truncate"
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--dv3-text)', letterSpacing: '0.08em' }}>
            {title}
          </span>
          {pill && pillSpec && (
            <span className="font-mono font-semibold uppercase tracking-widest"
                  style={{
                    fontSize: 9.5, padding: '2px 7px', borderRadius: 0,
                    background: pillSpec.bg, color: pillSpec.fg,
                    border: `1px solid ${pillSpec.border}`,
                  }}>
              {pill}
            </span>
          )}
        </div>
        {rightMetric && (
          <span className="font-mono font-semibold"
                style={{ fontSize: 11, color: 'var(--dv3-text3)' }}>
            {rightMetric}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * View toggle (list / periods)
 * ────────────────────────────────────────────────────────────────────────── */

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const items: Array<{ key: ViewMode; label: string }> = [
    { key: 'list', label: 'Список' },
    { key: 'periods', label: 'По периодам' },
  ]
  return (
    <div className="flex gap-1 mb-3" role="tablist" aria-label="Режим отображения">
      {items.map(it => {
        const active = value === it.key
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className="font-mono uppercase tracking-widest transition-all"
            style={{
              fontSize: 10,
              padding: '4px 10px',
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--ink-soft)',
              border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
            }}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Period chips (list view filter)
 * ────────────────────────────────────────────────────────────────────────── */

function PeriodChips({
  value, onChange, periods, tasks,
}: {
  value: number | 'ALL'
  onChange: (v: number | 'ALL') => void
  periods: Period[]
  tasks: Evaluation[]
}) {
  if (periods.length <= 1) return null

  const countByPeriod = new Map<number, number>()
  for (const t of tasks) countByPeriod.set(t.periodId, (countByPeriod.get(t.periodId) ?? 0) + 1)

  const items: Array<{ key: number | 'ALL'; label: string; count: number }> = [
    { key: 'ALL', label: 'Все периоды', count: tasks.length },
    ...periods.map(p => ({
      key: p.id,
      label: periodShortLabel(p),
      count: countByPeriod.get(p.id) ?? 0,
    })),
  ]

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {items.map(it => {
        const active = value === it.key
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
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--ink-soft)',
              border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
            }}
          >
            {it.label}
            <span className="ml-1.5 tabular-nums" style={{ opacity: 0.7 }}>{it.count}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Task ledger
 * ────────────────────────────────────────────────────────────────────────── */

function TaskLedger({ rows, offset, periodById, onOpen }: {
  rows: Evaluation[]
  offset: number
  periodById: Map<number, Period>
  onOpen: (id: number) => void
}) {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--line-soft)' }}>
      {rows.map((e, i) => {
        const v = STATUS_VISUALS[e.status]
        const p = periodById.get(e.periodId)
        const days = p ? daysUntil(p.submissionDeadline) : null
        const u = urgencyTone(days)

        return (
          <div
            key={e.id}
            onClick={() => onOpen(e.id)}
            onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onOpen(e.id) } }}
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
                ID #{e.id}
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
                {p && (
                  <span className="font-mono ml-2"
                        style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                    до {fmtDateShort(p.submissionDeadline)}
                  </span>
                )}
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

            <div className="col-span-2 flex justify-start">
              <span className="font-mono uppercase tracking-widest"
                    style={{
                      fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
                      background: u.bg, color: u.color,
                      border: `1px solid ${u.border}`,
                      fontWeight: 600,
                    }}>
                {u.label}
              </span>
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
  return (
    <div className="flex justify-center gap-1 mt-4">
      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="font-mono tabular-nums transition-all"
          style={{
            width: 30, height: 28,
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            background: i === page ? 'var(--ink)' : 'transparent',
            color: i === page ? 'var(--bg)' : 'var(--ink-soft)',
            border: `1px solid ${i === page ? 'var(--ink)' : 'var(--line)'}`,
          }}>
          {i + 1}
        </button>
      ))}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * PeriodRow — periods view (admin can force-close past-deadline periods)
 * ────────────────────────────────────────────────────────────────────────── */

const MAX_INLINE_DRAFTS = 5

function PeriodRow({ group, onOpenEval, onForceClose }: {
  group: PeriodGroup
  onOpenEval: (id: number) => void
  onForceClose?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const p = group.period
  const typeLabel = p ? PERIOD_TYPE_LABEL[p.type] ?? p.type : 'Период'
  const u = urgencyTone(group.days)
  const visibleDrafts = expanded ? group.drafts : group.drafts.slice(0, MAX_INLINE_DRAFTS)
  const more = group.drafts.length - visibleDrafts.length

  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{
        background: group.isPastDeadline ? 'rgba(200,80,60,0.04)' : 'var(--surface-mute)',
        border: `1px solid ${group.isPastDeadline ? 'rgba(200,80,60,0.24)' : 'var(--line-soft)'}`,
        padding: '12px 14px',
      }}
    >
      <div className="absolute top-0 bottom-0 left-0" style={{
        width: 3,
        background: group.isPastDeadline ? 'var(--danger)' : group.pct === 100 ? 'var(--accent-2)' : 'var(--gold)',
      }} />

      <div className="flex items-baseline justify-between gap-3 mb-2 pl-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display truncate"
                  style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {typeLabel}
            </span>
            <span className="font-mono"
                  style={{ fontSize: 10.5, color: 'var(--ink-dim)' }}>
              {p ? periodShortLabel(p) : `#${group.periodId}`}
            </span>
            <span className="font-mono uppercase tracking-widest"
                  style={{
                    fontSize: 9.5, padding: '1px 6px', borderRadius: 3,
                    background: u.bg, color: u.color,
                    border: `1px solid ${u.border}`, fontWeight: 600,
                  }}>
              {u.label}
            </span>
          </div>
          <div className="font-mono mt-0.5"
               style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
            {p ? `${fmtDateShort(p.startDate)} — ${fmtDateShort(p.endDate)} · до ${fmtDateShort(p.submissionDeadline)}` : '—'}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-display tabular-nums"
                style={{ fontSize: 16, fontWeight: 600, color: group.pct === 100 ? 'var(--accent-2)' : 'var(--ink)' }}>
            {group.pct}%
          </span>
          <span className="font-mono"
                style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
            {group.submitted}/{group.total}
          </span>
          {onForceClose && (
            <button
              type="button"
              onClick={onForceClose}
              className="font-mono uppercase tracking-widest transition-colors"
              style={{
                fontSize: 9.5, padding: '3px 8px', borderRadius: 4, fontWeight: 600,
                cursor: 'pointer',
                background: 'rgba(200,80,60,0.10)',
                color: 'var(--danger)',
                border: '1px solid rgba(200,80,60,0.32)',
              }}
            >
              Закрыть
            </button>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-full mb-2 ml-2"
           style={{ height: 4, background: 'var(--bg-soft)' }}>
        <div className="absolute inset-y-0 left-0 transition-all"
             style={{
               width: `${group.pct}%`,
               background: group.isPastDeadline ? 'var(--danger)' : group.pct === 100 ? 'var(--accent-2)' : 'var(--gold)',
               borderRadius: 999,
             }} />
      </div>

      {group.drafts.length > 0 && (
        <div className="ml-2 mt-2 grid gap-1" style={{ gridTemplateColumns: '1fr' }}>
          {visibleDrafts.map(e => (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpenEval(e.id)}
              className="flex items-center justify-between text-left transition-colors hover:bg-black/[0.03] focus:bg-black/[0.05] focus:outline-none"
              style={{
                padding: '5px 8px',
                borderRadius: 4,
                border: '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-mono tabular-nums"
                      style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
                  #{e.id}
                </span>
                <span className="truncate"
                      style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>
                  {e.evaluateeName}
                </span>
              </span>
              <span className="font-mono"
                    style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                →
              </span>
            </button>
          ))}
          {more > 0 && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="font-mono uppercase tracking-widest text-left"
              style={{
                fontSize: 10, padding: '4px 8px', color: 'var(--ink-faint)',
                cursor: 'pointer', background: 'transparent', border: 'none',
              }}
            >
              + ещё {more} {plural(more, ['сотрудник', 'сотрудника', 'сотрудников'])}
            </button>
          )}
          {expanded && group.drafts.length > MAX_INLINE_DRAFTS && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="font-mono uppercase tracking-widest text-left"
              style={{
                fontSize: 10, padding: '4px 8px', color: 'var(--ink-faint)',
                cursor: 'pointer', background: 'transparent', border: 'none',
              }}
            >
              ← свернуть
            </button>
          )}
        </div>
      )}

      {group.drafts.length === 0 && (
        <div className="ml-2 font-mono uppercase tracking-widest"
             style={{ fontSize: 10, color: 'var(--accent-2)', fontWeight: 600 }}>
          ✓ все оценки отправлены
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * AppealRow
 * ────────────────────────────────────────────────────────────────────────── */

function AppealRow({ appeal, index, onOpen }: {
  appeal: AppealPending
  index: number
  onOpen: () => void
}) {
  const hrs = hoursUntil(appeal.deadline)
  const hot = hrs <= 24
  const overdue = hrs < 0
  const tone = overdue
    ? { fg: '#b04d3a', bg: 'rgba(200,80,60,0.10)', border: 'rgba(200,80,60,0.32)' }
    : hot
      ? { fg: '#9c7416', bg: 'rgba(200,150,40,0.10)', border: 'rgba(200,150,40,0.28)' }
      : { fg: 'var(--ink-soft)', bg: 'transparent', border: 'var(--line)' }

  const label = overdue
    ? `просрочено ${Math.abs(hrs)}ч`
    : hrs < 48
      ? `${hrs}ч`
      : `${Math.ceil(hrs / 24)}д`

  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{
        background: overdue ? 'rgba(200,80,60,0.05)' : 'var(--surface-mute)',
        border: `1px solid ${overdue ? 'rgba(200,80,60,0.28)' : 'var(--line-soft)'}`,
        padding: '10px 12px',
      }}
    >
      <div className="absolute top-0 bottom-0 left-0" style={{
        width: 3,
        background: overdue ? 'var(--danger)' : hot ? 'var(--gold)' : 'var(--info)',
      }} />
      <div className="pl-2">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-mono tabular-nums"
                  style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="font-display truncate"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              {appeal.evaluateeName}
            </span>
          </span>
          <span className="font-mono uppercase tracking-widest shrink-0"
                style={{
                  fontSize: 9.5, padding: '1px 6px', borderRadius: 3,
                  background: tone.bg, color: tone.fg,
                  border: `1px solid ${tone.border}`, fontWeight: 600,
                }}>
            {label}
          </span>
        </div>
        <p className="line-clamp-2"
           style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.45 }}>
          {appeal.reason}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-mono"
                style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
            до {fmtDateTime(appeal.deadline)}
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="font-mono font-semibold uppercase tracking-widest transition-colors"
            style={{
              fontSize: 10, padding: '4px 10px', borderRadius: 4,
              cursor: 'pointer',
              background: overdue ? 'var(--danger)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
            }}
          >
            Ответить →
          </button>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Empty state
 * ────────────────────────────────────────────────────────────────────────── */

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="text-center py-8" style={{ color: 'var(--ink-faint)' }}>
      <div className="font-display mb-1"
           style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent-2)' }}>
        ✓ {title}
      </div>
      <div className="font-mono"
           style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
        {hint}
      </div>
    </div>
  )
}
