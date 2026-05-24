import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ThumbsUp, ThumbsDown, AlertCircle, ArrowLeft, FileCheck2 } from 'lucide-react'
import { evaluationsApi, Evaluation } from './evaluationsApi'
import api from '../../app/api'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
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

const DETAIL_CSS = `
.evd-shell {
  max-width: 1080px;
  margin: 0 auto;
  padding: 36px 32px 80px;
  position: relative;
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
}
.evd-shell::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent 0 23px,
      var(--dv3-border) 23px 23.5px
    );
  opacity: .25;
  pointer-events: none;
  z-index: 0;
  mask-image: linear-gradient(180deg, transparent 0, #000 80px, #000 calc(100% - 120px), transparent 100%);
}
.evd-shell > * { position: relative; z-index: 1; }

.evd-back {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dv3-text3);
  background: none; border: 0; padding: 0; cursor: pointer;
  margin-bottom: 24px;
}
.evd-back:hover { color: var(--dv3-accent); }

/* ─── HERO ─────────────────────────────────────────────────────────── */
.evd-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 48px;
  align-items: end;
  padding: 24px 0 32px;
  border-bottom: 1px solid var(--dv3-border);
  position: relative;
}
.evd-hero::after {
  content: '';
  position: absolute; left: 0; right: 0; bottom: -1px;
  height: 4px;
  background: repeating-linear-gradient(90deg, var(--dv3-border-hi) 0 6px, transparent 6px 12px);
  opacity: .5;
}
.evd-hero-tag {
  font-size: 10px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--dv3-text3);
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 18px;
}
.evd-hero-tag::before {
  content: ''; width: 28px; height: 1px; background: var(--dv3-text4);
}
.evd-hero-id {
  font-size: 10px; letter-spacing: .22em; color: var(--dv3-text4);
}

.evd-verdict {
  display: flex; align-items: baseline; gap: 18px;
  margin-bottom: 18px;
}
.evd-verdict-num {
  font-family: 'EB Garamond', 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: clamp(108px, 18vw, 196px);
  line-height: .82;
  letter-spacing: -0.04em;
  color: var(--dv3-text);
  position: relative;
}
.evd-verdict-num--up   { color: var(--dv3-zone-up); }
.evd-verdict-num--warn { color: var(--dv3-zone-warn); }
.evd-verdict-num--down { color: var(--dv3-zone-down); }
.evd-verdict-num--null { color: var(--dv3-text4); }

.evd-verdict-frac {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-size: 13px; letter-spacing: .14em; color: var(--dv3-text3);
  padding-bottom: 28px;
}
.evd-verdict-frac strong {
  display: block;
  font-size: 22px; color: var(--dv3-text);
  letter-spacing: 0;
  font-weight: 500;
  margin-bottom: 4px;
}

.evd-hero-tail {
  font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
  color: var(--dv3-text3);
  display: flex; flex-wrap: wrap; gap: 18px 28px;
}
.evd-hero-tail strong {
  display: block; color: var(--dv3-text);
  font-weight: 500; letter-spacing: 0;
  text-transform: none; font-size: 13px; margin-top: 2px;
}

.evd-hero-side {
  display: flex; flex-direction: column; gap: 14px;
  padding-bottom: 12px;
}
.evd-hero-side-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid var(--dv3-border);
  font-size: 12px;
}
.evd-hero-side-row:first-child { border-top: 0; padding-top: 0; }
.evd-hero-side-row .k {
  color: var(--dv3-text3);
  letter-spacing: .16em; text-transform: uppercase; font-size: 10px;
  align-self: center;
}
.evd-hero-side-row .v { color: var(--dv3-text); }
.evd-hero-side-row .v em {
  font-style: normal; color: var(--dv3-text3);
  display: block; font-size: 10px; letter-spacing: .12em; margin-top: 3px;
}

/* ─── TIMELINE ─────────────────────────────────────────────────────── */
.evd-timeline {
  margin: 36px 0 12px;
  display: flex; align-items: center; gap: 0;
  font-size: 10px; letter-spacing: .2em; text-transform: uppercase;
  color: var(--dv3-text3);
}
.evd-timeline-step {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px;
  border: 1px solid var(--dv3-border);
  background: var(--dv3-bg2);
  white-space: nowrap;
}
.evd-timeline-step.is-done {
  background: var(--dv3-accent-bg);
  border-color: var(--dv3-border-hi);
  color: var(--dv3-accent);
}
.evd-timeline-step.is-current {
  border-color: var(--dv3-accent);
  color: var(--dv3-text);
  box-shadow: inset 0 0 0 1px var(--dv3-accent);
}
.evd-timeline-dash {
  flex: 0 1 32px; height: 1px;
  background: repeating-linear-gradient(90deg, var(--dv3-border-hi) 0 4px, transparent 4px 8px);
}

/* ─── LEDGER ──────────────────────────────────────────────────────── */
.evd-section {
  margin-top: 48px;
}
.evd-section-head {
  display: flex; align-items: baseline; gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--dv3-border);
  margin-bottom: 8px;
}
.evd-section-head h2 {
  margin: 0;
  font-family: 'EB Garamond', 'Cormorant Garamond', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  font-size: 28px;
  letter-spacing: -0.01em;
  color: var(--dv3-text);
}
.evd-section-head .count {
  font-size: 10px; letter-spacing: .22em; color: var(--dv3-text3);
  text-transform: uppercase;
}
.evd-section-head .spacer { flex: 1; }
.evd-section-head .total {
  font-size: 11px; letter-spacing: .14em; color: var(--dv3-text3);
  text-transform: uppercase;
}
.evd-section-head .total strong {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  margin-left: 8px; color: var(--dv3-text); font-size: 14px;
  letter-spacing: 0;
}
.evd-section--neg .evd-section-head h2 { color: var(--dv3-zone-down); }
.evd-section--neg .evd-section-head .total strong { color: var(--dv3-zone-down); }

.evd-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 92px 110px;
  gap: 18px;
  padding: 16px 0;
  border-bottom: 1px dashed var(--dv3-border);
  align-items: center;
}
.evd-row-idx {
  font-size: 10px; letter-spacing: .18em; color: var(--dv3-text4);
}
.evd-row-name {
  font-size: 13px; color: var(--dv3-text); font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500; letter-spacing: -0.005em;
  line-height: 1.25;
}
.evd-row-name .w {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  font-style: normal;
  font-size: 10px; letter-spacing: .14em;
  color: var(--dv3-text3);
  margin-left: 10px;
  padding: 2px 6px;
  border: 1px solid var(--dv3-border);
  border-radius: 1px;
}
.evd-row-bar {
  height: 6px; background: var(--dv3-bg3);
  border: 1px solid var(--dv3-border);
  position: relative; overflow: hidden;
}
.evd-row-bar > i {
  position: absolute; inset: 0 auto 0 0;
  background: linear-gradient(90deg, var(--dv3-accent), var(--dv3-zone-up));
  width: var(--w, 0%);
  transform-origin: left center;
  animation: evd-grow .9s cubic-bezier(.2,.7,.2,1) both;
}
.evd-section--neg .evd-row-bar > i {
  background: linear-gradient(90deg, var(--dv3-zone-down), #e0866a);
}
.evd-row-vals {
  text-align: right; font-variant-numeric: tabular-nums;
}
.evd-row-vals .raw {
  font-size: 16px; color: var(--dv3-text);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
}
.evd-row-vals .wt {
  display: block;
  font-size: 10px; letter-spacing: .16em;
  color: var(--dv3-text3);
  text-transform: uppercase;
  margin-top: 4px;
}
.evd-section--neg .evd-row-vals .raw { color: var(--dv3-zone-down); }

@keyframes evd-grow {
  0%   { width: 0%; }
  100% { width: var(--w, 0%); }
}

/* ─── REACTION ────────────────────────────────────────────────────── */
.evd-react {
  margin-top: 56px;
  padding: 28px;
  border: 1px solid var(--dv3-border-hi);
  background: var(--dv3-bg2);
  position: relative;
  background-image:
    repeating-linear-gradient(45deg,
      transparent 0 14px,
      var(--dv3-border) 14px 14.5px);
}
.evd-react-inner {
  background: var(--dv3-bg2);
  padding: 24px 24px 22px;
  border: 1px solid var(--dv3-border);
  position: relative;
}
.evd-react-stamp {
  position: absolute; right: -14px; top: -14px;
  transform: rotate(8deg);
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic;
  font-size: 11px; letter-spacing: .26em; text-transform: uppercase;
  padding: 6px 14px;
  background: var(--dv3-bg);
  border: 1px solid var(--dv3-accent);
  color: var(--dv3-accent);
}
.evd-react h3 {
  margin: 0 0 6px;
  font-family: 'EB Garamond', Georgia, serif;
  font-style: italic; font-weight: 500;
  font-size: 22px; color: var(--dv3-text);
}
.evd-react p {
  margin: 0 0 18px;
  font-size: 12px; color: var(--dv3-text3); line-height: 1.55;
}
.evd-react textarea {
  width: 100%; min-height: 86px;
  padding: 12px 14px;
  background: var(--dv3-bg);
  border: 1px solid var(--dv3-border);
  color: var(--dv3-text);
  font: 13px/1.5 'Geist Mono', ui-monospace, Menlo, monospace;
  resize: vertical;
  outline: none;
  transition: border-color .15s;
}
.evd-react textarea:focus { border-color: var(--dv3-accent); }

.evd-react-actions {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  margin-top: 16px;
}
.evd-react-btn {
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
.evd-react-btn:hover { transform: translateY(-1px); }
.evd-react-btn--agree {
  background: var(--dv3-accent);
  border-color: var(--dv3-accent);
  color: var(--dv3-bg);
}
.evd-react-btn--agree:hover { background: var(--dv3-zone-up); border-color: var(--dv3-zone-up); }
.evd-react-btn--disagree {
  background: var(--dv3-bg);
  color: var(--dv3-zone-down);
  border-color: var(--dv3-zone-down);
}
.evd-react-btn--disagree:hover { background: var(--dv3-zone-down); color: var(--dv3-bg); }
.evd-react-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

@media (max-width: 760px) {
  .evd-shell { padding: 20px 16px 60px; }
  .evd-hero { grid-template-columns: 1fr; gap: 24px; }
  .evd-hero-side { border-top: 1px dashed var(--dv3-border); padding-top: 16px; }
  .evd-row { grid-template-columns: 28px minmax(0, 1fr) 90px; gap: 12px; }
  .evd-row-bar { display: none; }
  .evd-react-actions { grid-template-columns: 1fr; }
}
`

const formatDate = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const zoneClass = (score: number | null): string => {
  if (score === null) return 'evd-verdict-num--null'
  if (score >= 80) return 'evd-verdict-num--up'
  if (score >= 50) return 'evd-verdict-num--warn'
  return 'evd-verdict-num--down'
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

  useEffect(() => {
    Promise.all([
      evaluationsApi.get(evaluationId),
      api.get<ScoreHistory[]>(`/evaluations/${evaluationId}/score-history`).catch(() => ({ data: [] })),
    ]).then(([eval_, hist]) => {
      setEvaluation(eval_)
      setScores(hist.data)
    }).finally(() => setLoading(false))
  }, [evaluationId])

  const react = async (reaction: 'AGREE' | 'DISAGREE') => {
    setReacting(true)
    try {
      await api.post(`/evaluations/${evaluationId}/reaction`, { reaction, comment })
      if (reaction === 'AGREE') navigate('/my-evaluations')
      else navigate(`/appeals/new?evaluationId=${evaluationId}`)
    } catch (err: any) {
      alert(err.response?.data?.message_ru || 'Ошибка')
    } finally {
      setReacting(false)
    }
  }

  if (loading) {
    return (
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{DETAIL_CSS}</style>
        <div className="evd-shell">
          <div style={{ color: 'var(--dv3-text3)', padding: '120px 0', textAlign: 'center' }}>
            Загрузка досье…
          </div>
        </div>
      </div>
    )
  }
  if (!evaluation) {
    return (
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{DETAIL_CSS}</style>
        <div className="evd-shell">
          <div style={{ color: 'var(--dv3-zone-down)', padding: '120px 0', textAlign: 'center' }}>
            Оценка не найдена
          </div>
        </div>
      </div>
    )
  }

  const positiveScores = scores.filter(s => s.type === 'POSITIVE')
  const antiBonusScores = scores.filter(s => s.type === 'ANTI_BONUS')
  const finalScore = evaluation.finalScore
  const scoreWhole = finalScore !== null ? Math.round(finalScore) : null

  const positiveSum = positiveScores.reduce((a, s) => a + s.weightedValue, 0)
  const antiBonusSum = antiBonusScores.reduce((a, s) => a + s.weightedValue, 0)
  const maxBar = Math.max(
    1,
    ...scores.map(s => Math.abs(s.weightedValue)),
    ...scores.map(s => s.rawValue),
  )

  const idCode = `EV-${String(evaluation.id).padStart(6, '0')}`

  const timeline: { key: string; label: string; state: 'done' | 'current' | 'pending' }[] = [
    { key: 'DRAFT',        label: 'Черновик',  state: 'done' },
    { key: 'SUBMITTED',    label: 'Отправлено', state:
        evaluation.status === 'DRAFT' ? 'pending' :
        evaluation.status === 'SUBMITTED' ? 'current' : 'done' },
    { key: 'ACKNOWLEDGED', label: 'Принято',
      state: evaluation.status === 'ACKNOWLEDGED' ? 'current' :
             evaluation.status === 'CLOSED' || evaluation.status === 'APPEALED' ? 'done' : 'pending' },
    { key: 'CLOSED',       label: 'Закрыто',
      state: evaluation.status === 'CLOSED' ? 'current' :
             evaluation.status === 'APPEALED' ? 'done' : 'pending' },
  ]

  return (
    <div className="dv3-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{DV3_FORM_CSS}</style>
      <style>{DETAIL_CSS}</style>

      <div className="evd-shell">
        <button className="evd-back" onClick={() => navigate('/my-evaluations')}>
          <ArrowLeft size={12} /> К списку оценок
        </button>

        {/* HERO */}
        <header className="evd-hero">
          <div>
            <div className="evd-hero-tag">
              Досье оценки <span className="evd-hero-id">№ {idCode}</span>
            </div>

            <div className="evd-verdict">
              <span className={`evd-verdict-num ${zoneClass(scoreWhole)}`}>
                {scoreWhole !== null ? scoreWhole : '—'}
              </span>
              <span className="evd-verdict-frac">
                <strong>из 100</strong>
                итоговый балл
              </span>
            </div>

            <div className="evd-hero-tail">
              <div>
                Критериев<strong>{scores.length}</strong>
              </div>
              <div>
                Положит.<strong style={{ color: 'var(--dv3-zone-up)' }}>
                  +{positiveSum.toFixed(2)}
                </strong>
              </div>
              <div>
                Антибонус<strong style={{ color: 'var(--dv3-zone-down)' }}>
                  −{antiBonusSum.toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          <aside className="evd-hero-side">
            <div className="evd-hero-side-row">
              <span className="k">Статус</span>
              <span className="v"><EvaluationStatusBadge status={evaluation.status} /></span>
            </div>
            <div className="evd-hero-side-row">
              <span className="k">Оценщик</span>
              <span className="v">
                {evaluation.evaluatorName}
                <em>исполнитель</em>
              </span>
            </div>
            <div className="evd-hero-side-row">
              <span className="k">Период</span>
              <span className="v">
                #{evaluation.periodId}
                <em>оценочный цикл</em>
              </span>
            </div>
            <div className="evd-hero-side-row">
              <span className="k">Отправлено</span>
              <span className="v">{formatDate(evaluation.submittedAt)}</span>
            </div>
            <div className="evd-hero-side-row">
              <span className="k">Создано</span>
              <span className="v">{formatDate(evaluation.createdAt)}</span>
            </div>
          </aside>
        </header>

        {/* TIMELINE */}
        <nav className="evd-timeline" aria-label="Жизненный цикл оценки">
          {timeline.map((step, i) => (
            <span key={step.key} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <span className={`evd-timeline-step ${step.state === 'done' ? 'is-done' : step.state === 'current' ? 'is-current' : ''}`}>
                {String(i + 1).padStart(2, '0')} · {step.label}
              </span>
              {i < timeline.length - 1 && <span className="evd-timeline-dash" />}
            </span>
          ))}
        </nav>

        {/* POSITIVE */}
        {positiveScores.length > 0 && (
          <section className="evd-section">
            <div className="evd-section-head">
              <h2>Положительные критерии</h2>
              <span className="count">{positiveScores.length} поз.</span>
              <span className="spacer" />
              <span className="total">сумма<strong>+{positiveSum.toFixed(2)}</strong></span>
            </div>
            {positiveScores.map((s, i) => (
              <LedgerRow key={s.criteriaId} idx={i + 1} s={s} max={maxBar} />
            ))}
          </section>
        )}

        {/* ANTI-BONUS */}
        {antiBonusScores.length > 0 && (
          <section className="evd-section evd-section--neg">
            <div className="evd-section-head">
              <h2>Антибонусы</h2>
              <span className="count">{antiBonusScores.length} штрафов</span>
              <span className="spacer" />
              <span className="total">сумма<strong>−{antiBonusSum.toFixed(2)}</strong></span>
            </div>
            {antiBonusScores.map((s, i) => (
              <LedgerRow key={s.criteriaId} idx={i + 1} s={s} max={maxBar} negative />
            ))}
          </section>
        )}

        {/* REACTION */}
        {evaluation.status === 'SUBMITTED' && (
          <section className="evd-react">
            <div className="evd-react-inner">
              <div className="evd-react-stamp">К подписи</div>
              <h3>
                <AlertCircle size={16} style={{ verticalAlign: -2, marginRight: 6 }} />
                Ваша реакция требуется
              </h3>
              <p>
                Подпишите согласие или подайте обоснованное возражение. После согласия
                оценка закрывается и переходит в архив. Возражение откроет процедуру апелляции.
              </p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Комментарий (необязательно)…"
              />
              <div className="evd-react-actions">
                <button
                  onClick={() => react('AGREE')}
                  disabled={reacting}
                  className="evd-react-btn evd-react-btn--agree"
                >
                  <ThumbsUp size={14} /> Согласен · подписать
                </button>
                <button
                  onClick={() => react('DISAGREE')}
                  disabled={reacting}
                  className="evd-react-btn evd-react-btn--disagree"
                >
                  <ThumbsDown size={14} /> Не согласен · апелляция
                </button>
              </div>
            </div>
          </section>
        )}

        {evaluation.status === 'ACKNOWLEDGED' && (
          <section className="evd-react">
            <div className="evd-react-inner" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <FileCheck2 size={28} style={{ color: 'var(--dv3-accent)', marginBottom: 8 }} />
              <h3 style={{ marginBottom: 4 }}>Оценка подписана</h3>
              <p style={{ margin: 0 }}>Спор закрыт. Запись передана в архив.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function LedgerRow({
  idx, s, max, negative = false,
}: { idx: number; s: ScoreHistory; max: number; negative?: boolean }) {
  const pct = Math.min(100, (Math.abs(s.weightedValue) / max) * 100)
  return (
    <div className="evd-row">
      <span className="evd-row-idx">{String(idx).padStart(2, '0')}</span>
      <div className="evd-row-name">
        {s.nameRu}
        <span className="w">{s.weightSnapshot}%</span>
      </div>
      <div className="evd-row-bar" aria-hidden>
        <i style={{ ['--w' as any]: `${pct}%` }} />
      </div>
      <div className="evd-row-vals">
        <span className="raw">{s.rawValue.toFixed(2)}</span>
        <span className="wt">взвеш {negative ? '−' : '+'}{Math.abs(s.weightedValue).toFixed(2)}</span>
      </div>
    </div>
  )
}
