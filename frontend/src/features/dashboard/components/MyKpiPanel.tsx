import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePeriod } from '@/features/periods/PeriodContext'
import { analyticsApi, type PersonalAnalytics, type ScorecardResponse } from '@/features/analytics'
import { RATING_ZONES } from '@/shared/lib/ratingZones'

interface MyKpiPanelProps {
  analytics: PersonalAnalytics | null
}

const TARGET = RATING_ZONES.up

function zoneOf(score: number): 'crit' | 'warn' | 'ok' {
  if (score >= RATING_ZONES.up) return 'ok'
  if (score >= RATING_ZONES.warn) return 'warn'
  return 'crit'
}

function zoneLabelKey(z: 'crit' | 'warn' | 'ok'): string {
  if (z === 'ok') return 'dashboard.myKpiPanel.zone.aboveTarget'
  if (z === 'warn') return 'dashboard.myKpiPanel.zone.nearTarget'
  return 'dashboard.myKpiPanel.zone.belowTarget'
}

export function MyKpiPanel({ analytics }: MyKpiPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { selectedPeriod, isAllPeriods, periodById } = usePeriod()

  const [card, setCard] = useState<ScorecardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const targetPeriodId = useMemo(() => {
    if (!isAllPeriods && typeof selectedPeriod === 'number') return selectedPeriod
    const hist = analytics?.history ?? []
    if (hist.length === 0) return undefined
    return [...hist].sort((a, b) => b.startDate.localeCompare(a.startDate))[0].periodId
  }, [isAllPeriods, selectedPeriod, analytics])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    analyticsApi.scorecard(targetPeriodId)
      .then(r => { if (!cancelled) setCard(r) })
      .catch(() => { if (!cancelled) setCard(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [targetPeriodId])

  const periodScore = isAllPeriods
    ? (analytics?.currentScore ?? null)
    : (analytics?.history.find(h => h.periodId === selectedPeriod)?.score ?? null)

  const score = card?.totalScore ?? periodScore ?? null
  const scoreDisplay = score !== null ? Math.round(score) : null
  const scorePct = score !== null ? Math.min(100, Math.max(0, score)) : 0

  const prevScore = useMemo(() => {
    if (card?.vsPrevPeriod !== null && card?.vsPrevPeriod !== undefined && score !== null) {
      return score - card.vsPrevPeriod
    }
    const hist = analytics?.history ?? []
    if (hist.length < 2) return null
    const sorted = [...hist].sort((a, b) => b.startDate.localeCompare(a.startDate))
    if (isAllPeriods) return sorted[1]?.score ?? null
    const idx = sorted.findIndex(h => h.periodId === selectedPeriod)
    return idx >= 0 ? sorted[idx + 1]?.score ?? null : null
  }, [card, score, analytics, isAllPeriods, selectedPeriod])
  const delta = score !== null && prevScore !== null ? Math.round(score - prevScore) : null

  const zone = score !== null ? zoneOf(score) : 'crit'

  const periodLabel = useMemo(() => {
    if (card?.periodLabel) return card.periodLabel
    if (typeof targetPeriodId === 'number') {
      const p = periodById.get(targetPeriodId)
      if (p) return new Date(p.endDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    }
    return '—'
  }, [card, targetPeriodId, periodById])

  const periodTag = useMemo(() => {
    if (typeof targetPeriodId === 'number') return `K-${String(targetPeriodId).padStart(2, '0')}`
    return 'K-··'
  }, [targetPeriodId])

  const positiveSum = card?.positiveSum ?? null
  const antiBonusSum = card?.antiBonusSum ?? null
  const criteriaCount = card?.criteria.length ?? 0
  const antiBonusCount = card?.antiBonuses.length ?? 0

  const bonusBreakdown = useMemo(() => {
    if (!card) return null
    const base = card.criteria.reduce((s, c) => s + (c.score ?? 0), 0)
    const bonus = (card.positiveSum ?? 0) - base
    return { base, bonus }
  }, [card])

  return (
    <section className="mkp-wrap" style={{ gridColumn: 'span 4' }}>
      <style>{MKP_CSS}</style>
      <article className={`kcard zone-${zone}`}>
        <div className="kc-head">
          <div className="kc-ico"><GaugeIcon /></div>
          <div className="kc-ht">
            <div className="lbl">{t('dashboard.myKpiPanel.title', { defaultValue: 'Мой KPI' })}</div>
            <div className="sub">{periodLabel}</div>
          </div>
          <span className="kc-tag">{periodTag}</span>
        </div>

        <div className="kc-num">
          <b>{loading && scoreDisplay === null ? '··' : (scoreDisplay ?? '—')}</b>
          <span className="of">/ 100</span>
          {delta !== null && (
            <span className={`tr ${delta >= 0 ? 'up' : 'down'}`}>
              {delta >= 0 ? <ArrowUpRightIcon /> : <ArrowDownRightIcon />}
              {delta >= 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>

        <div className="kc-zlab">
          <span className="kc-zpill">
            {zone === 'ok' ? <TrendingUpIcon /> : zone === 'warn' ? <MinusIcon /> : <TrendingDownIcon />}
            {t(zoneLabelKey(zone), { defaultValue: zone === 'ok' ? 'Выше цели' : zone === 'warn' ? 'У цели' : 'Ниже цели' })}
          </span>
          <span className="target">{t('dashboard.myKpiPanel.target', { defaultValue: 'цель' })} {TARGET}</span>
        </div>

        <div className="kc-gauge">
          <div className="kc-track">
            <span className="z-crit" style={{ flexBasis: `${RATING_ZONES.warn}%` }} />
            <span className="z-warn" style={{ flexBasis: `${RATING_ZONES.up - RATING_ZONES.warn}%` }} />
            <span className="z-ok" style={{ flexBasis: `${100 - RATING_ZONES.up}%` }} />
          </div>
          <span className="kc-mark" style={{ left: `${scorePct}%` }} />
          <div className="kc-scale">
            <span>0</span><span>{RATING_ZONES.warn}</span><span>{RATING_ZONES.up}</span><span>100</span>
          </div>
        </div>

        {card && (
          <div className="kc-peek">
            <div className="peek ok">
              <span className="pk-ico"><ListChecksIcon /></span>
              <span className="pk-mid">
                <span className="pk-t">{t('dashboard.myKpiPanel.peek.criteria', { defaultValue: 'Критерии' })}</span>
                <span className="pk-m">
                  {t('dashboard.myKpiPanel.peek.criteriaCount', {
                    defaultValue: '{{n}} критериев · база',
                    n: criteriaCount,
                  })}
                </span>
              </span>
              <span className="pk-score">{bonusBreakdown ? Math.round(bonusBreakdown.base) : '—'}</span>
            </div>
            {antiBonusCount > 0 && antiBonusSum !== null && (
              <div className="peek crit">
                <span className="pk-ico"><AlertTriangleIcon /></span>
                <span className="pk-mid">
                  <span className="pk-t">{t('dashboard.myKpiPanel.peek.antiBonus', { defaultValue: 'Анти-бонусы' })}</span>
                  <span className="pk-m">
                    {t('dashboard.myKpiPanel.peek.antiBonusCount', {
                      defaultValue: '{{n}} нарушений · удержание',
                      n: antiBonusCount,
                    })}
                  </span>
                </span>
                <span className="pk-score">−{Math.round(Math.abs(antiBonusSum))}</span>
              </div>
            )}
            {bonusBreakdown && bonusBreakdown.bonus > 0 && (
              <div className="peek ok">
                <span className="pk-ico"><AwardIcon /></span>
                <span className="pk-mid">
                  <span className="pk-t">{t('dashboard.myKpiPanel.peek.bonus', { defaultValue: 'Бонусы' })}</span>
                  <span className="pk-m">{t('dashboard.myKpiPanel.peek.bonusKind', { defaultValue: 'надбавка' })}</span>
                </span>
                <span className="pk-score">+{Math.round(bonusBreakdown.bonus)}</span>
              </div>
            )}
          </div>
        )}

        <div className="kc-foot">
          <span className="more">
            {card && positiveSum !== null && antiBonusSum !== null
              ? `${Math.round(positiveSum)} − ${Math.round(Math.abs(antiBonusSum))} = ${Math.round(card.totalScore)}`
              : loading
                ? t('dashboard.myKpiPanel.footer.loading', { defaultValue: 'загрузка…' })
                : ''}
          </span>
          <button type="button" className="all" onClick={() => navigate('/my-evaluations')}>
            {t('dashboard.myKpiPanel.detail', { defaultValue: 'Детализация KPI' })}
            <ArrowRightIcon />
          </button>
        </div>
      </article>
    </section>
  )
}

function GaugeIcon() {
  return (
    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  )
}
function TrendingUpIcon() {
  return (
    <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
function TrendingDownIcon() {
  return (
    <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
    </svg>
  )
}
function MinusIcon() {
  return (
    <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  )
}
function ArrowUpRightIcon() {
  return (
    <svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h10v10" /><path d="M7 17 17 7" />
    </svg>
  )
}
function ArrowDownRightIcon() {
  return (
    <svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7l10 10" /><path d="M17 7v10H7" />
    </svg>
  )
}
function ListChecksIcon() {
  return (
    <svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" />
    </svg>
  )
}
function AlertTriangleIcon() {
  return (
    <svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  )
}
function AwardIcon() {
  return (
    <svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  )
}

const MKP_CSS = `
.mkp-wrap {
  --kc-surface: #ffffff;
  --kc-surface-2: #f2f5fa;
  --kc-surface-3: #e6ebf3;
  --kc-ink: #16202e;
  --kc-ink-2: #48566a;
  --kc-ink-3: #8893a6;
  --kc-border: #e1e7f0;
  --kc-border-2: #cfd8e6;
  --kc-accent: #2456a6;
  --kc-crit: #c2392b;
  --kc-crit-soft: #fbe9e6;
  --kc-crit-ink: #8f261b;
  --kc-warn: #b07d16;
  --kc-warn-soft: #fbf2da;
  --kc-warn-ink: #7e5908;
  --kc-ok: #2f8a52;
  --kc-ok-soft: #e6f3ea;
  --kc-ok-ink: #1f6b3d;
  --kc-shadow-sm: 0 1px 2px rgba(14,23,38,.06), 0 1px 3px rgba(14,23,38,.05);
  --kc-shadow-md: 0 2px 6px rgba(14,23,38,.07), 0 8px 24px rgba(14,23,38,.06);
}
[data-theme="dark"] .mkp-wrap {
  --kc-surface: #1a2433;
  --kc-surface-2: #20293a;
  --kc-surface-3: #2a3447;
  --kc-ink: #e6ecf5;
  --kc-ink-2: #aab6c8;
  --kc-ink-3: #7c8699;
  --kc-border: #2d3a51;
  --kc-border-2: #3a4660;
  --kc-crit-soft: rgba(194,57,43,0.18);
  --kc-warn-soft: rgba(176,125,22,0.18);
  --kc-ok-soft: rgba(47,138,82,0.20);
}
.mkp-wrap .kcard {
  width: 100%;
  background: var(--kc-surface);
  border: 1px solid var(--kc-border);
  border-top: 3px solid var(--kc-ok);
  border-radius: 4px;
  box-shadow: var(--kc-shadow-sm);
  display: flex; flex-direction: column;
  transition: box-shadow .14s, transform .14s, border-color .14s;
  font-family: var(--font-sans, 'Fira Sans', system-ui, sans-serif);
  color: var(--kc-ink);
}
.mkp-wrap .kcard.zone-warn { border-top-color: var(--kc-warn); }
.mkp-wrap .kcard.zone-crit { border-top-color: var(--kc-crit); }
.mkp-wrap .kcard:hover { box-shadow: var(--kc-shadow-md); transform: translateY(-1px); }
.mkp-wrap .ic { display: inline-block; vertical-align: middle; }

.mkp-wrap .kc-head { display: flex; align-items: center; gap: 11px; padding: 16px 18px 0; }
.mkp-wrap .kc-ico {
  width: 34px; height: 34px; border-radius: 9px;
  background: var(--kc-ok-soft); color: var(--kc-ok);
  display: grid; place-items: center; flex: none;
}
.mkp-wrap .kcard.zone-warn .kc-ico { background: var(--kc-warn-soft); color: var(--kc-warn); }
.mkp-wrap .kcard.zone-crit .kc-ico { background: var(--kc-crit-soft); color: var(--kc-crit); }
.mkp-wrap .kc-ht { min-width: 0; flex: 1; }
.mkp-wrap .kc-ht .lbl { font-size: 13px; font-weight: 600; line-height: 1.2; }
.mkp-wrap .kc-ht .sub {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase;
  color: var(--kc-ink-3); margin-top: 2px;
}
.mkp-wrap .kc-tag {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10px; font-weight: 600; letter-spacing: .04em;
  color: var(--kc-ink-3);
  border: 1px solid var(--kc-border-2);
  border-radius: 5px; padding: 2px 6px;
}

.mkp-wrap .kc-num { display: flex; align-items: flex-end; gap: 8px; padding: 14px 18px 4px; }
.mkp-wrap .kc-num b {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 46px; font-weight: 600; line-height: .86; letter-spacing: -.02em;
}
.mkp-wrap .kc-num .of {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 15px; color: var(--kc-ink-3); margin-bottom: 6px;
}
.mkp-wrap .kc-num .tr {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 11.5px; font-weight: 600;
  margin-bottom: 8px; margin-left: auto;
}
.mkp-wrap .kc-num .tr.up { color: var(--kc-ok-ink); }
.mkp-wrap .kc-num .tr.down { color: var(--kc-crit-ink); }

.mkp-wrap .kc-zlab { display: flex; align-items: center; gap: 7px; padding: 0 18px 12px; }
.mkp-wrap .kc-zpill {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10.5px; font-weight: 600;
  letter-spacing: .04em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 5px;
  background: var(--kc-ok-soft); color: var(--kc-ok-ink);
}
.mkp-wrap .kcard.zone-warn .kc-zpill { background: var(--kc-warn-soft); color: var(--kc-warn-ink); }
.mkp-wrap .kcard.zone-crit .kc-zpill { background: var(--kc-crit-soft); color: var(--kc-crit-ink); }
.mkp-wrap .kc-zlab .target {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 11px; color: var(--kc-ink-3); margin-left: auto;
}

.mkp-wrap .kc-gauge { position: relative; margin: 0 18px; }
.mkp-wrap .kc-track {
  display: flex; height: 9px; border-radius: 5px; overflow: hidden;
  gap: 2px; background: var(--kc-surface-3);
}
.mkp-wrap .kc-track span { display: block; }
.mkp-wrap .kc-track .z-crit { background: var(--kc-crit); }
.mkp-wrap .kc-track .z-warn { background: var(--kc-warn); }
.mkp-wrap .kc-track .z-ok { background: var(--kc-ok); }
.mkp-wrap .kc-mark {
  position: absolute; top: -4px; width: 3px; height: 17px; border-radius: 2px;
  background: var(--kc-ink); box-shadow: 0 0 0 2px var(--kc-surface);
  transform: translateX(-50%); transition: left .7s cubic-bezier(.4,0,.2,1);
}
.mkp-wrap .kc-scale {
  display: flex; justify-content: space-between;
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 9.5px; color: var(--kc-ink-3);
  margin-top: 6px; letter-spacing: .03em;
}

.mkp-wrap .kc-peek { margin: 14px 0 0; border-top: 1px solid var(--kc-border); }
.mkp-wrap .peek {
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 11px; align-items: center;
  padding: 11px 18px; border-bottom: 1px solid var(--kc-border);
  transition: background .12s; position: relative;
}
.mkp-wrap .peek::before {
  content: ""; position: absolute; left: 0; top: 9px; bottom: 9px;
  width: 3px; border-radius: 0 3px 3px 0; background: var(--kc-ink-3);
}
.mkp-wrap .peek.ok::before { background: var(--kc-ok); }
.mkp-wrap .peek.warn::before { background: var(--kc-warn); }
.mkp-wrap .peek.crit::before { background: var(--kc-crit); }
.mkp-wrap .peek .pk-ico {
  width: 28px; height: 28px; border-radius: 7px;
  display: grid; place-items: center; background: var(--kc-surface-3);
  flex: none; color: var(--kc-ink-2);
}
.mkp-wrap .peek.ok .pk-ico { background: var(--kc-ok-soft); color: var(--kc-ok); }
.mkp-wrap .peek.warn .pk-ico { background: var(--kc-warn-soft); color: var(--kc-warn); }
.mkp-wrap .peek.crit .pk-ico { background: var(--kc-crit-soft); color: var(--kc-crit); }
.mkp-wrap .peek .pk-mid { min-width: 0; display: flex; flex-direction: column; }
.mkp-wrap .peek .pk-t {
  font-size: 13px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mkp-wrap .peek .pk-m {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10.5px; letter-spacing: .03em; color: var(--kc-ink-3);
  text-transform: uppercase; margin-top: 1px;
}
.mkp-wrap .peek .pk-score {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 14px; font-weight: 600; padding: 2px 9px;
  border-radius: 6px; white-space: nowrap;
  background: var(--kc-surface-3); color: var(--kc-ink-2);
}
.mkp-wrap .peek.ok .pk-score { background: var(--kc-ok-soft); color: var(--kc-ok-ink); }
.mkp-wrap .peek.warn .pk-score { background: var(--kc-warn-soft); color: var(--kc-warn-ink); }
.mkp-wrap .peek.crit .pk-score { background: var(--kc-crit-soft); color: var(--kc-crit-ink); }

.mkp-wrap .kc-foot { display: flex; align-items: center; gap: 9px; padding: 13px 18px; }
.mkp-wrap .kc-foot .more {
  font-size: 12px; color: var(--kc-ink-3);
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
}
.mkp-wrap .kc-foot .all {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 600;
  color: var(--kc-accent);
  background: none; border: none; cursor: pointer;
  font-family: inherit; padding: 4px 0;
}
.mkp-wrap .kc-foot .all .ic { transition: transform .14s; }
.mkp-wrap .kc-foot .all:hover .ic { transform: translateX(2px); }
`
