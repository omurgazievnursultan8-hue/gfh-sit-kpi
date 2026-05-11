import { useEffect, useState } from 'react'
import api from '../../app/api'

export interface CurrentPeriod {
  id: number
  type: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
  startDate: string
  endDate: string
  submissionDeadline: string
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
}

let cache: { period: CurrentPeriod | null; ts: number } | null = null
const TTL_MS = 60_000

export function useCurrentPeriod() {
  const [period, setPeriod] = useState<CurrentPeriod | null>(
    cache && Date.now() - cache.ts < TTL_MS ? cache.period : null
  )
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache && Date.now() - cache.ts < TTL_MS) return
    let cancelled = false
    setLoading(true)
    api.get<CurrentPeriod | ''>('/periods/current')
      .then(res => {
        if (cancelled) return
        const p = (res.data && typeof res.data === 'object') ? res.data : null
        cache = { period: p, ts: Date.now() }
        setPeriod(p)
      })
      .catch(() => { if (!cancelled) setPeriod(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { period, loading }
}

export function formatPeriodLabel(p: CurrentPeriod, lang: 'ru' | 'kg'): string {
  const start = new Date(p.startDate)
  const year = start.getFullYear()
  const month = start.getMonth() // 0-indexed
  if (p.type === 'QUARTERLY') {
    const q = Math.floor(month / 3) + 1
    return `Q${q} · ${year}`
  }
  if (p.type === 'MONTHLY') {
    const monthsRu = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
    const monthsKg = ['Янв','Фев','Март','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
    const m = (lang === 'kg' ? monthsKg : monthsRu)[month]
    return `${m} · ${year}`
  }
  return `${year}`
}

export function daysUntilDeadline(p: CurrentPeriod): number {
  const dl = new Date(p.submissionDeadline).getTime()
  const ms = dl - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}
