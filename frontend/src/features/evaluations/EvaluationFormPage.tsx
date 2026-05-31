import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { evaluationsApi } from './evaluationsApi'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { FORM_CSS } from './form/formStyles'
import { useEvaluationForm } from './form/useEvaluationForm'
import { useAutosave } from './form/useAutosave'
import { useKeyboardShortcuts } from './form/useKeyboardShortcuts'
import { PhaseRouter } from './form/PhaseRouter'
import { BottomBar } from './form/BottomBar'
import { ShortcutsOverlay } from './form/ShortcutsOverlay'
import { Ledger } from './form/Ledger'
import { EmployeeStepper } from './form/EmployeeStepper'
import { EvaluationDetailPage } from './EvaluationDetailPage'

const buildPayload = (scores: Record<number, { value: string; note: string }>) =>
  Object.entries(scores)
    .filter(([, v]) => v.value !== '')
    .map(([sid, v]) => ({
      criteriaId: Number(sid),
      value: parseFloat(v.value),
      note: v.note || undefined,
    }))

function BannerShell({ text, tone }: { text: string; tone?: 'warn' | 'err' }) {
  const color = tone === 'err' ? 'var(--dv3-zone-down)' : tone === 'warn' ? 'var(--dv3-zone-warn)' : 'var(--dv3-text3)'
  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{FORM_CSS}</style>
      <div className="efm-banner" style={{ color }}>{text}</div>
    </div>
  )
}

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) }
  catch { return iso }
}

const daysLeft = (iso: string | null | undefined): number | null => {
  if (!iso) return null
  const end = new Date(iso).getTime()
  if (Number.isNaN(end)) return null
  return Math.ceil((end - Date.now()) / 86400000)
}

export function EvaluationFormPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)
  const lang = (i18n.language?.startsWith('kg') ? 'kg' : 'ru') as 'ru' | 'kg'

  const f = useEvaluationForm(evaluationId)
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
    onEscape: () => { setShortcutsOpen(false) },
  })

  const totals = useMemo(() => {
    const posSum = f.positive.reduce((s, c) => s + (parseFloat(f.state.scores[c.id]?.value ?? '0') || 0), 0)
    const negSum = f.antibonus.reduce((s, c) => s + (parseFloat(f.state.scores[c.id]?.value ?? '0') || 0), 0)
    return { posSum, negSum, total: Math.max(0, posSum - negSum) }
  }, [f.positive, f.antibonus, f.state.scores])

  if (f.state.loading) return <BannerShell text="…" />
  if (f.state.error) return <BannerShell text="Не удалось загрузить" tone="err" />
  if (!f.state.evaluation) return <BannerShell text="Оценка не найдена" tone="err" />
  if (f.state.evaluation.status !== 'DRAFT') return <EvaluationDetailPage />
  if (f.positive.length === 0) return <BannerShell text={t('evaluation.form.noCriteria')} tone="warn" />

  const lowTotal = totals.total < 30
  const showSubmit = f.state.phase === 'review'

  const totalCriteria = f.positive.length + f.antibonus.length
  const filledCount = f.posFilled + f.negFilled
  const filledPct = totalCriteria > 0 ? Math.round((filledCount / totalCriteria) * 100) : 0

  const ev = f.state.evaluation
  const periodLabel = `${fmtDate(ev.periodStartDate)} — ${fmtDate(ev.periodEndDate)}`
  const dl = daysLeft(ev.periodEndDate)
  const deadlineChip = dl != null && dl >= 0
    ? `${t('evaluation.form.deadlineDays', { defaultValue: 'до дедлайна' })} ${dl} дн · ${fmtDate(ev.periodEndDate)}`
    : null

  return (
    <div className="dv3-root" style={{ height: '100%', overflow: 'hidden' }}>
      <style>{DASHBOARD_CSS}</style>
      <style>{FORM_CSS}</style>
      <div className="efm-page-v2" data-phase={f.state.phase}>
       <div className="efm-box">
        <div className="efm-box-inner">
        <header className="efm-topbar-v2">
          <div className="efm-tb-ttl">
            <span className="efm-tb-c">{t('evaluation.form.topbarTag', { defaultValue: 'Оценка сотрудника' })}</span>
            <h1 className="efm-tb-h1">{ev.evaluateeName}</h1>
          </div>
          <span className="efm-grow" />
          <span className="efm-chip-pill"><span className="dot" />{periodLabel}</span>
          {deadlineChip && <span className="efm-chip-pill efm-chip-pill--warn"><span className="dot" />{deadlineChip}</span>}
          <div className="efm-progwrap" aria-label="overall-progress">
            <span className="efm-pg-lbl">{filledCount}/{totalCriteria}</span>
            <div className="efm-progtrack"><i style={{ width: filledPct + '%' }} /></div>
          </div>
        </header>

        <EmployeeStepper
          evaluationId={evaluationId}
          periodId={ev.periodId}
          evaluatorId={ev.evaluatorId}
          evaluateeName={ev.evaluateeName}
        />

        <div className="efm-work">
          <aside className="efm-lcol">
            <Ledger
              positive={f.positive} antibonus={f.antibonus}
              scores={f.state.scores}
              phase={f.state.phase} cursor={f.state.cursor}
              previewScore={f.state.previewScore}
              lang={lang}
              onJump={f.goToStep}
            />
          </aside>

          <main className="efm-rcol">
            <section className="efm-focus">
              <div className="efm-focus-scroll">
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
              </div>

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
              />
            </section>
          </main>
        </div>
        </div>
       </div>

        <ShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <ConfirmDialog
          open={submitConfirmOpen}
          title={t('evaluation.form.confirmTitle')}
          description={`${t('evaluation.form.confirmBody', { total: Math.round(totals.total) })}${lowTotal ? '\n\n' + t('evaluation.form.confirmLowWarn') : ''}`}
          variant="default"
          onConfirm={doSubmit}
          onCancel={() => setSubmitConfirmOpen(false)}
        />
      </div>
    </div>
  )
}
