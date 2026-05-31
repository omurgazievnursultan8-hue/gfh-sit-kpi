import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logoutAction } from '@/features/auth/slice'
import { AppDispatch, RootState } from '@/app/store'

const DEFAULT_IDLE_MINUTES = 30
// Throttle activity-driven timer resets — mousemove fires per pixel.
const RESET_THROTTLE_MS = 1000

export function useIdleTimeout() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector((s: RootState) => s.auth)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastResetRef = useRef(0)

  useEffect(() => {
    if (!isAuthenticated) return

    const idleMs = DEFAULT_IDLE_MINUTES * 60 * 1000

    const scheduleLogout = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        await dispatch(logoutAction())
        navigate('/login')
      }, idleMs)
    }

    // Throttled handler — first call schedules immediately, subsequent calls
    // within window do nothing. mousemove storms collapse to ~1Hz updates.
    const onActivity = () => {
      const now = Date.now()
      if (now - lastResetRef.current < RESET_THROTTLE_MS) return
      lastResetRef.current = now
      scheduleLogout()
    }

    // Passive listeners: prevent these handlers from blocking scroll/touch
    // perf path (mousemove + scroll especially).
    const events = ['mousemove', 'keydown', 'click', 'scroll'] as const
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }))
    scheduleLogout()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isAuthenticated, dispatch, navigate])
}
