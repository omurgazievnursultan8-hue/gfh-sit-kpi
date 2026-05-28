import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { evaluationsApi } from './evaluationsApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { FORM_CSS } from './form/formStyles'
import { useEvaluationForm } from './form/useEvaluationForm'
import { useAutosave } from './form/useAutosave'
import { useKeyboardShortcuts } from './form/useKeyboardShortcuts'
import { StepperHeader } from './form/StepperHeader'
import { PhaseRouter } from './form/PhaseRouter'
import { BottomBar } from './form/BottomBar'
import { ChecklistDrawer } from './form/ChecklistDrawer'
import { ShortcutsOverlay } from './form/ShortcutsOverlay'

const idCode = (id: number): string => `EV-${String(id).padStart(6, '0')}`

const buildPayload = (scores: Record<number, { value: string; note: string }>) =>
  Object.entries(scores)
    .filter(([, v]) => v.value !== '')
    .map(([sid, v]) => ({
      criteriaId: Number(sid),
      value: parseFloat(v.value),
      note: v.note || undefined,
    }))

const periodLabel = (
  type: string | undefined,
  start: string | undefined,
  end: string | undefined,
): string => {
  if (!type || !start || !end) return ''
  const s = new Date(start)
  const year = s.getFullYear()
  if (type === 'ANNUAL') return `${year}`
  if (type === 'QUARTERLY') {
    const q = Math.floor(s.getMonth() / 3) + 1
    return `Q${q} ${year}`
  }
  if (type === 'MONTHLY') {
    const m = String(s.getMonth() + 1).padStart(2, '0')
    return `${m}.${year}`
  }
  return `${start}…${end}`
}

function BannerShell({ text, tone }: { text: string; tone?: 'warn' | 'err' }) {
  const color = tone === 'err' ? 'var(--dv3-zone-down)' : tone === 'warn' ? 'var(--dv3-zone-warn)' : 'var(--dv3-text3)'
  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{FORM_CSS}</style>
      <div className="efm-shell" style={{ textAlign: 'center', padding: '120px 24px', fontFamily: "'EB Garamond',Georgia,serif", fontStyle: 'italic', fontSize: 22, color }}>
        {text}
      </div>
    </div>
  )
}

export function EvaluationFormPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)
  const lang = (i18n.language?.startsWith('kg') ? 'kg' : 'ru') as 'ru' | 'kg'

  const f = useEvaluationForm(evaluationId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const presetTriggers = useRef<Array<() => void>>([])

  const dirty = Object.values(f.state.scores).some(s => s.dirty)

  const doSave = useCallback(async () => {
    const list = buildPayload(f.state.scores)
    if (list.length === 0) return
    f.dispatch({ type: 'SAVING', saving: true })
    try {
      await evaluationsApi.saveScores(evaluationId, list)
      f.dispatch({ type: 'SAVED', at: new Date() })
      f.dispatch({ type: 'CLEAR_DIRTY' })
      setSaveFailed(false)
    } catch (e) {
      setSaveFailed(true)
    } finally {
      f.dispatch({ type: 'SAVING', saving: false })
    }
  }, [evaluationId, f])

  useAutosave(doSave, dirty)

  useEffect(() => {
    const list = buildPayload(f.state.scores)
    if (list.length === 0) { f.dispatch({ type: 'PREVIEW', value: null }); return }
    const tid = setTimeout(() => {
      evaluationsApi.preview(evaluationId, list)
        .then(v => f.dispatch({ type: 'PREVIEW', value: v }))
        .catch(() => {})
    }, 800)
    return () => clearTimeout(tid)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.state.scores, evaluationId])

  const onSubmitClick = useCallback(() => setSubmitConfirmOpen(true), [])
  const doSubmit = useCallback(async () => {
    try {
      await doSave()
      await evaluationsApi.submit(evaluationId)
      navigate('/my-tasks')
    } finally {
      setSubmitConfirmOpen(false)
    }
  }, [doSave, evaluationId, navigate])

  useKeyboardShortcuts({
    onPrev: f.goPrev,
    onNext: () => { if (f.canAdvance) f.goNext() },
    onPreset: (i) => presetTriggers.current[i]?.(),
    onSave: doSave,
    onSubmit: () => { if (f.state.phase === 'review' && f.canSubmit) onSubmitClick() },
    onHelp: () => setShortcutsOpen(true),
    onEscape: () => { setShortcutsOpen(false); setDrawerOpen(false) },
  })

  if (f.state.loading) return <BannerShell text="…" />
  if (f.state.error) return <BannerShell text="Не удалось загрузить" tone="err" />
  if (!f.state.evaluation) return <BannerShell text="Оценка не найдена" tone="err" />
  if (f.state.evaluation.status !== 'DRAFT') return <BannerShell text={t('evaluation.form.evaluationNotDraftBanner')} tone="warn" />
  if (f.positive.length === 0) return <BannerShell text={t('evaluation.form.noCriteria')} tone="warn" />

  const posSum = f.positive.reduce((s, c) => s + (parseFloat(f.state.scores[c.id]?.value ?? '0') || 0), 0)
  const negSum = f.antibonus.reduce((s, c) => s + (parseFloat(f.state.scores[c.id]?.value ?? '0') || 0), 0)
  const total = f.state.previewScore ?? Math.max(0, posSum - negSum)
  const lowTotal = total < 30
  const showSubmit = f.state.phase === 'review'
  const period = periodLabel(f.state.evaluation.periodType, f.state.evaluation.periodStartDate, f.state.evaluation.periodEndDate)

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{FORM_CSS}</style>
      <div className="efm-shell efm-page" data-phase={f.state.phase}>
        <div className="efm-topbar">
          <button className="efm-back" onClick={() => navigate('/my-tasks')}>
            <ArrowLeft size={12} /> {t('evaluation.form.back')}
          </button>
          <span>{idCode(f.state.evaluation.id)} · DRAFT · {period}</span>
        </div>

        <StepperHeader
          phase={f.state.phase} cursor={f.state.cursor}
          positive={f.positive} antibonus={f.antibonus} scores={f.state.scores}
        />

        <PhaseRouter
          phase={f.state.phase} cursor={f.state.cursor}
          evaluationId={evaluationId}
          positive={f.positive} antibonus={f.antibonus}
          scores={f.state.scores} files={f.state.files}
          previewScore={f.state.previewScore}
          posFilled={f.posFilled} negFilled={f.negFilled}
          canSubmit={f.canSubmit}
          lang={lang}
          onScore={f.setScore} onNote={f.setNote}
          onAttachFile={(file) => f.dispatch({ type: 'ATTACH_FILE', file })}
          onRemoveFile={(fid) => f.dispatch({ type: 'REMOVE_FILE', fileId: fid })}
          onJump={f.goToStep}
          onSubmit={onSubmitClick}
          presetRef={(n, fire) => { presetTriggers.current[n] = fire }}
        />

        <BottomBar
          saving={f.state.saving}
          lastSaved={f.state.lastSaved}
          saveFailed={saveFailed}
          canPrev={!(f.state.phase === 'positive' && f.state.cursor === 0)}
          canNext={f.canAdvance}
          canSubmit={f.canSubmit}
          showSubmit={showSubmit}
          onPrev={f.goPrev}
          onNext={f.goNext}
          onSubmit={onSubmitClick}
          onToggleDrawer={() => setDrawerOpen(v => !v)}
        />

        <ChecklistDrawer
          open={drawerOpen} onClose={() => setDrawerOpen(false)}
          positive={f.positive} antibonus={f.antibonus} scores={f.state.scores}
          lang={lang} onJump={f.goToStep}
        />

        <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <ConfirmDialog
          open={submitConfirmOpen}
          title={t('evaluation.form.confirmTitle')}
          description={`${t('evaluation.form.confirmBody', { total: Math.round(total) })}${lowTotal ? '\n\n' + t('evaluation.form.confirmLowWarn') : ''}`}
          variant="default"
          onConfirm={doSubmit}
          onCancel={() => setSubmitConfirmOpen(false)}
        />
      </div>
    </div>
  )
}
