import { useTranslation } from 'react-i18next'

export function BrandPanel() {
  const { t } = useTranslation()

  return (
    <section className="login-brand" aria-hidden="true">
      <div className="login-brand-overlay" />
      <div className="login-brand-glow" />

      <div className="login-brand-header">
        <div className="login-brand-mark">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 20h18" />
            <path d="M6 20V12" />
            <path d="M11 20V7" />
            <path d="M16 20v-6" />
            <path d="M21 20V4" />
          </svg>
        </div>
        <p className="login-brand-name">{t('login.brandName')}</p>
      </div>

      <p className="login-brand-sub">{t('login.brandSub')}</p>

      <ul className="login-brand-list">
        {(['bullet1', 'bullet2', 'bullet3'] as const).map((k) => (
          <li key={k}>
            <span className="login-brand-dot" />
            {t(`login.${k}`)}
          </li>
        ))}
      </ul>

      <div className="login-brand-foot">
        <span>ГФХ · КПИ · 2026</span>
        <span>{t('login.footRight')}</span>
      </div>
    </section>
  )
}
