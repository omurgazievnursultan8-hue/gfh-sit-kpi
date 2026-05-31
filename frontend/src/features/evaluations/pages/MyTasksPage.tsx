import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../../app/store'
import { evaluationsApi, Evaluation, EvaluationStatus } from '../api'
import { periodsApi, Period, AppealPending } from '@/features/periods/api'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { usePageTitle } from '@/layouts/shell/PageContext'
import { DASHBOARD_CSS } from '../../dashboard/styles'
import { DataPanel, type Column, type FilterDef } from '@/shared/datapanel/DataPanel'

/* ────────────────────────────────────────────────────────────────────────────
 * "Мои задачи" — evaluator queue.
 * Styled to match UsersPage: dv3-terminal + DataPanel (table/cards) with
 * search, period/status/urgency filters, saved views, column config.
 * Pending appeals render as a compact alert strip above the panel.
 * ────────────────────────────────────────────────────────────────────────── */

const PANEL_KEY = 'gfh_my_tasks'

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  DRAFT: 'Черновик',
  SUBMITTED: 'Отправлено',
  ACKNOWLEDGED: 'Подтверждено',
  APPEALED: 'Апелляция',
  CLOSED: 'Завершено',
}

const STATUS_RANK: Record<EvaluationStatus, number> = {
  DRAFT: 0, APPEALED: 1, SUBMITTED: 2, ACKNOWLEDGED: 3, CLOSED: 4,
}

interface StatusVisual { bg: string; fg: string; border: string }
const STATUS_VISUALS: Record<EvaluationStatus, StatusVisual> = {
  DRAFT:        { bg: 'rgba(200,150,40,0.14)',  fg: '#9c7416',         border: 'rgba(200,150,40,0.32)'  },
  SUBMITTED:    { bg: 'rgba(120,150,200,0.14)', fg: '#4a73c7',         border: 'rgba(120,150,200,0.32)' },
  ACKNOWLEDGED: { bg: 'rgba(26,117,88,0.14)',   fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.32)'   },
  APPEALED:     { bg: 'rgba(200,80,60,0.14)',   fg: '#b04d3a',         border: 'rgba(200,80,60,0.32)'   },
  CLOSED:       { bg: 'rgba(120,120,120,0.12)', fg: '#6b6b6b',         border: 'rgba(120,120,120,0.32)' },
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

function periodShortLabel(p: Period): string {
  const start = new Date(p.startDate)
  const year = start.getFullYear()
  if (p.type === 'QUARTERLY') return `Q${Math.floor(start.getMonth() / 3) + 1} ${year}`
  if (p.type === 'MONTHLY') return `${String(start.getMonth() + 1).padStart(2, '0')}.${year}`
  return `${year}`
}

interface UrgencyTone { color: string; bg: string; border: string; label: string; bucket: 'overdue' | 'hot' | 'soon' | 'ok' | 'none' }
function urgencyTone(days: number | null): UrgencyTone {
  if (days === null) return { color: 'var(--ink-faint)', bg: 'transparent', border: 'var(--line)', label: '—', bucket: 'none' }
  if (days < 0)  return { color: '#b04d3a', bg: 'rgba(200,80,60,0.10)',  border: 'rgba(200,80,60,0.32)',  label: `просрочено ${Math.abs(days)}д`, bucket: 'overdue' }
  if (days <= 3) return { color: '#b04d3a', bg: 'rgba(200,80,60,0.08)',  border: 'rgba(200,80,60,0.28)',  label: `${days}д осталось`,             bucket: 'hot'     }
  if (days <= 7) return { color: '#9c7416', bg: 'rgba(200,150,40,0.10)', border: 'rgba(200,150,40,0.28)', label: `${days}д осталось`,             bucket: 'soon'    }
  return            { color: 'var(--accent-2)', bg: 'rgba(26,117,88,0.08)', border: 'rgba(26,117,88,0.24)', label: `${days}д осталось`,             bucket: 'ok'      }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || '—'
}

function TaskAvatar({ name, status, size = 34 }: { name: string; status: EvaluationStatus; size?: number }) {
  const v = STATUS_VISUALS[status]
  return (
    <span
      className="inline-flex items-center justify-center flex-shrink-0"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
        fontSize: Math.round(size * 0.36), fontWeight: 600, letterSpacing: '0.01em',
      }}
    >
      {initials(name)}
    </span>
  )
}

function StatusBadge({ status }: { status: EvaluationStatus }) {
  const v = STATUS_VISUALS[status]
  return (
    <span
      style={{
        display: 'inline-flex', fontSize: 11.5, fontWeight: 500,
        padding: '3px 9px', borderRadius: 999,
        background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

const DEADLINE_GAUGE_MAX_DAYS = 14

function DeadlineGauge({ days, tone, width = 112 }: { days: number | null; tone: UrgencyTone; width?: number }) {
  if (days === null) {
    return <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>—</span>
  }
  const overdue = days < 0
  const pct = overdue ? 100 : Math.min(100, (Math.max(0, days) / DEADLINE_GAUGE_MAX_DAYS) * 100)
  const label = overdue ? `−${Math.abs(days)}д` : `${days}д`
  return (
    <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
      <div
        aria-label={overdue ? `Просрочено ${Math.abs(days)} дней` : `Осталось ${days} дней`}
        role="progressbar"
        aria-valuenow={days}
        style={{
          position: 'relative', width, height: 8, borderRadius: 999,
          background: tone.bg, border: `1px solid ${tone.border}`, overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: overdue ? 0 : 'auto', right: overdue ? 'auto' : 0,
          width: `${pct}%`, background: tone.color,
          borderRadius: 999, transition: 'width 200ms ease',
        }} />
      </div>
      <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: tone.color, minWidth: 36, textAlign: 'right' }}>
        {label}
      </span>
    </div>
  )
}

function StarRating({ value, max100 = 100 }: { value: number | null; max100?: number }) {
  const hasValue = value !== null && !Number.isNaN(Number(value))
  const v = hasValue ? Math.max(0, Math.min(max100, Number(value))) : 0
  const stars = (v / max100) * 5
  const full = Math.floor(stars)
  const frac = stars - full
  const filledColor = '#d8a93a'
  const emptyColor = '#9a8d6b'
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={hasValue ? `${v.toFixed(1)} из ${max100}` : 'нет оценки'}
      title={hasValue ? `${v.toFixed(1)} / ${max100}` : 'нет оценки'}
    >
      <span className="inline-flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map(i => {
          let fill = 0
          if (hasValue) {
            if (i < full) fill = 1
            else if (i === full) fill = frac
          }
          return <Star key={i} fill={fill} filledColor={filledColor} emptyColor={emptyColor} />
        })}
      </span>
      <span
        className="font-mono tabular-nums"
        style={{ fontSize: 11, color: hasValue ? 'var(--ink-soft)' : 'var(--ink-faint)', minWidth: 28, textAlign: 'right' }}
      >
        {hasValue ? stars.toFixed(1) : '—'}
      </span>
    </span>
  )
}

function Star({ fill, filledColor, emptyColor, size = 14 }: { fill: number; filledColor: string; emptyColor: string; size?: number }) {
  const id = `star-clip-${Math.random().toString(36).slice(2, 9)}`
  const path = 'M12 2.5l2.95 6.36 6.95.74-5.2 4.78 1.5 6.86L12 17.77 5.8 21.24l1.5-6.86L2.1 9.6l6.95-.74L12 2.5z'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={{ display: 'block' }}>
      <defs>
        <clipPath id={id}><rect x="0" y="0" width={24 * fill} height="24" /></clipPath>
      </defs>
      <path d={path} fill={emptyColor} />
      <path d={path} fill={filledColor} clipPath={`url(#${id})`} />
    </svg>
  )
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
  const [closeTarget, setCloseTarget] = useState<number | null>(null)
  const [showAppeals, setShowAppeals] = useState(true)
  const [, setNow] = useState(new Date())

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
    } catch {
      // partial failures swallowed
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Re-render every minute so urgency badges stay fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

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

  const periodsInTasks = useMemo(() => {
    const ids = Array.from(new Set(tasks.map(t => t.periodId)))
    return ids
      .map(id => periodById.get(id))
      .filter((p): p is Period => !!p)
      .sort((a, b) => new Date(a.submissionDeadline).getTime() - new Date(b.submissionDeadline).getTime())
  }, [tasks, periodById])

  const FILTERS: FilterDef[] = useMemo(() => {
    const periodOptions = [
      { value: '', label: 'Все периоды' },
      ...periodsInTasks.map(p => ({ value: String(p.id), label: periodShortLabel(p) })),
    ]
    const statusOptions = [
      { value: '',             label: 'Любой статус' },
      { value: 'DRAFT',        label: STATUS_LABELS.DRAFT },
      { value: 'SUBMITTED',    label: STATUS_LABELS.SUBMITTED },
      { value: 'ACKNOWLEDGED', label: STATUS_LABELS.ACKNOWLEDGED },
      { value: 'APPEALED',     label: STATUS_LABELS.APPEALED },
      { value: 'CLOSED',       label: STATUS_LABELS.CLOSED },
    ]
    const urgencyOptions = [
      { value: '',        label: 'Любая срочность' },
      { value: 'overdue', label: 'Просрочено' },
      { value: 'hot',     label: '≤ 3 дн' },
      { value: 'soon',    label: '≤ 7 дн' },
      { value: 'ok',      label: '> 7 дн' },
    ]
    return [
      { key: 'period',  label: 'Период',    type: 'select', options: periodOptions },
      { key: 'status',  label: 'Статус',    type: 'select', options: statusOptions },
      { key: 'urgency', label: 'Срочность', type: 'select', options: urgencyOptions },
    ]
  }, [periodsInTasks])

  const openTask = (e: Evaluation) => navigate(`/evaluations/${e.id}`)

  const columns: Column<Evaluation>[] = [
    {
      key: 'name', header: 'Сотрудник', sortable: true, hideable: false,
      render: (e) => (
        <div className="flex items-center gap-3">
          <TaskAvatar name={e.evaluateeName} status={e.status} size={34} />
          <div className="flex flex-col" style={{ minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{e.evaluateeName}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)' }}>#{e.id}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'period', header: 'Период', sortable: true,
      render: (e) => {
        const p = periodById.get(e.periodId)
        return (
          <span style={{ fontSize: 13, color: p ? 'var(--ink-soft)' : 'var(--ink-dim)' }}>
            {p ? periodShortLabel(p) : `#${e.periodId}`}
          </span>
        )
      },
    },
    {
      key: 'deadline', header: 'Дедлайн', sortable: true,
      render: (e) => {
        const p = periodById.get(e.periodId)
        const days = p ? daysUntil(p.submissionDeadline) : null
        return (
          <div className="flex flex-col gap-1" style={{ minWidth: 0 }}>
            <DeadlineGauge days={days} tone={urgencyTone(days)} />
            <span style={{ fontSize: 11, color: 'var(--ink-dim)', fontFamily: 'var(--font-mono)' }}>
              {p ? `до ${fmtDateShort(p.submissionDeadline)}` : '—'}
            </span>
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: 'rating', header: 'Рейтинг', sortable: true, align: 'right',
      render: (e) => <StarRating value={e.finalScore} />,
    },
  ]

  const searchText = (e: Evaluation) => `${e.evaluateeName} #${e.id}`

  const clientFilter = (e: Evaluation, v: Record<string, string>) => {
    if (v.period && String(e.periodId) !== v.period) return false
    if (v.status && e.status !== v.status) return false
    if (v.urgency) {
      const p = periodById.get(e.periodId)
      const days = p ? daysUntil(p.submissionDeadline) : null
      if (urgencyTone(days).bucket !== v.urgency) return false
    }
    return true
  }

  const comparator = (key: string) => (a: Evaluation, b: Evaluation): number => {
    const pa = periodById.get(a.periodId)
    const pb = periodById.get(b.periodId)
    switch (key) {
      case 'period': return (pa ? periodShortLabel(pa) : '').localeCompare(pb ? periodShortLabel(pb) : '', 'ru')
      case 'deadline': {
        const da = pa ? new Date(pa.submissionDeadline).getTime() : Number.POSITIVE_INFINITY
        const db = pb ? new Date(pb.submissionDeadline).getTime() : Number.POSITIVE_INFINITY
        return da - db
      }
      case 'status': return (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99)
      case 'rating': return (a.finalScore ?? -1) - (b.finalScore ?? -1)
      default: return a.evaluateeName.localeCompare(b.evaluateeName, 'ru')
    }
  }

  const renderCard = (e: Evaluation): ReactNode => {
    const p = periodById.get(e.periodId)
    const days = p ? daysUntil(p.submissionDeadline) : null
    const tone = urgencyTone(days)
    return (
      <div
        className="tasks-card"
        onClick={() => openTask(e)}
        tabIndex={0}
        role="button"
        aria-label={`Открыть оценку ${e.evaluateeName}`}
        onKeyDown={ev => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openTask(e) }
        }}
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 16,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div className="flex items-start gap-3">
          <TaskAvatar name={e.evaluateeName} status={e.status} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
              {e.evaluateeName}
            </div>
            <div className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              ID #{e.id}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <CardMetaRow k="Период">
            <span style={{ color: p ? 'var(--ink)' : 'var(--ink-dim)' }}>
              {p ? periodShortLabel(p) : `#${e.periodId}`}
            </span>
          </CardMetaRow>
          <CardMetaRow k="Дедлайн">
            <span className="flex items-center gap-2 justify-end">
              <DeadlineGauge days={days} tone={tone} width={120} />
              {p && (
                <span style={{ fontSize: 11, color: 'var(--ink-dim)', fontFamily: 'var(--font-mono)' }}>
                  {fmtDateShort(p.submissionDeadline)}
                </span>
              )}
            </span>
          </CardMetaRow>
          <CardMetaRow k="Статус"><StatusBadge status={e.status} /></CardMetaRow>
          <CardMetaRow k="Рейтинг"><StarRating value={e.finalScore} /></CardMetaRow>
        </div>
        <style>{`
          .tasks-card { cursor: pointer; transition: border-color 120ms ease, box-shadow 120ms ease; outline: none; }
          .tasks-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-md); }
          .tasks-card:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
        `}</style>
      </div>
    )
  }

  const appealsHot = pendingAppeals.filter(a => hoursUntil(a.deadline) <= 24).length

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>

      <div className="dv3-terminal">
        {pendingAppeals.length > 0 && (
          <AppealsStrip
            appeals={pendingAppeals}
            hot={appealsHot}
            open={showAppeals}
            onToggle={() => setShowAppeals(v => !v)}
            onOpen={id => navigate(`/evaluations/${id}`)}
          />
        )}

        <DataPanel<Evaluation>
          mode="client"
          columns={columns}
          rows={tasks}
          rowKey={(e) => e.id}
          loading={loading}
          caption="Очередь оценок"
          empty="Очередь пуста — нет ожидающих задач."
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по сотруднику…"
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'deadline', dir: 'asc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          panelStorageKey={PANEL_KEY}
          columnConfig
          onRowClick={openTask}
          toolbarActions={
            isAdmin && periodsInTasks.some(p => daysUntil(p.submissionDeadline) < 0) ? (
              <ForceCloseMenu
                periods={periodsInTasks.filter(p => daysUntil(p.submissionDeadline) < 0)}
                onPick={setCloseTarget}
              />
            ) : null
          }
        />

        <ConfirmDialog
          open={!!closeTarget}
          title="Принудительно закрыть период?"
          description="Все неотправленные черновики будут закрыты. Это действие необратимо."
          variant="danger"
          onConfirm={handleForceClose}
          onCancel={() => setCloseTarget(null)}
        />
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function CardMetaRow({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3" style={{ minHeight: 22 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{k}</span>
      <span className="truncate" style={{ fontSize: 13, textAlign: 'right' }}>{children}</span>
    </div>
  )
}

function ForceCloseMenu({ periods, onPick }: { periods: Period[]; onPick: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 transition-colors"
        style={{
          fontSize: 13, fontWeight: 500, height: 38, padding: '0 12px', borderRadius: 10,
          background: 'rgba(200,80,60,0.08)', color: 'var(--danger)',
          border: '1px solid rgba(200,80,60,0.32)', cursor: 'pointer',
        }}
      >
        Закрыть просроченный
        <svg viewBox="0 0 24 24" aria-hidden style={{ width: 12, height: 12, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 51,
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
            boxShadow: 'var(--shadow-md)', minWidth: 220, padding: 4,
          }}>
            {periods.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setOpen(false); onPick(p.id) }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  width: '100%', padding: '8px 10px', borderRadius: 6, border: 'none',
                  background: 'transparent', cursor: 'pointer', color: 'var(--ink)', fontSize: 13,
                }}
                onMouseEnter={ev => ((ev.currentTarget as HTMLButtonElement).style.background = 'var(--surface-mute)')}
                onMouseLeave={ev => ((ev.currentTarget as HTMLButtonElement).style.background = 'transparent')}
              >
                <span>{periodShortLabel(p)}</span>
                <span style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
                  {fmtDateShort(p.submissionDeadline)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

function AppealsStrip({
  appeals, hot, open, onToggle, onOpen,
}: {
  appeals: AppealPending[]
  hot: number
  open: boolean
  onToggle: () => void
  onOpen: (evaluationId: number) => void
}) {
  return (
    <section
      aria-label="Апелляции"
      style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, marginBottom: 16, overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          width: '100%', padding: '12px 16px', border: 'none', background: 'transparent',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span className="flex items-center gap-3">
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(200,80,60,0.12)', color: 'var(--danger)',
            fontSize: 13, fontWeight: 700,
          }}>
            {appeals.length}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            Апелляции требуют ответа
          </span>
          {hot > 0 && (
            <span className="font-mono uppercase tracking-widest" style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
              background: 'rgba(200,80,60,0.10)', color: '#b04d3a',
              border: '1px solid rgba(200,80,60,0.32)',
            }}>
              {hot} {'< 24ч'}
            </span>
          )}
        </span>
        <svg viewBox="0 0 24 24" aria-hidden style={{
          width: 16, height: 16, stroke: 'var(--ink-faint)', fill: 'none', strokeWidth: 2,
          transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 150ms ease',
        }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {appeals.map((a, i) => (
            <AppealRow key={a.id} appeal={a} index={i} onOpen={() => onOpen(a.evaluationId)} />
          ))}
        </div>
      )}
    </section>
  )
}

function AppealRow({ appeal, index, onOpen }: { appeal: AppealPending; index: number; onOpen: () => void }) {
  const hrs = hoursUntil(appeal.deadline)
  const hot = hrs <= 24
  const overdue = hrs < 0
  const tone = overdue
    ? { fg: '#b04d3a', bg: 'rgba(200,80,60,0.10)', border: 'rgba(200,80,60,0.32)' }
    : hot
      ? { fg: '#9c7416', bg: 'rgba(200,150,40,0.10)', border: 'rgba(200,150,40,0.28)' }
      : { fg: 'var(--ink-soft)', bg: 'transparent', border: 'var(--line)' }
  const label = overdue ? `просрочено ${Math.abs(hrs)}ч` : hrs < 48 ? `${hrs}ч` : `${Math.ceil(hrs / 24)}д`

  return (
    <div
      style={{
        background: overdue ? 'rgba(200,80,60,0.05)' : 'var(--surface-mute)',
        border: `1px solid ${overdue ? 'rgba(200,80,60,0.28)' : 'var(--line-soft)'}`,
        borderRadius: 8, padding: '10px 12px',
      }}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
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
      <p className="line-clamp-2" style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.45 }}>
        {appeal.reason}
      </p>
      <div className="flex items-center justify-between mt-2">
        <span className="font-mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
          до {fmtDateTime(appeal.deadline)}
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="font-mono font-semibold uppercase tracking-widest transition-colors"
          style={{
            fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            background: overdue ? 'var(--danger)' : 'var(--accent)',
            color: '#fff', border: 'none',
          }}
        >
          Ответить →
        </button>
      </div>
    </div>
  )
}
