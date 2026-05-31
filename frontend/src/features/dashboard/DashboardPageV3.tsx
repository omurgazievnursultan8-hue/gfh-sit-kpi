import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { usePageTitle } from '../../context/PageContext'
import { usePeriod } from '../../context/PeriodContext'
import type { RootState } from '../../app/store'
import {
  analyticsApi,
  type PersonalAnalytics,
  type ScorecardResponse,
  type TeamResponse,
  type DashboardEvent,
} from '../analytics/analyticsApi'
import { evaluationsApi, type Evaluation } from '../evaluations/evaluationsApi'
import { appealsApi, type AppealSummary } from '../appeals/appealsApi'
import { DV3_CSS } from './dv3Styles'

const AVATAR_CLASSES = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] as const

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '··'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_CLASSES[h % AVATAR_CLASSES.length]
}

function fmtDateShort(iso: string | null, lng: string): string {
  if (!iso) return '—'
  const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
  return new Date(iso).toLocaleDateString(loc, { day: '2-digit', month: '2-digit' })
}

function fmtDateTime(iso: string, lng: string): string {
  const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
  const d = new Date(iso)
  return d.toLocaleDateString(loc, { day: '2-digit', month: '2-digit' }) +
    ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

function relativeTime(iso: string, lng: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return lng === 'kg' ? `${mins} мүнөт мурун` : `${mins} мин назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return lng === 'kg' ? `${hrs} саат мурун` : `${hrs} ч. назад`
  const days = Math.floor(hrs / 24)
  if (days < 7) return lng === 'kg' ? `${days} күн мурун` : `${days} дн. назад`
  return fmtDateTime(iso, lng)
}

export function DashboardPageV3() {
  usePageTitle('nav.dashboard')
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const email = useSelector((s: RootState) => s.auth.email)

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null)
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [appeals, setAppeals] = useState<AppealSummary[]>([])
  const [partialFailure, setPartialFailure] = useState(false)
  const [loading, setLoading] = useState(true)

  const { selectedPeriod, isAllPeriods, periodById } = usePeriod()

  useEffect(() => {
    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      analyticsApi.scorecard().then(setScorecard),
      analyticsApi.team().then(setTeam).catch(() => null),
      analyticsApi.events().then(setEvents).catch(() => null),
      evaluationsApi.asEvaluator(0, 200).then(r => setEvaluations(r.content)).catch(() => null),
      appealsApi.mine().then(setAppeals).catch(() => null),
    ]
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
      setLoading(false)
    })
  }, [])

  // ── period scoping ──────────────────────────────────────────────────────
  const evalPeriodById = useMemo(
    () => new Map(evaluations.map(e => [e.id, e.periodId])), [evaluations],
  )
  const scopedEvals = isAllPeriods
    ? evaluations
    : evaluations.filter(e => e.periodId === selectedPeriod)
  const scopedAppeals = isAllPeriods
    ? appeals
    : appeals.filter(a => evalPeriodById.get(a.evaluationId) === selectedPeriod)

  // ── current score ──────────────────────────────────────────────────────
  const periodScore = isAllPeriods
    ? (analytics?.currentScore ?? null)
    : (analytics?.history.find(h => h.periodId === selectedPeriod)?.score ?? null)
  const scoreDisplay = periodScore !== null ? Math.round(periodScore) : null
  const scorePct = periodScore !== null
    ? Math.min(1, Math.max(0, periodScore / 100))
    : 0
  const ringCirc = 2 * Math.PI * 50 // r=50 → ~314.16
  const ringOffset = ringCirc * (1 - scorePct)

  const periodLabel = useMemo(() => {
    if (isAllPeriods) return t('dashboard.allPeriods', { defaultValue: 'Все периоды' })
    const p = periodById.get(selectedPeriod as number)
    if (!p) return '—'
    const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
    return new Date(p.endDate).toLocaleDateString(loc, { month: 'long', year: 'numeric' })
  }, [isAllPeriods, selectedPeriod, periodById, lng, t])

  const periodRange = useMemo(() => {
    if (isAllPeriods) return null
    const p = periodById.get(selectedPeriod as number)
    if (!p) return null
    return `${fmtDateShort(p.startDate, lng)} — ${fmtDateShort(p.endDate, lng)}`
  }, [isAllPeriods, selectedPeriod, periodById, lng])

  const deadlineDays = useMemo(() => {
    if (isAllPeriods) return null
    const p = periodById.get(selectedPeriod as number)
    return p ? daysUntil(p.endDate) : null
  }, [isAllPeriods, selectedPeriod, periodById])

  const fullName = analytics?.fullName ?? email ?? ''
  const firstName = fullName.split(/\s+/)[0] || (email?.split('@')[0] ?? '')

  const greetingDate = useMemo(() => {
    const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
    const d = new Date()
    return d.toLocaleDateString(loc, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  }, [lng])

  const greetingWord = useMemo(() => {
    const h = new Date().getHours()
    if (lng === 'kg') {
      if (h < 5) return 'Жакшы түн'
      if (h < 12) return 'Кутмандуу таң'
      if (h < 18) return 'Жакшы күн'
      return 'Кутмандуу кеч'
    }
    if (h < 5) return 'Доброй ночи'
    if (h < 12) return 'Доброе утро'
    if (h < 18) return 'Добрый день'
    return 'Добрый вечер'
  }, [lng])

  // ── pending counts ─────────────────────────────────────────────────────
  const pendingEvals = scopedEvals.filter(e => e.status === 'DRAFT' || e.status === 'SUBMITTED')
  const totalEvals = scopedEvals.length
  const pendingAppeals = scopedAppeals.filter(a => a.status === 'PENDING')

  // ── delta ──────────────────────────────────────────────────────────────
  const prevScore = useMemo(() => {
    const hist = analytics?.history ?? []
    if (hist.length < 2) return null
    const sorted = [...hist].sort((a, b) => b.startDate.localeCompare(a.startDate))
    if (isAllPeriods) return sorted[1]?.score ?? null
    const idx = sorted.findIndex(h => h.periodId === selectedPeriod)
    return idx >= 0 ? sorted[idx + 1]?.score ?? null : null
  }, [analytics, selectedPeriod, isAllPeriods])
  const delta = periodScore !== null && prevScore !== null
    ? Math.round(periodScore - prevScore)
    : null

  // ── department average ─────────────────────────────────────────────────
  const deptAvg = useMemo(() => {
    if (isAllPeriods) return analytics?.departmentAvg ?? null
    return analytics?.history.find(h => h.periodId === selectedPeriod)?.departmentAvg ?? null
  }, [analytics, selectedPeriod, isAllPeriods])

  // ── action queue (synthesized) ─────────────────────────────────────────
  const actions = useMemo(() => {
    const items: Array<{
      key: string
      tone: 'urgent' | 'warn' | 'info' | 'ok'
      icon: 'eval' | 'appeal' | 'profile' | 'plan'
      title: string
      desc: string
      due: string | null
      dueLabel: string
      href: string
    }> = []
    if (pendingEvals.length > 0) {
      items.push({
        key: 'evals',
        tone: deadlineDays !== null && deadlineDays <= 7 ? 'urgent' : 'warn',
        icon: 'eval',
        title: t('dashboard.v3.actEvals', { defaultValue: 'Оценить сотрудников' }),
        desc: t('dashboard.v3.actEvalsDesc', {
          defaultValue: '{{done}} из {{total}} — финал до конца периода',
          done: pendingEvals.length,
          total: totalEvals,
        }),
        due: deadlineDays !== null ? `${deadlineDays} дн.` : '—',
        dueLabel: deadlineDays !== null ? '' : '',
        href: '/my-tasks',
      })
    }
    for (const a of pendingAppeals.slice(0, 3)) {
      const days = daysUntil(a.deadline)
      items.push({
        key: `app-${a.id}`,
        tone: days !== null && days <= 3 ? 'urgent' : 'warn',
        icon: 'appeal',
        title: t('dashboard.v3.actAppeal', { defaultValue: 'Апелляция · {{n}}', n: a.evaluateeName }),
        desc: a.reason || t('appeals.noReason', { defaultValue: 'без описания' }),
        due: days !== null ? `${days} дн.` : '—',
        dueLabel: '',
        href: `/my-evaluations/${a.evaluationId}`,
      })
    }
    return items
  }, [pendingEvals, pendingAppeals, deadlineDays, totalEvals, t])

  // ── history chart points ───────────────────────────────────────────────
  const chart = useMemo(() => {
    const hist = [...(analytics?.history ?? [])]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-6)
    if (hist.length === 0) return null
    const W = 600
    const H = 200
    const padL = 40
    const padR = 20
    const innerW = W - padL - padR
    const innerH = 160
    const xFor = (i: number) => hist.length === 1
      ? padL + innerW / 2
      : padL + (innerW * i) / (hist.length - 1)
    const yFor = (v: number) => 20 + innerH - (Math.min(100, Math.max(0, v)) / 100) * innerH
    const myPts = hist.map((h, i) => ({ x: xFor(i), y: yFor(h.score), v: Math.round(h.score), label: h.periodType + ' ' + h.startDate.slice(0, 4) }))
    const deptPts = hist.map((h, i) => h.departmentAvg !== null
      ? { x: xFor(i), y: yFor(h.departmentAvg), v: Math.round(h.departmentAvg) }
      : null,
    )
    return { hist, myPts, deptPts, W, H, targetY: yFor(75) }
  }, [analytics])

  // ── team data ──────────────────────────────────────────────────────────
  const teamRows = useMemo(() => {
    if (!team) return []
    const rows = [...team.attention]
    if (team.bestPerformer) rows.push(team.bestPerformer)
    return rows
  }, [team])

  return (
    <div className="dv3-root">
      <style>{DV3_CSS}</style>
      <div className="dv3-inner">

        {partialFailure && (
          <div className="dv3-warn">{t('dashboard.partialFailure', { defaultValue: 'Часть данных не загружена' })}</div>
        )}

        {/* ===== HERO ===== */}
        <section className="dv3-hero">
          <div className="dv3-hero-inner">
            <div>
              <div className="dv3-greet">
                <span className="dot" />
                {greetingDate}
              </div>
              <h1>{greetingWord}, <span className="name">{firstName || '—'}</span></h1>
              <p className="dv3-hero-sub">
                {t('dashboard.v3.heroSub', {
                  defaultValue: 'Период оценки {{p}}{{ddl}}. У вас {{evals}} сотрудников ждут оценку и {{ap}} апелляций.',
                  p: periodLabel,
                  ddl: deadlineDays !== null && deadlineDays > 0
                    ? ` ${t('dashboard.v3.endsIn', { defaultValue: 'завершается через' })} ${deadlineDays} дн.`
                    : '',
                  evals: pendingEvals.length,
                  ap: pendingAppeals.length,
                })}
              </p>
              {periodRange && (
                <div className="dv3-hero-period">
                  <span className="tag">{t('dashboard.v3.activeTag', { defaultValue: 'Активный' })}</span>
                  {periodLabel} · {periodRange}
                </div>
              )}
            </div>

            <div className="dv3-hero-stats">
              <div className="dv3-ring" aria-label={t('dashboard.ratingAria', { score: scoreDisplay ?? 0 })}>
                <svg viewBox="0 0 120 120">
                  <circle className="bg" cx="60" cy="60" r="50" strokeWidth="9" fill="none" />
                  <circle
                    className="fg"
                    cx="60" cy="60" r="50" strokeWidth="9" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ringCirc.toFixed(2)}
                    strokeDashoffset={ringOffset.toFixed(2)}
                  />
                </svg>
                <div className="dv3-ring-num">
                  <div>
                    <div className="big">{scoreDisplay ?? '··'}</div>
                    <div className="max">/ 100</div>
                  </div>
                </div>
              </div>
              <div className="dv3-hero-side">
                <div className="dv3-hero-side-row">
                  <div className="lbl">{t('dashboard.v3.deptAvg', { defaultValue: 'Среднее по деп.' })}</div>
                  <div className="val">{deptAvg !== null ? Math.round(deptAvg) : '—'}</div>
                </div>
                <div className="dv3-hero-side-row">
                  <div className="lbl">{t('dashboard.v3.dynamics', { defaultValue: 'Динамика' })}</div>
                  <div className="val">
                    {delta !== null ? (delta >= 0 ? `+${delta}` : `${delta}`) : '—'}
                    <span className={`delta${delta !== null && delta < 0 ? ' down' : ''}`}>{t('dashboard.vsPrev', { defaultValue: 'vs пред.' })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Quicklinks ===== */}
        <div className="dv3-quicklinks">
          <Link className="dv3-qlink accent" to="/my-tasks">
            <div className="dv3-qlink-top">
              <div className="dv3-qlink-label">
                <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                {t('dashboard.v3.qlEvals', { defaultValue: 'Оценить сотрудников' })}
              </div>
              {pendingEvals.length > 0 && <span className="dv3-qlink-tag urgent">{t('dashboard.v3.urgent', { defaultValue: 'срочно' })}</span>}
            </div>
            <div className="dv3-qlink-num">{pendingEvals.length}<span className="frac">/ {totalEvals}</span></div>
            <div className="dv3-qlink-foot">
              {t('dashboard.v3.waitingEval', { defaultValue: 'ждут оценку' })}
              {deadlineDays !== null && <> · {t('dashboard.v3.deadline', { defaultValue: 'дедлайн' })} <strong>{deadlineDays} дн.</strong></>}
            </div>
          </Link>

          <Link className="dv3-qlink danger" to="/my-evaluations">
            <div className="dv3-qlink-top">
              <div className="dv3-qlink-label">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {t('dashboard.v3.qlAppeals', { defaultValue: 'Апелляции' })}
              </div>
              {pendingAppeals.length > 0 && <span className="dv3-qlink-tag urgent">{t('dashboard.v3.review', { defaultValue: 'на рассм.' })}</span>}
            </div>
            <div className="dv3-qlink-num">{pendingAppeals.length}</div>
            <div className="dv3-qlink-foot">
              {pendingAppeals.length > 0
                ? <>{t('dashboard.v3.awaitingDecision', { defaultValue: 'ожидают решения' })} · <strong>{pendingAppeals.slice(0, 2).map(a => a.evaluateeName).join(', ')}</strong></>
                : t('dashboard.v3.noOpenAppeals', { defaultValue: 'нет открытых апелляций' })}
            </div>
          </Link>

          <Link className="dv3-qlink gold" to="/my-kpi">
            <div className="dv3-qlink-top">
              <div className="dv3-qlink-label">
                <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {t('dashboard.v3.qlMyKpi', { defaultValue: 'Мой KPI' })}
              </div>
              {scoreDisplay !== null && <span className="dv3-qlink-tag ok">{scorecard?.grade || '—'}</span>}
            </div>
            <div className="dv3-qlink-num">{scoreDisplay ?? '—'}<span className="frac">/ 100</span></div>
            <div className="dv3-qlink-foot">
              {prevScore !== null && delta !== null
                ? <>{delta >= 0 ? '+' : ''}{delta} {t('dashboard.v3.toPrev', { defaultValue: 'к пред.' })} ({Math.round(prevScore)})</>
                : t('dashboard.v3.firstPeriod', { defaultValue: 'первый период' })}
            </div>
          </Link>

          <Link className="dv3-qlink info" to="/analytics/hierarchical">
            <div className="dv3-qlink-top">
              <div className="dv3-qlink-label">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                {t('dashboard.v3.qlDeptReport', { defaultValue: 'Отчёт по департаменту' })}
              </div>
              <span className="dv3-qlink-tag">{t('dashboard.v3.draft', { defaultValue: 'обзор' })}</span>
            </div>
            <div className="dv3-qlink-num">{deptAvg !== null ? Math.round(deptAvg) : '—'}<span className="frac">ср.</span></div>
            <div className="dv3-qlink-foot">
              {t('dashboard.v3.deptFoot', { defaultValue: 'по департаменту · команда {{n}}', n: team?.totalCount ?? 0 })}
            </div>
          </Link>
        </div>

        {/* ===== Scorecard + Action queue ===== */}
        <div className="dv3-grid">
          <div className="dv3-card">
            <div className="dv3-card-head">
              <h2>{t('dashboard.v3.myKpi', { defaultValue: 'Мой KPI' })} · {periodLabel}</h2>
              <Link to="/my-kpi" className="link">{t('dashboard.v3.toProfile', { defaultValue: 'К профилю →' })}</Link>
            </div>
            <div className="dv3-score-top">
              <div className="dv3-score-head">
                {scoreDisplay ?? '··'}<span className="out">/100</span>
              </div>
              <div className="dv3-score-meta">
                <div className="ptype">
                  {scorecard?.evaluatorName
                    ? t('dashboard.v3.evaluator', { defaultValue: 'оценил {{n}}', n: scorecard.evaluatorName })
                    : t('dashboard.v3.noEvaluator', { defaultValue: 'нет оценщика' })}
                </div>
                {scorecard?.grade && (
                  <div className="grade-row"><span className="grade">{scorecard.grade}</span>{t('dashboard.v3.gradeNote', { defaultValue: 'итог периода' })}</div>
                )}
                <div className="delta-row">
                  {delta !== null && (
                    <span>
                      <span className={delta >= 0 ? 'up' : 'down'}>{delta >= 0 ? '▲' : '▼'} {delta >= 0 ? '+' : ''}{delta}</span>
                      &nbsp;{t('dashboard.v3.toPrev', { defaultValue: 'к пред.' })} ({prevScore !== null ? Math.round(prevScore) : '—'})
                    </span>
                  )}
                  {deptAvg !== null && scoreDisplay !== null && (
                    <span>
                      <span className={scoreDisplay - deptAvg >= 0 ? 'up' : 'down'}>
                        {scoreDisplay - deptAvg >= 0 ? '▲' : '▼'} {Math.round(scoreDisplay - deptAvg) >= 0 ? '+' : ''}{Math.round(scoreDisplay - deptAvg)}
                      </span>
                      &nbsp;{t('dashboard.v3.toDeptAvg', { defaultValue: 'к среднему' })} ({Math.round(deptAvg)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="dv3-breakdown">
              <div className="dv3-breakdown-title">
                {t('dashboard.v3.breakdownTitle', { defaultValue: 'Разбивка по критериям' })}
              </div>
              {scorecard && scorecard.criteria.length > 0 ? (
                <>
                  {scorecard.criteria.map(c => {
                    const pct = c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0
                    const cls = pct < 60 ? 'low' : pct < 80 ? 'warn' : ''
                    return (
                      <div key={c.criteriaId} className={`dv3-crit ${cls}`}>
                        <div className="nm">
                          {lng === 'kg' ? c.nameKg || c.nameRu : c.nameRu}
                          <small>{c.levelLabel}</small>
                        </div>
                        <div className="meter"><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
                        <div className="scr">{Math.round(c.score)} / {Math.round(c.maxScore)}</div>
                      </div>
                    )
                  })}
                  {scorecard.antiBonuses.map(c => (
                    <div key={`a-${c.criteriaId}`} className="dv3-crit penalty">
                      <div className="nm">
                        {lng === 'kg' ? c.nameKg || c.nameRu : c.nameRu}
                        <small>{t('dashboard.v3.antiBonus', { defaultValue: 'штраф' })}</small>
                      </div>
                      <div className="meter"><span style={{ width: '25%' }} /></div>
                      <div className="scr">−{Math.round(Math.abs(c.score))}</div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="dv3-empty">{loading ? t('common.loading', { defaultValue: 'Загрузка…' }) : t('dashboard.v3.noBreakdown', { defaultValue: 'Разбивка недоступна для выбранного периода' })}</div>
              )}
            </div>
          </div>

          <div className="dv3-card">
            <div className="dv3-card-head">
              <h2>{t('dashboard.v3.toDo', { defaultValue: 'К действию' })} <span className="badge-num">{actions.length}</span></h2>
              <span className="meta">{t('dashboard.v3.byUrgency', { defaultValue: 'Срочность ↓' })}</span>
            </div>
            <div className="dv3-actions">
              {actions.length === 0 && (
                <div className="dv3-empty">{t('dashboard.v3.noActions', { defaultValue: 'Нет открытых действий' })}</div>
              )}
              {actions.map(a => (
                <Link key={a.key} className="dv3-action" to={a.href}>
                  <div className={`dv3-action-ico ${a.tone}`}>
                    {a.icon === 'eval' && <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                    {a.icon === 'appeal' && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                    {a.icon === 'profile' && <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    {a.icon === 'plan' && <svg viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
                  </div>
                  <div className="dv3-action-text">
                    <strong>{a.title}</strong>
                    <div className="desc">{a.desc}</div>
                  </div>
                  <div className={`dv3-action-due ${a.tone}`}>
                    <span className="v">{a.due}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ===== Team performance ===== */}
        {team && teamRows.length > 0 && (
          <div className="dv3-card" style={{ marginBottom: 22 }}>
            <div className="dv3-card-head">
              <h2>{t('dashboard.v3.myTeam', { defaultValue: 'Моя команда' })} <span className="badge-num">{team.totalCount}</span></h2>
              <Link to="/my-tasks" className="link">{t('dashboard.v3.allMembers', { defaultValue: 'Все сотрудники →' })}</Link>
            </div>
            <div>
              <div className="dv3-team-head">
                <div>{t('dashboard.v3.colEmp', { defaultValue: 'Сотрудник' })}</div>
                <div className="col-pos">{t('dashboard.v3.colPos', { defaultValue: 'Должность' })}</div>
                <div>{t('dashboard.v3.colStatus', { defaultValue: 'Статус' })}</div>
                <div>KPI</div>
                <div className="col-delta">Δ</div>
                <div></div>
              </div>
              {teamRows.map(m => {
                const pct = m.latestScore !== null ? Math.min(100, Math.max(0, m.latestScore)) : 0
                const kpiCls = m.latestScore === null ? '' : m.latestScore < 60 ? 'low' : m.latestScore < 80 ? 'warn' : ''
                const pillCls = m.status === 'appeal' ? 'disagreed'
                  : m.status === 'unevaluated' ? 'awaiting'
                  : m.status === 'low' ? 'in_progress'
                  : 'closed'
                const d = m.scoreDelta
                const deltaCls = d === null ? 'flat' : d < 0 ? 'down' : d === 0 ? 'flat' : ''
                return (
                  <Link key={m.userId} className="dv3-team-row" to={`/my-evaluations`}>
                    <div className="dv3-cell-user">
                      <div className={`dv3-avatar ${avatarColor(m.fullName)}`}>{m.initials || initials(m.fullName)}</div>
                      <div className="dv3-name-block">
                        <strong>{m.fullName}</strong>
                        <span className="sub">{m.reasonLabel}</span>
                      </div>
                    </div>
                    <div className="dv3-pos">{m.position || '—'}</div>
                    <div><span className={`dv3-pill ${pillCls}`}>{m.reasonLabel}</span></div>
                    <div className={`dv3-kpi-mini ${kpiCls}`}>
                      <div className="bar"><span style={{ width: `${pct}%` }} /></div>
                      <div className="num">{m.latestScore !== null ? Math.round(m.latestScore) : '—'}</div>
                    </div>
                    <div className="dv3-delta-cell">
                      {d === null
                        ? <span className="dv3-delta-pill flat">—</span>
                        : <span className={`dv3-delta-pill ${deltaCls}`}>
                            {d > 0 && <svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>}
                            {d < 0 && <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>}
                            {d > 0 ? '+' : ''}{Math.round(d)}
                          </span>
                      }
                    </div>
                    <div />
                  </Link>
                )
              })}
              <div className="dv3-table-foot">
                <div className="info">
                  {t('dashboard.v3.shown', { defaultValue: 'Показано' })}{' '}
                  <strong>{teamRows.length}</strong>{' '}{t('dashboard.v3.of', { defaultValue: 'из' })}{' '}
                  <strong>{team.totalCount}</strong>
                </div>
                <Link to="/my-tasks" className="dv3-btn">{t('dashboard.v3.openList', { defaultValue: 'Открыть список →' })}</Link>
              </div>
            </div>
          </div>
        )}

        {/* ===== Lower: chart + feed ===== */}
        <div className="dv3-lower">
          <div className="dv3-card">
            <div className="dv3-card-head">
              <h2>{t('dashboard.v3.history', { defaultValue: 'История KPI' })}</h2>
              <span className="meta">{chart ? `${chart.hist.length} ${t('dashboard.v3.periods', { defaultValue: 'периодов' })}` : ''}</span>
            </div>
            {chart ? (
              <>
                <div className="dv3-chart-wrap">
                  <svg className="dv3-chart" viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none">
                    <g stroke="#e7e2d4" strokeWidth="1">
                      <line x1="40" y1="20" x2={chart.W - 10} y2="20" strokeDasharray="2 4" />
                      <line x1="40" y1="60" x2={chart.W - 10} y2="60" strokeDasharray="2 4" />
                      <line x1="40" y1="100" x2={chart.W - 10} y2="100" strokeDasharray="2 4" />
                      <line x1="40" y1="140" x2={chart.W - 10} y2="140" strokeDasharray="2 4" />
                      <line x1="40" y1="180" x2={chart.W - 10} y2="180" />
                    </g>
                    <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#98a8a3">
                      <text x="34" y="23" textAnchor="end">100</text>
                      <text x="34" y="63" textAnchor="end">80</text>
                      <text x="34" y="103" textAnchor="end">60</text>
                      <text x="34" y="143" textAnchor="end">40</text>
                      <text x="34" y="183" textAnchor="end">20</text>
                    </g>
                    <line x1="40" y1={chart.targetY} x2={chart.W - 10} y2={chart.targetY} stroke="#98a8a3" strokeWidth="1.2" strokeDasharray="6 5" />
                    <text x={chart.W - 18} y={chart.targetY - 4} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#6b7c77">{t('dashboard.v3.goal', { defaultValue: 'ЦЕЛЬ' })} 75</text>

                    {chart.deptPts.every(p => p !== null) && chart.deptPts.length > 1 && (
                      <>
                        <polyline
                          points={chart.deptPts.map(p => `${p!.x},${p!.y}`).join(' ')}
                          stroke="#a8852b" strokeWidth="1.6" fill="none" strokeDasharray="3 3"
                        />
                        {chart.deptPts.map((p, i) => p && <circle key={`d-${i}`} cx={p.x} cy={p.y} r="2.5" fill="#a8852b" />)}
                      </>
                    )}

                    <polyline
                      points={chart.myPts.map(p => `${p.x},${p.y}`).join(' ')}
                      stroke="#0d4d3f" strokeWidth="2.4" fill="none"
                      strokeLinecap="round" strokeLinejoin="round"
                    />
                    {chart.myPts.map((p, i) => {
                      const isLast = i === chart.myPts.length - 1
                      return (
                        <circle key={`m-${i}`} cx={p.x} cy={p.y} r={isLast ? 5.5 : 4} fill={isLast ? '#0d4d3f' : '#fff'} stroke={isLast ? '#fff' : '#0d4d3f'} strokeWidth="2" />
                      )
                    })}
                    <g fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#0e1714" fontWeight="600">
                      {chart.myPts.slice(0, -1).map((p, i) => (
                        <text key={`l-${i}`} x={p.x} y={p.y - 10} textAnchor="middle">{p.v}</text>
                      ))}
                    </g>
                    {chart.myPts.length > 0 && (() => {
                      const last = chart.myPts[chart.myPts.length - 1]
                      return (
                        <g>
                          <rect x={last.x - 24} y={20} width="48" height="20" rx="4" fill="#0d4d3f" />
                          <text x={last.x} y={34} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#f5ecd2" fontWeight="600">{last.v}</text>
                        </g>
                      )
                    })()}
                    <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fill="#6b7c77">
                      {chart.myPts.map((p, i) => (
                        <text key={`x-${i}`} x={p.x} y="195" textAnchor="middle" fontWeight={i === chart.myPts.length - 1 ? 600 : 400} fill={i === chart.myPts.length - 1 ? '#0e1714' : '#6b7c77'}>{p.label}</text>
                      ))}
                    </g>
                  </svg>
                </div>
                <div className="dv3-chart-legend">
                  <span><span className="swatch me" />{t('dashboard.v3.legendMe', { defaultValue: 'Мой KPI' })}</span>
                  <span><span className="swatch dept" />{t('dashboard.v3.legendDept', { defaultValue: 'Среднее по департаменту' })}</span>
                  <span><span className="swatch target" />{t('dashboard.v3.legendTarget', { defaultValue: 'Цель = 75' })}</span>
                </div>
              </>
            ) : (
              <div className="dv3-empty">{loading ? t('common.loading', { defaultValue: 'Загрузка…' }) : t('dashboard.v3.noHistory', { defaultValue: 'История пока пуста' })}</div>
            )}
          </div>

          <div className="dv3-card">
            <div className="dv3-card-head">
              <h2>{t('dashboard.v3.feed', { defaultValue: 'Лента событий' })}</h2>
              <Link to="/notifications" className="link">{t('dashboard.v3.all', { defaultValue: 'Все →' })}</Link>
            </div>
            <div className="dv3-feed">
              {events.length === 0 && (
                <div className="dv3-empty">{loading ? t('common.loading', { defaultValue: 'Загрузка…' }) : t('dashboard.v3.noEvents', { defaultValue: 'Событий пока нет' })}</div>
              )}
              {events.slice(0, 8).map(e => {
                const dotCls = e.iconType === 'warn' ? 'appeal'
                  : e.iconType === 'success' ? 'approve'
                  : 'submit'
                return (
                  <div key={e.id} className="dv3-feed-item">
                    <div className={`dv3-feed-dot ${dotCls}`}>
                      {dotCls === 'appeal' && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                      {dotCls === 'approve' && <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                      {dotCls === 'submit' && <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                    </div>
                    <div>
                      <div className="dv3-feed-text">{e.text}</div>
                      <div className="dv3-feed-time">{relativeTime(e.timestamp, lng)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
