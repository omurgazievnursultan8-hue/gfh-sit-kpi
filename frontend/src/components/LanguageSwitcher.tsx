import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language

  const toggle = () => {
    const next = current === 'ru' ? 'kg' : 'ru'
    i18n.changeLanguage(next)
    localStorage.setItem('gfh_lang', next)
  }

  return (
    <button
      onClick={toggle}
      className="text-sm font-medium px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
      aria-label="Switch language"
    >
      {current === 'ru' ? 'KG' : 'RU'}
    </button>
  )
}
