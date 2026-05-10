import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logoutAction } from '../features/auth/authSlice'
import { AppDispatch, RootState } from '../app/store'

const DEFAULT_IDLE_MINUTES = 30

export function useIdleTimeout() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { isAuthenticated } = useSelector((s: RootState) => s.auth)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const idleMs = DEFAULT_IDLE_MINUTES * 60 * 1000

    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        await dispatch(logoutAction())
        navigate('/login')
      }, idleMs)
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll']
    events.forEach((ev) => window.addEventListener(ev, reset))
    reset()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isAuthenticated, dispatch, navigate])
}
