import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { usePageTitle } from '@/layouts/shell/PageContext'
import { usePeriod } from '@/features/periods/PeriodContext'
import type { RootState } from '../../../app/store'
import { analyticsApi, type PersonalAnalytics } from '@/features/analytics'
import { evaluationsApi, type Evaluation } from '@/features/evaluations'
import { appealsApi, type AppealSummary } from '@/features/appeals/api'
import { DV3_CSS } from '../styles'
import { MyTasksPanel } from '../components/MyTasksPanel'
import { MyKpiPanel } from '../components/MyKpiPanel'

function fmtDateShort(iso: string | null, lng: string): string {
  if (!iso) return '—'
  const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
  return new Date(iso).toLocaleDateString(loc, { day: '2-digit', month: '2-digit' })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

export function DashboardPage() {
  usePageTitle('nav.dashboard')
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const email = useSelector((s: RootState) => s.auth.email)

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [appeals, setAppeals] = useState<AppealSummary[]>([])
  const [partialFailure, setPartialFailure] = useState(false)

  const { selectedPeriod, isAllPeriods, periodById } = usePeriod()

  useEffect(() => {
    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      evaluationsApi.asEvaluator(0, 200).then(r => setEvaluations(r.content)).catch(() => null),
      appealsApi.mine().then(setAppeals).catch(() => null),
    ]
    Promise.allSettled(tasks).then(results => {
      if (results.some(r => r.status === 'rejected')) setPartialFailure(true)
    })
  }, [])

  const evalPeriodById = useMemo(
    () => new Map(evaluations.map(e => [e.id, e.periodId])), [evaluations],
  )
  const scopedEvals = isAllPeriods
    ? evaluations
    : evaluations.filter(e => e.periodId === selectedPeriod)
  const scopedAppeals = isAllPeriods
    ? appeals
    : appeals.filter(a => evalPeriodById.get(a.evaluationId) === selectedPeriod)

  const periodScore = isAllPeriods
    ? (analytics?.currentScore ?? null)
    : (analytics?.history.find(h => h.periodId === selectedPeriod)?.score ?? null)
  const scoreDisplay = periodScore !== null ? Math.round(periodScore) : null
  const scorePct = periodScore !== null
    ? Math.min(1, Math.max(0, periodScore / 100))
    : 0
  const ringCirc = 2 * Math.PI * 50
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

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const greetingDate = useMemo(() => {
    const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
    return now.toLocaleDateString(loc, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) +
      ' · ' + now.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  }, [lng, now])

  const greetingWord = useMemo(() => {
    const h = now.getHours()
    if (h < 5) return t('dashboard.greetingNight')
    if (h < 12) return t('dashboard.greetingMorning')
    if (h < 18) return t('dashboard.greetingAfternoon')
    return t('dashboard.greetingEvening')
  }, [now, t])

  const pendingEvals = scopedEvals.filter(e => e.status === 'DRAFT')
  const totalEvals = scopedEvals.length
  const pendingAppeals = scopedAppeals.filter(a => a.status === 'PENDING')

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

  const deptAvg = useMemo(() => {
    if (isAllPeriods) return analytics?.departmentAvg ?? null
    return analytics?.history.find(h => h.periodId === selectedPeriod)?.departmentAvg ?? null
  }, [analytics, selectedPeriod, isAllPeriods])

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
              <div
                className="dv3-ring"
                aria-label={scoreDisplay !== null
                  ? t('dashboard.ratingAria', { score: scoreDisplay })
                  : t('dashboard.ratingAriaEmpty', { defaultValue: 'Рейтинг не определён' })}
              >
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

        {/* ===== TASKS ROW ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 18, marginBottom: 22 }}>
          <MyKpiPanel analytics={analytics} />
          <MyTasksPanel />
        </div>

      </div>
    </div>
  )
}
