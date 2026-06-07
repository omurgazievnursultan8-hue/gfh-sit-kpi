import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Check, ChevronLeft, ChevronRight, Send, Upload, Paperclip, X, Star,
} from 'lucide-react'
import api from '@/app/api'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { evaluationsApi, Evaluation, EvaluationScore, EvaluationFile } from '../api'
import { criteriaApi, Criteria } from '@/features/criteria/api'
import { EvaluationDetailPage } from './EvaluationDetailPage'

/* ---------------- types & helpers ---------------- */

interface Entry { value: string; note: string; dirty: boolean }
type Zone = 'up' | 'mid' | 'down'
const zoneOf = (p: number): Zone => (p >= 80 ? 'up' : p >= 60 ? 'mid' : 'down')

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '??'
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

const fmtSize = (b: number): string =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} КБ` : `${(b / 1024 / 1024).toFixed(1)} МБ`

const buildPayload = (scores: Record<number, Entry>): EvaluationScore[] =>
  Object.entries(scores)
    .filter(([, v]) => v.value !== '')
    .map(([sid, v]) => ({
      criteriaId: Number(sid),
      value: parseFloat(v.value),
      note: v.note || undefined,
    }))

/* ---------------- styles ---------------- */

const FORM_CSS = `
.efv-root{
  --bg:#eef1f6;--surface:#ffffff;--surface-2:#f2f5fa;--surface-3:#e6ebf3;
  --ink:#16202e;--ink-2:#48566a;--ink-3:#8893a6;
  --border:#e1e7f0;--border-2:#cfd8e6;
  --accent:#2456a6;--accent-2:#1d478c;--accent-soft:#e2eaf6;--accent-ink:#1c4486;
  --crit:#c2392b;--crit-soft:#fbe9e6;--crit-ink:#8f261b;
  --warn:#b07d16;--warn-soft:#fbf2da;--warn-ink:#7e5908;
  --ok:#2f8a52;--ok-soft:#e6f3ea;--ok-ink:#1f6b3d;
  --shadow-sm:0 1px 2px rgba(14,23,38,.06),0 1px 3px rgba(14,23,38,.05);
  --shadow-md:0 2px 6px rgba(14,23,38,.07),0 8px 24px rgba(14,23,38,.06);
  --radius:4px;
  --sans:'Fira Sans',system-ui,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,monospace;
  --serif:'Source Serif 4',Georgia,serif;
  --on-accent:#fff;
  background:radial-gradient(1100px 560px at 88% -8%, rgba(36,86,166,.07), transparent 60%), var(--bg);
  min-height:100vh;color:var(--ink);font-family:var(--sans);
  font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased;
}
.efv-root *,.efv-root *::before,.efv-root *::after{box-sizing:border-box;}
.efv-wrap{max-width:1180px;margin:0 auto;padding:30px 26px 100px;}
.efv-eb{font-family:var(--mono);font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);}

/* header */
.efv-head{display:flex;align-items:flex-start;gap:22px;flex-wrap:wrap;padding-bottom:20px;border-bottom:2px solid var(--ink);margin-bottom:18px;}
.efv-head .id{flex:1;min-width:220px;}
.efv-head .id .eb{margin-bottom:7px;}
.efv-head .id h1{font-family:var(--serif);font-size:27px;font-weight:600;letter-spacing:-.015em;margin:0;line-height:1.08;}
.efv-head .id .sub{font-size:13px;color:var(--ink-2);margin-top:6px;}
.efv-head .id .sub b{color:var(--ink);font-weight:600;}
.efv-head .meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;padding-top:3px;}
.efv-tchip{display:inline-flex;align-items:center;gap:7px;font-family:var(--mono);font-size:11px;font-weight:500;
  letter-spacing:.04em;padding:7px 12px;border-radius:6px;border:1px solid var(--border-2);
  background:var(--surface);color:var(--ink-2);white-space:nowrap;}
.efv-tchip::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ink-3);flex:none;}
.efv-tchip.period::before{background:var(--accent);}
.efv-tchip.dline{background:var(--warn-soft);border-color:#e8d9a8;color:var(--warn-ink);}
.efv-tchip.dline::before{background:var(--warn);}
.efv-prog{display:flex;align-items:center;gap:10px;}
.efv-prog .lab{font-family:var(--mono);font-size:12px;font-weight:600;color:var(--ink-2);letter-spacing:.02em;}
.efv-prog .lab b{color:var(--ink);}
.efv-prog .track{width:120px;height:6px;border-radius:5px;background:var(--surface-3);overflow:hidden;}
.efv-prog .track i{display:block;height:100%;border-radius:5px;background:var(--accent);transition:width .5s cubic-bezier(.4,0,.2,1);}

/* roster */
.efv-roster{display:flex;gap:11px;overflow-x:auto;padding:2px 2px 14px;margin-bottom:20px;
  border-bottom:1px solid var(--border);scrollbar-width:thin;}
.efv-pchip{display:flex;align-items:center;gap:11px;flex:none;min-width:208px;padding:11px 14px;
  border:1px solid var(--border-2);border-radius:var(--radius);background:var(--surface);
  box-shadow:var(--shadow-sm);cursor:pointer;text-align:left;font-family:var(--sans);
  transition:border-color .12s,background .12s,box-shadow .12s;}
.efv-pchip:hover{background:var(--surface-2);}
.efv-pchip .av{width:34px;height:34px;border-radius:8px;font-size:12px;display:grid;place-items:center;
  flex:none;font-family:var(--mono);font-weight:600;background:var(--accent-soft);color:var(--accent-ink);}
.efv-pchip .pi{min-width:0;line-height:1.25;display:flex;flex-direction:column;}
.efv-pchip .pn{display:block;font-family:var(--serif);font-size:14px;font-weight:600;letter-spacing:-.01em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;}
.efv-pchip .pst{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-3);margin-top:3px;display:inline-flex;align-items:center;gap:4px;}
.efv-pchip.active{border-color:var(--accent);background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent);}
.efv-pchip.active .av{background:var(--accent);color:#fff;}
.efv-pchip.active .pst{color:var(--accent-ink);}
.efv-pchip.done .pst{color:var(--ok-ink);}
.efv-pchip.done .av{background:var(--ok-soft);color:var(--ok-ink);}

/* body grid */
.efv-body{display:grid;grid-template-columns:270px 1fr;gap:20px;align-items:start;}
@media(max-width:840px){.efv-body{grid-template-columns:1fr;}}

.efv-side{display:flex;flex-direction:column;gap:18px;position:sticky;top:16px;}
.efv-scard{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
  box-shadow:var(--shadow-sm);overflow:hidden;}
.efv-scard .sc-head{padding:16px 16px 12px;border-bottom:1px solid var(--border);}
.efv-scard .sc-head h2{font-family:var(--serif);font-size:17px;font-weight:600;margin:0;letter-spacing:-.01em;}
.efv-scard .sc-head .eb{margin-top:5px;}

.efv-phlab{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.13em;text-transform:uppercase;
  color:var(--ink-3);padding:14px 16px 7px;display:flex;align-items:center;gap:8px;}
.efv-phlab::before{content:"";width:6px;height:6px;border-radius:1px;background:var(--accent);flex:none;}
.efv-phlab.anti::before{background:var(--crit);}
.efv-citem{display:flex;align-items:center;gap:11px;width:100%;padding:9px 16px;background:none;border:0;
  border-left:2px solid transparent;cursor:pointer;text-align:left;font-family:var(--sans);transition:background .12s;}
.efv-citem:hover{background:var(--surface-2);}
.efv-citem.active{background:var(--accent-soft);border-left-color:var(--accent);}
.efv-cbox{width:18px;height:18px;border-radius:3px;border:1.5px solid var(--border-2);background:var(--surface);
  flex:none;display:grid;place-items:center;color:#fff;transition:background .12s,border-color .12s;}
.efv-cbox svg{opacity:0;}
.efv-citem.done .efv-cbox{background:var(--ok);border-color:var(--ok);}
.efv-citem.done .efv-cbox svg{opacity:1;}
.efv-citem.active .efv-cbox{border-color:var(--accent);}
.efv-citem.anti.done .efv-cbox{background:var(--crit);border-color:var(--crit);}
.efv-cname{flex:1;min-width:0;font-size:13px;color:var(--ink);font-weight:500;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.efv-citem.active .efv-cname{color:var(--accent-ink);}
.efv-cw{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--ink-3);flex:none;}
.efv-citem.anti .efv-cw{color:var(--crit-ink);}

/* live rating */
.efv-ratecard{padding:18px 18px 20px;}
.efv-ratecard h2{font-family:var(--serif);font-size:17px;font-weight:600;margin:0;letter-spacing:-.01em;}
.efv-ratecard .eb{margin-top:5px;}
.efv-big{display:flex;align-items:baseline;gap:8px;margin:14px 0 4px;}
.efv-big .n{font-family:var(--mono);font-size:42px;font-weight:600;line-height:.9;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums;transition:color .2s;}
.efv-big .n.up{color:var(--ok-ink);}.efv-big .n.mid{color:var(--warn-ink);}.efv-big .n.down{color:var(--crit-ink);}
.efv-big .of{font-family:var(--mono);font-size:15px;color:var(--ink-3);}
.efv-ratebar{height:8px;border-radius:5px;background:var(--surface-3);overflow:hidden;margin:12px 0 16px;}
.efv-ratebar i{display:block;height:100%;border-radius:5px;transition:width .5s cubic-bezier(.4,0,.2,1),background .2s;}
.efv-ratebar i.up{background:var(--ok);}.efv-ratebar i.mid{background:var(--warn);}.efv-ratebar i.down{background:var(--crit);}
.efv-rrow{display:flex;align-items:center;justify-content:space-between;padding:7px 0;font-size:13px;
  border-top:1px solid var(--border);}
.efv-rrow:first-of-type{border-top:0;}
.efv-rrow .k{color:var(--ink-2);}
.efv-rrow .v{font-family:var(--mono);font-weight:600;font-variant-numeric:tabular-nums;}
.efv-rrow .v.pos{color:var(--ok-ink);}
.efv-rrow .v.neg{color:var(--crit-ink);}
.efv-rrow.total{margin-top:5px;padding-top:11px;border-top:2px solid var(--ink);}
.efv-rrow.total .k{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink);}
.efv-rrow.total .v{font-size:18px;}

/* criterion card */
.efv-card{background:var(--surface);border:1px solid var(--border);border-top:3px solid var(--accent);
  border-radius:var(--radius);box-shadow:var(--shadow-md);padding:28px 32px 26px;min-height:560px;
  display:flex;flex-direction:column;}
.efv-card.anti{border-top-color:var(--crit);}
.efv-fc-top{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.efv-fc-top .step{margin-left:auto;font-family:var(--mono);font-size:12px;letter-spacing:.08em;color:var(--ink-3);}
.efv-fc-top .step b{color:var(--ink);}
.efv-kchip{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;font-weight:600;
  letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:4px;white-space:nowrap;}
.efv-kchip.scope{color:var(--accent-ink);background:var(--accent-soft);}
.efv-kchip.weight{color:var(--ink-2);background:var(--surface-2);border:1px solid var(--border-2);}
.efv-kchip.anti{color:var(--crit-ink);background:var(--crit-soft);}
.efv-fc-title{font-family:var(--serif);font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.12;margin:16px 0 0;}
.efv-fc-desc{font-size:13.5px;line-height:1.55;color:var(--ink-2);margin:11px 0 0;max-width:600px;}

.efv-sec{margin-top:24px;}
.efv-sec-lab{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-3);display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;}
.efv-sec-lab .opt{font-weight:400;letter-spacing:.04em;color:var(--ink-3);text-transform:none;}
.efv-sec-lab .req{color:var(--crit-ink);font-weight:600;letter-spacing:.04em;text-transform:none;}

.efv-scorebox{display:flex;align-items:center;gap:24px;flex-wrap:wrap;border:1px solid var(--border);
  border-radius:var(--radius);background:var(--surface-2);padding:20px 22px;}
.efv-stars{display:flex;gap:6px;}
.efv-star{background:none;border:0;padding:2px;cursor:pointer;line-height:0;color:var(--border-2);
  transition:color .12s,transform .1s;}
.efv-star:hover{transform:translateY(-1px);}
.efv-star.on{color:var(--accent);}
.efv-star.on svg{fill:var(--accent);}
.efv-scorebox.anti .efv-star.on{color:var(--crit);}
.efv-scorebox.anti .efv-star.on svg{fill:var(--crit);}
.efv-scorenum{display:flex;align-items:center;gap:3px;border:1px solid var(--border-2);border-radius:6px;
  background:var(--surface);padding:8px 12px;white-space:nowrap;flex:none;}
.efv-scorenum input{width:54px;border:0;outline:none;background:none;font-family:var(--mono);font-size:22px;
  font-weight:600;text-align:center;color:var(--ink);font-variant-numeric:tabular-nums;-moz-appearance:textfield;}
.efv-scorenum input::-webkit-outer-spin-button,.efv-scorenum input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
.efv-scorenum input::placeholder{color:var(--ink-3);}
.efv-scorenum .of{font-family:var(--mono);font-size:16px;color:var(--ink-3);}
.efv-scorebox.anti .efv-scorenum input{color:var(--crit-ink);}
.efv-scoremeta{display:flex;flex-direction:column;gap:3px;}
.efv-scoremeta .pts{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--ink);}
.efv-scoremeta .pts.empty{color:var(--ink-3);font-weight:500;}
.efv-scoremeta .hint{font-family:var(--mono);font-size:10.5px;letter-spacing:.02em;color:var(--ink-3);}

.efv-zpill{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;font-weight:600;
  letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:5px;white-space:nowrap;width:fit-content;}
.efv-zpill::before{content:"";width:7px;height:7px;border-radius:50%;flex:none;}
.efv-zpill.up{background:var(--ok-soft);color:var(--ok-ink);}.efv-zpill.up::before{background:var(--ok);}
.efv-zpill.mid{background:var(--warn-soft);color:var(--warn-ink);}.efv-zpill.mid::before{background:var(--warn);}
.efv-zpill.down{background:var(--crit-soft);color:var(--crit-ink);}.efv-zpill.down::before{background:var(--crit);}

.efv-note{width:100%;min-height:96px;resize:vertical;padding:12px 14px;border:1px solid var(--border-2);
  border-radius:6px;background:var(--surface);font-family:var(--sans);font-size:13.5px;line-height:1.55;
  color:var(--ink);outline:none;transition:border-color .14s,box-shadow .14s;}
.efv-note::placeholder{color:var(--ink-3);}
.efv-note:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);}
.efv-note.invalid{border-color:var(--crit);box-shadow:0 0 0 3px var(--crit-soft);}

.efv-drop{display:flex;align-items:center;justify-content:center;gap:9px;border:1px dashed var(--border-2);
  border-radius:6px;background:var(--surface-2);padding:18px;font-family:var(--mono);font-size:12px;
  letter-spacing:.03em;color:var(--ink-3);cursor:pointer;transition:border-color .14s,color .14s,background .14s;}
.efv-drop:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-soft);}
.efv-drop.drag{border-style:solid;border-color:var(--accent);color:var(--accent);background:var(--accent-soft);}
.efv-files{display:flex;flex-direction:column;gap:6px;margin-top:8px;}
.efv-frow{display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border);
  border-radius:6px;background:var(--surface);font-size:12.5px;}
.efv-frow .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink);}
.efv-frow .sz{font-family:var(--mono);font-size:11px;color:var(--ink-3);flex:none;}
.efv-frow .del{background:none;border:0;padding:4px;cursor:pointer;color:var(--ink-3);
  border-radius:4px;display:grid;place-items:center;}
.efv-frow .del:hover{color:var(--crit);background:var(--crit-soft);}

.efv-foot{display:flex;align-items:center;gap:14px;margin-top:auto;padding-top:22px;border-top:1px solid var(--border);
  flex-wrap:wrap;}
.efv-save{font-family:var(--mono);font-size:11px;letter-spacing:.04em;color:var(--ink-3);
  display:inline-flex;align-items:center;gap:7px;}
.efv-save::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--ok);flex:none;}
.efv-save.saving::before{background:var(--warn);}
.efv-save.err::before{background:var(--crit);}
.efv-save.err{color:var(--crit-ink);}
.efv-nav{display:flex;gap:9px;margin-left:auto;flex-wrap:wrap;}

.efv-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:var(--sans);font-size:12.5px;
  font-weight:600;border:1px solid var(--border-2);background:var(--surface);color:var(--ink);border-radius:8px;
  padding:8px 13px;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s;}
.efv-btn:hover:not(:disabled){background:var(--surface-2);}
.efv-btn.solid{background:var(--accent);border-color:var(--accent);color:var(--on-accent);}
.efv-btn.solid:hover:not(:disabled){background:var(--accent-2);}
.efv-btn.ghost{border-color:transparent;background:transparent;color:var(--accent);}
.efv-btn:disabled{opacity:.5;cursor:not-allowed;}

.efv-banner{padding:80px 20px;text-align:center;font-family:var(--mono);font-size:11px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);}
`

/* ---------------- star input ---------------- */

interface StarProps { active: boolean; onMouseEnter: () => void; onClick: () => void; label: string }
function StarBtn({ active, onMouseEnter, onClick, label }: StarProps) {
  return (
    <button type="button" className={'efv-star' + (active ? ' on' : '')}
      onMouseEnter={onMouseEnter} onClick={onClick} aria-label={label}>
      <Star size={30} strokeWidth={2} />
    </button>
  )
}

/* ---------------- page ---------------- */

export function EvaluationFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { i18n, t } = useTranslation()
  const evaluationId = Number(id)
  const lang = (i18n.language?.startsWith('kg') ? 'kg' : 'ru') as 'ru' | 'kg'

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [criteria, setCriteria] = useState<Criteria[]>([])
  const [scores, setScores] = useState<Record<number, Entry>>({})
  const [files, setFiles] = useState<EvaluationFile[]>([])
  const [siblings, setSiblings] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [drag, setDrag] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* initial load */
  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([
      evaluationsApi.get(evaluationId),
      criteriaApi.list(0, 200),
      api.get<EvaluationScore[]>(`/evaluations/${evaluationId}/scores`).then(r => r.data),
      evaluationsApi.listFiles(evaluationId).catch(() => [] as EvaluationFile[]),
    ]).then(([ev, page, scoreList, fileList]) => {
      if (!alive) return
      setEvaluation(ev)
      const active = page.content.filter(c => c.active)
      active.sort((a, b) => {
        if (a.type === b.type) return a.id - b.id
        return a.type === 'POSITIVE' ? -1 : 1
      })
      setCriteria(active)
      const map: Record<number, Entry> = {}
      scoreList.forEach(s => {
        map[s.criteriaId] = { value: s.value == null ? '' : String(s.value), note: s.note ?? '', dirty: false }
      })
      setScores(map)
      setFiles(fileList)
    }).catch(e => { if (alive) setLoadError(e?.message ?? 'load failed') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [evaluationId])

  /* siblings for roster */
  useEffect(() => {
    if (!evaluation) return
    let alive = true
    const fallback = () => evaluationsApi.asEvaluator(0, 100)
      .then(p => p.content.filter(e => e.periodId === evaluation.periodId))
      .catch(() => [] as Evaluation[])
    evaluationsApi.adminList({ periodId: evaluation.periodId, evaluatorId: evaluation.evaluatorId, size: 100 })
      .then(p => p.content)
      .catch(fallback)
      .then(list => { if (alive) setSiblings(list) })
    return () => { alive = false }
  }, [evaluation])

  /* save plumbing */
  const scoresRef = useRef(scores)
  scoresRef.current = scores
  const dirty = useMemo(() => Object.values(scores).some(s => s.dirty), [scores])

  const doSave = useCallback(async () => {
    const payload = buildPayload(scoresRef.current)
    if (payload.length === 0) return
    setSaving(true)
    try {
      await evaluationsApi.saveScores(evaluationId, payload)
      setLastSaved(new Date())
      setSaveFailed(false)
      setScores(prev => {
        const next: Record<number, Entry> = {}
        for (const k in prev) next[Number(k)] = { ...prev[Number(k)], dirty: false }
        return next
      })
    } catch {
      setSaveFailed(true)
    } finally {
      setSaving(false)
    }
  }, [evaluationId])

  useEffect(() => {
    if (!dirty) return
    const tid = setTimeout(() => { doSave() }, 1500)
    return () => clearTimeout(tid)
  }, [dirty, scores, doSave])

  useEffect(() => {
    const id = setInterval(() => {
      if (Object.values(scoresRef.current).some(s => s.dirty)) doSave()
    }, 30_000)
    return () => clearInterval(id)
  }, [doSave])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden'
        && Object.values(scoresRef.current).some(s => s.dirty)) doSave()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [doSave])

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (Object.values(scoresRef.current).some(s => s.dirty)) {
        e.preventDefault(); e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  /* derived */
  const positive = useMemo(() => criteria.filter(c => c.type === 'POSITIVE'), [criteria])
  const antibonus = useMemo(() => criteria.filter(c => c.type === 'ANTI_BONUS'), [criteria])

  const posTotal = useMemo(
    () => positive.reduce((a, c) => a + (parseFloat(scores[c.id]?.value ?? '') || 0), 0),
    [positive, scores],
  )
  const antiTotal = useMemo(
    () => antibonus.reduce((a, c) => a + (parseFloat(scores[c.id]?.value ?? '') || 0), 0),
    [antibonus, scores],
  )
  const finalScore = +(Math.max(0, posTotal - antiTotal)).toFixed(1)
  const finalZone = zoneOf(finalScore)
  const filledCount = criteria.filter(c => (scores[c.id]?.value ?? '') !== '').length
  const filledPct = criteria.length > 0 ? Math.round(filledCount / criteria.length * 100) : 0

  const canSubmit = useMemo(() => {
    if (positive.length === 0) return false
    for (const c of positive) {
      if (c.autoCalculated) continue
      const sc = scores[c.id]
      if (!sc || sc.value === '') return false
    }
    for (const c of antibonus) {
      const sc = scores[c.id]
      if (!sc || sc.value === '') continue
      const v = parseFloat(sc.value)
      if (v > 0 && (sc.note?.trim().length ?? 0) < 10) return false
    }
    return true
  }, [positive, antibonus, scores])

  /* early returns */
  if (loading) {
    return <div className="efv-root"><style>{FORM_CSS}</style><div className="efv-wrap"><div className="efv-banner">…</div></div></div>
  }
  if (loadError || !evaluation) {
    return <div className="efv-root"><style>{FORM_CSS}</style><div className="efv-wrap"><div className="efv-banner" style={{ color: 'var(--crit-ink)' }}>Не удалось загрузить</div></div></div>
  }
  if (evaluation.status !== 'DRAFT') return <EvaluationDetailPage />
  if (criteria.length === 0) {
    return <div className="efv-root"><style>{FORM_CSS}</style><div className="efv-wrap"><div className="efv-banner" style={{ color: 'var(--warn-ink)' }}>{t('evaluation.form.noCriteria', { defaultValue: 'Критерии не настроены' })}</div></div></div>
  }

  /* current criterion */
  const cur = criteria[Math.min(idx, criteria.length - 1)]
  const isAnti = cur.type === 'ANTI_BONUS'
  const curEntry = scores[cur.id]
  const curValueRaw = curEntry?.value ?? ''
  const curPts = curValueRaw === '' ? null : parseFloat(curValueRaw)
  const max = Number(cur.weight)
  const curRating = curPts == null ? 0 : +(curPts / max * 5).toFixed(1)
  const curPct = curPts == null ? 0 : Math.round(curPts / max * 100)
  const starsShown = hoverStar || Math.ceil(curRating)
  const curName = lang === 'kg' ? cur.nameKg : cur.nameRu
  const curDesc = (lang === 'kg' ? cur.descriptionKg : cur.descriptionRu) ?? ''
  const curScope = lang === 'kg' ? (cur.orgUnitNameKg ?? 'Глобалдык') : (cur.orgUnitNameRu ?? 'Глобальный')
  const noteRequired = isAnti && curPts != null && curPts > 0
  const noteInvalid = noteRequired && (curEntry?.note?.trim().length ?? 0) < 10
  const scopedFiles = files.filter(f => f.criteriaId === cur.id)

  /* actions */
  const setStar = (i: number) => {
    const pts = +((i + 1) / 5 * max).toFixed(2)
    setScores(s => ({ ...s, [cur.id]: { value: String(pts), note: s[cur.id]?.note ?? '', dirty: true } }))
    if (idx < criteria.length - 1 && !isAnti) {
      setHoverStar(0)
      setTimeout(() => setIdx(i => Math.min(criteria.length - 1, i + 1)), 220)
    }
  }
  const setNum = (val: string) => {
    if (val === '') {
      setScores(s => ({ ...s, [cur.id]: { value: '', note: s[cur.id]?.note ?? '', dirty: true } }))
      return
    }
    const parsed = parseFloat(val)
    if (Number.isNaN(parsed)) return
    const v = Math.max(0, Math.min(max, parsed))
    setScores(s => ({ ...s, [cur.id]: { value: String(+v.toFixed(2)), note: s[cur.id]?.note ?? '', dirty: true } }))
  }
  const setNote = (note: string) => {
    setScores(s => ({ ...s, [cur.id]: { value: s[cur.id]?.value ?? '', note, dirty: true } }))
  }
  const go = (d: number) => setIdx(i => Math.max(0, Math.min(criteria.length - 1, i + d)))

  const upload = async (file: File) => {
    try {
      const saved = await evaluationsApi.uploadFile(evaluationId, file, cur.id)
      setFiles(f => [...f, saved])
    } catch (e) {
      console.error('upload failed', e)
    }
  }
  const removeFile = async (fid: number) => {
    try {
      await evaluationsApi.deleteFile(evaluationId, fid)
      setFiles(f => f.filter(x => x.id !== fid))
    } catch (e) {
      console.error('delete failed', e)
    }
  }

  const onSubmitClick = () => setSubmitOpen(true)
  const doSubmit = async () => {
    setSubmitting(true)
    try {
      if (Object.values(scoresRef.current).some(s => s.dirty)) await doSave()
      await evaluationsApi.submit(evaluationId)
      navigate('/my-tasks')
    } catch (e) {
      console.error('submit failed', e)
    } finally {
      setSubmitting(false)
      setSubmitOpen(false)
    }
  }

  /* header meta */
  const periodLabel = `${fmtDate(evaluation.periodStartDate)} — ${fmtDate(evaluation.periodEndDate)}`
  const dl = daysLeft(evaluation.periodEndDate)
  const deadlineChip = dl != null && dl >= 0
    ? `до дедлайна ${dl} дн · ${fmtDate(evaluation.periodEndDate)}`
    : null

  const saveLabel = saving
    ? 'сохраняется…'
    : saveFailed
      ? 'ошибка сохранения'
      : lastSaved
        ? `сохранено ${lastSaved.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
        : 'черновик сохраняется автоматически'

  const lowTotal = finalScore < 30

  return (
    <div className="efv-root">
      <style>{FORM_CSS}</style>

      <div className="efv-wrap">

        {/* header */}
        <header className="efv-head">
          <div className="id">
            <div className="efv-eb eb">// Заполнение оценки · KPI</div>
            <h1>{evaluation.evaluateeName}</h1>
            <div className="sub">Оценщик: <b>{evaluation.evaluatorName}</b></div>
          </div>
          <div className="meta">
            <span className="efv-tchip period">{periodLabel}</span>
            {deadlineChip && <span className="efv-tchip dline">{deadlineChip}</span>}
            <div className="efv-prog">
              <span className="lab"><b>{filledCount}</b>/{criteria.length}</span>
              <div className="track"><i style={{ width: filledPct + '%' }} /></div>
            </div>
          </div>
        </header>

        {/* roster */}
        {siblings.length > 0 && (
          <nav className="efv-roster">
            {siblings.map(s => {
              const isHere = s.id === evaluation.id
              const isDone = s.status === 'SUBMITTED' || s.status === 'ACKNOWLEDGED' || s.status === 'CLOSED'
              const label = isHere ? 'В работе' : isDone ? 'Готово' : 'Черновик'
              return (
                <button key={s.id}
                  className={'efv-pchip' + (isHere ? ' active' : '') + (isDone ? ' done' : '')}
                  onClick={() => { if (!isHere) navigate(`/evaluations/${s.id}`) }}
                  title={s.evaluateeName}>
                  <span className="av">{initialsOf(s.evaluateeName)}</span>
                  <span className="pi">
                    <span className="pn">{s.evaluateeName}</span>
                    <span className="pst">
                      {isDone && <Check size={11} />}
                      {label}
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>
        )}

        <div className="efv-body">

          {/* sidebar */}
          <aside className="efv-side">
            <section className="efv-scard">
              <div className="sc-head">
                <h2>Список</h2>
                <div className="efv-eb eb">Нажмите, чтобы перейти</div>
              </div>
              {positive.length > 0 && (
                <>
                  <div className="efv-phlab">Фаза · Положительные</div>
                  {positive.map(c => {
                    const i = criteria.indexOf(c)
                    const done = (scores[c.id]?.value ?? '') !== ''
                    const name = lang === 'kg' ? c.nameKg : c.nameRu
                    return (
                      <button key={c.id}
                        className={'efv-citem' + (i === idx ? ' active' : '') + (done ? ' done' : '')}
                        onClick={() => setIdx(i)}>
                        <span className="efv-cbox"><Check size={11} strokeWidth={3} /></span>
                        <span className="efv-cname">{name}</span>
                        <span className="efv-cw">{c.weight}%</span>
                      </button>
                    )
                  })}
                </>
              )}
              {antibonus.length > 0 && (
                <>
                  <div className="efv-phlab anti">Фаза · Антибонус</div>
                  {antibonus.map(c => {
                    const i = criteria.indexOf(c)
                    const done = (scores[c.id]?.value ?? '') !== ''
                    const name = lang === 'kg' ? c.nameKg : c.nameRu
                    return (
                      <button key={c.id}
                        className={'efv-citem anti' + (i === idx ? ' active' : '') + (done ? ' done' : '')}
                        onClick={() => setIdx(i)}>
                        <span className="efv-cbox"><Check size={11} strokeWidth={3} /></span>
                        <span className="efv-cname">{name}</span>
                        <span className="efv-cw">−{c.weight}%</span>
                      </button>
                    )
                  })}
                </>
              )}
            </section>

            <section className="efv-scard efv-ratecard">
              <h2>Текущий рейтинг</h2>
              <div className="efv-eb eb">Пересчитывается вживую</div>
              <div className="efv-big">
                <span className={'n ' + finalZone}>{finalScore.toFixed(1)}</span>
                <span className="of">/ 100</span>
              </div>
              <div className="efv-ratebar">
                <i className={finalZone} style={{ width: Math.max(0, Math.min(100, finalScore)) + '%' }} />
              </div>
              <div className="efv-rrow"><span className="k">Положительные</span><span className="v pos">+{posTotal.toFixed(1)}</span></div>
              <div className="efv-rrow"><span className="k">Антибонус</span><span className="v neg">−{antiTotal.toFixed(1)}</span></div>
              <div className="efv-rrow total"><span className="k">Итог</span><span className="v">{finalScore.toFixed(1)}</span></div>
            </section>
          </aside>

          {/* main criterion card */}
          <main className={'efv-card' + (isAnti ? ' anti' : '')}>
            <div className="efv-fc-top">
              <span className={'efv-kchip ' + (isAnti ? 'anti' : 'scope')}>{isAnti ? 'Антибонус' : curScope}</span>
              <span className="efv-kchip weight">{isAnti ? 'до −' + cur.weight : 'вес ' + cur.weight + '%'}</span>
              <span className="step"><b>{idx + 1}</b> / {criteria.length}</span>
            </div>
            <h2 className="efv-fc-title">{curName}</h2>
            {curDesc && <p className="efv-fc-desc">{curDesc}</p>}

            <div className="efv-sec">
              <div className="efv-sec-lab">{isAnti ? 'Степень нарушения' : 'Оценка'}</div>
              <div className={'efv-scorebox' + (isAnti ? ' anti' : '')}>
                <div className="efv-stars" onMouseLeave={() => setHoverStar(0)}>
                  {[0, 1, 2, 3, 4].map(i => (
                    <StarBtn key={i} active={i < starsShown}
                      onMouseEnter={() => setHoverStar(i + 1)}
                      onClick={() => setStar(i)}
                      label={`${i + 1} из 5`} />
                  ))}
                </div>
                <div className="efv-scorenum">
                  <input type="number" min={0} max={max} step={max <= 10 ? 0.5 : 1}
                    value={curValueRaw} placeholder="—"
                    disabled={cur.autoCalculated}
                    onChange={e => setNum(e.target.value)} />
                  <span className="of">/ {max}</span>
                </div>
                <div className="efv-scoremeta">
                  {curPts == null
                    ? <span className="pts empty">Не оценено</span>
                    : <span className="pts">{curRating.toFixed(1)} · из 5</span>}
                  {curPts == null
                    ? <span className="hint">Нажмите звёзды или введите балл</span>
                    : isAnti
                      ? <span className="hint">Вычет −{curPts.toFixed(1)} балла</span>
                      : (() => {
                          const z = zoneOf(curPct)
                          const lab = z === 'up' ? 'Выше цели' : z === 'mid' ? 'В норме' : 'Ниже цели'
                          return <span className={'efv-zpill ' + z}>{lab}</span>
                        })()}
                </div>
              </div>
            </div>

            <div className="efv-sec">
              <div className="efv-sec-lab">
                Примечание
                {noteRequired
                  ? <span className="req">— обязательно при оценке &gt; 0 (мин. 10 симв.)</span>
                  : <span className="opt">— обоснование оценки</span>}
              </div>
              <textarea
                className={'efv-note' + (noteInvalid ? ' invalid' : '')}
                placeholder="Краткое обоснование оценки"
                value={curEntry?.note ?? ''}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            <div className="efv-sec">
              <div className="efv-sec-lab">Доказательная база</div>
              <div
                className={'efv-drop' + (drag ? ' drag' : '')}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => {
                  e.preventDefault(); setDrag(false)
                  for (const f of Array.from(e.dataTransfer.files)) upload(f)
                }}
              >
                <Upload size={15} />
                + перетащите файл или нажмите
                <input ref={fileInputRef} type="file" hidden
                  onChange={e => {
                    for (const f of Array.from(e.target.files ?? [])) upload(f)
                    e.target.value = ''
                  }} />
              </div>
              {scopedFiles.length > 0 && (
                <div className="efv-files">
                  {scopedFiles.map(f => (
                    <div key={f.id} className="efv-frow">
                      <Paperclip size={13} style={{ color: 'var(--ok-ink)', flex: 'none' }} />
                      <span className="nm">{f.originalName}</span>
                      <span className="sz">{fmtSize(f.fileSize)}</span>
                      <button className="del" onClick={() => removeFile(f.id)} aria-label={`удалить ${f.originalName}`}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="efv-foot">
              <button className="efv-btn ghost" onClick={() => go(-1)} disabled={idx === 0}>
                <ChevronLeft size={14} />Назад
              </button>
              <span className={'efv-save' + (saving ? ' saving' : '') + (saveFailed ? ' err' : '')}>{saveLabel}</span>
              <div className="efv-nav">
                {idx === criteria.length - 1
                  ? <button className="efv-btn solid" onClick={onSubmitClick} disabled={!canSubmit || submitting}>
                      <Send size={14} />Отправить оценку
                    </button>
                  : <button className="efv-btn solid" onClick={() => go(1)}>
                      Далее<ChevronRight size={14} />
                    </button>}
              </div>
            </div>
          </main>
        </div>
      </div>

      <ConfirmDialog
        open={submitOpen}
        title={t('evaluation.form.confirmTitle', { defaultValue: 'Отправить оценку?' })}
        description={`${t('evaluation.form.confirmBody', { total: Math.round(finalScore), defaultValue: `Итоговый балл: ${Math.round(finalScore)}. После отправки изменения недоступны.` })}${lowTotal ? '\n\n' + t('evaluation.form.confirmLowWarn', { defaultValue: 'Внимание: итог ниже 30 баллов.' }) : ''}`}
        variant="default"
        onConfirm={doSubmit}
        onCancel={() => setSubmitOpen(false)}
      />
    </div>
  )
}
