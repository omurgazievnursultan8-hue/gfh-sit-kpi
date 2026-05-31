import { useState, useLayoutEffect, useEffect, useRef } from 'react'

// Safari private mode + locked-down profiles throw on localStorage access.
function safeGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}

const STORAGE_KEY = 'gfh_theme'

function osTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function useTheme() {
  // Track whether user has explicitly chosen — drives OS-follow behaviour.
  const userSetRef = useRef<boolean>(safeGet(STORAGE_KEY) !== null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = safeGet(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
    return osTheme()
  })

  // useLayoutEffect: apply data-theme before browser paints, avoiding FOUC
  // on first render when stored/system theme is dark.
  // Only persist when user has made an explicit choice — otherwise storage
  // would "lock in" the OS-derived initial value and break OS-follow below.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (userSetRef.current) safeSet(STORAGE_KEY, theme)
  }, [theme])

  // Cross-tab sync: another tab changing theme propagates to this one.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      if (e.newValue === 'dark' || e.newValue === 'light') {
        userSetRef.current = true
        setTheme(e.newValue)
      } else if (e.newValue === null) {
        // Other tab cleared preference → revert to OS-follow.
        userSetRef.current = false
        setTheme(osTheme())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Follow OS theme changes mid-session, but only when user has not set
  // an explicit preference.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => {
      if (userSetRef.current) return
      setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = () => {
    userSetRef.current = true
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  return { theme, toggle }
}
