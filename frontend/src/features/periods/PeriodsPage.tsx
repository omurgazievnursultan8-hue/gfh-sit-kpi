import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { periodsApi, Period, PeriodStatus, PeriodProgress } from './periodsApi'
import { PeriodCard } from './components/PeriodCard'
import { PeriodFormModal, PeriodFormData } from './components/PeriodFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { usePageTitle } from '../../context/PageContext'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'

const PLACEHOLDER = '··'

const SECTIONS: { status: PeriodStatus; label: string }[] = [
  { status: 'ACTIVE', label: 'Активные' },
  { status: 'DRAFT',  label: 'Черновики' },
  { status: 'CLOSED', label: 'Завершённые' },
]

export function PeriodsPage() {
  usePageTitle('Периоды оценки')

  const [periods, setPeriods] = useState<Period[]>([])
  const [progress, setProgress] = useState<Record<number, PeriodProgress>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [closeTarget, setCloseTarget] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [now, setNow] = useState(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await periodsApi.list()
      setPeriods(list)
      const withProgress = list.filter(p => p.status === 'ACTIVE' || p.status === 'CLOSED')
      const entries = await Promise.all(
        withProgress.map(async p => {
          try {
            return [p.id, await periodsApi.progress(p.id)] as const
          } catch {
            return [p.id, { total: 0, completed: 0 }] as const
          }
        }),
      )
      setProgress(Object.fromEntries(entries))
    } catch {
      setLoadError('Не удалось загрузить периоды')
    } finally {
      setLoading(false)
      setLoadedAt(new Date())
    }
  }, [])

  useEffect(() => { load() }, [load])

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
  const total = periods.length
  const activeCount = useMemo(() => periods.filter(p => p.status === 'ACTIVE').length, [periods])
  const draftCount = useMemo(() => periods.filter(p => p.status === 'DRAFT').length, [periods])
  const closedCount = useMemo(() => periods.filter(p => p.status === 'CLOSED').length, [periods])

  const handleCreate = async (data: PeriodFormData) => {
    await periodsApi.create(data)
    await load()
  }

  const handleActivate = async (id: number) => {
    setBusyId(id)
    try {
      await periodsApi.activate(id)
      setActionError(null)
      await load()
    } catch {
      setActionError('Не удалось активировать период')
    } finally {
      setBusyId(null)
    }
  }

  const handleClose = async () => {
    if (closeTarget == null) return
    const id = closeTarget
    setCloseTarget(null)
    setBusyId(id)
    try {
      await periodsApi.close(id)
      setActionError(null)
      await load()
    } catch {
      setActionError('Не удалось закрыть период')
    } finally {
      setBusyId(null)
    }
  }

  const failed = loadError !== null

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
              title="PERIODS.TOTAL" id="P01" loading={loading}
              value={total} label="периодов"
            />
            <StatCard
              className="dv3-col-3"
              title="ACTIVE" id="A01" loading={loading}
              value={activeCount} label="активны"
              gauge={{
                pct: total > 0 ? activeCount / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((activeCount / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="DRAFT" id="D01" loading={loading}
              value={draftCount} label="черновики"
              gauge={{
                pct: total > 0 ? draftCount / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((draftCount / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
            <StatCard
              className="dv3-col-3"
              title="CLOSED" id="C01" loading={loading}
              value={closedCount} label="завершены"
              gauge={{
                pct: total > 0 ? closedCount / total : 0, variant: 'meta',
                left: '0',
                center: <><strong>{total > 0 ? Math.round((closedCount / total) * 100) : 0}%</strong> всех</>,
                right: total,
              }}
            />
          </div>
          <div style={{ marginTop: 24 }}>
        <div className="flex items-baseline justify-end mb-6">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 font-mono uppercase tracking-widest"
            style={{ fontSize: 10.5, fontWeight: 600, padding: '8px 14px', borderRadius: 6, background: 'var(--dv3-accent)', color: '#fff' }}
          >
            <Plus size={14} /> Создать период
          </button>
        </div>

        {actionError && (
          <div className="font-mono" style={{ fontSize: 12, color: 'var(--dv3-zone-down)' }}>{actionError}</div>
        )}

        {loading && (
          <div className="font-mono" style={{ fontSize: 12, color: 'var(--dv3-text3)' }}>Загрузка…</div>
        )}

        {loadError && !loading && (
          <div className="font-mono" style={{ fontSize: 12, color: 'var(--dv3-zone-down)' }}>{loadError}</div>
        )}

        {!loading && !loadError && periods.length === 0 && (
          <div className="font-mono" style={{ fontSize: 12, color: 'var(--dv3-text3)' }}>
            Периодов пока нет. Создайте первый.
          </div>
        )}

        {!loading && !loadError && SECTIONS.map(section => {
          const items = periods.filter(p => p.status === section.status)
          if (items.length === 0) return null
          return (
            <div key={section.status} className="mb-7">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="font-mono uppercase font-semibold tracking-widest" style={{ fontSize: 10.5, color: 'var(--dv3-text3)' }}>
                  {section.label}
                </span>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--dv3-text3)' }}>{items.length}</span>
              </div>
              <div className="grid gap-3">
                {items.map(p => (
                  <PeriodCard
                    key={p.id}
                    period={p}
                    progress={progress[p.id]}
                    busy={busyId === p.id}
                    onActivate={handleActivate}
                    onClose={id => setCloseTarget(id)}
                  />
                ))}
              </div>
            </div>
          )
        })}

        <PeriodFormModal
          open={modalOpen}
          onSave={handleCreate}
          onClose={() => setModalOpen(false)}
        />

        <ConfirmDialog
          open={closeTarget !== null}
          title="Закрыть период?"
          description="После закрытия период нельзя будет редактировать или активировать заново."
          variant="danger"
          confirmLabel="Закрыть"
          onConfirm={handleClose}
          onCancel={() => setCloseTarget(null)}
        />
          </div>
        </div>
      </div>
    </>
  )
}
