import { useEffect, useState } from 'react'
import api from '../../app/api'

export interface UserCounters {
  pendingEvaluations: number
  openAppeals: number
  unreadNotifications: number
}

const ZERO: UserCounters = { pendingEvaluations: 0, openAppeals: 0, unreadNotifications: 0 }
const POLL_MS = 60_000

let cache: { value: UserCounters; ts: number } | null = null
const subscribers = new Set<(c: UserCounters) => void>()
let intervalId: number | null = null

async function fetchOnce() {
  try {
    const res = await api.get<UserCounters>('/me/counters')
    if (res.data && typeof res.data === 'object') {
      cache = { value: res.data, ts: Date.now() }
      subscribers.forEach(fn => fn(res.data))
    }
  } catch {
    // swallow; counters are best-effort
  }
}

function ensurePolling() {
  if (intervalId !== null) return
  fetchOnce()
  intervalId = window.setInterval(fetchOnce, POLL_MS)
}

function stopPolling() {
  if (intervalId !== null && subscribers.size === 0) {
    window.clearInterval(intervalId)
    intervalId = null
  }
}

export function useUserCounters(): UserCounters {
  const [value, setValue] = useState<UserCounters>(cache?.value ?? ZERO)

  useEffect(() => {
    subscribers.add(setValue)
    ensurePolling()
    return () => {
      subscribers.delete(setValue)
      stopPolling()
    }
  }, [])

  return value
}

export function refreshCounters() {
  fetchOnce()
}
