import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Send, ArrowLeft, BarChart3, ListChecks, CheckCircle2, AlertTriangle } from 'lucide-react'
import { evaluationsApi, Evaluation, EvaluationScore } from './evaluationsApi'
import { criteriaApi, Criteria } from '../criteria/criteriaApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FileUploadSection } from './components/FileUploadSection'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import api from '../../app/api'

interface ScoreMap { [criteriaId: number]: { value: string; note: string } }

const FORM_CSS = `
.evf-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 36px 32px 80px;
  position: relative;
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
}
.evf-shell::before {
  content: '';
  position: absolute; inset: 0;
  background-image: repeating-linear-gradient(
    0deg, transparent 0 23px, var(--dv3-border) 23px 23.5px);
  opacity: .22;
  pointer-events: none;
  z-index: 0;
  mask-image: linear-gradient(180deg, transparent 0, #000 80px, #000 calc(100% - 80px), transparent 100%);
}
.evf-shell > * { position: relative; z-index: 1; }

.evf-back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
  background: none; border: 0; padding: 0; cursor: pointer;
  margin-bottom: 24px;
}
.evf-back:hover { color: var(--dv3-accent); }

/* ─── PAGE HEAD ─────────────────────────────────────────────────── */
.evf-pagehead {
  margin-bottom: 28px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--dv3-border);
}
.evf-pagehead-tag {
  font-size: 10px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--dv3-text3);
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 12px;
}
.evf-pagehead-tag::before { content: ''; width: 28px; height: 1px; background: var(--dv3-text4); }
.evf-pagehead h1 {
  margin: 0 0 6px;
  font-family: 'EB Garamond', 'Cormorant Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: clamp(36px, 5vw, 54px);
  letter-spacing: -0.02em; line-height: 1; color: var(--dv3-text);
}
.evf-pagehead p {
  margin: 0; font-size: 12px; letter-spacing: .02em;
  color: var(--dv3-text3); max-width: 520px;
}

/* ─── 2-COL LAYOUT ──────────────────────────────────────────────── */
.evf-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 40px;
  align-items: start;
}

/* ─── EVALUATEE CARD ────────────────────────────────────────────── */
.evf-evaluatee {
  display: grid;
  grid-template-columns: 64px minmax(0,1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 18px 22px;
  border: 1px solid var(--dv3-border-hi);
  background: var(--dv3-bg2);
  margin-bottom: 32px;
  position: relative;
}
.evf-evaluatee::before {
  content: 'СУБЪЕКТ ОЦЕНКИ';
  position: absolute; top: -7px; left: 16px;
  background: var(--dv3-bg);
  padding: 0 8px;
  font-size: 9px; letter-spacing: .28em; color: var(--dv3-zone-info);
}
.evf-avatar {
  width: 64px; height: 64px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--dv3-border-hi);
  background: var(--dv3-accent-bg);
  color: var(--dv3-accent);
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 26px;
}
.evf-evaluatee-name {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 28px; letter-spacing: -0.01em; line-height: 1.05;
  color: var(--dv3-text);
  margin: 0 0 4px;
}
.evf-evaluatee-meta {
  font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.evf-evaluatee-period {
  text-align: right;
}
.evf-evaluatee-period-label {
  font-size: 9px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--dv3-text4); margin-bottom: 4px;
}
.evf-evaluatee-period-val {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 18px; color: var(--dv3-text);
  margin-bottom: 6px;
}
.evf-period-badge {
  display: inline-block;
  font-size: 9px; letter-spacing: .22em; text-transform: uppercase;
  padding: 3px 8px;
  border: 1px solid var(--dv3-zone-info);
  color: var(--dv3-zone-info);
}

/* ─── SECTION HEAD ──────────────────────────────────────────────── */
.evf-section { margin-top: 36px; }
.evf-section-head {
  display: flex; align-items: baseline; gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dv3-border);
  margin-bottom: 16px;
}
.evf-section-head h2 {
  margin: 0;
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 26px; letter-spacing: -0.01em; color: var(--dv3-text);
}
.evf-section-head .line { flex: 1; height: 1px; background: repeating-linear-gradient(90deg, var(--dv3-border-hi) 0 4px, transparent 4px 8px); }
.evf-section-head .count {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 11px; letter-spacing: .14em; color: var(--dv3-text3);
}
.evf-section-head .count strong { color: var(--dv3-text); }
.evf-section--neg .evf-section-head h2 { color: var(--dv3-zone-down); }

/* ─── WEIGHT BAR ────────────────────────────────────────────────── */
.evf-weight-summary {
  display: flex; align-items: center; gap: 12px;
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
  margin-bottom: 18px;
}
.evf-weight-bar {
  flex: 1; height: 4px;
  background: var(--dv3-bg3);
  border: 1px solid var(--dv3-border);
  position: relative; overflow: hidden;
}
.evf-weight-bar > i {
  position: absolute; inset: 0 auto 0 0;
  background: linear-gradient(90deg, var(--dv3-accent), var(--dv3-zone-up));
  width: var(--w, 0%);
  transition: width .4s ease;
}
.evf-weight-summary strong {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  color: var(--dv3-text); letter-spacing: 0; font-size: 12px; min-width: 40px; text-align: right;
}

/* ─── CRITERION CARD ────────────────────────────────────────────── */
.evf-card {
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg2);
  padding: 18px 20px;
  margin-bottom: 12px;
  transition: border-color .15s, background .15s;
}
.evf-card.is-filled {
  border-color: var(--dv3-border-hi);
  background: linear-gradient(90deg, var(--dv3-accent-bg), var(--dv3-bg2) 50%);
}
.evf-section--neg .evf-card.is-filled {
  background: linear-gradient(90deg, rgba(192,83,63,0.10), var(--dv3-bg2) 50%);
  border-color: var(--dv3-zone-down);
}

.evf-card-head {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-bottom: 14px;
}
.evf-card-idx {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--dv3-border-hi);
  background: var(--dv3-bg);
  color: var(--dv3-text);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 11px; letter-spacing: .08em;
}
.evf-card.is-filled .evf-card-idx {
  background: var(--dv3-accent);
  border-color: var(--dv3-accent);
  color: var(--dv3-bg);
}
.evf-section--neg .evf-card.is-filled .evf-card-idx {
  background: var(--dv3-zone-down);
  border-color: var(--dv3-zone-down);
}
.evf-card-name {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 17px; letter-spacing: -0.005em; line-height: 1.25;
  color: var(--dv3-text);
}
.evf-card-chips {
  margin-top: 8px;
  display: flex; gap: 6px; flex-wrap: wrap;
}
.evf-chip {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 9px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
  padding: 3px 8px;
  border: 1px solid var(--dv3-border);
  border-radius: 1px;
}
.evf-chip--w { color: var(--dv3-text); border-color: var(--dv3-border-hi); }
.evf-chip--scope { color: var(--dv3-text3); }
.evf-chip--anti { color: var(--dv3-zone-down); border-color: var(--dv3-zone-down); }
.evf-chip--auto { color: var(--dv3-zone-info); border-color: var(--dv3-zone-info); }

/* ─── INPUT ROW ─────────────────────────────────────────────────── */
.evf-card-input {
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr) 96px 40px;
  gap: 12px;
  align-items: center;
}
.evf-input-label {
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.evf-section--neg .evf-input-label { color: var(--dv3-zone-down); }

.evf-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 4px;
  background: var(--dv3-bg3);
  border: 1px solid var(--dv3-border);
  outline: none;
  cursor: pointer;
}
.evf-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 18px; height: 18px;
  background: var(--dv3-accent);
  border: 1px solid var(--dv3-bg);
  box-shadow: 0 0 0 1px var(--dv3-accent);
  cursor: pointer;
  border-radius: 0;
  transform: rotate(45deg);
}
.evf-slider::-moz-range-thumb {
  width: 18px; height: 18px;
  background: var(--dv3-accent);
  border: 1px solid var(--dv3-bg);
  cursor: pointer;
  border-radius: 0;
  transform: rotate(45deg);
}
.evf-section--neg .evf-slider::-webkit-slider-thumb {
  background: var(--dv3-zone-down);
  box-shadow: 0 0 0 1px var(--dv3-zone-down);
}
.evf-section--neg .evf-slider::-moz-range-thumb { background: var(--dv3-zone-down); }

.evf-num {
  width: 100%;
  padding: 10px 10px;
  background: var(--dv3-bg);
  border: 1px solid var(--dv3-border);
  color: var(--dv3-text);
  font: italic 18px/1 'EB Garamond', Georgia, serif;
  outline: none;
  text-align: right;
  font-variant-numeric: tabular-nums;
  transition: border-color .15s;
}
.evf-num:focus { border-color: var(--dv3-accent); }
.evf-section--neg .evf-num:focus { border-color: var(--dv3-zone-down); }
.evf-num.is-filled { color: var(--dv3-accent); }
.evf-section--neg .evf-num.is-filled { color: var(--dv3-zone-down); }

.evf-num-max {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 11px; letter-spacing: .1em; color: var(--dv3-text4);
  text-align: center;
}

.evf-note {
  margin-top: 12px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 1px dashed var(--dv3-border);
  color: var(--dv3-text);
  font: 12px/1.4 'Geist Mono', ui-monospace, Menlo, monospace;
  outline: none;
  transition: border-color .15s;
}
.evf-note:focus { border-color: var(--dv3-accent); border-style: solid; }
.evf-note::placeholder { color: var(--dv3-text4); }

/* ─── FILES ─────────────────────────────────────────────────────── */
.evf-files {
  margin-top: 32px;
  padding: 18px 20px;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg2);
}
.evf-files h2 {
  margin: 0 0 12px;
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 20px; color: var(--dv3-text);
}

/* ─── SUMMARY COL ───────────────────────────────────────────────── */
.evf-summary {
  position: sticky;
  top: 16px;
  display: flex; flex-direction: column; gap: 16px;
}
.evf-panel {
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg2);
  position: relative;
}
.evf-panel-head {
  padding: 12px 16px;
  border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg3);
  display: flex; align-items: center; gap: 8px;
  font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--dv3-text2);
}
.evf-panel-body { padding: 18px 18px; }

/* live preview */
.evf-preview-num {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 86px; line-height: .9; letter-spacing: -0.03em;
  display: flex; align-items: baseline; gap: 10px;
  color: var(--dv3-text);
}
.evf-preview-num.is-up   { color: var(--dv3-zone-up); }
.evf-preview-num.is-warn { color: var(--dv3-zone-warn); }
.evf-preview-num.is-down { color: var(--dv3-zone-down); }
.evf-preview-num.is-null { color: var(--dv3-text4); }
.evf-preview-num span {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-style: normal;
  font-size: 11px; letter-spacing: .14em; color: var(--dv3-text3);
}
.evf-preview-sub {
  font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--dv3-text3); margin-top: 4px;
}
.evf-preview-bar {
  margin-top: 14px;
  height: 6px;
  background: var(--dv3-bg3);
  border: 1px solid var(--dv3-border);
  position: relative; overflow: hidden;
}
.evf-preview-bar > i {
  position: absolute; inset: 0 auto 0 0;
  width: var(--w, 0%);
  transition: width .4s cubic-bezier(.2,.7,.2,1), background .15s;
}
.evf-preview-bar > i.is-up   { background: linear-gradient(90deg, var(--dv3-accent), var(--dv3-zone-up)); }
.evf-preview-bar > i.is-warn { background: var(--dv3-zone-warn); }
.evf-preview-bar > i.is-down { background: var(--dv3-zone-down); }

.evf-breakdown { margin-top: 16px; }
.evf-breakdown-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0;
  font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.evf-breakdown-row strong {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  letter-spacing: 0;
  font-size: 13px; color: var(--dv3-text);
}
.evf-breakdown-row strong.pos { color: var(--dv3-zone-up); }
.evf-breakdown-row strong.neg { color: var(--dv3-zone-down); }
.evf-breakdown-total {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px dashed var(--dv3-border);
}
.evf-breakdown-total strong {
  font-size: 18px;
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic;
}

/* completion */
.evf-comp { display: flex; flex-direction: column; gap: 14px; }
.evf-comp-row { display: flex; justify-content: space-between; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--dv3-text3); margin-bottom: 6px; }
.evf-comp-row strong { font-family: 'Geist Mono', ui-monospace, Menlo, monospace; letter-spacing: 0; color: var(--dv3-text); font-size: 12px; }
.evf-comp-bar { height: 3px; background: var(--dv3-bg3); border: 1px solid var(--dv3-border); position: relative; overflow: hidden; }
.evf-comp-bar > i { position: absolute; inset: 0 auto 0 0; width: var(--w, 0%); background: var(--dv3-accent); transition: width .3s; }
.evf-comp-bar > i.neg { background: var(--dv3-zone-down); }

/* checklist */
.evf-check { display: flex; flex-direction: column; }
.evf-check-row {
  display: grid;
  grid-template-columns: 16px minmax(0,1fr) auto;
  gap: 10px; align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed var(--dv3-border);
  font-size: 11px;
}
.evf-check-row:last-child { border-bottom: 0; }
.evf-check-dot {
  width: 12px; height: 12px;
  border: 1.5px solid var(--dv3-border-hi);
  background: transparent;
  transform: rotate(45deg);
}
.evf-check-row.is-done .evf-check-dot {
  background: var(--dv3-accent);
  border-color: var(--dv3-accent);
}
.evf-check-row.is-done.neg .evf-check-dot {
  background: var(--dv3-zone-down);
  border-color: var(--dv3-zone-down);
}
.evf-check-name {
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic;
  color: var(--dv3-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.evf-check-val {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 10px; color: var(--dv3-text3); letter-spacing: 0;
}
.evf-check-row.is-done .evf-check-val { color: var(--dv3-text); }

/* submit area */
.evf-submit {
  display: flex; flex-direction: column; gap: 10px;
}
.evf-btn {
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 14px 16px;
  font: 12px/1 'Geist Mono', ui-monospace, Menlo, monospace;
  letter-spacing: .18em; text-transform: uppercase;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg);
  color: var(--dv3-text);
  cursor: pointer;
  transition: all .15s;
}
.evf-btn:hover:not(:disabled) { transform: translateY(-1px); border-color: var(--dv3-border-hi); }
.evf-btn:disabled { opacity: .4; cursor: not-allowed; }
.evf-btn--primary {
  background: var(--dv3-accent); border-color: var(--dv3-accent); color: var(--dv3-bg);
}
.evf-btn--primary:hover:not(:disabled) {
  background: var(--dv3-zone-up); border-color: var(--dv3-zone-up);
}
.evf-submit-hint {
  font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--dv3-text3); text-align: center; line-height: 1.4;
}
.evf-submit-hint.ok { color: var(--dv3-zone-up); }
.evf-saved {
  font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
  color: var(--dv3-text3); text-align: center;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.evf-saved strong { font-family: 'Geist Mono', ui-monospace, Menlo, monospace; color: var(--dv3-text); letter-spacing: 0; }

/* banners */
.evf-banner {
  text-align: center; padding: 80px 0;
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-size: 22px;
  color: var(--dv3-text3);
}
.evf-banner.is-warn { color: var(--dv3-zone-warn); }
.evf-banner.is-err  { color: var(--dv3-zone-down); }

@media (max-width: 960px) {
  .evf-page { grid-template-columns: 1fr; }
  .evf-summary { position: static; }
}
@media (max-width: 640px) {
  .evf-shell { padding: 20px 16px 60px; }
  .evf-card-input { grid-template-columns: 50px minmax(0,1fr) 76px 32px; gap: 8px; }
  .evf-evaluatee { grid-template-columns: 48px minmax(0,1fr); }
  .evf-evaluatee-period { grid-column: 1 / -1; text-align: left; border-top: 1px dashed var(--dv3-border); padding-top: 12px; }
  .evf-avatar { width: 48px; height: 48px; font-size: 20px; }
}
`

const zoneClass = (pct: number | null): string => {
  if (pct === null) return 'is-null'
  if (pct >= 80) return 'is-up'
  if (pct >= 60) return 'is-warn'
  return 'is-down'
}

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '··'
}

const periodLabel = (periodId: number): string => `Период #${periodId}`

export function EvaluationFormPageLegacy() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [scores, setScores] = useState<ScoreMap>({})
  const [previewScore, setPreviewScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const positiveCriteria = useMemo(
    () => criteria.filter(c => c.type === 'POSITIVE' && c.active),
    [criteria],
  )
  const antiBonusCriteria = useMemo(
    () => criteria.filter(c => c.type === 'ANTI_BONUS' && c.active),
    [criteria],
  )

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      criteriaApi.list(0, 200),
    ]).then(([eval_, criteriaPage]) => {
      setEvaluation(eval_)
      setCriteria(criteriaPage.content)
      api.get<EvaluationScore[]>(`/evaluations/${evaluationId}/scores`).then(r => {
        const map: ScoreMap = {}
        r.data.forEach(s => {
          map[s.criteriaId] = { value: s.value.toString(), note: s.note ?? '' }
        })
        setScores(map)
      }).catch(() => {})
    }).finally(() => setLoading(false))
  }, [evaluationId])

  const buildScoreList = useCallback((): EvaluationScore[] =>
    Object.entries(scores)
      .filter(([, v]) => v.value !== '')
      .map(([sid, v]) => ({
        criteriaId: Number(sid),
        value: parseFloat(v.value),
        note: v.note || undefined,
      })), [scores])

  const save = useCallback(async () => {
    const list = buildScoreList()
    if (list.length === 0) return
    setSaving(true)
    try {
      await evaluationsApi.saveScores(evaluationId, list)
      setLastSaved(new Date())
    } finally {
      setSaving(false)
    }
  }, [evaluationId, buildScoreList])

  const updatePreview = useCallback(async () => {
    const list = buildScoreList()
    if (list.length === 0) { setPreviewScore(null); return }
    try {
      const score = await evaluationsApi.preview(evaluationId, list)
      setPreviewScore(score)
    } catch {}
  }, [evaluationId, buildScoreList])

  useEffect(() => {
    autosaveRef.current = setInterval(save, 30_000)
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current) }
  }, [save])

  useEffect(() => {
    const t = setTimeout(updatePreview, 800)
    return () => clearTimeout(t)
  }, [scores, updatePreview])

  const handleScoreChange = (criteriaId: number, field: 'value' | 'note', val: string) => {
    setScores(prev => ({
      ...prev,
      [criteriaId]: { ...prev[criteriaId] ?? { value: '', note: '' }, [field]: val },
    }))
  }

  const handleSliderChange = (criteriaId: number, max: number, raw: string) => {
    const v = Math.min(max, Math.max(0, parseFloat(raw) || 0))
    handleScoreChange(criteriaId, 'value', v.toString())
  }

  const handleSubmit = async () => {
    try {
      await save()
      await evaluationsApi.submit(evaluationId)
      navigate('/my-tasks')
    } finally {
      setSubmitOpen(false)
    }
  }

  /* ── shells ───────────────────────────────────────────────────── */
  const shell = (body: React.ReactNode) => (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{FORM_CSS}</style>
      <div className="evf-shell">{body}</div>
    </div>
  )

  if (loading)     return shell(<div className="evf-banner">Открытие досье…</div>)
  if (!evaluation) return shell(<div className="evf-banner is-err">Оценка не найдена</div>)
  if (evaluation.status !== 'DRAFT') {
    return shell(
      <div className="evf-banner is-warn">
        Эта оценка уже отправлена<br />
        <small style={{ display: 'block', fontSize: 11, letterSpacing: '.2em', marginTop: 16, color: 'var(--dv3-text3)', textTransform: 'uppercase', fontStyle: 'normal' }}>
          статус: {evaluation.status}
        </small>
      </div>
    )
  }

  /* ── totals ───────────────────────────────────────────────────── */
  const posWeightTotal = positiveCriteria.reduce((s, c) => s + Number(c.weight), 0)
  const negWeightTotal = antiBonusCriteria.reduce((s, c) => s + Number(c.weight), 0)

  const posSum = positiveCriteria.reduce((s, c) => {
    const v = parseFloat(scores[c.id]?.value || '0') || 0
    return s + v
  }, 0)
  const negSum = antiBonusCriteria.reduce((s, c) => {
    const v = parseFloat(scores[c.id]?.value || '0') || 0
    return s + v
  }, 0)

  const posFilled = positiveCriteria.filter(c => scores[c.id]?.value && scores[c.id].value !== '').length
  const negFilled = antiBonusCriteria.filter(c => scores[c.id]?.value && scores[c.id].value !== '').length

  const previewPct = previewScore !== null ? previewScore : Math.max(0, posSum - negSum)
  const previewWhole = previewScore !== null ? Math.round(previewScore) : Math.round(previewPct)
  const allPosFilled = positiveCriteria.length > 0 && posFilled === positiveCriteria.length

  const idCode = `EV-${String(evaluation.id).padStart(6, '0')}`

  const renderCard = (c: Criteria, i: number, negative = false) => {
    const score = scores[c.id] ?? { value: '', note: '' }
    const valNum = parseFloat(score.value || '0') || 0
    const max = Number(c.weight)
    const filled = score.value !== ''
    const idxLabel = negative ? `A${i + 1}` : `${i + 1}`
    const scope = c.orgUnitNameRu ?? 'Глобальный'
    return (
      <div key={c.id} className={`evf-card ${filled ? 'is-filled' : ''}`}>
        <div className="evf-card-head">
          <span className="evf-card-idx">{idxLabel}</span>
          <div>
            <div className="evf-card-name">{c.nameRu}</div>
            <div className="evf-card-chips">
              {negative
                ? <span className="evf-chip evf-chip--anti">до −{max} баллов</span>
                : <span className="evf-chip evf-chip--w">вес {max}%</span>}
              <span className="evf-chip evf-chip--scope">{scope}</span>
              {c.autoCalculated && <span className="evf-chip evf-chip--auto">авто</span>}
            </div>
          </div>
        </div>
        <div className="evf-card-input">
          <span className="evf-input-label">{negative ? 'Вычет' : 'Балл'}</span>
          <input
            type="range"
            min={0}
            max={max}
            step={max <= 10 ? 0.5 : 1}
            value={valNum}
            onChange={e => handleSliderChange(c.id, max, e.target.value)}
            className="evf-slider"
            aria-label={`Слайдер ${c.nameRu}`}
          />
          <input
            type="number"
            min={0}
            max={max}
            step="0.01"
            placeholder="—"
            value={score.value}
            onChange={e => handleScoreChange(c.id, 'value', e.target.value)}
            className={`evf-num ${filled ? 'is-filled' : ''}`}
            aria-label={`Значение для ${c.nameRu}`}
          />
          <span className="evf-num-max">/ {max}</span>
        </div>
        <input
          type="text"
          placeholder="Примечание (необязательно)…"
          value={score.note}
          onChange={e => handleScoreChange(c.id, 'note', e.target.value)}
          className="evf-note"
          aria-label={`Примечание для ${c.nameRu}`}
        />
      </div>
    )
  }

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{FORM_CSS}</style>

      <div className="evf-shell">
        <button className="evf-back" onClick={() => navigate('/my-tasks')}>
          <ArrowLeft size={12} /> К моим задачам
        </button>

        <div className="evf-pagehead">
          <div className="evf-pagehead-tag">
            Форма оценки <span style={{ color: 'var(--dv3-text4)' }}>№ {idCode}</span>
          </div>
          <h1>Заполнение оценки</h1>
          <p>Заполните баллы по каждому критерию. Изменения сохраняются автоматически каждые 30 секунд.</p>
        </div>

        <div className="evf-page">
          {/* ════ FORM COLUMN ════ */}
          <div>
            {/* Evaluatee card */}
            <div className="evf-evaluatee">
              <div className="evf-avatar">{initials(evaluation.evaluateeName)}</div>
              <div>
                <h2 className="evf-evaluatee-name">{evaluation.evaluateeName}</h2>
                <div className="evf-evaluatee-meta">оценщик · {evaluation.evaluatorName}</div>
              </div>
              <div className="evf-evaluatee-period">
                <div className="evf-evaluatee-period-label">Период</div>
                <div className="evf-evaluatee-period-val">{periodLabel(evaluation.periodId)}</div>
                <span className="evf-period-badge">DRAFT</span>
              </div>
            </div>

            {/* Positive section */}
            <section className="evf-section">
              <div className="evf-section-head">
                <h2>Положительные критерии</h2>
                <span className="line" />
                <span className="count"><strong>{posFilled}</strong> / {positiveCriteria.length}</span>
              </div>

              <div className="evf-weight-summary">
                <span>Сумма весов</span>
                <div className="evf-weight-bar">
                  <i style={{ ['--w' as any]: `${Math.min(100, posWeightTotal)}%` }} />
                </div>
                <strong>{posWeightTotal}%</strong>
              </div>

              {positiveCriteria.length === 0
                ? <div className="evf-banner" style={{ padding: '40px 0', fontSize: 16 }}>Нет критериев</div>
                : positiveCriteria.map((c, i) => renderCard(c, i, false))}
            </section>

            {/* Anti-bonus section */}
            {antiBonusCriteria.length > 0 && (
              <section className="evf-section evf-section--neg">
                <div className="evf-section-head">
                  <h2>Антибонус — вычеты</h2>
                  <span className="line" />
                  <span className="count"><strong>{negFilled}</strong> / {antiBonusCriteria.length}</span>
                </div>
                {antiBonusCriteria.map((c, i) => renderCard(c, i, true))}
              </section>
            )}

            {/* Files */}
            <div className="evf-files">
              <h2>Доказательная база</h2>
              <FileUploadSection evaluationId={evaluationId} />
            </div>
          </div>

          {/* ════ SUMMARY COLUMN ════ */}
          <aside className="evf-summary">
            {/* Live preview */}
            <div className="evf-panel">
              <div className="evf-panel-head">
                <BarChart3 size={12} /> Предварительный расчёт
              </div>
              <div className="evf-panel-body">
                <div className={`evf-preview-num ${zoneClass(previewWhole)}`}>
                  {previewWhole}
                  <span>/ 100</span>
                </div>
                <div className="evf-preview-sub">из 100 баллов</div>
                <div className="evf-preview-bar" aria-hidden>
                  <i
                    className={zoneClass(previewWhole)}
                    style={{ ['--w' as any]: `${Math.min(100, Math.max(0, previewPct))}%` }}
                  />
                </div>
                <div className="evf-breakdown">
                  <div className="evf-breakdown-row">
                    <span>Положительные</span>
                    <strong className="pos">+{posSum.toFixed(2)}</strong>
                  </div>
                  <div className="evf-breakdown-row">
                    <span>Антибонус</span>
                    <strong className="neg">−{negSum.toFixed(2)}</strong>
                  </div>
                  <div className="evf-breakdown-row evf-breakdown-total">
                    <span>Итог</span>
                    <strong>{previewWhole}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Completion */}
            <div className="evf-panel">
              <div className="evf-panel-head">
                <CheckCircle2 size={12} /> Заполнено критериев
              </div>
              <div className="evf-panel-body evf-comp">
                <div>
                  <div className="evf-comp-row"><span>Положительные</span><strong>{posFilled} / {positiveCriteria.length}</strong></div>
                  <div className="evf-comp-bar">
                    <i style={{ ['--w' as any]: `${positiveCriteria.length ? posFilled / positiveCriteria.length * 100 : 0}%` }} />
                  </div>
                </div>
                {antiBonusCriteria.length > 0 && (
                  <div>
                    <div className="evf-comp-row"><span>Антибонус</span><strong>{negFilled} / {antiBonusCriteria.length}</strong></div>
                    <div className="evf-comp-bar">
                      <i className="neg" style={{ ['--w' as any]: `${negFilled / antiBonusCriteria.length * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Checklist */}
            <div className="evf-panel">
              <div className="evf-panel-head">
                <ListChecks size={12} /> Список критериев
              </div>
              <div className="evf-panel-body">
                <div className="evf-check">
                  {[...positiveCriteria.map((c, i) => ({ c, i, neg: false })),
                    ...antiBonusCriteria.map((c, i) => ({ c, i, neg: true }))]
                    .map(({ c, i, neg }) => {
                      const v = scores[c.id]?.value
                      const done = v != null && v !== ''
                      return (
                        <div key={c.id} className={`evf-check-row ${done ? 'is-done' : ''} ${neg ? 'neg' : ''}`}>
                          <span className="evf-check-dot" />
                          <span className="evf-check-name">{neg ? `A${i + 1}` : `${i + 1}`}. {c.nameRu}</span>
                          <span className="evf-check-val">{done ? `${neg ? '−' : ''}${parseFloat(v).toFixed(1)}` : '—'}</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="evf-submit">
              <button
                onClick={() => setSubmitOpen(true)}
                disabled={!allPosFilled}
                className="evf-btn evf-btn--primary"
              >
                <Send size={13} /> Отправить оценку
              </button>
              <button onClick={save} disabled={saving || posFilled + negFilled === 0} className="evf-btn">
                <Save size={13} /> {saving ? 'Сохранение…' : 'Сохранить черновик'}
              </button>
              {lastSaved && (
                <div className="evf-saved">
                  <CheckCircle2 size={11} style={{ color: 'var(--dv3-accent)' }} />
                  сохранено <strong>{lastSaved.toLocaleTimeString('ru-RU')}</strong>
                </div>
              )}
              {allPosFilled ? (
                <div className="evf-submit-hint ok">Готово к отправке</div>
              ) : (
                <div className="evf-submit-hint">
                  <AlertTriangle size={10} style={{ verticalAlign: -1, marginRight: 4 }} />
                  заполните все {positiveCriteria.length} положительных критериев
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={submitOpen}
        title="Отправить оценку?"
        description={`Итоговый балл: ${previewWhole}. После отправки оценку нельзя будет изменить. Сотрудник получит уведомление.`}
        variant="default"
        onConfirm={handleSubmit}
        onCancel={() => setSubmitOpen(false)}
      />
    </div>
  )
}
