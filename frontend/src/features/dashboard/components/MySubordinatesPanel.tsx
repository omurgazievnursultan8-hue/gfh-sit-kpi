import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePeriod } from '@/features/periods/PeriodContext'
import { analyticsApi, type TeamResponse, type TeamMemberDto } from '@/features/analytics'
import { PanelShell, type PanelTone } from './PanelShell'

const STATUS_TONE: Record<TeamMemberDto['status'], 'crit' | 'warn' | 'ok'> = {
  appeal: 'crit',
  low: 'crit',
  unevaluated: 'warn',
  best: 'ok',
}

function trendIcon(delta: number | null): JSX.Element {
  if (delta === null || delta === 0) return <MinusIcon />
  return delta > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />
}

export function MySubordinatesPanel() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lng = i18n.language
  const { selectedPeriod, isAllPeriods, periodById } = usePeriod()

  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    analyticsApi.team()
      .then(r => { if (!cancelled) setTeam(r) })
      .catch(() => { if (!cancelled) setTeam(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const total = team?.totalCount ?? 0
  const evaluated = team?.evaluatedCount ?? 0
  const left = Math.max(0, total - evaluated)
  const avg = team?.teamAvg !== null && team?.teamAvg !== undefined ? Math.round(team.teamAvg) : null
  const progressPct = total > 0 ? Math.round((evaluated / total) * 100) : 0

  const ok = team?.zoneOk ?? 0
  const warn = team?.zoneWarn ?? 0
  const crit = team?.zoneCrit ?? 0
  const okPct = evaluated > 0 ? (ok / evaluated) * 100 : 0
  const warnPct = evaluated > 0 ? (warn / evaluated) * 100 : 0
  const critPct = evaluated > 0 ? (crit / evaluated) * 100 : 0

  const peekRows = useMemo<TeamMemberDto[]>(() => {
    if (!team) return []
    const seen = new Set<number>()
    const rows: TeamMemberDto[] = []
    for (const m of team.attention) {
      if (seen.has(m.userId)) continue
      seen.add(m.userId)
      rows.push(m)
      if (rows.length === 3) break
    }
    if (rows.length < 3 && team.bestPerformer && !seen.has(team.bestPerformer.userId)) {
      rows.push(team.bestPerformer)
    }
    return rows
  }, [team])

  const emptySlots = Math.max(0, 3 - peekRows.length)
  const remaining = Math.max(0, total - peekRows.length)

  const tone: PanelTone = useMemo(() => {
    if (crit > 0 || team?.attention.some(a => a.status === 'appeal' || a.status === 'low')) return 'crit'
    if (warn > 0 || team?.attention.some(a => a.status === 'unevaluated')) return 'warn'
    if (evaluated > 0 && evaluated === total && ok === evaluated) return 'ok'
    return 'accent'
  }, [crit, warn, ok, evaluated, total, team])

  const periodLabel = useMemo(() => {
    if (isAllPeriods) return t('dashboard.allPeriods', { defaultValue: 'Все периоды' })
    if (typeof selectedPeriod === 'number') {
      const p = periodById.get(selectedPeriod)
      if (p) {
        const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
        return new Date(p.endDate).toLocaleDateString(loc, { month: 'long', year: 'numeric' })
      }
    }
    return t('dashboard.mySubordinatesPanel.subhead', { defaultValue: 'Цикл оценки' })
  }, [isAllPeriods, selectedPeriod, periodById, lng, t])

  const tag = `U-${String(total).padStart(2, '0')}`

  return (
    <PanelShell
      tone={tone}
      head={{
        icon: <UsersIcon />,
        title: t('dashboard.mySubordinatesPanel.title', { defaultValue: 'Мои подчинённые' }),
        sub: periodLabel,
        tag,
      }}
      stat={{
        value: loading ? '·' : total,
        unit: t('dashboard.mySubordinatesPanel.stat', { defaultValue: 'в подчинении' }),
        trail: total > 0 ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ps-ink-3)' }}>
            {evaluated}/{total}
          </span>
        ) : undefined,
      }}
      viz={
        <div className="msp-viz">
          <style>{MSP_LOCAL_CSS}</style>
          {total > 0 ? (
            <>
              <div className="msp-prog">
                <div className="msp-bar">
                  <i style={{ width: `${progressPct}%` }} />
                </div>
                <span className="msp-frac">{evaluated} / {total}</span>
              </div>
              <div className="msp-zone">
                {evaluated > 0 ? (
                  <>
                    {okPct > 0 && <span className="z-ok" style={{ flexBasis: `${okPct}%` }} />}
                    {warnPct > 0 && <span className="z-warn" style={{ flexBasis: `${warnPct}%` }} />}
                    {critPct > 0 && <span className="z-crit" style={{ flexBasis: `${critPct}%` }} />}
                  </>
                ) : (
                  <span className="z-empty" style={{ flexBasis: '100%' }} />
                )}
              </div>
              <div className="msp-legend">
                <span className="lg ok">{t('dashboard.mySubordinatesPanel.legend.ok', { defaultValue: 'Выше цели' })} <b>{ok}</b></span>
                <span className="lg warn">{t('dashboard.mySubordinatesPanel.legend.warn', { defaultValue: 'В норме' })} <b>{warn}</b></span>
                <span className="lg crit">{t('dashboard.mySubordinatesPanel.legend.crit', { defaultValue: 'Ниже цели' })} <b>{crit}</b></span>
              </div>
            </>
          ) : (
            <div className="msp-empty">{loading
              ? t('dashboard.mySubordinatesPanel.loading', { defaultValue: 'загрузка…' })
              : t('dashboard.mySubordinatesPanel.empty', { defaultValue: 'Нет подчинённых' })}</div>
          )}
        </div>
      }
      peek={
        <>
          {peekRows.map(m => {
            const rowTone = STATUS_TONE[m.status]
            return (
              <div
                key={m.userId}
                className={`peek ${rowTone}`}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/users/${m.userId}`)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/users/${m.userId}`)
                  }
                }}
              >
                <span className="pk-ico msp-av">{m.initials}</span>
                <span className="pk-mid">
                  <span className="pk-t">{m.fullName}</span>
                  <span className="pk-m">{m.position || t(`dashboard.mySubordinatesPanel.reason.${m.status}`, { defaultValue: m.reasonLabel })}</span>
                </span>
                <span className="pk-right">
                  {trendIcon(m.scoreDelta)}
                  {m.latestScore !== null ? Math.round(m.latestScore) : '—'}
                </span>
              </div>
            )
          })}
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
        more: loading
          ? t('dashboard.mySubordinatesPanel.loading', { defaultValue: 'загрузка…' })
          : total === 0
            ? ''
            : remaining > 0
              ? t('dashboard.mySubordinatesPanel.more', { defaultValue: 'ещё {{n}} сотрудников', n: remaining })
              : avg !== null
                ? t('dashboard.mySubordinatesPanel.progress', {
                    defaultValue: 'Оценено {{done}} · осталось {{left}} · средний балл {{avg}}',
                    done: evaluated, left, avg,
                  })
                : t('dashboard.mySubordinatesPanel.progressNoAvg', {
                    defaultValue: 'Оценено {{done}} · осталось {{left}}',
                    done: evaluated, left,
                  }),
        cta: {
          label: t('dashboard.mySubordinatesPanel.all', { defaultValue: 'Все подчинённые' }),
          onClick: () => navigate('/manager-dashboard'),
          icon: <ArrowRightIcon />,
        },
      }}
    />
  )
}

function UsersIcon() {
  return (
    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
function ArrowRightIcon() {
  return (
    <svg className="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  )
}

const MSP_LOCAL_CSS = `
.msp-viz { display: flex; flex-direction: column; gap: 10px; padding-top: 2px; }
.msp-prog { display: flex; align-items: center; gap: 9px; }
.msp-bar {
  flex: 1; height: 7px; border-radius: 5px;
  background: var(--ps-surface-3); overflow: hidden;
}
.msp-bar i {
  display: block; height: 100%; border-radius: 5px;
  background: var(--ps-accent);
  transition: width .7s cubic-bezier(.4,0,.2,1);
}
.msp-frac {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 11px; font-weight: 600; color: var(--ps-ink-2); white-space: nowrap;
}
.msp-zone {
  display: flex; height: 8px; border-radius: 5px; overflow: hidden;
  gap: 2px; background: var(--ps-surface-3);
}
.msp-zone span { display: block; transition: flex-basis .6s; }
.msp-zone .z-ok { background: var(--ps-ok); }
.msp-zone .z-warn { background: var(--ps-warn); }
.msp-zone .z-crit { background: var(--ps-crit); }
.msp-zone .z-empty { background: var(--ps-surface-3); }
.msp-legend {
  display: flex; flex-wrap: wrap; gap: 6px 14px;
  font-size: 11.5px; color: var(--ps-ink-2);
}
.msp-legend .lg { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
.msp-legend .lg b {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  color: var(--ps-ink); font-weight: 600;
}
.msp-legend .lg::before {
  content: ""; width: 8px; height: 8px; border-radius: 3px; flex: none;
}
.msp-legend .lg.ok::before { background: var(--ps-ok); }
.msp-legend .lg.warn::before { background: var(--ps-warn); }
.msp-legend .lg.crit::before { background: var(--ps-crit); }
.msp-empty {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 11px; color: var(--ps-ink-3);
  padding: 8px 0;
}
.psh-wrap .psh-peek .peek .msp-av {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 11px; font-weight: 600; letter-spacing: .02em;
}
`
