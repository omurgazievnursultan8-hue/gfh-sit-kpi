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

export interface PeriodProgress {
  pct: number
  daysTotal: number
  daysElapsed: number
  daysLeft: number
  endLabel: string
}

// Elapsed share of [startDate, submissionDeadline]. Clamped to [0, 100].
export function periodProgress(p: CurrentPeriod): PeriodProgress {
  const start = new Date(p.startDate).getTime()
  const end = new Date(p.submissionDeadline).getTime()
  const now = Date.now()
  const total = Math.max(1, end - start)
  const elapsed = Math.min(total, Math.max(0, now - start))
  const pct = Math.round((elapsed / total) * 100)
  const daysTotal = Math.max(1, Math.ceil(total / 86_400_000))
  const daysElapsed = Math.max(0, Math.ceil(elapsed / 86_400_000))
  const endDt = new Date(end)
  const dd = String(endDt.getDate()).padStart(2, '0')
  const mm = String(endDt.getMonth() + 1).padStart(2, '0')
  return {
    pct,
    daysTotal,
    daysElapsed,
    daysLeft: Math.max(0, daysTotal - daysElapsed),
    endLabel: `${dd}.${mm}`,
  }
}
