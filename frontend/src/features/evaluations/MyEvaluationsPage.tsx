import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { evaluationsApi, type Evaluation, type EvaluationStatus } from './evaluationsApi'
import { usePageTitle } from '../../context/PageContext'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { DataPanel, type Column, type FilterDef } from '../../components/DataPanel'
import {
  STATUS_LABELS, STATUS_ORDER, EvaluationStatusBadge,
} from './components/evaluationStatus'
import { StatusDistributionCard } from './components/StatusDistribution'
import { formatPeriodRange } from './components/periodFormat'
import { periodsApi, type Period } from '../periods/periodsApi'

/* ──────────────────────────────────────────────────────────────────────────
 * "Мои оценки" — rebuilt on shared components:
 *   dashboard hero (.dv3-hero) + 4 gauge StatCards + users-page DataPanel.
 * ────────────────────────────────────────────────────────────────────────── */

const PANEL_KEY = 'gfh_my_evaluations'
const PLACEHOLDER = '··'

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function rowDate(e: Evaluation): string | null {
  return e.submittedAt ?? e.createdAt
}

function signedDelta(n: number | null): { txt: string; tone: 'up' | 'down' | 'flat' } {
  if (n === null || Number.isNaN(n)) return { txt: '—', tone: 'flat' }
  if (Math.abs(n) < 0.05) return { txt: '±0.0', tone: 'flat' }
  return { txt: `${n > 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}`, tone: n > 0 ? 'up' : 'down' }
}

export function MyEvaluationsPage() {
  const navigate = useNavigate()
  usePageTitle('nav.myEvaluations')

  const [all, setAll] = useState<Evaluation[]>([])
  const [periodById, setPeriodById] = useState<Map<number, Period>>(new Map())
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    setLoading(true)
    Promise.allSettled([
      evaluationsApi.myHistory(0, 200),
      periodsApi.list(),
    ]).then(([history, periods]) => {
      if (history.status === 'fulfilled') setAll(history.value.content)
      else setFailed(true)
      if (periods.status === 'fulfilled') {
        setPeriodById(new Map(periods.value.map(p => [p.id, p])))
      } else {
        setFailed(true)
      }
    }).finally(() => { setLoading(false); setLoadedAt(new Date()) })
  }, [])

  // Live tick — refresh clock + relative time each minute.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* ── time / clock ──────────────────────────────────────────────────────── */
  const hours = now.getHours()
  const timeGreeting = hours < 12 ? 'Доброе утро' : hours < 18 ? 'Добрый день' : 'Добрый вечер'
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const todayLine = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  let updatedLabel = ''
  if (loadedAt) {
    const mins = Math.floor((now.getTime() - loadedAt.getTime()) / 60_000)
    updatedLabel = mins < 1 ? 'обновлено только что' : `обновлено ${mins} мин назад`
  }

  /* ── derived stats ─────────────────────────────────────────────────────── */
  const counts = useMemo<Record<EvaluationStatus, number>>(() => {
    const c: Record<EvaluationStatus, number> = {
      DRAFT: 0, SUBMITTED: 0, ACKNOWLEDGED: 0, APPEALED: 0, CLOSED: 0,
    }
    for (const e of all) c[e.status] += 1
    return c
  }, [all])

  const scored = useMemo(() => all.filter(e => e.finalScore !== null), [all])
  const avgScore = scored.length
    ? scored.reduce((s, e) => s + (e.finalScore as number), 0) / scored.length
    : null
  const avgWhole = avgScore !== null ? Math.round(avgScore) : null

  const total = all.length
  const pending = counts.SUBMITTED
  const appealed = counts.APPEALED
  const closed = counts.CLOSED + counts.ACKNOWLEDGED

  // Per-evaluation delta vs the next-older scored entry, computed from the
  // API order (newest-first) so it is stable regardless of DataPanel sorting.
  const deltaById = useMemo(() => {
    const m = new Map<number, number | null>()
    for (let i = 0; i < scored.length; i++) {
      const cur = scored[i].finalScore as number
      const prev = i + 1 < scored.length ? scored[i + 1].finalScore : null
      m.set(scored[i].id, prev !== null ? cur - prev : null)
    }
    return m
  }, [scored])

  /* ── DataPanel config ──────────────────────────────────────────────────── */
  const columns: Column<Evaluation>[] = [
    {
      key: 'period', header: 'Период', sortable: true,
      render: (e) => (
        <div>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {formatPeriodRange(periodById.get(e.periodId), e.periodId)}
          </div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
            {fmtDateShort(rowDate(e))}
          </div>
        </div>
      ),
    },
    {
      key: 'evaluator', header: 'Оценщик', sortable: true,
      render: (e) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{e.evaluatorName}</span>,
    },
    {
      key: 'date', header: 'Дата', sortable: true,
      render: (e) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{fmtDateShort(rowDate(e))}</span>,
    },
    {
      key: 'status', header: 'Статус', sortable: true,
      render: (e) => <EvaluationStatusBadge status={e.status} />,
    },
    {
      key: 'finalScore', header: 'Итог', sortable: true, align: 'right',
      render: (e) => (
        <span className="font-display tabular-nums" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
          {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
        </span>
      ),
    },
    {
      key: 'delta', header: 'Δ', align: 'right',
      render: (e) => {
        const d = signedDelta(deltaById.get(e.id) ?? null)
        const color = d.tone === 'up' ? 'var(--accent-2)' : d.tone === 'down' ? 'var(--danger)' : 'var(--ink-faint)'
        return <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color }}>{d.txt}</span>
      },
    },
  ]

  const FILTERS: FilterDef[] = [
    {
      key: 'status', label: 'Статус', type: 'select',
      options: [
        { value: '', label: 'Все статусы' },
        ...STATUS_ORDER.map(s => ({ value: s, label: STATUS_LABELS[s] })),
      ],
    },
  ]

  const searchText = (e: Evaluation) =>
    `Период #${e.periodId} ${formatPeriodRange(periodById.get(e.periodId), e.periodId)} ${e.evaluatorName}`

  const clientFilter = (e: Evaluation, v: Record<string, string>) =>
    !v.status || e.status === v.status

  const comparator = (key: string) => (a: Evaluation, b: Evaluation): number => {
    switch (key) {
      case 'evaluator':  return a.evaluatorName.localeCompare(b.evaluatorName, 'ru')
      case 'status':     return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
      case 'finalScore': return (a.finalScore ?? -1) - (b.finalScore ?? -1)
      case 'period': {
        const pa = periodById.get(a.periodId)
        const pb = periodById.get(b.periodId)
        if (pa && pb) return pa.startDate.localeCompare(pb.startDate)
        return a.periodId - b.periodId
      }
      case 'date':
      default:           return (rowDate(a) ?? '').localeCompare(rowDate(b) ?? '')
    }
  }

  const renderCard = (e: Evaluation): ReactNode => {
    const d = signedDelta(deltaById.get(e.id) ?? null)
    const deltaColor = d.tone === 'up' ? 'var(--accent-2)' : d.tone === 'down' ? 'var(--danger)' : 'var(--ink-faint)'
    return (
      <div
        onClick={() => navigate(`/my-evaluations/${e.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/my-evaluations/${e.id}`) } }}
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 16, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {formatPeriodRange(periodById.get(e.periodId), e.periodId)}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
              {fmtDateShort(rowDate(e))}
            </div>
          </div>
          <EvaluationStatusBadge status={e.status} />
        </div>
        <div className="flex items-end justify-between gap-3" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <span className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{e.evaluatorName}</span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display tabular-nums" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
              {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
            </span>
            <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: deltaColor }}>{d.txt}</span>
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
              title="SELF.AVG" id="A01" loading={loading}
              value={avgWhole} unit="/ 100" zoneScore={avgWhole}
              gauge={{
                pct: avgScore !== null ? avgScore / 100 : 0, variant: 'marker',
                left: '0', right: '100',
                current: avgWhole !== null ? avgWhole : '—',
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="EVAL.TOTAL" id="T01" loading={loading}
              value={total} label="оценок"
              gauge={{
                pct: total > 0 ? closed / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{closed}</strong> закрыто</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="INBOX" id="I01" loading={loading}
              value={pending + appealed} label="требуют реакции"
              onClick={() => navigate('/my-tasks')}
              gauge={{
                pct: total > 0 ? (pending + appealed) / total : 0, variant: 'meta',
                left: <><strong>{pending}</strong> ждут</>,
                center: <><strong>{appealed}</strong> {plural(appealed, ['апелл', 'апелл', 'апелл'])}</>,
                right: total,
              }}
            />
            <StatusDistributionCard
              className="dv3-col-3"
              counts={counts} total={total} loading={loading}
            />
          </div>

      {/* LIST + DISTRIBUTION */}
          <div style={{ marginTop: 24 }}>
        <DataPanel<Evaluation>
          mode="client"
          columns={columns}
          rows={all}
          rowKey={(e) => e.id}
          loading={loading}
          caption="Журнал моих оценок"
          empty="Нет оценок"
          searchable
          searchText={searchText}
          searchPlaceholder="Поиск по периоду или оценщику"
          filters={FILTERS}
          clientFilter={clientFilter}
          comparator={comparator}
          defaultSort={{ key: 'date', dir: 'desc' }}
          views={['table', 'cards']}
          renderCard={renderCard}
          panelStorageKey={PANEL_KEY}
          columnConfig
          onRowClick={(e) => navigate(`/my-evaluations/${e.id}`)}
        />

          </div>
        </div>
      </div>
    </>
  )
}
