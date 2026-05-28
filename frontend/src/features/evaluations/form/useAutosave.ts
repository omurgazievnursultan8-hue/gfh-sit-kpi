import { useEffect, useRef } from 'react'

type SaveFn = () => Promise<void> | void

export function useAutosave(saveFn: SaveFn, dirty: boolean, opts?: {
  debounceMs?: number
  intervalMs?: number
}) {
  const { debounceMs = 5_000, intervalMs = 30_000 } = opts ?? {}
  const saveRef = useRef(saveFn)
  saveRef.current = saveFn
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => saveRef.current(), debounceMs)
    return () => clearTimeout(t)
  }, [dirty, debounceMs])

  useEffect(() => {
    const id = setInterval(() => {
      if (dirtyRef.current) saveRef.current()
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden' && dirtyRef.current) {
        saveRef.current()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])
}
