import { useEffect, useMemo, useState, useCallback } from 'react'
import { delegationsApi, Delegation, DelegationRequest } from './delegationsApi'
import { DelegationFormModal } from './components/DelegationFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Layout } from '../../components/Layout'
import api from '../../app/api'
import { DataTable, type Column } from '../../components/DataTable'
import { TableCard } from '../../components/TableCard'
import { Badge, type BadgeTone } from '../../components/Badge'

/* ────────────────────────────────────────────────────────────────────────────
 * "Делегирования оценки" — admin ledger.
 * Cream surface + 3px stripe cards, JetBrains Mono labels, Source Serif display,
 * green accent. Filter chips + search + ledger rows.
 * ────────────────────────────────────────────────────────────────────────── */

interface User {
  id: number
  fullName: string
  email: string
}
interface UsersPage { content: User[] }

type FilterKey = 'ALL' | 'ACTIVE' | 'EXPIRED' | 'EXPIRING'

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function urgency(d: Delegation): { tone: BadgeTone; label: string } {
  if (!d.isActive) return { tone: 'neutral', label: 'завершено' }
  const days = daysUntil(d.validTo)
  if (days < 0)  return { tone: 'danger',  label: `истекло ${Math.abs(days)}д` }
  if (days <= 7) return { tone: 'warn',    label: `${days}д осталось` }
  return { tone: 'success', label: `${days}д` }
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
}

const PAGE_SIZE = 15

/* ────────────────────────────────────────────────────────────────────────── */

export function DelegationsPage() {
  const [all, setAll] = useState<Delegation[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Delegation | null>(null)

  const [filter, setFilter] = useState<FilterKey>('ALL')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  const loadDelegations = useCallback(async () => {
    setLoading(true)
    try {
      // pull full set; client-side filter/search/paginate (admin-only, ~100 emp)
      const data = await delegationsApi.list(0, 500)
      setAll(data.content)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDelegations() }, [loadDelegations])

  useEffect(() => {
    api.get<UsersPage>('/users', { params: { size: 200 } })
      .then(r => setUsers(r.data.content))
      .catch(() => {})
  }, [])

  const handleSave = async (data: DelegationRequest) => {
    await delegationsApi.create(data)
    await loadDelegations()
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await delegationsApi.deactivate(deactivateTarget.id)
      setDeactivateTarget(null)
      await loadDelegations()
    } catch {
      setDeactivateTarget(null)
    }
  }

  /* ── stats ─────────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const active = all.filter(d => d.isActive)
    const expired = all.filter(d => !d.isActive)
    const expiring = active.filter(d => {
      const days = daysUntil(d.validTo)
      return days >= 0 && days <= 7
    })
    const overdue = active.filter(d => daysUntil(d.validTo) < 0)
    const delegatees = new Set(active.map(d => d.evaluateeId)).size
    return {
      total: all.length,
      active: active.length,
      expired: expired.length,
      expiring: expiring.length,
      overdue: overdue.length,
      delegatees,
    }
  }, [all])

  /* ── filter + search ───────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let rows = all
    if (filter === 'ACTIVE')   rows = rows.filter(d => d.isActive)
    if (filter === 'EXPIRED')  rows = rows.filter(d => !d.isActive)
    if (filter === 'EXPIRING') rows = rows.filter(d => d.isActive && (() => {
      const days = daysUntil(d.validTo); return days >= 0 && days <= 7
    })())
    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter(d =>
        (d.evaluateeName ?? '').toLowerCase().includes(q) ||
        (d.delegatedToName ?? '').toLowerCase().includes(q)
      )
    }
    return [...rows].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return new Date(a.validTo).getTime() - new Date(b.validTo).getTime()
    })
  }, [all, filter, query])

  useEffect(() => { setPage(0) }, [filter, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const columns: Column<Delegation>[] = [
    {
      key: 'rank',
      header: '#',
      width: '44px',
      render: (d) => (
        <span className="font-mono tabular-nums" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
          {String(page * PAGE_SIZE + pageRows.indexOf(d) + 1).padStart(2, '0')}
        </span>
      ),
    },
    {
      key: 'evaluatee',
      header: 'Оцениваемый',
      render: (d) => <PersonChip name={d.evaluateeName ?? '—'} tone="from" />,
    },
    {
      key: 'arrow',
      header: 'переход',
      srOnlyHeader: true,
      width: '24px',
      align: 'center',
      render: () => (
        <span className="font-mono" style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 600 }}>→</span>
      ),
    },
    {
      key: 'delegate',
      header: 'Делегат',
      render: (d) => <PersonChip name={d.delegatedToName ?? '—'} tone="to" />,
    },
    {
      key: 'period',
      header: 'Период',
      render: (d) => (
        <span className="font-mono tabular-nums" style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>
          {fmtDate(d.validFrom)} — {fmtDate(d.validTo)}
        </span>
      ),
    },
    {
      key: 'window',
      header: 'Окно',
      render: (d) => {
        const u = urgency(d)
        return <Badge tone={u.tone}>{u.label}</Badge>
      },
    },
    {
      key: 'action',
      header: 'Действие',
      align: 'right',
      width: '110px',
      render: (d) =>
        d.isActive ? (
          <button
            type="button"
            onClick={() => setDeactivateTarget(d)}
            className="font-mono uppercase tracking-widest transition-colors"
            style={{
              fontSize: 9.5, padding: '4px 10px', borderRadius: 4, fontWeight: 700,
              cursor: 'pointer', background: 'transparent', color: 'var(--danger)',
              border: '1px solid var(--danger-soft)',
            }}
          >
            Снять
          </button>
        ) : (
          <span className="font-mono uppercase tracking-widest" style={{ fontSize: 9.5, color: 'var(--ink-dim)', fontWeight: 600 }}>
            архив
          </span>
        ),
    },
  ]

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <Layout>
      <style>{`
        @keyframes dl-rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .dl-rise { opacity: 0; animation: dl-rise 620ms cubic-bezier(.22,.61,.36,1) forwards }
        @media (max-width: 880px) { .dl-stats-grid { grid-template-columns: 1fr 1fr !important } }
        @media (max-width: 520px) { .dl-stats-grid { grid-template-columns: 1fr !important } .dl-strip { flex-direction: column; align-items: flex-start !important } }
        .dl-inactive { opacity: .65 }
      `}</style>

      <div style={{ padding: '8px 0 32px' }}>
        {/* ── HEADER STRIP ──────────────────────────────────────────────── */}
        <div className="dl-strip dl-rise flex items-end justify-between gap-4 mb-6 flex-wrap"
             style={{ animationDelay: '0ms' }}>
          <div>
            <div className="font-mono uppercase tracking-widest mb-1"
                 style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>
              Админ · Делегирование
            </div>
            <h1 className="font-display"
                style={{
                  fontSize: 30, fontWeight: 600, color: 'var(--ink)',
                  lineHeight: 1.1, margin: 0, letterSpacing: '-0.01em',
                }}>
              Делегирования<span style={{ color: 'var(--gold)' }}>.</span>
            </h1>
            <p style={{ marginTop: 6, fontSize: 13.5, color: 'var(--ink-soft)', maxWidth: 620, lineHeight: 1.5 }}>
              Передача права оценивать на ограниченный период.
              {stats.active > 0 && (
                <>
                  {' '}Сейчас активно{' '}
                  <strong style={{ color: 'var(--ink)' }}>
                    {stats.active} {plural(stats.active, ['делегирование', 'делегирования', 'делегирований'])}
                  </strong>
                  {stats.overdue > 0 && (
                    <>, из них{' '}
                      <strong style={{ color: 'var(--danger)' }}>{stats.overdue} истекл.</strong>
                    </>
                  )}.
                </>
              )}
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="font-mono uppercase tracking-widest transition-all hover:-translate-y-px"
            style={{
              fontSize: 11, fontWeight: 700, padding: '10px 18px',
              borderRadius: 6,
              background: 'var(--accent)',
              color: 'var(--surface)',
              border: '1px solid var(--accent-ink)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              letterSpacing: '0.08em',
            }}
          >
            + Новое делегирование
          </button>
        </div>

        {/* ── STATS ──────────────────────────────────────────────────────── */}
        <div className="grid gap-3 mb-5 dl-stats-grid dl-rise"
             style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', animationDelay: '90ms' }}>
          <StatCard
            label="Всего"
            mainText={String(stats.total)}
            mainColor="var(--ink)"
            stripe="var(--accent-2)"
            delta={{ txt: `${stats.delegatees} ${plural(stats.delegatees, ['чел.', 'чел.', 'чел.'])}`, tone: 'flat' }}
            footer="в реестре"
          />
          <StatCard
            label="Активные"
            mainText={String(stats.active)}
            mainColor={stats.active > 0 ? 'var(--accent-2)' : 'var(--ink-faint)'}
            stripe="var(--accent-2)"
            delta={{ txt: stats.active > 0 ? 'действуют' : '—', tone: 'flat' }}
            footer="сейчас в силе"
          />
          <StatCard
            label="Истекают"
            mainText={String(stats.expiring)}
            mainColor={stats.expiring > 0 ? '#9c7416' : 'var(--ink-faint)'}
            stripe={stats.expiring > 0 ? 'var(--warn, #c89628)' : 'var(--line-strong)'}
            delta={{ txt: stats.expiring > 0 ? '≤ 7д' : 'ок', tone: stats.expiring > 0 ? 'down' : 'up' }}
            footer="скоро закончатся"
          />
          <StatCard
            label="Просрочено"
            mainText={String(stats.overdue)}
            mainColor={stats.overdue > 0 ? 'var(--danger)' : 'var(--ink-faint)'}
            stripe={stats.overdue > 0 ? 'var(--danger)' : 'var(--line-strong)'}
            delta={{ txt: stats.overdue > 0 ? 'продлить' : '—', tone: stats.overdue > 0 ? 'down' : 'flat' }}
            footer="окно прошло"
          />
        </div>

        {/* ── LEDGER ─────────────────────────────────────────────────────── */}
        <div className="dl-rise" style={{ animationDelay: '180ms' }}>
          <TableCard
            header={
              <>
                {/* card header */}
                <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-display"
                          style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>
                      Реестр делегирований
                    </span>
                    <span className="font-mono font-semibold uppercase tracking-widest"
                          style={{
                            fontSize: 9.5, padding: '2px 7px', borderRadius: 4,
                            background: 'rgba(26,117,88,0.10)',
                            color: 'var(--accent-2)',
                            border: '1px solid rgba(26,117,88,0.24)',
                          }}>
                      Журнал
                    </span>
                  </div>
                  <span className="font-mono font-semibold"
                        style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {filtered.length}/{stats.total}
                  </span>
                </div>

                {/* filter chips + search */}
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterChips
                    value={filter}
                    onChange={setFilter}
                    counts={{
                      ALL: stats.total,
                      ACTIVE: stats.active,
                      EXPIRING: stats.expiring,
                      EXPIRED: stats.expired,
                    }}
                  />
                  <div className="ml-auto">
                    <input
                      type="search"
                      placeholder="Поиск по ФИО…"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      className="font-mono"
                      style={{
                        fontSize: 12,
                        padding: '6px 10px',
                        minWidth: 220,
                        borderRadius: 4,
                        border: '1px solid var(--line)',
                        background: 'var(--surface-mute)',
                        color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </>
            }
            footer={
              totalPages > 1
                ? <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                : undefined
            }
          >
            <DataTable<Delegation>
              caption="Реестр делегирований"
              columns={columns}
              rows={pageRows}
              rowKey={(d) => d.id}
              loading={loading}
              rowClassName={(d) => (d.isActive ? undefined : 'dl-inactive')}
              totalCount={filtered.length}
              empty={
                <div>
                  <div className="font-display mb-1"
                       style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-soft)' }}>
                    Ничего не найдено
                  </div>
                  <div className="font-mono uppercase tracking-widest"
                       style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
                    попробуйте сменить фильтр или поиск
                  </div>
                </div>
              }
            />
          </TableCard>
        </div>
      </div>

      <DelegationFormModal open={modalOpen} users={users} onSave={handleSave} onClose={() => setModalOpen(false)} />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Деактивировать делегирование?"
        description={`Делегирование от «${deactivateTarget?.evaluateeName ?? ''}» к «${deactivateTarget?.delegatedToName ?? ''}» будет деактивировано.`}
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </Layout>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers / subcomponents
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
    <div className="relative overflow-hidden rounded-lg"
         style={{
           background: 'var(--surface)',
           border: '1px solid var(--line-soft)',
           padding: '14px 16px',
           boxShadow: 'var(--shadow-sm)',
         }}>
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
        <span className="font-mono tabular-nums"
              style={{ fontSize: 11, color: deltaColor, fontWeight: 600 }}>
          {delta.txt}
        </span>
      </div>
      <div className="font-mono mt-2" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
        {footer}
      </div>
    </div>
  )
}

function FilterChips({ value, onChange, counts }: {
  value: FilterKey
  onChange: (v: FilterKey) => void
  counts: Record<FilterKey, number>
}) {
  const items: Array<{ key: FilterKey; label: string }> = [
    { key: 'ALL',      label: 'Все' },
    { key: 'ACTIVE',   label: 'Активные' },
    { key: 'EXPIRING', label: 'Истекают' },
    { key: 'EXPIRED',  label: 'Завершённые' },
  ]
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(it => {
        const active = value === it.key
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className="font-mono uppercase tracking-widest transition-all"
            style={{
              fontSize: 10, padding: '4px 9px', borderRadius: 4, fontWeight: 600,
              cursor: 'pointer',
              background: active ? 'var(--ink)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--ink-soft)',
              border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
            }}
          >
            {it.label}
            <span className="ml-1.5 tabular-nums" style={{ opacity: 0.7 }}>{counts[it.key]}</span>
          </button>
        )
      })}
    </div>
  )
}

function PersonChip({ name, tone }: { name: string; tone: 'from' | 'to' }) {
  const spec = tone === 'from'
    ? { bg: 'rgba(120,150,200,0.10)', fg: '#4a73c7', border: 'rgba(120,150,200,0.28)' }
    : { bg: 'rgba(26,117,88,0.10)',   fg: 'var(--accent-2)', border: 'rgba(26,117,88,0.24)' }
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="font-mono shrink-0"
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: spec.bg, color: spec.fg,
              border: `1px solid ${spec.border}`,
              fontSize: 9.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '0.02em',
            }}>
        {initials(name)}
      </span>
      <span className="truncate"
            style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
        {name}
      </span>
    </div>
  )
}

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
            width: 30, height: 28, borderRadius: 4,
            fontSize: 11, fontWeight: 600,
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
