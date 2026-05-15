import { useEffect, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { periodsApi, Period, PeriodStatus, PeriodProgress } from './periodsApi'
import { PeriodCard } from './components/PeriodCard'
import { PeriodFormModal, PeriodFormData } from './components/PeriodFormModal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { usePageTitle } from '../../context/PageContext'

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
    }
  }, [])

  useEffect(() => { load() }, [load])

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

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px' }}>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)' }}>
          Периоды оценки
        </h1>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 font-mono uppercase tracking-widest"
          style={{ fontSize: 10.5, fontWeight: 600, padding: '8px 14px', borderRadius: 6, background: 'var(--accent-2,#2f9e6d)', color: '#fff' }}
        >
          <Plus size={14} /> Создать период
        </button>
      </div>

      {actionError && (
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--danger)' }}>{actionError}</div>
      )}

      {loading && (
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Загрузка…</div>
      )}

      {loadError && !loading && (
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--danger)' }}>{loadError}</div>
      )}

      {!loading && !loadError && periods.length === 0 && (
        <div className="font-mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          Периодов пока нет. Создайте первый.
        </div>
      )}

      {!loading && !loadError && SECTIONS.map(section => {
        const items = periods.filter(p => p.status === section.status)
        if (items.length === 0) return null
        return (
          <div key={section.status} className="mb-7">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-mono uppercase font-semibold tracking-widest" style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
                {section.label}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{items.length}</span>
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
  )
}
