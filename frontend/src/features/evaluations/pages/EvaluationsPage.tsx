import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../app/store'
import { evaluationsApi, type Evaluation, type EvaluationStatus } from '../api'
import { periodsApi, type Period } from '@/features/periods/api'
import { usePageTitle } from '@/layouts/shell/PageContext'
import { DASHBOARD_CSS } from '../../dashboard/styles'
import { DataPanel, type Column, type FilterDef } from '@/shared/datapanel/DataPanel'
import {
  STATUS_LABELS, STATUS_ORDER, EvaluationStatusBadge,
} from '../components/evaluationStatus'
import { formatPeriodRange } from '../components/periodFormat'

/* ──────────────────────────────────────────────────────────────────────────
 * Unified evaluations page. Two modes:
 *   - received: my history (any role)
 *   - given:    evaluations I conducted (managers)
 * Tabs visible only when user has both perspectives available.
 * ────────────────────────────────────────────────────────────────────────── */

export type EvaluationsMode = 'received' | 'given'

const MANAGER_ROLES = new Set([
  'ADMIN', 'CHAIRMAN', 'DEPUTY_CHAIRMAN', 'ORG_HEAD',
])

const PANEL_KEY: Record<EvaluationsMode, string> = {
  received: 'gfh_my_evaluations',
  given:    'gfh_evaluator_evaluations',
}

const TITLE_KEY: Record<EvaluationsMode, string> = {
  received: 'nav.myEvaluations',
  given:    'nav.evaluations',
}

function fmtDateShort(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function rowDate(e: Evaluation): string | null {
  return e.submittedAt ?? e.createdAt
}

function periodShortLabel(p: Period): string {
  const start = new Date(p.startDate)
  const year = start.getFullYear()
  if (p.type === 'QUARTERLY') return `Q${Math.floor(start.getMonth() / 3) + 1} ${year}`
  if (p.type === 'MONTHLY') return `${String(start.getMonth() + 1).padStart(2, '0')}.${year}`
  return `${year}`
}

function signedDelta(n: number | null): { txt: string; tone: 'up' | 'down' | 'flat' } {
  if (n === null || Number.isNaN(n)) return { txt: '—', tone: 'flat' }
  if (Math.abs(n) < 0.05) return { txt: '±0.0', tone: 'flat' }
  return { txt: `${n > 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}`, tone: n > 0 ? 'up' : 'down' }
}

interface Props {
  defaultMode: EvaluationsMode
}

export function EvaluationsPage({ defaultMode }: Props) {
  const navigate = useNavigate()
  const role = useSelector((s: RootState) => s.auth.role)
  const isManager = !!role && MANAGER_ROLES.has(role)

  // Plain employees can't switch — given mode is gated upstream by ProtectedRoute.
  const [mode, setMode] = useState<EvaluationsMode>(defaultMode)
  const effectiveMode: EvaluationsMode = isManager ? mode : 'received'

  usePageTitle(TITLE_KEY[effectiveMode])

  const [all, setAll] = useState<Evaluation[]>([])
  const [periodById, setPeriodById] = useState<Map<number, Period>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const fetchEvals = effectiveMode === 'received'
      ? evaluationsApi.myHistory(0, 200)
      : evaluationsApi.asEvaluator(0, 500)
    Promise.allSettled([fetchEvals, periodsApi.list()])
      .then(([evals, periods]) => {
        if (evals.status === 'fulfilled') setAll(evals.value.content)
        else setAll([])
        if (periods.status === 'fulfilled') {
          setPeriodById(new Map(periods.value.map(p => [p.id, p])))
        }
      })
      .finally(() => setLoading(false))
  }, [effectiveMode])

  /* ── stats ─────────────────────────────────────────────────────────────── */
  const counts = useMemo<Record<EvaluationStatus, number>>(() => {
    const c: Record<EvaluationStatus, number> = {
      DRAFT: 0, SUBMITTED: 0, ACKNOWLEDGED: 0, APPEALED: 0, CLOSED: 0,
    }
    for (const e of all) c[e.status] += 1
    return c
  }, [all])

  // received-only: Δ vs next-older scored entry, computed in API order.
  const deltaById = useMemo(() => {
    const m = new Map<number, number | null>()
    if (effectiveMode !== 'received') return m
    const scored = all.filter(e => e.finalScore !== null)
    for (let i = 0; i < scored.length; i++) {
      const cur = scored[i].finalScore as number
      const prev = i + 1 < scored.length ? scored[i + 1].finalScore : null
      m.set(scored[i].id, prev !== null ? cur - prev : null)
    }
    return m
  }, [all, effectiveMode])

  // given-only: period filter options.
  const periodsInData = useMemo(() => {
    const ids = Array.from(new Set(all.map(e => e.periodId)))
    return ids
      .map(id => periodById.get(id))
      .filter((p): p is Period => !!p)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  }, [all, periodById])

  /* ── DataPanel columns ─────────────────────────────────────────────────── */
  const subjectCol: Column<Evaluation> = effectiveMode === 'received'
    ? {
        key: 'subject', header: 'Оценщик', sortable: true,
        render: (e) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{e.evaluatorName}</span>,
      }
    : {
        key: 'subject', header: 'Сотрудник', sortable: true, hideable: false,
        render: (e) => (
          <div>
            <div className="font-display" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
              {e.evaluateeName}
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
              {fmtDateShort(rowDate(e))}
            </div>
          </div>
        ),
      }

  const periodCol: Column<Evaluation> = {
    key: 'period', header: 'Период', sortable: true,
    render: (e) => {
      const p = periodById.get(e.periodId)
      if (effectiveMode === 'received') {
        return (
          <div>
            <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              {formatPeriodRange(p, e.periodId)}
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
              {fmtDateShort(rowDate(e))}
            </div>
          </div>
        )
      }
      return (
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {p ? periodShortLabel(p) : `#${e.periodId}`}
        </span>
      )
    },
  }

  const statusCol: Column<Evaluation> = {
    key: 'status', header: 'Статус', sortable: true,
    render: (e) => <EvaluationStatusBadge status={e.status} />,
  }

  const scoreCol: Column<Evaluation> = {
    key: 'finalScore', header: 'Итог', sortable: true, align: 'right',
    render: (e) => (
      <span className="font-display tabular-nums" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
        {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
      </span>
    ),
  }

  const deltaCol: Column<Evaluation> = {
    key: 'delta', header: 'Δ', align: 'right',
    render: (e) => {
      const d = signedDelta(deltaById.get(e.id) ?? null)
      const color = d.tone === 'up' ? 'var(--accent-2)' : d.tone === 'down' ? 'var(--danger)' : 'var(--ink-faint)'
      return <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color }}>{d.txt}</span>
    },
  }

  const dateCol: Column<Evaluation> = {
    key: 'date', header: 'Дата', sortable: true,
    render: (e) => <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{fmtDateShort(rowDate(e))}</span>,
  }

  const columns: Column<Evaluation>[] = effectiveMode === 'received'
    ? [periodCol, subjectCol, dateCol, statusCol, scoreCol, deltaCol]
    : [subjectCol, periodCol, statusCol, scoreCol]

  /* ── filters + search + sort ───────────────────────────────────────────── */
  const FILTERS: FilterDef[] = useMemo(() => {
    const statusOptions = [
      { value: '', label: 'Все статусы' },
      ...STATUS_ORDER
        .filter(s => effectiveMode === 'received' || counts[s] > 0)
        .map(s => ({ value: s, label: STATUS_LABELS[s] })),
    ]
    const defs: FilterDef[] = [
      { key: 'status', label: 'Статус', type: 'select', options: statusOptions },
    ]
    if (effectiveMode === 'given' && periodsInData.length > 1) {
      defs.push({
        key: 'period', label: 'Период', type: 'select',
        options: [
          { value: '', label: 'Все периоды' },
          ...periodsInData.map(p => ({ value: String(p.id), label: periodShortLabel(p) })),
        ],
      })
    }
    return defs
  }, [counts, periodsInData, effectiveMode])

  const searchText = (e: Evaluation) => {
    const p = periodById.get(e.periodId)
    if (effectiveMode === 'received') {
      return `Период #${e.periodId} ${formatPeriodRange(p, e.periodId)} ${e.evaluatorName}`
    }
    return `${e.evaluateeName} ${p ? periodShortLabel(p) : ''} #${e.periodId}`
  }

  const clientFilter = (e: Evaluation, v: Record<string, string>) => {
    if (v.status && e.status !== v.status) return false
    if (v.period && String(e.periodId) !== v.period) return false
    return true
  }

  const comparator = (key: string) => (a: Evaluation, b: Evaluation): number => {
    switch (key) {
      case 'subject':
        return effectiveMode === 'received'
          ? a.evaluatorName.localeCompare(b.evaluatorName, 'ru')
          : a.evaluateeName.localeCompare(b.evaluateeName, 'ru')
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

  const openRow = (e: Evaluation) => {
    if (effectiveMode === 'given') navigate(`/evaluations/${e.id}`)
    else navigate(`/my-evaluations/${e.id}`)
  }

  const renderCard = (e: Evaluation): ReactNode => {
    const p = periodById.get(e.periodId)
    const title = effectiveMode === 'received'
      ? formatPeriodRange(p, e.periodId)
      : e.evaluateeName
    const sub = effectiveMode === 'received'
      ? e.evaluatorName
      : (p ? periodShortLabel(p) : `#${e.periodId}`)
    const d = effectiveMode === 'received' ? signedDelta(deltaById.get(e.id) ?? null) : null
    const deltaColor = d
      ? (d.tone === 'up' ? 'var(--accent-2)' : d.tone === 'down' ? 'var(--danger)' : 'var(--ink-faint)')
      : 'var(--ink-faint)'
    return (
      <div
        onClick={() => openRow(e)}
        role="button"
        tabIndex={0}
        onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openRow(e) } }}
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 16, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display truncate" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {title}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
              {fmtDateShort(rowDate(e))}
            </div>
          </div>
          <EvaluationStatusBadge status={e.status} />
        </div>
        <div className="flex items-end justify-between gap-3" style={{ paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <span className="truncate" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{sub}</span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display tabular-nums" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
              {e.finalScore !== null ? Number(e.finalScore).toFixed(1) : '—'}
            </span>
            {d && (
              <span className="font-mono tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: deltaColor }}>{d.txt}</span>
            )}
          </span>
        </div>
      </div>
    )
  }

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>

      <div className="dv3-terminal">
        {isManager && (
          <div className="flex gap-1" role="tablist" aria-label="Перспектива оценок" style={{ marginBottom: 16 }}>
            {([
              { key: 'received', label: 'МОИ ОЦЕНКИ' },
              { key: 'given',    label: 'Я ОЦЕНЩИК' },
            ] as Array<{ key: EvaluationsMode; label: string }>).map(it => {
              const active = effectiveMode === it.key
              return (
                <button
                  key={it.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(it.key)}
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
        )}

        <div>
          <DataPanel<Evaluation>
            mode="client"
            columns={columns}
            rows={all}
            rowKey={(e) => e.id}
            loading={loading}
            caption={effectiveMode === 'received' ? 'Журнал моих оценок' : 'Проведённые оценки'}
            empty={effectiveMode === 'received' ? 'Нет оценок' : 'Нет оценок по выбранным фильтрам'}
            searchable
            searchText={searchText}
            searchPlaceholder={effectiveMode === 'received' ? 'Поиск по периоду или оценщику' : 'Поиск по сотруднику или периоду'}
            filters={FILTERS}
            clientFilter={clientFilter}
            comparator={comparator}
            defaultSort={effectiveMode === 'received' ? { key: 'date', dir: 'desc' } : { key: 'subject', dir: 'asc' }}
            views={['table', 'cards']}
            renderCard={renderCard}
            panelStorageKey={PANEL_KEY[effectiveMode]}
            columnConfig
            onRowClick={openRow}
          />
        </div>
      </div>
    </div>
  )
}
