import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ListChecks, Send } from 'lucide-react'

interface Props {
  saving: boolean; lastSaved: Date | null; saveFailed: boolean
  canPrev: boolean; canNext: boolean; canSubmit: boolean
  showSubmit: boolean
  onPrev: () => void; onNext: () => void
  onSubmit: () => void
  onToggleDrawer: () => void
}

export function BottomBar(p: Props) {
  const { t } = useTranslation()
  return (
    <div className="efm-bottombar">
      <button className="efm-bb-btn" disabled={!p.canPrev} onClick={p.onPrev}><ChevronLeft size={14} /> {t('evaluation.form.prev')}</button>
      <div className="efm-bottombar-status">
        {p.saving ? t('evaluation.form.saving')
          : p.saveFailed ? t('evaluation.form.saveFailed')
          : p.lastSaved ? t('evaluation.form.saved', { time: p.lastSaved.toLocaleTimeString('ru-RU') })
          : null}
      </div>
      <button className="efm-bb-btn" onClick={p.onToggleDrawer}><ListChecks size={14} /> {t('evaluation.form.checklist')}</button>
      {p.showSubmit
        ? <button className="efm-bb-btn efm-bb-btn--primary" disabled={!p.canSubmit} onClick={p.onSubmit}><Send size={14} /> {t('evaluation.form.submit')}</button>
        : <button className="efm-bb-btn efm-bb-btn--primary" disabled={!p.canNext} onClick={p.onNext}>{t('evaluation.form.next')} <ChevronRight size={14} /></button>}
    </div>
  )
}
