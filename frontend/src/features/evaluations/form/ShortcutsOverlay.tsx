import { useTranslation } from 'react-i18next'

interface Props { open: boolean; onClose: () => void }

export function ShortcutsOverlay({ open, onClose }: Props) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div className="efm-shortcuts" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="efm-shortcuts-card" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic' }}>
          {t('evaluation.form.shortcuts.title')}
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, lineHeight: 2 }}>
          <li>{t('evaluation.form.shortcuts.prevNext')}</li>
          <li>{t('evaluation.form.shortcuts.presets')}</li>
          <li>{t('evaluation.form.shortcuts.save')}</li>
          <li>{t('evaluation.form.shortcuts.submit')}</li>
          <li>{t('evaluation.form.shortcuts.help')}</li>
          <li>{t('evaluation.form.shortcuts.close')}</li>
        </ul>
      </div>
    </div>
  )
}
