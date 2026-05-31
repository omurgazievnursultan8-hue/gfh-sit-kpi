import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type AdminRange = 'week' | 'month' | 'trimester' | 'half' | 'year'

export const ADMIN_RANGE_OPTIONS: { value: AdminRange; labelRu: string; days: number }[] = [
  { value: 'week',      labelRu: 'неделя',    days: 7 },
  { value: 'month',     labelRu: 'месяц',     days: 30 },
  { value: 'trimester', labelRu: 'квартал',   days: 90 },
  { value: 'half',      labelRu: '6 месяцев', days: 180 },
  { value: 'year',      labelRu: 'год',       days: 365 },
]

const STORAGE_KEY = 'gfh_admin_range'

interface Ctx {
  range: AdminRange
  setRange: (r: AdminRange) => void
}

const AdminRangeContext = createContext<Ctx | null>(null)

export function AdminRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRangeState] = useState<AdminRange>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AdminRange | null
    return stored && ADMIN_RANGE_OPTIONS.some(o => o.value === stored) ? stored : 'month'
  })
  useEffect(() => { localStorage.setItem(STORAGE_KEY, range) }, [range])
  return (
    <AdminRangeContext.Provider value={{ range, setRange: setRangeState }}>
      {children}
    </AdminRangeContext.Provider>
  )
}

export function useAdminRange(): Ctx {
  const ctx = useContext(AdminRangeContext)
  if (!ctx) throw new Error('useAdminRange must be used within AdminRangeProvider')
  return ctx
}
