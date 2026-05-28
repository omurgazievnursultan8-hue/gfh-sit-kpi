import { useEffect } from 'react'

interface Handlers {
  onPrev: () => void
  onNext: () => void
  onPreset: (index: number) => void
  onSave: () => void
  onSubmit: () => void
  onHelp: () => void
  onEscape: () => void
}

const isTypingTarget = (t: EventTarget | null): boolean => {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable) return true
  const tag = t.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function useKeyboardShortcuts(h: Handlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey

      if (cmd && e.key.toLowerCase() === 's') { e.preventDefault(); h.onSave(); return }
      if (cmd && e.key === 'Enter')           { e.preventDefault(); h.onSubmit(); return }

      if (isTypingTarget(e.target)) return

      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); h.onPrev(); return
        case 'ArrowRight': e.preventDefault(); h.onNext(); return
        case '?':          e.preventDefault(); h.onHelp(); return
        case 'Escape':     h.onEscape(); return
      }
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= 6) {
        e.preventDefault()
        h.onPreset(n - 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, h])
}
