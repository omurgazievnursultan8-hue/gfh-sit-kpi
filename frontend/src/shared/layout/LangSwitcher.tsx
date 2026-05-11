import i18n from '../../i18n'

export function LangSwitcher() {
  const lang = i18n.language?.startsWith('kg') ? 'kg' : 'ru'

  return (
    <div
      className="login-lang-bar"
      role="group"
      aria-label="Язык / Тил"
    >
      <span className="login-lang-globe" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18" />
          <path d="M12 3a14 14 0 0 0 0 18" />
        </svg>
      </span>
      {(['ru', 'kg'] as const).map((l) => (
        <button
          key={l}
          onClick={() => i18n.changeLanguage(l)}
          aria-pressed={lang === l}
          className={`login-lang-btn${lang === l ? ' active' : ''}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
