import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { usePageTitle } from '../../context/PageContext'
import { usePeriod } from '../../context/PeriodContext'
import type { RootState } from '../../app/store'
import { analyticsApi, type PersonalAnalytics } from '../analytics/analyticsApi'
import { delegationsApi, type Delegation } from '../org/delegationsApi'
import { evaluationsApi, type Evaluation } from '../evaluations/evaluationsApi'
import { appealsApi, type AppealSummary } from '../appeals/appealsApi'
import { RATING_ZONES } from '../../lib/ratingZones'
import { DV4_CSS } from './dv4Styles'

type RatingState = 'scored' | 'pending' | 'none'

function zoneOf(score: number | null): 'up' | 'warn' | 'down' | null {
  if (score === null) return null
  if (score >= RATING_ZONES.up) return 'up'
  if (score >= RATING_ZONES.warn) return 'warn'
  return 'down'
}

function fmtDate(iso: string | null, lng: string): string {
  if (!iso) return '—'
  const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
  return new Date(iso).toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DashboardPageV2() {
  usePageTitle('nav.dashboard')
  const { t, i18n } = useTranslation()
  const email = useSelector((s: RootState) => s.auth.email)
  const role = useSelector((s: RootState) => s.auth.role)

  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [myEvaluations, setMyEvaluations] = useState<Evaluation[]>([])
  const [appeals, setAppeals] = useState<AppealSummary[]>([])
  const [partialFailure, setPartialFailure] = useState(false)
  const [loading, setLoading] = useState(true)

  const { selectedPeriod, isAllPeriods, periodById } = usePeriod()

  useEffect(() => {
    const loadDelegations = delegationsApi.list(0, 100)
      .then(first =>
        first.totalElements > first.content.length
          ? delegationsApi.list(0, first.totalElements)
          : first,
      )
      .then(r => setDelegations(r.content))

    const tasks = [
      analyticsApi.personal().then(setAnalytics),
      loadDelegations,
      evaluationsApi.asEvaluator(0, 200).then(r => setEvaluations(r.content)),
      evaluationsApi.myHistory(0, 50).then(r => setMyEvaluations(r.content)),
      appealsApi.mine().then(setAppeals),
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

  // ── self rating ─────────────────────────────────────────────────────────
  const periodScore = isAllPeriods
    ? (analytics?.currentScore ?? null)
    : (analytics?.history.find(h => h.periodId === selectedPeriod)?.score ?? null)
  const scoreDisplay = periodScore !== null ? Math.round(periodScore) : null
  const scorePct = periodScore !== null
    ? Math.min(1, Math.max(0, periodScore / 100))
    : 0
  const zone = zoneOf(periodScore)

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

  const periodLabel = useMemo(() => {
    if (isAllPeriods) return t('dashboard.allPeriods')
    const p = periodById.get(selectedPeriod as number)
    if (!p) return '—'
    const locale = i18n.language === 'kg' ? 'ky-KG' : 'ru-RU'
    return new Date(p.endDate).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  }, [isAllPeriods, selectedPeriod, periodById, i18n.language, t])

  const myPeriodEval = isAllPeriods
    ? null
    : myEvaluations.find(e => e.periodId === selectedPeriod) ?? null
  const ratingState: RatingState =
    periodScore !== null ? 'scored' : myPeriodEval ? 'pending' : 'none'

  // ── strip stats ─────────────────────────────────────────────────────────
  const cycleDone = scopedEvals.filter(e => e.status !== 'DRAFT').length
  const cycleTotal = scopedEvals.length
  const cyclePct = cycleTotal > 0 ? cycleDone / cycleTotal : 0

  const appealsPending = scopedAppeals.filter(a => a.status === 'PENDING').length
  const appealsTotal = scopedAppeals.length
  const appealsPct = appealsTotal > 0 ? appealsPending / appealsTotal : 0

  const activeDelegations = delegations.filter(d => d.isActive)
  const delegTotal = delegations.length
  const delegActive = activeDelegations.length
  const delegPct = delegTotal > 0 ? delegActive / delegTotal : 0

  // ── recent activity ─────────────────────────────────────────────────────
  const recentEvals = useMemo(() => {
    return [...scopedEvals]
      .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt))
      .slice(0, 6)
  }, [scopedEvals])
  const recentAppeals = useMemo(() => {
    return [...scopedAppeals]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
  }, [scopedAppeals])

  const todayMono = useMemo(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10).replace(/-/g, '.')
  }, [])

  const roleLabel = role ? t(`roles.${role.toLowerCase()}`, { defaultValue: role }) : '—'

  return (
    <div className="dv4-root">
      <style>{DV4_CSS}</style>

      <div className="dv4-wrap">
        <div className="sr-only" role="status" aria-live="polite">
          {partialFailure ? t('dashboard.partialFailureSr') : ''}
        </div>

        {partialFailure && (
          <div className="dv4-warn-banner">
            {t('dashboard.partialFailure', { defaultValue: 'Часть данных не загружена' })}
          </div>
        )}

        {/* ── MASTHEAD ── */}
        <header className="dv4-mast">
          <div className="dv4-mast-left">
            <div className="dv4-eyebrow">
              <span>GFH · KPI</span>
              <em>{todayMono}</em>
              <span>{i18n.language.toUpperCase()}</span>
            </div>
            <h1 className="dv4-title">{t('dashboard.v2.title', { defaultValue: 'Личный реестр результативности' })}</h1>
            <p className="dv4-tag">
              {t('dashboard.v2.tagline', {
                defaultValue: 'Сводка ключевых показателей за выбранный период оценки. Все цифры — окончательные после закрытия цикла.',
              })}
            </p>
            <div className="dv4-meta-row">
              <div>
                <div className="dv4-meta-k">{t('dashboard.v2.metaPeriod', { defaultValue: 'Период' })}</div>
                <div className="dv4-meta-v">{periodLabel}</div>
              </div>
              <div>
                <div className="dv4-meta-k">{t('dashboard.v2.metaRole', { defaultValue: 'Роль' })}</div>
                <div className="dv4-meta-v">{roleLabel}</div>
              </div>
              <div>
                <div className="dv4-meta-k">{t('dashboard.v2.metaAccount', { defaultValue: 'Учётная запись' })}</div>
                <div className="dv4-meta-v" style={{ fontSize: 13, fontFamily: 'var(--dv4-mono)', letterSpacing: '0.04em' }}>
                  {email ?? '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="dv4-mast-right">
            <div className="dv4-eyebrow" style={{ color: 'var(--dv4-gold)' }}>
              <span>R.01</span>
              <em style={{ color: 'var(--dv4-ink-soft)' }}>{t('dashboard.cardSelfRating')}</em>
            </div>

            {ratingState === 'scored' && (
              <>
                <div className="dv4-score-row">
                  <div className={`dv4-score-n${zone === 'warn' ? ' is-warn' : zone === 'down' ? ' is-down' : ''}`}>
                    {scoreDisplay}
                  </div>
                  <div className="dv4-score-unit">/ 100</div>
                  <div className={`dv4-score-zone${zone === 'warn' ? ' is-warn' : zone === 'down' ? ' is-down' : ''}`}>
                    {t(
                      zone === 'up' ? 'dashboard.zoneUp'
                        : zone === 'warn' ? 'dashboard.zoneNorm'
                          : 'dashboard.zoneDown',
                    )}
                  </div>
                </div>

                <div className="dv4-gauge" aria-label={t('dashboard.ratingAria', { score: scoreDisplay })}>
                  <div className="dv4-gauge-bar" />
                  <div className="dv4-gauge-fill" style={{ width: `${scorePct * 100}%` }} />
                  <div className="dv4-gauge-tick" style={{ left: `${RATING_ZONES.warn}%` }} />
                  <div className="dv4-gauge-tick" style={{ left: `${RATING_ZONES.up}%` }} />
                  <div className="dv4-gauge-marker" style={{ left: `${scorePct * 100}%` }} />
                </div>
                <div className="dv4-gauge-axis">
                  <span>0</span>
                  <span>{RATING_ZONES.warn}</span>
                  <span>{RATING_ZONES.up}</span>
                  <span>100</span>
                </div>

                {delta !== null && !isAllPeriods && (
                  <div className={`dv4-delta${delta < 0 ? ' is-down' : delta === 0 ? ' is-flat' : ''}`}>
                    {delta > 0 ? '▲' : delta < 0 ? '▼' : '■'}
                    <strong>{delta > 0 ? `+${delta}` : delta}</strong>
                    <span>{t('dashboard.vsPrev')}</span>
                  </div>
                )}
              </>
            )}

            {ratingState === 'pending' && myPeriodEval && (
              <div className="dv4-pending">
                <div className="dv4-pending-lead">{t('dashboard.ratingPending')}</div>
                {myPeriodEval.evaluatorName && (
                  <div className="dv4-pending-eval">{myPeriodEval.evaluatorName}</div>
                )}
                <span className={`dv4-pending-pill${myPeriodEval.status === 'SUBMITTED' ? ' is-submitted' : ''}`}>
                  {t(myPeriodEval.status === 'SUBMITTED'
                    ? 'evaluations.statusSubmitted'
                    : 'evaluations.statusDraft')}
                </span>
              </div>
            )}

            {ratingState === 'none' && (
              <div className="dv4-score-row">
                <div className="dv4-score-n is-empty">··</div>
                <div className="dv4-score-unit">{t('dashboard.ratingNone')}</div>
              </div>
            )}

            {loading && ratingState === 'scored' && <div className="dv4-skel dv4-score-unit">{t('common.loading', { defaultValue: 'Загрузка…' })}</div>}
          </div>
        </header>

        {/* ── KPI STRIP ── */}
        <section className="dv4-strip" aria-label={t('dashboard.v2.strip', { defaultValue: 'Ключевые показатели' })}>
          <Tile
            code="P.01"
            label={t('dashboard.cardEvalCycle')}
            value={cycleDone}
            unit={`/ ${loading ? '··' : cycleTotal}`}
            sub={t('dashboard.evaluationsComplete')}
            pct={cyclePct}
          />
          <Tile
            code="A.01"
            label={t('dashboard.cardAppeals')}
            value={appealsPending}
            unit={`/ ${loading ? '··' : appealsTotal}`}
            sub={t('dashboard.pendingAppeals')}
            pct={appealsPct}
            tone={appealsPending > 0 ? 'warn' : undefined}
          />
          <Tile
            code="D.01"
            label={t('dashboard.cardDelegations')}
            value={delegActive}
            unit={`/ ${loading ? '··' : delegTotal}`}
            sub={t('dashboard.activeDelegations')}
            pct={delegPct}
          />
        </section>

        {/* ── LEDGER ── */}
        <section className="dv4-ledger">
          <div className="dv4-panel">
            <div className="dv4-panel-head">
              <div>
                <div className="dv4-panel-eyebrow">P.02 · Recent</div>
                <div className="dv4-panel-title">
                  {t('dashboard.v2.recentEvals', { defaultValue: 'Последние оценки' })}
                </div>
              </div>
              <div className="dv4-panel-count">
                {scopedEvals.length} {t('dashboard.total')}
              </div>
            </div>
            {recentEvals.length === 0 ? (
              <div className="dv4-empty">{t('dashboard.v2.noEvals', { defaultValue: 'Нет оценок в этом периоде' })}</div>
            ) : (
              <ul className="dv4-rows">
                {recentEvals.map(e => (
                  <li key={e.id} className="dv4-row">
                    <div className="dv4-row-main">
                      <div className="dv4-row-title">{e.evaluateeName}</div>
                      <div className="dv4-row-sub">
                        {fmtDate(e.submittedAt ?? e.createdAt, i18n.language)} · {e.periodType}
                        {e.finalScore !== null && ` · ${Math.round(e.finalScore)}/100`}
                      </div>
                    </div>
                    <span className={`dv4-row-tag${e.status === 'CLOSED' ? ' is-ok' : e.status === 'DRAFT' ? ' is-warn' : e.status === 'APPEALED' ? ' is-bad' : ''}`}>
                      {t(`evaluations.status${e.status.charAt(0) + e.status.slice(1).toLowerCase()}`, { defaultValue: e.status })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dv4-panel">
            <div className="dv4-panel-head">
              <div>
                <div className="dv4-panel-eyebrow">A.02 · Recent</div>
                <div className="dv4-panel-title">
                  {t('dashboard.v2.recentAppeals', { defaultValue: 'Мои апелляции' })}
                </div>
              </div>
              <div className="dv4-panel-count">
                {scopedAppeals.length} {t('dashboard.total')}
              </div>
            </div>
            {recentAppeals.length === 0 ? (
              <div className="dv4-empty">{t('dashboard.v2.noAppeals', { defaultValue: 'Нет апелляций' })}</div>
            ) : (
              <ul className="dv4-rows">
                {recentAppeals.map(a => (
                  <li key={a.id} className="dv4-row">
                    <div className="dv4-row-main">
                      <div className="dv4-row-title">{a.reason || `#${a.id}`}</div>
                      <div className="dv4-row-sub">
                        {fmtDate(a.createdAt, i18n.language)}
                        {a.deadline && ` · ${t('appeals.deadline', { defaultValue: 'до' })} ${fmtDate(a.deadline, i18n.language)}`}
                      </div>
                    </div>
                    <span className={`dv4-row-tag${a.status === 'PENDING' ? ' is-warn' : a.status === 'OVERTURNED' ? ' is-bad' : ' is-ok'}`}>
                      {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── DELEGATIONS STRIP ── */}
        {delegations.length > 0 && (
          <section className="dv4-panel" style={{ marginTop: 18 }}>
            <div className="dv4-panel-head">
              <div>
                <div className="dv4-panel-eyebrow">D.02 · Active</div>
                <div className="dv4-panel-title">
                  {t('dashboard.v2.delegationsList', { defaultValue: 'Текущие делегирования' })}
                </div>
              </div>
              <div className="dv4-panel-count">
                {delegActive} / {delegTotal} {t('dashboard.total')}
              </div>
            </div>
            {activeDelegations.length === 0 ? (
              <div className="dv4-empty">{t('dashboard.v2.noActiveDeleg', { defaultValue: 'Нет активных делегирований' })}</div>
            ) : (
              <ul className="dv4-rows">
                {activeDelegations.slice(0, 5).map(d => (
                  <li key={d.id} className="dv4-row">
                    <div className="dv4-row-main">
                      <div className="dv4-row-title">
                        {d.originalEvaluatorName} → {d.delegatedToName}
                      </div>
                      <div className="dv4-row-sub">
                        {fmtDate(d.validFrom, i18n.language)} — {fmtDate(d.validTo, i18n.language)} · {d.evaluateeName}
                      </div>
                    </div>
                    <span className="dv4-row-tag is-ok">ACTIVE</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Tile({
  code, label, value, unit, sub, pct, tone,
}: {
  code: string
  label: string
  value: number
  unit: string
  sub: string
  pct: number
  tone?: 'warn' | 'down'
}) {
  return (
    <div className={`dv4-tile${tone === 'warn' ? ' is-warn' : tone === 'down' ? ' is-down' : ''}`}>
      <div className="dv4-tile-head">
        <div className="dv4-tile-label">{label}</div>
        <div className="dv4-tile-code">{code}</div>
      </div>
      <div className="dv4-tile-figure">
        <div className="dv4-tile-n">{value}</div>
        <div className="dv4-tile-unit">{unit}</div>
      </div>
      <div className="dv4-tile-sub">{sub}</div>
      <div className="dv4-tile-meter" aria-hidden="true">
        <i style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </div>
    </div>
  )
}
