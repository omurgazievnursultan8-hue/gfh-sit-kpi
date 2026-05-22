import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Send, Eye } from 'lucide-react'
import { evaluationsApi, Evaluation, EvaluationScore } from './evaluationsApi'
import { criteriaApi, Criteria } from '../criteria/criteriaApi'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { FileUploadSection } from './components/FileUploadSection'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DV3_FORM_CSS } from '../dashboard/dv3FormStyles'
import api from '../../app/api'

interface ScoreMap { [criteriaId: number]: { value: string; note: string } }

export function EvaluationFormPage() {
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

  const positiveCriteria = criteria.filter(c => c.type === 'POSITIVE' && c.active)
  const antiBonusCriteria = criteria.filter(c => c.type === 'ANTI_BONUS' && c.active)

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

  const handleSubmit = async () => {
    try {
      await save()
      await evaluationsApi.submit(evaluationId)
      navigate('/my-tasks')
    } finally {
      setSubmitOpen(false)
    }
  }

  /* ── early-return shells (dv3-skinned) ──────────────────────────────────── */
  const shell = (body: React.ReactNode) => (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{DV3_FORM_CSS}</style>
      <div className="dv3-terminal" style={{ maxWidth: 860 }}>{body}</div>
    </div>
  )

  if (loading) {
    return shell(
      <div className="dv3-banner" style={{ textAlign: 'center' }}>Загрузка...</div>
    )
  }
  if (!evaluation) {
    return shell(
      <div className="dv3-banner dv3-banner--error" style={{ textAlign: 'center' }}>Оценка не найдена</div>
    )
  }
  if (evaluation.status !== 'DRAFT') {
    return shell(
      <div className="dv3-banner dv3-banner--warn" style={{ textAlign: 'center' }}>
        Эта оценка уже отправлена (статус: {evaluation.status})
      </div>
    )
  }

  const renderSection = (sectionCriteria: Criteria[], title: string) => (
    <div style={{ marginBottom: 28 }}>
      <div className="dv3-section-head">{title}</div>
      {sectionCriteria.length === 0 ? (
        <p className="dv3-help">Нет критериев для этого раздела</p>
      ) : (
        <div className="dv3-form">
          {sectionCriteria.map(c => {
            const score = scores[c.id] ?? { value: '', note: '' }
            return (
              <div key={c.id} className="dv3-panel">
                <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dv3-text)' }}>{c.nameRu}</span>
                  <span style={{ fontSize: 11, color: 'var(--dv3-text3)' }}>({c.weight}%)</span>
                  {c.autoCalculated && (
                    <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--dv3-zone-info)' }}>авто</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Значение"
                    value={score.value}
                    onChange={e => handleScoreChange(c.id, 'value', e.target.value)}
                    className="dv3-input dv3-input--num"
                  />
                  <input
                    type="text"
                    placeholder="Примечание (необязательно)"
                    value={score.note}
                    onChange={e => handleScoreChange(c.id, 'note', e.target.value)}
                    className="dv3-input"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{DV3_FORM_CSS}</style>

      <div className="dv3-terminal" style={{ maxWidth: 860 }}>
        {/* HERO */}
        <div className="dv3-hero">
          <div className="dv3-hero-meta">
            <span className="dv3-hero-meta-l">EVAL.SCORE</span>
            <span className="dv3-hero-meta-r">{lastSaved ? `Сохранено ${lastSaved.toLocaleTimeString('ru-RU')}` : ''}</span>
          </div>
          <div className="dv3-hero-main">
            <div>
              <h1 className="dv3-hero-title">
                <span className="dv3-accent">Оценка сотрудника</span>
              </h1>
              <p className="dv3-hero-sub">{evaluation.evaluateeName}</p>
            </div>
            <div className="dv3-hero-metrics">
              <div className="dv3-hero-metric">
                <span className="dv3-hero-metric-num">
                  {previewScore !== null ? previewScore.toFixed(2) : '··'}
                </span>
                <span className="dv3-hero-metric-lab">итог (preview)</span>
              </div>
            </div>
          </div>
          <div className="dv3-hero-foot">
            <div className="dv3-btn-row">
              <button onClick={save} disabled={saving} className="dv3-btn">
                <Save size={14} />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={() => setSubmitOpen(true)} className="dv3-btn dv3-btn--primary">
                <Send size={14} />
                Отправить
              </button>
            </div>
            {previewScore !== null && (
              <span className="dv3-hero-foot-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Eye size={13} /> Итог: {previewScore.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {renderSection(positiveCriteria, 'Положительные критерии')}
        {renderSection(antiBonusCriteria, 'Антибонусы')}

        <FileUploadSection evaluationId={evaluationId} />
      </div>

      <ConfirmDialog
        open={submitOpen}
        title="Отправить оценку?"
        description="После отправки оценку нельзя будет изменить. Сотрудник получит уведомление."
        variant="default"
        onConfirm={handleSubmit}
        onCancel={() => setSubmitOpen(false)}
      />
    </div>
  )
}
