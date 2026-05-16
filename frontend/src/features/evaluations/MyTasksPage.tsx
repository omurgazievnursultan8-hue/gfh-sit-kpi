import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../app/store'
import { evaluationsApi, Evaluation, EvaluationStatus } from './evaluationsApi'
import { periodsApi, Period, AppealPending } from '../periods/periodsApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { usePageTitle } from '../../context/PageContext'

/* ────────────────────────────────────────────────────────────────────────────
 * "Мои задачи" — evaluator queue (merged with manager-tasks).
 * Same aesthetic family as PersonalDashboardPage / MyEvaluationsPage:
 *   deep-green hero, cream paper, JetBrains Mono labels, Source Serif display.
 * Features: list/periods toggle, pending appeals panel, admin force-close.
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

const PERIOD_TYPE_LABEL: Record<string, string> = {
  MONTHLY: 'Ежемесячная',
  QUARTERLY: 'Квартальная',
  ANNUAL: 'Годовая',
}

const PAGE_SIZE = 10

type ViewMode = 'list' | 'periods'

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

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

  const nearestDeadlinePeriod = useMemo(() => {
    const future = periods
      .filter(p => p.status === 'ACTIVE')
      .filter(p => tasks.some(t => t.periodId === p.id && t.status === 'DRAFT'))
      .sort((a, b) => new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime())
    return future[0] ?? null
  }, [periods, tasks])

  const periodsInTasks = useMemo(() => {
    const ids = Array.from(new Set(tasks.map(t => t.periodId)))
    return ids
      .map(id => periodById.get(id))
      .filter((p): p is Period => !!p)
      .sort((a, b) => new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime())
  }, [tasks, periodById])

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
        @keyframes tk-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .tk-rise { opacity: 0; animation: tk-rise 620ms cubic-bezier(.22,.61,.36,1) forwards }
        @media (max-width: 640px) { .tk-hero-grid { grid-template-columns: 1fr !important; gap: 20px !important } }
        @media (max-width: 880px) { .tk-stats-grid { grid-template-columns: 1fr 1fr !important } .tk-bottom-grid { grid-template-columns: 1fr !important } }
        @media (max-width: 520px) { .tk-stats-grid { grid-template-columns: 1fr !important } }
      `}</style>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl mb-6 tk-rise"
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

        <div className="relative grid items-center gap-8 tk-hero-grid"
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
              Мои <span style={{ color: 'var(--gold)' }}>задачи</span>
              <span style={{ color: 'rgba(245,236,210,0.55)', fontSize: 18, fontWeight: 400, marginLeft: 10 }}>
                · очередь оценщика
              </span>
            </h1>

            <HeroProse
              timeGreet={timeGreeting()}
              total={tasks.length}
              drafts={drafts}
              overdue={overdue}
              hot={hotDeadline}
              appeals={pendingAppeals.length}
              appealsHot={appealsHot}
              nearestPeriod={nearestDeadlinePeriod}
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
                Очередь
              </span>
              <span>{tasks.length} {plural(tasks.length, ['задача', 'задачи', 'задач'])}</span>
              <span>·</span>
              <span>{periodsInTasks.length} {plural(periodsInTasks.length, ['период', 'периода', 'периодов'])}</span>
              {pendingAppeals.length > 0 && (
                <>
                  <span>·</span>
                  <span>{pendingAppeals.length} {plural(pendingAppeals.length, ['апелляция', 'апелляции', 'апелляций'])}</span>
                </>
              )}
            </div>
          </div>

          {/* right */}
          <div className="flex flex-col items-end gap-2">
            <HeroBigBadge big={String(drafts)} cap="к заполнению" accent="#f5ecd2" />
            {overdue > 0 && (
              <HeroPill
                label={`${overdue} ${plural(overdue, ['просрочена', 'просрочены', 'просрочено'])}`}
                tone="danger"
              />
            )}
            {hotDeadline > 0 && (
              <HeroPill label={`${hotDeadline} срочн.`} tone="warn" />
            )}
            {pendingAppeals.length > 0 && (
              <HeroPill
                label={`${pendingAppeals.length} апелл.`}
                tone={appealsHot > 0 ? 'danger' : 'warn'}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── STATS ──────────────────────────────────────────────────────────── */}
      <div className="grid gap-3 mb-5 tk-stats-grid tk-rise"
           style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', animationDelay: '90ms' }}>
        <StatCard
          label="Всего задач"
          mainText={String(tasks.length)}
          mainColor="var(--ink)"
          stripe="var(--accent-2)"
          delta={{ txt: `${periodsInTasks.length} пер.`, tone: 'flat' }}
          footer="в очереди"
        />
        <StatCard
          label="Черновики"
          mainText={String(drafts)}
          mainColor={drafts > 0 ? '#9c7416' : 'var(--ink-faint)'}
          stripe="var(--warn, #c89628)"
          delta={{ txt: drafts > 0 ? 'заполните' : 'ок', tone: drafts > 0 ? 'down' : 'up' }}
          footer="статус DRAFT"
        />
        <StatCard
          label="Апелляции"
          mainText={String(pendingAppeals.length)}
          mainColor={pendingAppeals.length > 0 ? 'var(--danger)' : 'var(--ink-faint)'}
          stripe={pendingAppeals.length > 0 ? 'var(--danger)' : 'var(--line-strong)'}
          delta={{ txt: appealsHot > 0 ? `${appealsHot} <24ч` : pendingAppeals.length > 0 ? 'ждут' : '—', tone: appealsHot > 0 ? 'down' : 'flat' }}
          footer="требуют ответа"
        />
        <StatCard
          label="Срочно"
          mainText={String(hotDeadline + overdue)}
          mainColor={(hotDeadline + overdue) > 0 ? 'var(--danger)' : 'var(--ink-faint)'}
          stripe={(hotDeadline + overdue) > 0 ? 'var(--danger)' : 'var(--line-strong)'}
          delta={{ txt: overdue > 0 ? `${overdue} проср.` : '≤ 3д', tone: overdue > 0 ? 'down' : 'flat' }}
          footer="дедлайн под угрозой"
        />
      </div>

      {/* ── QUEUE + APPEALS ───────────────────────────────────────────────── */}
      <div className="grid gap-3 tk-bottom-grid tk-rise"
           style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', animationDelay: '180ms' }}>

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
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hero subcomponents
 * ────────────────────────────────────────────────────────────────────────── */

function HeroProse({ timeGreet, total, drafts, overdue, hot, appeals, appealsHot, nearestPeriod }: {
  timeGreet: string
  total: number
  drafts: number
  overdue: number
  hot: number
  appeals: number
  appealsHot: number
  nearestPeriod: Period | null
}) {
  const emphasis = { color: '#f5ecd2', fontWeight: 600 } as const

  if (total === 0 && appeals === 0) {
    return (
      <div className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 620, lineHeight: 1.55 }}>
        <p style={{ margin: 0 }}>{timeGreet}. Очередь пуста — новых задач и апелляций нет.</p>
      </div>
    )
  }

  const taskWord = plural(total, ['задача', 'задачи', 'задач'])
  const draftWord = plural(drafts, ['черновик', 'черновика', 'черновиков'])

  return (
    <div className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 620, lineHeight: 1.55 }}>
      <p style={{ margin: 0 }}>
        {timeGreet}. В очереди <strong style={emphasis}>{total} {taskWord}</strong>
        {drafts > 0 && (
          <> · <strong style={emphasis}>{drafts} {draftWord}</strong> к заполнению</>
        )}
        .
      </p>
      {nearestPeriod && (
        <p style={{ margin: 0, marginTop: 2 }}>
          Ближайший дедлайн ·{' '}
          <strong style={emphasis}>{periodShortLabel(nearestPeriod)}</strong>
          {' '}через{' '}
          <strong style={{
            color: daysUntil(nearestPeriod.submissionDeadline) <= 3 ? '#f0a4a4' : '#f5ecd2',
            fontWeight: 600,
          }}>
            {Math.max(0, daysUntil(nearestPeriod.submissionDeadline))}{' '}
            {plural(Math.max(0, daysUntil(nearestPeriod.submissionDeadline)), ['день', 'дня', 'дней'])}
          </strong>.
        </p>
      )}
      {(overdue > 0 || hot > 0) && (
        <p style={{ margin: 0, marginTop: 2 }}>
          {overdue > 0 && (
            <>Просрочено{' '}
              <strong style={{ color: '#f0a4a4', fontWeight: 600 }}>{overdue}</strong>
              {hot > 0 ? ', ' : '. '}
            </>
          )}
          {hot > 0 && (
            <>срочных ≤ 3д{' '}
              <strong style={{ color: '#f0caa4', fontWeight: 600 }}>{hot}</strong>.
            </>
          )}
        </p>
      )}
      {appeals > 0 && (
        <p style={{ margin: 0, marginTop: 2 }}>
          Апелляций ожидает ·{' '}
          <strong style={{ color: appealsHot > 0 ? '#f0a4a4' : '#f0caa4', fontWeight: 600 }}>
            {appeals} {plural(appeals, ['апелляция', 'апелляции', 'апелляций'])}
          </strong>
          {appealsHot > 0 && (
            <>, из них <strong style={{ color: '#f0a4a4', fontWeight: 600 }}>{appealsHot} срочн.</strong></>
          )}.
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
 * StatCard
 * ────────────────────────────────────────────────────────────────────────── */

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
