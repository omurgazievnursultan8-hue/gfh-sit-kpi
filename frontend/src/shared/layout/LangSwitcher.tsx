import { useEffect, useRef, useState } from 'react'
import i18n from '../../i18n'

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

type Lang = 'ru' | 'kg'

export function LangSwitcher() {
  const current: Lang = i18n.language?.startsWith('kg') ? 'kg' : 'ru'
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (l: Lang) => {
    i18n.changeLanguage(l)
    setOpen(false)
  }

  return (
    <div className="login-lang-bar" ref={rootRef}>
      <button
        type="button"
        className="login-lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Язык / Тил"
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
        <ul className="login-lang-menu" role="listbox">
          {(['ru', 'kg'] as const).map((l) => (
            <li key={l}>
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
