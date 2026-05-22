import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { periodsApi, type Period } from '../features/periods/periodsApi'

// Sentinel for the "all periods" selector option.
export const ALL_PERIODS = 'ALL' as const
export type PeriodSelection = number | typeof ALL_PERIODS

// Nearest period: the ACTIVE one if any, else the most recent period that has
// already started, else the most recent of all. Returns ALL when empty.
export function pickNearestPeriod(periods: Period[]): PeriodSelection {
  if (periods.length === 0) return ALL_PERIODS
  const active = periods.find(p => p.status === 'ACTIVE')
  if (active) return active.id
  const today = new Date().toISOString().slice(0, 10)
  const byStartDesc = [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate))
  return (byStartDesc.find(p => p.startDate <= today) ?? byStartDesc[0]).id
}

interface PeriodContextValue {
  periods: Period[]
  /** Periods sorted newest-first — selector option order. */
  periodOptions: Period[]
  /** id → period lookup. */
  periodById: Map<number, Period>
  selectedPeriod: PeriodSelection
  setSelectedPeriod: (p: PeriodSelection) => void
  isAllPeriods: boolean
  loading: boolean
}

const PeriodContext = createContext<PeriodContextValue>({
  periods: [], periodOptions: [], periodById: new Map(),
  selectedPeriod: ALL_PERIODS, setSelectedPeriod: () => {},
  isAllPeriods: true, loading: true,
})

// Holds the period selection app-wide so the topbar selector scopes every page.
export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelected] = useState<PeriodSelection>(ALL_PERIODS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    periodsApi.list()
      .then(ps => {
        setPeriods(ps)
        setSelected(pickNearestPeriod(ps))
      })
      .catch(() => { /* selector falls back to ALL */ })
      .finally(() => setLoading(false))
  }, [])

  const setSelectedPeriod = useCallback((p: PeriodSelection) => setSelected(p), [])

  const value = useMemo<PeriodContextValue>(() => {
    const periodOptions = [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate))
    return {
      periods,
      periodOptions,
      periodById: new Map(periods.map(p => [p.id, p])),
      selectedPeriod,
      setSelectedPeriod,
      isAllPeriods: selectedPeriod === ALL_PERIODS,
      loading,
    }
  }, [periods, selectedPeriod, setSelectedPeriod, loading])

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod(): PeriodContextValue {
  return useContext(PeriodContext)
}
