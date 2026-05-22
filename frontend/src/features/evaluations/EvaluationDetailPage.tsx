import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { evaluationsApi, Evaluation } from './evaluationsApi'
import api from '../../app/api'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { DV3_FORM_CSS } from '../dashboard/dv3FormStyles'
import { EvaluationStatusBadge } from './components/evaluationStatus'

interface ScoreHistory {
  criteriaId: number
  nameRu: string
  nameKg: string
  type: 'POSITIVE' | 'ANTI_BONUS'
  rawValue: number
  weightedValue: number
  weightSnapshot: number
}

export function EvaluationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const evaluationId = Number(id)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [scores, setScores] = useState<ScoreHistory[]>([])
  const [reacting, setReacting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      api.get<ScoreHistory[]>(`/evaluations/${evaluationId}/score-history`),
    ]).then(([eval_, hist]) => {
      setEvaluation(eval_)
      setScores(hist.data)
    }).finally(() => setLoading(false))
  }, [evaluationId])

  // Live tick — refresh clock each minute.
  useEffect(() => {
    const tid = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(tid)
  }, [])

  const react = async (reaction: 'AGREE' | 'DISAGREE') => {
    setReacting(true)
    try {
      await api.post(`/evaluations/${evaluationId}/reaction`, { reaction, comment })
      if (reaction === 'AGREE') {
        navigate('/my-evaluations')
      } else {
        navigate(`/appeals/new?evaluationId=${evaluationId}`)
      }
    } catch (err: any) {
      alert(err.response?.data?.message_ru || 'Ошибка')
    } finally {
      setReacting(false)
    }
  }

  /* ── time / clock ──────────────────────────────────────────────────────── */
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const clockKgt = `${hh}:${mm}`
  const hours = now.getHours()
  const timeGreeting = hours < 12 ? 'Доброе утро' : hours < 18 ? 'Добрый день' : 'Добрый вечер'
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayLine = `${datePart} · ${hh}:${mm}`

  const PLACEHOLDER = '··'

  if (loading) {
    return (
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <div className="dv3-terminal">
          <div className="text-center py-12" style={{ color: 'var(--dv3-text3)' }}>Загрузка...</div>
        </div>
      </div>
    )
  }
  if (!evaluation) {
    return (
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <div className="dv3-terminal">
          <div className="text-center py-12" style={{ color: 'var(--dv3-zone-down)' }}>Оценка не найдена</div>
        </div>
      </div>
    )
  }

  const positiveScores = scores.filter(s => s.type === 'POSITIVE')
  const antiBonusScores = scores.filter(s => s.type === 'ANTI_BONUS')

  const finalScore = evaluation.finalScore
  const scoreWhole = finalScore !== null ? Math.round(finalScore) : null

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{STAT_CARD_CSS}</style>
        <style>{DV3_FORM_CSS}</style>

        <div className="dv3-terminal" style={{ maxWidth: 960 }}>
          {/* STAT GRID */}
          <div className="dv3-grid">
            <StatCard
              className="dv3-col-6"
              title="EVAL.SCORE" id="S01" loading={loading}
              value={scoreWhole} unit="/ 100" zoneScore={scoreWhole}
              emptyValue="—"
              gauge={{
                pct: finalScore !== null ? finalScore / 100 : 0, variant: 'marker',
                left: '0', right: '100',
                current: scoreWhole !== null ? scoreWhole : '—',
              }}
            />
            <StatCard
              className="dv3-col-6"
              title="CRITERIA" id="C01" loading={loading}
              value={scores.length} label="критериев"
              gauge={{
                pct: scores.length > 0 ? positiveScores.length / scores.length : 0, variant: 'meta',
                left: '0',
                center: <><strong>{positiveScores.length}</strong> положит. · <strong>{antiBonusScores.length}</strong> антибонус</>,
                right: scores.length,
              }}
            />
          </div>
        </div>
      </div>

      {/* DETAIL / BREAKDOWN PANELS */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px 48px' }}>
        <div className="dv3-root">
          <style>{DV3_FORM_CSS}</style>
          <div className="dv3-form">
            {positiveScores.length > 0 && (
              <div className="dv3-panel">
                <div className="dv3-section-head">
                  <span>Положительные критерии</span>
                  <EvaluationStatusBadge status={evaluation.status} />
                </div>
                {positiveScores.map(s => (
                  <ScoreRow key={s.criteriaId} s={s} />
                ))}
              </div>
            )}

            {antiBonusScores.length > 0 && (
              <div className="dv3-panel">
                <div className="dv3-section-head">
                  <span>Антибонусы</span>
                </div>
                {antiBonusScores.map(s => (
                  <ScoreRow key={s.criteriaId} s={s} negative />
                ))}
              </div>
            )}

            {evaluation.status === 'SUBMITTED' && (
              <div className="dv3-panel dv3-panel--accent">
                <div className="dv3-section-head">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={14} />
                    Ваша реакция
                  </span>
                </div>
                <div className="dv3-field">
                  <label className="dv3-label">Комментарий</label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Комментарий (необязательно)"
                    rows={3}
                    className="dv3-textarea"
                  />
                </div>
                <div className="dv3-btn-row" style={{ marginTop: 16 }}>
                  <button
                    onClick={() => react('AGREE')}
                    disabled={reacting}
                    className="dv3-btn dv3-btn--primary"
                    style={{ flex: 1 }}
                  >
                    <ThumbsUp size={16} />
                    Согласен
                  </button>
                  <button
                    onClick={() => react('DISAGREE')}
                    disabled={reacting}
                    className="dv3-btn dv3-btn--danger"
                    style={{ flex: 1 }}
                  >
                    <ThumbsDown size={16} />
                    Не согласен
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ScoreRow({ s, negative = false }: { s: ScoreHistory; negative?: boolean }) {
  return (
    <div
      className="dv3-setrow"
      style={{ fontFamily: "'Geist Mono', ui-monospace, Menlo, monospace" }}
    >
      <div className="dv3-setrow-main">
        <span className="dv3-setrow-title">
          {s.nameRu}
          <span style={{ color: 'var(--dv3-text4)', marginLeft: 8, fontSize: 11 }}>({s.weightSnapshot}%)</span>
        </span>
      </div>
      <div style={{ textAlign: 'right', color: negative ? 'var(--dv3-zone-down)' : 'var(--dv3-text)' }}>
        <div style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{s.rawValue.toFixed(2)}</div>
        <div style={{ fontSize: 11, color: negative ? 'var(--dv3-zone-down)' : 'var(--dv3-text3)' }}>
          взвеш: {negative ? '-' : ''}{s.weightedValue.toFixed(2)}
        </div>
      </div>
    </div>
  )
}
