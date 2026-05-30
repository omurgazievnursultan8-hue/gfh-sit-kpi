import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Density } from '../components/datapanel/DataTable'

export type { Density }

// Safari private mode + locked-down profiles throw on localStorage access.
function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}

const STORAGE_KEY = 'gfh_density'
const DEFAULT_DENSITY: Density = 'comfortable'

function isDensity(v: string | null): v is Density {
  return v === 'comfortable' || v === 'compact'
}

interface DensityContextValue {
  density: Density
  setDensity: (d: Density) => void
}

const DensityContext = createContext<DensityContextValue>({
  density: DEFAULT_DENSITY,
  setDensity: () => { /* noop — rendered outside DensityProvider */ },
})

// Internal: owns the localStorage-backed density state. Used only by
// DensityProvider so the whole app shares a single instance.
function useDensityState(): DensityContextValue {
  const [density, setDensityState] = useState<Density>(() => {
    const stored = safeGet(STORAGE_KEY)
    return isDensity(stored) ? stored : DEFAULT_DENSITY
  })

  const setDensity = (next: Density) => {
    setDensityState(next)
    safeSet(STORAGE_KEY, next)
  }

  // Cross-tab sync: another tab changing density propagates to this one.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      setDensityState(isDensity(e.newValue) ? e.newValue : DEFAULT_DENSITY)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { density, setDensity }
}

export function DensityProvider({ children }: { children: ReactNode }) {
  const value = useDensityState()
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
}

// Public accessor — every consumer (DataTable, UserTable, IconRail) uses this
// so they all read and write the same shared density value.
export function useDensity(): DensityContextValue {
  return useContext(DensityContext)
}
