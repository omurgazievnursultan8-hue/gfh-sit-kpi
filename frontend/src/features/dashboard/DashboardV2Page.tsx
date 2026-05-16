import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'
import { usePageTitle } from '../../context/PageContext'
import { analyticsApi } from '../analytics/analyticsApi'
import type {
  PersonalAnalytics, ScorecardResponse, TeamResponse,
  DashboardEvent, PendingSummary,
} from '../analytics/analyticsApi'
import { periodsApi } from '../periods/periodsApi'
import type { Period, PeriodProgress, AppealPending } from '../periods/periodsApi'
import { delegationsApi } from '../org/delegationsApi'
import type { Delegation } from '../org/delegationsApi'
import { DASHBOARD_V2_CSS } from './dashboardV2Styles'

// ── helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(d)
}

function signed(n: number | null | undefined, d = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}`
}

function zoneClass(n: number | null | undefined): 'up' | 'down' | '' {
  if (n === null || n === undefined) return ''
  return n >= 0 ? 'up' : 'down'
}

function periodCode(type: string, startDate: string): string {
  const d = new Date(startDate)
  const yy = String(d.getFullYear()).slice(2)
  if (type === 'QUARTERLY') return `Q${Math.floor(d.getMonth() / 3) + 1}.${yy}`
  if (type === 'MONTHLY') return `M${d.getMonth() + 1}.${yy}`
  return `Y.${yy}`
}

function shortDate(s: string): string {
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }).toUpperCase()
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function asciiBar(pct: number, width = 20): { fill: string; empty: string } {
  const clamped = Math.max(0, Math.min(1, pct))
  const filled = Math.round(clamped * width)
  return { fill: '█'.repeat(filled), empty: '█'.repeat(width - filled) }
}

// ── line chart ──────────────────────────────────────────────────────────────
function DynamicsChart({ scores }: { scores: number[] }) {
  if (scores.length < 2) {
    return <div className="dv2-empty">NO TREND DATA · MIN 2 PERIODS REQUIRED</div>
  }
  const W = 300, H = 120
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  const range = Math.max(1, max - min)
  const step = W / (scores.length - 1)
  const pts = scores.map((v, i) => ({
    x: i * step,
    y: H - 8 - ((v - min) / range) * (H - 24),
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const last = pts[pts.length - 1]
  return (
    <div className="dv2-line-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <g className="dv2-line-grid">
          <line x1="0" y1="30" x2={W} y2="30" />
          <line x1="0" y1="60" x2={W} y2="60" />
          <line x1="0" y1="90" x2={W} y2="90" />
        </g>
        <path className="dv2-line-bg" d={area} />
        <path className="dv2-line-path" d={line} />
        {pts.map((p, i) => (
          <circle key={i} className="dv2-line-dot" cx={p.x} cy={p.y}
            r={i === pts.length - 1 ? 3 : 2} opacity={i === pts.length - 1 ? 1 : 0.5} />
        ))}
        <text className="dv2-line-annot" x={Math.min(W - 56, last.x - 20)} y={Math.max(10, last.y - 8)}>
          {fmt(scores[scores.length - 1])} ▲
        </text>
      </svg>
    </div>
  )
}

// ── card shell ──────────────────────────────────────────────────────────────
function Card({ col, title, id, children }: {
  col: number; title: string; id: string; children: React.ReactNode
}) {
  return (
    <section className={`dv2-card dv2-col-${col}`}>
      <div className="dv2-card-head">
        <span><strong>{title}</strong></span>
        <span className="dv2-card-id">[ {id} ]</span>
      </div>
      <div className="dv2-card-body">{children}</div>
    </section>
  )
}

function Tag({ kind, children }: { kind: 'up' | 'down' | 'warn' | 'info' | 'gold' | 'neutral'; children: React.ReactNode }) {
  return <span className={`dv2-tag dv2-tag--${kind}`}>{children}</span>
}

// ── page ────────────────────────────────────────────────────────────────────
export function DashboardV2Page() {
  usePageTitle('nav.dashboard')
  const navigate = useNavigate()
  const role = useSelector((s: RootState) => s.auth.role)
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount)
  const isManager = role !== 'EMPLOYEE'

  const [clock, setClock] = useState('')

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null)
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [summary, setSummary] = useState<PendingSummary | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [appeals, setAppeals] = useState<AppealPending[]>([])
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [progressByPeriod, setProgressByPeriod] = useState<Record<number, PeriodProgress>>({})
  const [partialFailure, setPartialFailure] = useState(false)

  // Live clock — terminal aesthetic.
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch all panels — render whatever succeeds, flag partial failure.
  useEffect(() => {
    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      analyticsApi.scorecard().then(setScorecard),
      analyticsApi.events().then(setEvents),
      analyticsApi.pendingSummary().then(setSummary),
      periodsApi.list().then(setPeriods),
      periodsApi.pendingAppeals().then(setAppeals),
      delegationsApi.list(0, 50).then(r => setDelegations(r.content)),
    ]
    if (isManager) tasks.push(analyticsApi.team().then(setTeam))
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
    })
  }, [isManager])

  const activePeriods = useMemo(
    () => periods
      .filter(p => p.status === 'ACTIVE')
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()),
    [periods],
  )

  // Per-period progress.
  useEffect(() => {
    if (activePeriods.length === 0) return
    let cancelled = false
    Promise.allSettled(
      activePeriods.map(p => periodsApi.progress(p.id).then(r => [p.id, r] as const)),
    ).then(results => {
      if (cancelled) return
      const next: Record<number, PeriodProgress> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') next[r.value[0]] = r.value[1]
      }
      setProgressByPeriod(next)
    })
    return () => { cancelled = true }
  }, [activePeriods])

  // ── derived ────────────────────────────────────────────────────────────────
  const histScores = (analytics?.history ?? []).map(h => h.score)
  const peak = histScores.length ? Math.max(...histScores) : null
  const trough = histScores.length ? Math.min(...histScores) : null
  const avg = histScores.length
    ? histScores.reduce((a, b) => a + b, 0) / histScores.length : null
  const sigma = stdDev(histScores)

  const currentScore = analytics?.currentScore ?? null
  const intPart = currentScore !== null ? Math.trunc(currentScore) : null
  const decPart = currentScore !== null
    ? `.${(Math.abs(currentScore) % 1).toFixed(2).slice(2)}` : ''

  const activeDelegations = delegations.filter(d => d.isActive)
  const activePeriodLabel = activePeriods[0]
    ? periodCode(activePeriods[0].type, activePeriods[0].startDate)
    : 'N/A'

  const cycleDone = summary?.completedEvaluations ?? 0
  const cycleTotal = summary?.totalEvaluations ?? 0
  const cyclePct = cycleTotal > 0 ? cycleDone / cycleTotal : 0
  const cycleBar = asciiBar(cyclePct, 22)

  const volPct = sigma !== null ? Math.min(1, sigma / 15) : 0
  const volBar = asciiBar(volPct, 20)
  const volLabel = sigma === null ? 'N/A' : sigma < 5 ? 'LOW' : sigma < 10 ? 'MEDIUM' : 'HIGH'

  // ── ticker rows ────────────────────────────────────────────────────────────
  const tickerItems: Array<{ label: string; value: string; zone: string }> = [
    { label: 'SELF', value: fmt(currentScore), zone: '' },
    { label: 'DEPT.AVG', value: fmt(analytics?.departmentAvg), zone: '' },
    { label: 'COMPANY.AVG', value: fmt(analytics?.companyAvg), zone: '' },
    { label: 'ANTI.BONUS', value: fmt(scorecard?.antiBonusTotal), zone: scorecard && scorecard.antiBonusTotal < 0 ? 'down' : '' },
    { label: 'EVALS.DONE', value: `${cycleDone}/${cycleTotal}`, zone: '' },
    { label: 'APPEALS', value: String(appeals.length), zone: appeals.length > 0 ? 'down' : 'up' },
    { label: 'NOTIF', value: String(unreadCount), zone: '' },
    { label: 'DELEG', value: String(activeDelegations.length), zone: '' },
  ]

  const eventTag = (t: DashboardEvent['iconType']) =>
    t === 'success' ? 'OK' : t === 'warn' ? 'WARN' : 'INFO'

  return (
    <div className="dv2-root">
      <style>{DASHBOARD_V2_CSS}</style>

      <div className="dv2-terminal">
        {/* a11y partial-failure announcer */}
        <div className="sr-only" role="status" aria-live="polite">
          {partialFailure ? 'Часть данных дашборда не загрузилась' : ''}
        </div>

        {/* ── HEADER ── */}
        <header className="dv2-head">
          <div className="dv2-head-brand">
            <span className="dv2-head-logo">GFH</span>
            <span>EMPLOYEE.RATING.TERMINAL · v2.0</span>
          </div>
          <div className="dv2-head-cmd">
            <span>dashboard --period={activePeriodLabel}</span>
            <span className="dv2-head-caret" />
          </div>
          <div className="dv2-head-right">
            <span>SESS <span className="dv2-mono">{clock}</span></span>
            <span>·</span>
            <span className="dv2-mono">UTC+6</span>
          </div>
        </header>

        {/* ── TICKER ── */}
        <div className="dv2-ticker">
          <div className="dv2-ticker-inner">
            {[...tickerItems, ...tickerItems].map((it, i) => (
              <span key={i} className="dv2-ticker-item">
                <strong>{it.label}</strong> {it.value}
                {it.zone && <span className={`dv2-${it.zone}`}>{it.zone === 'up' ? ' OK' : ' !'}</span>}
                <span className="dv2-ticker-sep">|</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── GRID ── */}
        <div className="dv2-grid">

          {/* SELF.RATING */}
          <Card col={8} title="SELF.RATING" id="R01">
            <div className="dv2-kpi">
              <div className="dv2-kpi-num">
                {intPart !== null ? intPart : '—'}
                <span className="dv2-kpi-dec">{decPart}</span>
                <span className="dv2-kpi-unit">/ 100</span>
              </div>
              <div className="dv2-kpi-meta">
                {scorecard?.grade && <Tag kind="gold">{scorecard.grade}</Tag>}
                {scorecard && scorecard.vsPrevPeriod !== null && (
                  <>
                    <div className={`dv2-kpi-delta dv2-${zoneClass(scorecard.vsPrevPeriod)}`}>
                      {signed(scorecard.vsPrevPeriod)}
                    </div>
                    <div className="dv2-kpi-delta-lab">
                      vs {scorecard.prevPeriodLabel ?? 'PREV'}
                    </div>
                  </>
                )}
                {scorecard && (
                  <div className="dv2-kpi-target">
                    GOAL Δ <strong className={`dv2-${zoneClass(scorecard.vsGoal)}`}>
                      {signed(scorecard.vsGoal)}
                    </strong>
                    {scorecard.rank !== null && <> · RANK <strong>#{scorecard.rank}</strong></>}
                  </div>
                )}
              </div>
            </div>

            <div className="dv2-rule-thick" />

            <div className="dv2-data-rows">
              {(scorecard?.criteria ?? []).slice(0, 5).map((c, i) => {
                const pct = c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0
                const good = pct >= 60
                return (
                  <div key={c.criteriaId} className="dv2-data-row">
                    <span className="dv2-data-idx">{String(i + 1).padStart(2, '0')}</span>
                    <span className="dv2-data-name">{c.nameRu}</span>
                    <span className="dv2-bar-track">
                      <span className={`dv2-bar-fill dv2-${good ? 'up' : 'down'}`}
                        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
                    </span>
                    <span className={`dv2-data-val dv2-${good ? 'up' : 'down'}`}>
                      {fmt(c.score)}
                    </span>
                  </div>
                )
              })}
              {(!scorecard || scorecard.criteria.length === 0) && (
                <div className="dv2-empty">NO SCORECARD · PERIOD NOT CLOSED</div>
              )}
            </div>

            <div className="dv2-rule" />

            <div className="dv2-field-grid dv2-field-grid--3">
              <div className="dv2-field">
                <div className="dv2-field-lab">PEAK</div>
                <div className="dv2-field-val">{fmt(peak)}</div>
                <div className="dv2-field-sub">12M HIGH</div>
              </div>
              <div className="dv2-field">
                <div className="dv2-field-lab">TROUGH</div>
                <div className="dv2-field-val">{fmt(trough)}</div>
                <div className="dv2-field-sub">12M LOW</div>
              </div>
              <div className="dv2-field">
                <div className="dv2-field-lab">AVG</div>
                <div className="dv2-field-val">{fmt(avg)}</div>
                <div className="dv2-field-sub">σ = {fmt(sigma, 1)}</div>
              </div>
            </div>
          </Card>

          {/* RATING.DYNAMICS */}
          <Card col={4} title="RATING.DYNAMICS" id="C01">
            <div className="dv2-row-between">
              <span className="dv2-muted">
                {histScores.length} PERIODS
              </span>
              {avg !== null && currentScore !== null && (
                <Tag kind={currentScore >= avg ? 'up' : 'down'}>
                  {currentScore >= avg ? 'UPTREND' : 'DOWNTREND'}
                </Tag>
              )}
            </div>
            <DynamicsChart scores={histScores} />
            <div className="dv2-gauge">
              <div className="dv2-gauge-meta">
                <span>VOLATILITY</span>
                <span><strong>{volLabel}</strong></span>
              </div>
              <div className="dv2-gauge-bar">
                <span className="dv2-fill">{volBar.fill}</span>
                <span className="dv2-dim">{volBar.empty}</span>
              </div>
              <div className="dv2-gauge-meta">
                <span>σ {fmt(sigma, 1)}</span>
                <span>{Math.round(volPct * 100)}%</span>
              </div>
            </div>
          </Card>

          {/* SUBORDINATES.RANK — managers only */}
          {isManager && (
            <Card col={6} title="SUBORDINATES.RANK" id="S01">
              {team && (team.bestPerformer || team.attention.length > 0) ? (
                <div className="dv2-ladder">
                  {[
                    ...(team.bestPerformer ? [team.bestPerformer] : []),
                    ...team.attention,
                  ].map(m => {
                    const down = m.status === 'low' || m.status === 'appeal'
                    const pct = m.latestScore !== null ? Math.max(8, Math.min(100, m.latestScore)) : 8
                    return (
                      <div key={m.userId} className="dv2-ladder-row">
                        <span className="dv2-ladder-key">{m.initials}</span>
                        <span className="dv2-ladder-name">{m.fullName}</span>
                        <span className="dv2-ladder-bg" style={{ width: `${pct}%` }} />
                        <span className={`dv2-ladder-val dv2-${down ? 'down' : 'up'}`}>
                          {fmt(m.latestScore)}
                        </span>
                      </div>
                    )
                  })}
                  <div className="dv2-ladder-foot">
                    TEAM {team.totalCount} · AVG {fmt(team.teamAvg)}
                  </div>
                </div>
              ) : (
                <div className="dv2-empty">NO SUBORDINATE DATA</div>
              )}
            </Card>
          )}

          {/* EVAL.CYCLE.PROGRESS */}
          <Card col={isManager ? 6 : 12} title="EVAL.CYCLE.PROGRESS" id="P01">
            <div className="dv2-row-between dv2-baseline">
              <div>
                <span className="dv2-big-num">{cycleDone} / {cycleTotal}</span>
                <span className="dv2-muted dv2-ml">EVALUATIONS COMPLETE</span>
              </div>
              {summary && summary.pendingEvaluations > 0 && (
                <Tag kind="warn">{summary.pendingEvaluations} PENDING</Tag>
              )}
            </div>
            <div className="dv2-gauge">
              <div className="dv2-gauge-bar dv2-gauge-bar--lg">
                <span className="dv2-fill">{cycleBar.fill}</span>
                <span className="dv2-dim">{cycleBar.empty}</span>
              </div>
              <div className="dv2-gauge-meta">
                <span>0%</span>
                <span><strong>{Math.round(cyclePct * 100)}%</strong></span>
                <span>100%</span>
              </div>
            </div>
            <div className="dv2-rule" />
            <div className="dv2-field-grid dv2-field-grid--3">
              <div className="dv2-field">
                <div className="dv2-field-lab">DONE</div>
                <div className="dv2-field-val dv2-up">{cycleDone}</div>
                <div className="dv2-field-sub">SUBMITTED</div>
              </div>
              <div className="dv2-field">
                <div className="dv2-field-lab">PEND.EVAL</div>
                <div className="dv2-field-val">{summary?.pendingEvaluations ?? 0}</div>
                <div className="dv2-field-sub">TO SCORE</div>
              </div>
              <div className="dv2-field">
                <div className="dv2-field-lab">PEND.APPEAL</div>
                <div className="dv2-field-val">{summary?.pendingAppeals ?? 0}</div>
                <div className="dv2-field-sub">TO REVIEW</div>
              </div>
            </div>
          </Card>

          {/* ANTI.BONUS */}
          <Card col={4} title="ANTI.BONUS" id="A01">
            <div className="dv2-row-between dv2-baseline">
              <span className="dv2-big-num dv2-down">
                {scorecard ? signed(scorecard.antiBonusTotal) : '—'}
              </span>
              {scorecard && (
                <Tag kind={scorecard.antiBonusTotal < 0 ? 'down' : 'up'}>
                  {scorecard.antiBonusTotal < 0 ? 'PENALTY' : 'CLEAN'}
                </Tag>
              )}
            </div>
            <div className="dv2-sub-cap">CUMULATIVE PENALTY · CURRENT PERIOD</div>
            <div className="dv2-rule" />
            <div className="dv2-data-rows">
              {(scorecard?.antiBonuses ?? []).slice(0, 5).map((a, i) => (
                <div key={a.criteriaId} className="dv2-data-row">
                  <span className="dv2-data-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="dv2-data-name">{a.nameRu}</span>
                  <span className="dv2-data-val dv2-down">{signed(a.score)}</span>
                </div>
              ))}
              {(!scorecard || scorecard.antiBonuses.length === 0) && (
                <div className="dv2-empty">NO PENALTIES RECORDED</div>
              )}
            </div>
          </Card>

          {/* ACTIVE.PERIODS */}
          <Card col={4} title="ACTIVE.PERIODS" id="T01">
            {activePeriods.length === 0 ? (
              <div className="dv2-empty">NO ACTIVE PERIODS</div>
            ) : (
              <div className="dv2-data-rows">
                {activePeriods.map((p, i) => {
                  const prog = progressByPeriod[p.id]
                  const pct = prog && prog.total > 0
                    ? (prog.completed / prog.total) * 100 : 0
                  const deadlineDays = Math.max(0, Math.ceil(
                    (new Date(p.submissionDeadline).getTime() - Date.now()) / 86400000))
                  return (
                    <div key={p.id} className="dv2-data-row">
                      <span className="dv2-data-idx">{String(i + 1).padStart(2, '0')}</span>
                      <span className="dv2-data-name">
                        {periodCode(p.type, p.startDate)}
                        <span className="dv2-data-sub"> · DL {shortDate(p.submissionDeadline)} · {deadlineDays}D</span>
                      </span>
                      <span className="dv2-bar-track">
                        <span className="dv2-bar-fill"
                          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
                      </span>
                      <span className="dv2-data-val">
                        {prog ? `${prog.completed}/${prog.total}` : '…'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* EVENT.LOG */}
          <Card col={4} title="EVENT.LOG" id="L01">
            <div className="dv2-cmd-list">
              {events.length === 0 && <div className="dv2-empty">NO EVENTS</div>}
              {events.slice(0, 8).map(e => (
                <div key={e.id} className="dv2-cmd-row">
                  <span className="dv2-cmd-time">
                    {new Date(e.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <span className="dv2-cmd-msg">{e.text}</span>
                  <span className={`dv2-cmd-tag dv2-cmd-tag--${eventTag(e.iconType)}`}>
                    {eventTag(e.iconType)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* MINI · APPEALS */}
          <button className="dv2-card dv2-col-3 dv2-card-btn" onClick={() => navigate('/my-tasks')}>
            <div className="dv2-card-head">
              <span><strong>APPEALS</strong></span>
              <span className="dv2-card-id">[ M01 ]</span>
            </div>
            <div className="dv2-card-body">
              <div className="dv2-mini-num">
                <span>{appeals.length}</span>
                <span className="dv2-muted">PENDING</span>
              </div>
              <div className="dv2-rule" />
              <div className="dv2-mini-list">
                {appeals.slice(0, 3).map(a => (
                  <div key={a.id}>· {a.evaluateeName} · {shortDate(a.deadline)}</div>
                ))}
                {appeals.length === 0 && <div className="dv2-muted">· none open</div>}
              </div>
            </div>
          </button>

          {/* MINI · NOTIFICATIONS */}
          <div className="dv2-card dv2-col-3">
            <div className="dv2-card-head">
              <span><strong>NOTIFICATIONS</strong></span>
              <span className="dv2-card-id">[ M02 ]</span>
            </div>
            <div className="dv2-card-body">
              <div className="dv2-mini-num">
                <span>{unreadCount}</span>
                <span className="dv2-muted">UNREAD</span>
              </div>
              <div className="dv2-rule" />
              <div className="dv2-mini-list">
                <div className="dv2-muted">· realtime feed active</div>
              </div>
            </div>
          </div>

          {/* MINI · DELEGATIONS */}
          <div className="dv2-card dv2-col-3">
            <div className="dv2-card-head">
              <span><strong>DELEGATIONS</strong></span>
              <span className="dv2-card-id">[ M03 ]</span>
            </div>
            <div className="dv2-card-body">
              <div className="dv2-mini-num">
                <span>{activeDelegations.length}</span>
                <span className="dv2-muted">ACTIVE</span>
              </div>
              <div className="dv2-rule" />
              <div className="dv2-mini-list">
                {activeDelegations.slice(0, 3).map(d => (
                  <div key={d.id}>· {d.evaluateeName} → {d.delegatedToName}</div>
                ))}
                {activeDelegations.length === 0 && <div className="dv2-muted">· none active</div>}
              </div>
            </div>
          </div>

          {/* MINI · NAV */}
          <div className="dv2-card dv2-col-3">
            <div className="dv2-card-head">
              <span><strong>NAVIGATE</strong></span>
              <span className="dv2-card-id">[ M04 ]</span>
            </div>
            <div className="dv2-card-body">
              <div className="dv2-nav-list">
                <button onClick={() => navigate('/my-kpi')}>
                  <span>[ KPI ]</span><span className="dv2-muted">PERSONAL.ANALYTICS</span>
                </button>
                <button onClick={() => navigate('/my-tasks')}>
                  <span>[ TASKS ]</span><span className="dv2-muted">EVALUATIONS.QUEUE</span>
                </button>
                <button onClick={() => navigate('/dashboard')}>
                  <span>[ V1 ]</span><span className="dv2-muted">CLASSIC.DASHBOARD</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── FOOTER ── */}
        <div className="dv2-status-bar">
          <div className="dv2-status-left">
            <span className="dv2-status-item">
              <span className={`dv2-status-dot${partialFailure ? ' dv2-warn-dot' : ''}`} />
              API · {partialFailure ? 'DEGRADED' : 'UP'}
            </span>
            <span className="dv2-status-item">
              <span className="dv2-status-dot" /> SESSION · {role ?? '—'}
            </span>
            <span className="dv2-status-item">
              <span className="dv2-status-dot" /> PERIOD · {activePeriodLabel}
            </span>
          </div>
          <div>GFH.TERM v2.0 · {analytics?.fullName ?? '—'}</div>
        </div>
      </div>
    </div>
  )
}
