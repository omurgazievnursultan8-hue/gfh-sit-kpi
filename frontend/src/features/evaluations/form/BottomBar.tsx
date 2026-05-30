import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'

interface Props {
  saving: boolean; lastSaved: Date | null; saveFailed: boolean
  canPrev: boolean; canNext: boolean; canSubmit: boolean
  showSubmit: boolean
  onPrev: () => void; onNext: () => void
  onSubmit: () => void
}

export function BottomBar(p: Props) {
  const { t } = useTranslation()
  const status = p.saving ? t('evaluation.form.saving')
    : p.saveFailed ? t('evaluation.form.saveFailed')
    : p.lastSaved ? t('evaluation.form.saved', { time: p.lastSaved.toLocaleTimeString('ru-RU') })
    : t('evaluation.form.autoSaveHint', { defaultValue: 'черновик сохраняется автоматически' })
  const cls = p.saveFailed ? 'is-err' : p.saving ? 'is-saving' : ''

  return (
    <footer className="efm-fnav">
      <button className="efm-btn is-ghost" disabled={!p.canPrev} onClick={p.onPrev} aria-label="prev">
        <ChevronLeft size={14} /> {t('evaluation.form.prev')}
      </button>
      <span className={`efm-savehint ${cls}`}>
        <span className="d" aria-hidden /> {status}
      </span>
      <span className="efm-grow" />
      {p.showSubmit
        ? <button className="efm-btn is-primary" disabled={!p.canSubmit} onClick={p.onSubmit}>
            <Send size={14} /> {t('evaluation.form.submit')}
          </button>
        : <button className="efm-btn is-primary" disabled={!p.canNext} onClick={p.onNext}>
            {t('evaluation.form.next')} <ChevronRight size={14} />
          </button>}
    </footer>
  )
}
