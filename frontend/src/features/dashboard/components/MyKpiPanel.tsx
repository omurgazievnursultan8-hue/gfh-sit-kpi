import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePeriod } from '@/features/periods/PeriodContext'
import { analyticsApi, type PersonalAnalytics, type ScorecardResponse } from '@/features/analytics'
import { RATING_ZONES } from '@/shared/lib/ratingZones'
import { PanelShell } from './PanelShell'

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

  const rows: Array<{ key: string; tone: 'ok' | 'crit'; icon: JSX.Element; title: string; meta: string; right: string }> = []
  rows.push({
    key: 'criteria',
    tone: 'ok',
    icon: <ListChecksIcon />,
    title: t('dashboard.myKpiPanel.peek.criteria', { defaultValue: 'Критерии' }),
    meta: t('dashboard.myKpiPanel.peek.criteriaCount', {
      defaultValue: '{{n}} критериев · база',
      n: criteriaCount,
    }),
    right: bonusBreakdown ? String(Math.round(bonusBreakdown.base)) : '—',
  })
  if (antiBonusCount > 0 && antiBonusSum !== null) {
    rows.push({
      key: 'anti',
      tone: 'crit',
      icon: <AlertTriangleIcon />,
      title: t('dashboard.myKpiPanel.peek.antiBonus', { defaultValue: 'Анти-бонусы' }),
      meta: t('dashboard.myKpiPanel.peek.antiBonusCount', {
        defaultValue: '{{n}} нарушений · удержание',
        n: antiBonusCount,
      }),
      right: `−${Math.round(Math.abs(antiBonusSum))}`,
    })
  }
  if (bonusBreakdown && bonusBreakdown.bonus > 0) {
    rows.push({
      key: 'bonus',
      tone: 'ok',
      icon: <AwardIcon />,
      title: t('dashboard.myKpiPanel.peek.bonus', { defaultValue: 'Бонусы' }),
      meta: t('dashboard.myKpiPanel.peek.bonusKind', { defaultValue: 'надбавка' }),
      right: `+${Math.round(bonusBreakdown.bonus)}`,
    })
  }

  const peekRows = rows.slice(0, 3)
  const emptySlots = Math.max(0, 3 - peekRows.length)

  return (
    <PanelShell
      tone={zone}
      head={{
        icon: <GaugeIcon />,
        title: t('dashboard.myKpiPanel.title', { defaultValue: 'Мой KPI' }),
        sub: periodLabel,
        tag: periodTag,
      }}
      stat={{
        value: loading && scoreDisplay === null ? '··' : (scoreDisplay ?? '—'),
        unit: <>/ 100</>,
        trail: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className={`mkp-zpill mkp-${zone}`}>
              {zone === 'ok' ? <TrendingUpIcon /> : zone === 'warn' ? <MinusIcon /> : <TrendingDownIcon />}
              {t(zoneLabelKey(zone), {
                defaultValue: zone === 'ok' ? 'Выше цели' : zone === 'warn' ? 'У цели' : 'Ниже цели',
              })}
            </span>
            {delta !== null && (
              <span className={`mkp-delta ${delta >= 0 ? 'up' : 'down'}`}>
                {delta >= 0 ? <ArrowUpRightIcon /> : <ArrowDownRightIcon />}
                {delta >= 0 ? `+${delta}` : delta}
              </span>
            )}
          </span>
        ),
      }}
      viz={
        <div className="mkp-gauge">
          <style>{MKP_LOCAL_CSS}</style>
          <div className="mkp-track">
            <span className="z-crit" style={{ flexBasis: `${RATING_ZONES.warn}%` }} />
            <span className="z-warn" style={{ flexBasis: `${RATING_ZONES.up - RATING_ZONES.warn}%` }} />
            <span className="z-ok" style={{ flexBasis: `${100 - RATING_ZONES.up}%` }} />
          </div>
          <span className="mkp-mark" style={{ left: `${scorePct}%` }} />
          <div className="mkp-scale">
            <span>0</span><span>{RATING_ZONES.warn}</span><span>{RATING_ZONES.up}</span><span>100</span>
          </div>
          <div className="mkp-target">{t('dashboard.myKpiPanel.target', { defaultValue: 'цель' })} {TARGET}</div>
        </div>
      }
      peek={
        <>
          {peekRows.map(r => (
            <div key={r.key} className={`peek ${r.tone}`}>
              <span className="pk-ico">{r.icon}</span>
              <span className="pk-mid">
                <span className="pk-t">{r.title}</span>
                <span className="pk-m">{r.meta}</span>
              </span>
              <span className="pk-right">{r.right}</span>
            </div>
          ))}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`e${i}`} className="peek empty" aria-hidden="true">
              <span className="pk-ico" style={{ visibility: 'hidden' }} />
              <span className="pk-mid" />
              <span className="pk-right" style={{ visibility: 'hidden' }} />
            </div>
          ))}
        </>
      }
      foot={{
        more: card && positiveSum !== null && antiBonusSum !== null
          ? `${Math.round(positiveSum)} − ${Math.round(Math.abs(antiBonusSum))} = ${Math.round(card.totalScore)}`
          : loading
            ? t('dashboard.myKpiPanel.footer.loading', { defaultValue: 'загрузка…' })
            : '',
        cta: {
          label: t('dashboard.myKpiPanel.detail', { defaultValue: 'Детализация KPI' }),
          onClick: () => navigate('/my-evaluations'),
          icon: <ArrowRightIcon />,
        },
      }}
    />
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

const MKP_LOCAL_CSS = `
.mkp-gauge { position: relative; padding-top: 6px; }
.mkp-track {
  display: flex; height: 9px; border-radius: 5px; overflow: hidden;
  gap: 2px; background: var(--ps-surface-3);
}
.mkp-track span { display: block; }
.mkp-track .z-crit { background: var(--ps-crit); }
.mkp-track .z-warn { background: var(--ps-warn); }
.mkp-track .z-ok { background: var(--ps-ok); }
.mkp-mark {
  position: absolute; top: 2px; width: 3px; height: 17px; border-radius: 2px;
  background: var(--ps-ink); box-shadow: 0 0 0 2px var(--ps-surface);
  transform: translateX(-50%); transition: left .7s cubic-bezier(.4,0,.2,1);
}
.mkp-scale {
  display: flex; justify-content: space-between;
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 9.5px; color: var(--ps-ink-3);
  margin-top: 6px; letter-spacing: .03em;
}
.mkp-target {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10.5px; color: var(--ps-ink-3);
  margin-top: 4px; text-align: right;
}
.mkp-zpill {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10px; font-weight: 600;
  letter-spacing: .04em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 5px;
}
.mkp-zpill.mkp-ok { background: var(--ps-ok-soft); color: var(--ps-ok-ink); }
.mkp-zpill.mkp-warn { background: var(--ps-warn-soft); color: var(--ps-warn-ink); }
.mkp-zpill.mkp-crit { background: var(--ps-crit-soft); color: var(--ps-crit-ink); }
.mkp-delta { display: inline-flex; align-items: center; gap: 3px; }
.mkp-delta.up { color: var(--ps-ok-ink); }
.mkp-delta.down { color: var(--ps-crit-ink); }
`
