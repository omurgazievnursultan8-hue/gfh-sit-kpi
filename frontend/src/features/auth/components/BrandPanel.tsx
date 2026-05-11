import { useTranslation } from 'react-i18next'

export function BrandPanel() {
  const { t } = useTranslation()

  return (
    <section className="login-brand" aria-hidden="true">
      <div className="login-brand-overlay" />
      <div className="login-brand-glow" />

      <div className="login-brand-header">
        <div className="login-brand-mark" aria-hidden="true">
          <span className="login-brand-mono">ГФХ</span>
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
        <span>ГФХ · КПИ · {new Date().getFullYear()}</span>
        <span>{t('login.footRight')}</span>
      </div>
    </section>
  )
}
