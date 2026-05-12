import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const FLAGS = {
  ru: (
    <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
      <rect width="18" height="13" fill="#fff" />
      <rect y="4.33" width="18" height="4.34" fill="#0039A6" />
      <rect y="8.67" width="18" height="4.33" fill="#D52B1E" />
    </svg>
  ),
  kg: (
    <svg width="18" height="13" viewBox="0 0 18 13" aria-hidden="true">
      <rect width="18" height="13" fill="#E8112D" />
      <circle cx="9" cy="6.5" r="2.6" fill="#FFEF00" />
      <circle cx="9" cy="6.5" r="1.6" fill="none" stroke="#E8112D" strokeWidth="0.5" />
    </svg>
  ),
} as const

const LABELS = { ru: 'Русский', kg: 'Кыргызча' } as const
const LANGS = ['ru', 'kg'] as const
type Lang = typeof LANGS[number]

function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}

export function LangSwitcher() {
  // Subscribe via useTranslation — i18n.language alone is not reactive;
  // visible flag would otherwise stay stale after changeLanguage.
  const { i18n, t } = useTranslation()
  const current: Lang = i18n.language?.startsWith('kg') ? 'kg' : 'ru'
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
      const items = Array.from(
        listboxRef.current?.querySelectorAll<HTMLButtonElement>('button[role="option"]') ?? []
      )
      if (items.length === 0) return
      const idx = items.indexOf(document.activeElement as HTMLButtonElement)
      e.preventDefault()
      let next = 0
      if (e.key === 'ArrowDown') next = idx < 0 ? 0 : (idx + 1) % items.length
      else if (e.key === 'ArrowUp') next = idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length
      else if (e.key === 'End') next = items.length - 1
      items[next]?.focus()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    // Move focus into listbox after open.
    const raf = requestAnimationFrame(() => {
      const items = Array.from(
        listboxRef.current?.querySelectorAll<HTMLButtonElement>('button[role="option"]') ?? []
      )
      const selected = items.find(b => b.getAttribute('aria-selected') === 'true')
      ;(selected ?? items[0])?.focus()
    })
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      cancelAnimationFrame(raf)
    }
  }, [open])

  const pick = (l: Lang) => {
    i18n.changeLanguage(l)
    safeSet('gfh_lang', l)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="login-lang-bar" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="login-lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="gfh-lang-listbox"
        aria-label={t('nav.language', 'Язык / Тил') as string}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="login-lang-flag">{FLAGS[current]}</span>
        <span className="login-lang-code">{current.toUpperCase()}</span>
        <svg
          className={`login-lang-caret${open ? ' open' : ''}`}
          width="10"
          height="10"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listboxRef}
          id="gfh-lang-listbox"
          className="login-lang-menu"
          role="listbox"
          aria-label={t('nav.language', 'Язык / Тил') as string}
        >
          {LANGS.map((l) => (
            // role=presentation: listbox requires direct children to be option/group.
            <li key={l} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={current === l}
                className={`login-lang-option${current === l ? ' active' : ''}`}
                onClick={() => pick(l)}
              >
                <span className="login-lang-flag">{FLAGS[l]}</span>
                <span className="login-lang-option-label">{LABELS[l]}</span>
                <span className="login-lang-option-code">{l.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
