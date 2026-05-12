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
let visibilityListenerAttached = false

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

function startInterval() {
  if (intervalId !== null) return
  intervalId = window.setInterval(() => {
    // Skip polling while tab hidden — backend save, fetch resumes on focus.
    if (typeof document !== 'undefined' && document.hidden) return
    fetchOnce()
  }, POLL_MS)
}

function stopInterval() {
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
}

function onVisibilityChange() {
  if (subscribers.size === 0) return
  if (!document.hidden) {
    // Returned to foreground — refresh immediately if cache stale.
    if (!cache || Date.now() - cache.ts >= POLL_MS) fetchOnce()
  }
}

function ensurePolling() {
  if (intervalId !== null) {
    // Already polling — refresh on subscribe if cache stale.
    if (!cache || Date.now() - cache.ts >= POLL_MS) fetchOnce()
    return
  }
  fetchOnce()
  startInterval()
  if (!visibilityListenerAttached && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
    visibilityListenerAttached = true
  }
}

function teardownIfEmpty() {
  if (subscribers.size !== 0) return
  stopInterval()
  if (visibilityListenerAttached && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    visibilityListenerAttached = false
  }
}

export function useUserCounters(): UserCounters {
  const [value, setValue] = useState<UserCounters>(cache?.value ?? ZERO)

  useEffect(() => {
    subscribers.add(setValue)
    ensurePolling()
    return () => {
      subscribers.delete(setValue)
      teardownIfEmpty()
    }
  }, [])

  return value
}

export function refreshCounters() {
  fetchOnce()
}
