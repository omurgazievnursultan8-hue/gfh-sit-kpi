import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, Evaluation, EvaluationStatus } from './evaluationsApi'
import { periodsApi, Period } from '../periods/periodsApi'
import { usePageTitle } from '../../context/PageContext'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import { StatusDistributionCard } from './components/StatusDistribution'

const PANEL_KEY = 'gfh_evaluator_evaluations'

/* ────────────────────────────────────────────────────────────────────────────
 * "Оценки" — full evaluator history across all statuses.
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

function StatusBadge({ status }: { status: EvaluationStatus }) {
  const v = STATUS_VISUALS[status]
  return (
    <span className="font-mono font-semibold uppercase tracking-widest"
          style={{
            fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
            background: v.bg, color: v.fg,
            border: `1px solid ${v.border}`,
          }}>
      {STATUS_LABELS[status]}
    </span>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

export function EvaluatorEvaluationsPage() {
  const navigate = useNavigate()
  usePageTitle('nav.evaluations')

  const [all, setAll] = useState<Evaluation[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)

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

  /* ── DataPanel config ──────────────────────────────────────────────────── */
  const columns: Column<Evaluation>[] = [
    {
      key: 'evaluatee', header: 'Сотрудник', sortable: true, hideable: false,
      render: (e) => (
        <div>
          <div className="font-display" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
            {e.evaluateeName}
          </div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
            {fmtDateShort(e.submittedAt ?? e.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'period', header: 'Период', sortable: true,
      render: (e) => {
        const p = periodById.get(e.periodId)
        return (
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            {p ? periodShortLabel(p) : `#${e.periodId}`}
          </span>
        )
      },
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      key: 'finalScore', header: 'Итог', sortable: true, align: 'right',
      render: (e) => (
        <span className="font-display tabular-nums" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
          {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
        </span>
      ),
    },
  ]

  const FILTERS: FilterDef[] = useMemo(() => {
    const statusOptions = [
      { value: '', label: 'Все статусы' },
      ...STATUS_ORDER
        .filter(s => counts[s] > 0)
        .map(s => ({ value: s, label: STATUS_LABELS[s] })),
    ]
    const periodOptions = [
      { value: '', label: 'Все периоды' },
      ...periodsInData.map(p => ({ value: String(p.id), label: periodShortLabel(p) })),
    ]
    const defs: FilterDef[] = [
      { key: 'status', label: 'Статус', type: 'select', options: statusOptions },
    ]
    if (periodsInData.length > 1) {
      defs.push({ key: 'period', label: 'Период', type: 'select', options: periodOptions })
    }
    return defs
  }, [counts, periodsInData])

  const searchText = (e: Evaluation) => {
    const p = periodById.get(e.periodId)
    return `${e.evaluateeName} ${p ? periodShortLabel(p) : ''} #${e.periodId}`
  }

  const clientFilter = (e: Evaluation, v: Record<string, string>) => {
    if (v.status && e.status !== v.status) return false
    if (v.period && String(e.periodId) !== v.period) return false
    return true
  }

  const comparator = (key: string) => (a: Evaluation, b: Evaluation): number => {
    switch (key) {
      case 'period': {
        const pa = periodById.get(a.periodId)
        const pb = periodById.get(b.periodId)
        if (pa && pb) return pa.startDate.localeCompare(pb.startDate)
        return a.periodId - b.periodId
      }
      case 'status':     return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      case 'finalScore': return (a.finalScore ?? -1) - (b.finalScore ?? -1)
      case 'evaluatee':
      default:           return a.evaluateeName.localeCompare(b.evaluateeName, 'ru')
    }
  }

  const openEvaluation = (e: Evaluation) => {
    if (e.status === 'DRAFT') navigate(`/evaluations/${e.id}`)
    else navigate(`/my-evaluations/${e.id}`)
  }

  const renderCard = (e: Evaluation): ReactNode => {
    const p = periodById.get(e.periodId)
    return (
      <div
        onClick={() => openEvaluation(e)}
        role="button"
        tabIndex={0}
        onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openEvaluation(e) } }}
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 16, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {e.evaluateeName}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
              {fmtDateShort(e.submittedAt ?? e.createdAt)}
            </div>
          </div>
          <StatusBadge status={e.status} />
        </div>
        <div className="flex items-end justify-between gap-3" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <span className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            {p ? periodShortLabel(p) : `#${e.periodId}`}
          </span>
          <span className="font-display tabular-nums" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
            {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
          </span>
        </div>
      </div>
    )
  }

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
              title="COVERAGE" id="C01" loading={loading}
              value={total} label="оценок проведено"
              gauge={{
                pct: 1, variant: 'meta',
                left: <><strong>{uniqueEvaluatees}</strong> {plural(uniqueEvaluatees, ['сотрудник', 'сотрудника', 'сотрудников'])}</>,
                center: <><strong>{periodsInData.length}</strong> {plural(periodsInData.length, ['период', 'периода', 'периодов'])}</>,
                right: total,
              }}
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
            <StatusDistributionCard
              className="dv3-col-3"
              counts={counts} total={total} loading={loading}
            />
          </div>

          {/* LEDGER */}
          <div style={{ marginTop: 24 }}>
            <DataPanel<Evaluation>
              mode="client"
              columns={columns}
              rows={all}
              rowKey={(e) => e.id}
              loading={loading}
              caption="Проведённые оценки"
              empty="Нет оценок по выбранным фильтрам"
              searchable
              searchText={searchText}
              searchPlaceholder="Поиск по сотруднику или периоду"
              filters={FILTERS}
              clientFilter={clientFilter}
              comparator={comparator}
              defaultSort={{ key: 'evaluatee', dir: 'asc' }}
              views={['table', 'cards']}
              renderCard={renderCard}
              panelStorageKey={PANEL_KEY}
              columnConfig
              onRowClick={openEvaluation}
            />
          </div>
        </div>
      </div>
    </>
  )
}

