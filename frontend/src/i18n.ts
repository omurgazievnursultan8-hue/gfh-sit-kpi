import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ru',
    // Restrict to languages we actually ship — prevents detector picking
    // browser locales like 'en-US' that would 404 on the http backend.
    supportedLngs: ['ru', 'kg'],
    // Strip region tags ('kg-KG' → 'kg') before loading the resource bundle.
    load: 'languageOnly',
    defaultNS: 'translation',
    backend: { loadPath: '/locales/{{lng}}/{{ns}}.json' },
    detection: {
      // Honour stored choice first, then fall back to browser locale on
      // first visit — first-time users in Kyrgyz browser get kg by default.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'gfh_lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

// Cross-tab language sync — listen for `gfh_lang` storage events from
// peer tabs and apply the change locally so all open tabs stay in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== 'gfh_lang') return
    if (!e.newValue) return
    if (e.newValue !== i18n.language) i18n.changeLanguage(e.newValue)
  })
}

export default i18n
