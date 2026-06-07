import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ThumbsUp, ThumbsDown, ArrowLeft, Check, ChevronRight, Minus,
} from 'lucide-react'
import { evaluationsApi, Evaluation } from '../api'
import api from '../../../app/api'

interface ScoreHistory {
  criteriaId: number
  nameRu: string
  nameKg: string
  type: 'POSITIVE' | 'ANTI_BONUS'
  rawValue: number
  weightedValue: number
  weightSnapshot: number
}

type Zone = 'up' | 'mid' | 'down'
const zoneOf = (s: number): Zone => (s >= 80 ? 'up' : s >= 60 ? 'mid' : 'down')
const ZONE_LABEL: Record<Zone, string> = { up: 'Выше цели', mid: 'В норме', down: 'Ниже цели' }

const EVD_CSS = `
.evd-root{
  --bg:#eef1f6;
  --surface:#ffffff;
  --surface-2:#f2f5fa;
  --surface-3:#e6ebf3;
  --ink:#16202e;
  --ink-2:#48566a;
  --ink-3:#8893a6;
  --border:#e1e7f0;
  --border-2:#cfd8e6;
  --brand:#173869;
  --brand-2:#2456a6;
  --accent:#2456a6;
  --accent-2:#1d478c;
  --accent-soft:#e2eaf6;
  --accent-ink:#1c4486;
  --crit:#c2392b; --crit-soft:#fbe9e6; --crit-ink:#8f261b;
  --warn:#b07d16; --warn-soft:#fbf2da; --warn-ink:#7e5908;
  --ok:#2f8a52;   --ok-soft:#e6f3ea;   --ok-ink:#1f6b3d;
  --shadow-sm:0 1px 2px rgba(14,23,38,.06),0 1px 3px rgba(14,23,38,.05);
  --radius:4px;
  --sans:'Fira Sans',system-ui,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
  --on-accent:#ffffff;
  background:
    radial-gradient(1100px 560px at 88% -8%, rgba(36,86,166,.07), transparent 60%),
    var(--bg);
  min-height:100vh;
  color:var(--ink);
  font-family:var(--sans);
  font-size:15px;
  line-height:1.45;
  -webkit-font-smoothing:antialiased;
}
.evd-root *, .evd-root *::before, .evd-root *::after{box-sizing:border-box;}
.evd-wrap{max-width:932px;margin:0 auto;padding:32px 24px 140px;}

.evd-eb{font-family:var(--mono);font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);}
.evd-mono{font-family:var(--mono);}
.evd-muted{color:var(--ink-3);}

.evd-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;}
.evd-crumb{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);}
.evd-crumb button{background:0;border:0;padding:0;cursor:pointer;color:var(--ink-3);font:inherit;letter-spacing:inherit;text-transform:inherit;display:inline-flex;align-items:center;gap:8px;transition:color .12s;}
.evd-crumb button:hover{color:var(--accent);}
.evd-crumb .sep{color:var(--border-2);}
.evd-crumb .here{color:var(--ink);}
.evd-stamp{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:5px 11px;border-radius:5px;background:var(--surface);border:1px solid var(--border);color:var(--ink-2);}
.evd-stamp i{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ink-3);}
.evd-stamp.is-done{background:var(--ok-soft);color:var(--ok-ink);border-color:transparent;}
.evd-stamp.is-done i{background:var(--ok);}
.evd-stamp.is-warn{background:var(--crit-soft);color:var(--crit-ink);border-color:transparent;}
.evd-stamp.is-warn i{background:var(--crit);}
.evd-stamp.is-info{background:var(--accent-soft);color:var(--accent-ink);border-color:transparent;}
.evd-stamp.is-info i{background:var(--accent);}

.evd-hero{display:grid;grid-template-columns:auto 1fr;gap:30px;align-items:center;background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--accent);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:26px 30px;}
.evd-hero .who .eb{margin-bottom:8px;}
.evd-hero .who h1{font-size:23px;font-weight:600;margin:0 0 5px;letter-spacing:-.01em;color:var(--ink);}
.evd-hero .who .sub{font-size:13px;color:var(--ink-2);}
.evd-hero .who .sub b{color:var(--ink);font-weight:600;}
.evd-hero .who .row{display:flex;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap;}
.evd-hero .who .chips{display:flex;gap:18px;margin-top:18px;flex-wrap:wrap;}
.evd-hero .who .chip .k{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);}
.evd-hero .who .chip .v{font-family:var(--mono);font-size:17px;font-weight:600;margin-top:3px;color:var(--ink);}
.evd-hero .who .chip .v.pos{color:var(--ok-ink);}
.evd-hero .who .chip .v.neg{color:var(--crit-ink);}

.evd-zpill{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:5px;white-space:nowrap;}
.evd-zpill::before{content:"";width:7px;height:7px;border-radius:50%;flex:none;}
.evd-zpill.up{background:var(--ok-soft);color:var(--ok-ink);} .evd-zpill.up::before{background:var(--ok);}
.evd-zpill.mid{background:var(--warn-soft);color:var(--warn-ink);} .evd-zpill.mid::before{background:var(--warn);}
.evd-zpill.down{background:var(--crit-soft);color:var(--crit-ink);} .evd-zpill.down::before{background:var(--crit);}

.evd-sbadge{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:5px;background:var(--ok-soft);color:var(--ok-ink);}
.evd-sbadge svg{width:12px;height:12px;}

.evd-donut{position:relative;flex:none;}
.evd-donut svg{display:block;transform:rotate(-90deg);}
.evd-dn-track{fill:none;stroke:var(--surface-3);}
.evd-dn-val{fill:none;stroke-linecap:round;transition:stroke-dashoffset .9s cubic-bezier(.4,0,.2,1);}
.evd-dn-val.up{stroke:var(--ok);}
.evd-dn-val.mid{stroke:var(--warn);}
.evd-dn-val.down{stroke:var(--crit);}
.evd-dn-cap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}

.evd-dist{margin-top:16px;}
.evd-zonebar{display:flex;height:8px;border-radius:5px;overflow:hidden;gap:2px;background:var(--surface-3);}
.evd-zonebar > span{display:block;}
.evd-zonebar .up{background:var(--ok);}
.evd-zonebar .mid{background:var(--warn);}
.evd-zonebar .down{background:var(--crit);}
.evd-dist .lg{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:9px;font-size:12px;color:var(--ink-2);}
.evd-dist .lg b{font-family:var(--mono);color:var(--ink);}
.evd-dist .lg span{display:inline-flex;align-items:center;gap:6px;}
.evd-dist .lg span::before{content:"";width:8px;height:8px;border-radius:2px;}
.evd-dist .lg .up::before{background:var(--ok);}
.evd-dist .lg .mid::before{background:var(--warn);}
.evd-dist .lg .down::before{background:var(--crit);}

.evd-sect{margin:26px 4px 13px;display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);}
.evd-sect.crit{color:var(--crit-ink);}
.evd-sect .ln{flex:1;height:1px;background:var(--border-2);}

.evd-crow{display:grid;grid-template-columns:26px 1fr 150px 80px;gap:14px;align-items:center;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);margin-bottom:8px;}
.evd-crow .ci{font-family:var(--mono);font-size:11px;color:var(--ink-3);display:inline-flex;align-items:center;justify-content:flex-start;}
.evd-crow .ci svg{color:var(--crit);}
.evd-crow .cn{font-size:14px;font-weight:500;color:var(--ink);}
.evd-crow .cn small{display:block;color:var(--ink-3);font-size:11.5px;font-weight:400;margin-top:2px;line-height:1.4;}
.evd-crow .bar-wrap{display:flex;flex-direction:column;gap:5px;}
.evd-crow .bar{height:8px;border-radius:5px;background:var(--surface-3);overflow:hidden;}
.evd-crow .bar i{display:block;height:100%;border-radius:5px;transition:width .7s cubic-bezier(.4,0,.2,1);}
.evd-crow .bar i.up{background:var(--ok);}
.evd-crow .bar i.mid{background:var(--warn);}
.evd-crow .bar i.down{background:var(--crit);}
.evd-crow .bmeta{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--ink-3);}
.evd-crow .cscore{text-align:right;}
.evd-crow .cscore b{font-family:var(--mono);font-size:18px;font-weight:600;color:var(--ink);}
.evd-crow .cscore .pts{font-family:var(--mono);font-size:11px;color:var(--ink-3);margin-top:2px;}
.evd-crow.anti .bar i{background:var(--crit);}
.evd-crow.anti .cscore b{color:var(--crit-ink);}

@media(max-width:680px){
  .evd-hero{grid-template-columns:1fr;justify-items:center;text-align:center;padding:24px 20px;}
  .evd-hero .who .row,.evd-hero .who .chips,.evd-dist .lg{justify-content:center;}
  .evd-crow{grid-template-columns:22px 1fr 80px;}
  .evd-crow .bar-wrap{grid-column:1 / -1;order:3;}
}

.evd-timeline{margin-top:36px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow-sm);padding:24px 28px;}
.evd-tl-head{font-family:var(--sans);font-weight:600;font-size:15px;letter-spacing:-.005em;margin:0 0 18px;color:var(--ink);}
.evd-tl{position:relative;padding-left:24px;}
.evd-tl::before{content:'';position:absolute;left:6px;top:4px;bottom:4px;width:1px;background:var(--border-2);}
.evd-tl-step{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:baseline;padding:12px 0;position:relative;border-bottom:1px solid var(--border);}
.evd-tl-step:last-child{border-bottom:0;}
.evd-tl-dot{position:absolute;left:-24px;top:16px;width:13px;height:13px;border-radius:50%;background:var(--surface);border:1px solid var(--border-2);display:grid;place-items:center;}
.evd-tl-step.done .evd-tl-dot{background:var(--ok);border-color:var(--ok);}
.evd-tl-step.current .evd-tl-dot{background:var(--warn);border-color:var(--warn);box-shadow:0 0 0 4px rgba(176,125,22,.15);}
.evd-tl-name{font-size:14px;font-weight:500;color:var(--ink);}
.evd-tl-step.current .evd-tl-name{color:var(--warn-ink);}
.evd-tl-meta{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin-top:2px;}
.evd-tl-time{font-family:var(--mono);font-size:11px;color:var(--ink-2);font-variant-numeric:tabular-nums;}

.evd-done{display:flex;align-items:center;gap:16px;margin-top:24px;padding:20px 24px;background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--ok);border-radius:var(--radius);box-shadow:var(--shadow-sm);}
.evd-done-icon{width:42px;height:42px;border-radius:10px;background:var(--ok-soft);color:var(--ok-ink);display:grid;place-items:center;flex:none;}
.evd-done h3{margin:0 0 3px;font-size:15px;font-weight:600;color:var(--ink);}
.evd-done p{margin:0;color:var(--ink-3);font-size:13px;}

.evd-dock{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:16px 24px;background:rgba(255,255,255,.94);backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);border-top:1px solid var(--border);box-shadow:0 -8px 24px -12px rgba(14,23,38,.08);}
.evd-dock-inner{max-width:932px;margin:0 auto;display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;}
@media(max-width:760px){.evd-dock-inner{grid-template-columns:1fr;}}
.evd-dock input{width:100%;padding:11px 14px;background:var(--surface);border:1px solid var(--border-2);border-radius:8px;color:var(--ink);font:13px/1.4 var(--sans);outline:none;transition:border-color .12s,box-shadow .12s;}
.evd-dock input::placeholder{color:var(--ink-3);}
.evd-dock input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(36,86,166,.12);}
.evd-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;font-family:var(--sans);font-size:12.5px;font-weight:600;border-radius:8px;cursor:pointer;border:1px solid transparent;transition:background .12s,border-color .12s,color .12s;}
.evd-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}
.evd-btn--agree{background:var(--accent);color:var(--on-accent);}
.evd-btn--agree:hover{background:var(--accent-2);}
.evd-btn--disagree{background:var(--surface);color:var(--crit-ink);border-color:var(--crit-soft);}
.evd-btn--disagree:hover{background:var(--crit);color:#fff;border-color:var(--crit);}
.evd-btn:disabled{opacity:.55;cursor:not-allowed;}

.evd-empty{padding:80px 20px;text-align:center;font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);}
`

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Черновик', SUBMITTED: 'На рассмотрении',
  ACKNOWLEDGED: 'Принята', APPEALED: 'Апелляция', CLOSED: 'Закрыта',
}

interface DonutProps { value: number; size?: number; stroke?: number; label?: string }
function Donut({ value, size = 150, stroke = 14, label = 'баллов' }: DonutProps) {
  const r = (size - stroke) / 2 - 1
  const c = 2 * Math.PI * r
  const z = zoneOf(value)
  const ref = useRef<SVGCircleElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    el.style.strokeDasharray = c.toFixed(1)
    el.style.strokeDashoffset = c.toFixed(1)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.strokeDashoffset = (c * (1 - Math.max(0, Math.min(100, value)) / 100)).toFixed(1)
    }))
  }, [value, c])
  return (
    <div className="evd-donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle className="evd-dn-track" cx={size / 2} cy={size / 2} r={r} style={{ strokeWidth: stroke }} />
        <circle ref={ref} className={'evd-dn-val ' + z} cx={size / 2} cy={size / 2} r={r} style={{ strokeWidth: stroke }} />
      </svg>
      <div className="evd-dn-cap">
        <b className="evd-mono" style={{ fontSize: size * 0.28, fontWeight: 600, lineHeight: 1 }}>{Math.round(value)}</b>
        {label && <span className="evd-eb" style={{ fontSize: 9.5, marginTop: 5, letterSpacing: '.1em' }}>{label}</span>}
      </div>
    </div>
  )
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

  const derived = useMemo(() => {
    const positive = scores.filter(s => s.type === 'POSITIVE')
    const negative = scores.filter(s => s.type === 'ANTI_BONUS')
    const positiveSum = positive.reduce((a, s) => a + s.weightedValue, 0)
    const negativeSum = negative.reduce((a, s) => a + Math.abs(s.weightedValue), 0)
    const zcount = positive.reduce<Record<Zone, number>>(
      (acc, c) => { acc[zoneOf(c.rawValue)]++; return acc },
      { up: 0, mid: 0, down: 0 },
    )
    return { positive, negative, positiveSum, negativeSum, zcount }
  }, [scores])

  if (loading) {
    return (
      <div className="evd-root">
        <style>{EVD_CSS}</style>
        <div className="evd-wrap"><div className="evd-empty">Загрузка…</div></div>
      </div>
    )
  }
  if (!evaluation) {
    return (
      <div className="evd-root">
        <style>{EVD_CSS}</style>
        <div className="evd-wrap">
          <div className="evd-empty" style={{ color: 'var(--crit-ink)' }}>Оценка не найдена</div>
        </div>
      </div>
    )
  }

  const finalScore = evaluation.finalScore
  const finalDisplay = finalScore !== null ? finalScore : 0
  const finalZone = zoneOf(finalDisplay)
  const idCode = `EV-${String(evaluation.id).padStart(6, '0')}`
  const isActionable = evaluation.status === 'SUBMITTED'
  const isDone = evaluation.status === 'ACKNOWLEDGED' || evaluation.status === 'CLOSED'

  const stampClass =
    isDone ? 'is-done'
      : evaluation.status === 'APPEALED' ? 'is-warn'
      : evaluation.status === 'SUBMITTED' ? 'is-info'
      : ''

  const periodLabel =
    evaluation.periodType === 'MONTHLY' ? 'Месяц'
      : evaluation.periodType === 'QUARTERLY' ? 'Квартал'
      : 'Год'

  const cycleShort = `${periodLabel} · ${new Date(evaluation.periodStartDate).getFullYear()}`

  const totalZ = derived.zcount.up + derived.zcount.mid + derived.zcount.down

  const stepDefs = [
    { key: 'DRAFT', name: 'Черновик создан', who: 'Оценщик', time: evaluation.createdAt },
    { key: 'SUBMITTED', name: 'Оценка отправлена', who: evaluation.evaluatorName, time: evaluation.submittedAt },
    { key: 'ACKNOWLEDGED', name: 'Оценка принята', who: evaluation.evaluateeName, time: null },
    { key: 'CLOSED', name: 'Закрытие периода', who: 'Система', time: null },
  ]
  const stateOrder = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'CLOSED']
  const currentIdx = evaluation.status === 'APPEALED' ? 2 : Math.max(0, stateOrder.indexOf(evaluation.status))

  return (
    <div className="evd-root">
      <style>{EVD_CSS}</style>

      <div className="evd-wrap">
        <div className="evd-top">
          <nav className="evd-crumb">
            <button onClick={() => navigate('/my-evaluations')}>
              <ArrowLeft size={13} /> Мои оценки
            </button>
            <ChevronRight size={13} className="sep" />
            <span className="here">{idCode}</span>
          </nav>
          <span className={`evd-stamp ${stampClass}`}>
            <i />{statusLabel[evaluation.status] ?? evaluation.status}
          </span>
        </div>

        <section className="evd-hero">
          <Donut value={finalDisplay} size={150} label="баллов" />
          <div className="who">
            <div className="evd-eb eb">// Карточка оценки · {cycleShort}</div>
            <h1>{evaluation.evaluateeName}</h1>
            <div className="sub">Оценщик: <b>{evaluation.evaluatorName}</b></div>
            <div className="row">
              <span className={'evd-zpill ' + finalZone}>{ZONE_LABEL[finalZone]}</span>
              {isDone && (
                <span className="evd-sbadge"><Check size={12} />Принята</span>
              )}
              <span className="evd-mono evd-muted" style={{ fontSize: 11.5 }}>{idCode}</span>
            </div>

            {totalZ > 0 && (
              <div className="evd-dist dist">
                <div className="evd-zonebar">
                  {derived.zcount.up > 0 && <span className="up" style={{ flexBasis: (derived.zcount.up / totalZ * 100) + '%' }} />}
                  {derived.zcount.mid > 0 && <span className="mid" style={{ flexBasis: (derived.zcount.mid / totalZ * 100) + '%' }} />}
                  {derived.zcount.down > 0 && <span className="down" style={{ flexBasis: (derived.zcount.down / totalZ * 100) + '%' }} />}
                </div>
                <div className="lg">
                  <span className="up">Выше цели <b>{derived.zcount.up}</b></span>
                  <span className="mid">В норме <b>{derived.zcount.mid}</b></span>
                  <span className="down">Ниже цели <b>{derived.zcount.down}</b></span>
                </div>
              </div>
            )}

            <div className="chips">
              <div className="chip">
                <div className="k">Положительные</div>
                <div className="v pos">+{derived.positiveSum.toFixed(1)}</div>
              </div>
              <div className="chip">
                <div className="k">Анти-бонус</div>
                <div className="v neg">−{derived.negativeSum.toFixed(1)}</div>
              </div>
              <div className="chip">
                <div className="k">Критериев</div>
                <div className="v">{scores.length}</div>
              </div>
            </div>
          </div>
        </section>

        {derived.positive.length > 0 && (
          <>
            <div className="evd-sect">
              Положительные критерии<span className="ln"></span>вес 100%
            </div>
            {derived.positive.map((c, i) => {
              const z = zoneOf(c.rawValue)
              const fill = Math.max(0, Math.min(100, c.rawValue))
              return (
                <div className="evd-crow" key={c.criteriaId}>
                  <span className="ci">{String(i + 1).padStart(2, '0')}</span>
                  <div className="cn">
                    {c.nameRu}
                    {c.nameKg && <small>{c.nameKg}</small>}
                  </div>
                  <div className="bar-wrap">
                    <div className="bar"><i className={z} style={{ width: fill + '%' }}></i></div>
                    <div className="bmeta">
                      <span>достигнуто {fill.toFixed(0)}%</span>
                      <span>вес {c.weightSnapshot}%</span>
                    </div>
                  </div>
                  <div className="cscore">
                    <b>{Math.round(c.rawValue)}</b>
                    <div className="pts">+{c.weightedValue.toFixed(1)}</div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {derived.negative.length > 0 && (
          <>
            <div className="evd-sect crit">
              Анти-бонус<span className="ln"></span>вычеты
            </div>
            {derived.negative.map(c => {
              const fill = Math.max(0, Math.min(100, c.rawValue))
              return (
                <div className="evd-crow anti" key={c.criteriaId}>
                  <span className="ci"><Minus size={12} /></span>
                  <div className="cn">
                    {c.nameRu}
                    {c.nameKg && <small>{c.nameKg}</small>}
                  </div>
                  <div className="bar-wrap">
                    <div className="bar"><i style={{ width: fill + '%' }}></i></div>
                    <div className="bmeta">
                      <span>применено {fill.toFixed(0)}%</span>
                      <span>до −{c.weightSnapshot}</span>
                    </div>
                  </div>
                  <div className="cscore">
                    <b>−{Math.abs(c.weightedValue).toFixed(1)}</b>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {scores.length === 0 && (
          <div className="evd-empty" style={{ marginTop: 24 }}>Критерии не загружены</div>
        )}

        <section className="evd-timeline">
          <h2 className="evd-tl-head">Жизненный цикл</h2>
          <div className="evd-tl">
            {stepDefs.map((s, i) => {
              const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''
              return (
                <div key={s.key} className={`evd-tl-step ${state}`}>
                  <span className="evd-tl-dot">
                    {i < currentIdx && <Check size={9} style={{ color: '#fff' }} strokeWidth={3} />}
                  </span>
                  <div>
                    <div className="evd-tl-name">{s.name}</div>
                    <div className="evd-tl-meta">{s.who}</div>
                  </div>
                  <span className="evd-tl-time">{formatDateTime(s.time)}</span>
                </div>
              )
            })}
          </div>
        </section>

        {isDone && (
          <div className="evd-done">
            <div className="evd-done-icon"><Check size={20} /></div>
            <div>
              <h3>Оценка подписана</h3>
              <p>Запись передана в архив. Изменения недоступны.</p>
            </div>
          </div>
        )}
      </div>

      {isActionable && (
        <div className="evd-dock">
          <div className="evd-dock-inner">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Комментарий к решению (необязательно)…"
            />
            <button onClick={() => react('DISAGREE')} disabled={reacting} className="evd-btn evd-btn--disagree">
              <ThumbsDown size={14} /> Апелляция
            </button>
            <button onClick={() => react('AGREE')} disabled={reacting} className="evd-btn evd-btn--agree">
              <ThumbsUp size={14} /> Согласен
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
