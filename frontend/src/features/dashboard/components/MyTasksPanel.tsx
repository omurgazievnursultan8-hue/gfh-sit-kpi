import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePeriod } from '@/features/periods/PeriodContext'
import { myTasksApi, type MyTask, type MyTaskSeverity, type MyTaskType } from '../myTasksApi'

const SEVERITY_RANK: Record<MyTaskSeverity, number> = {
  OVERDUE: 0, DUE_SOON: 1, NORMAL: 2,
}

const SEVERITY_TONE: Record<MyTaskSeverity, 'crit' | 'warn' | 'info'> = {
  OVERDUE: 'crit',
  DUE_SOON: 'warn',
  NORMAL: 'info',
}

const GROUP_LINK: Record<MyTaskType, string> = {
  PENDING_EVALUATION: '/my-tasks',
  PENDING_SELF_EVAL: '/my-evaluations',
  RESPOND_APPEAL: '/my-tasks',
  ADMIN_OPEN_APPEAL: '/admin/appeals',
  ADMIN_DRAFT_PERIOD: '/admin/periods',
}

const TYPE_ICON: Record<MyTaskType, JSX.Element> = {
  PENDING_EVALUATION: <ClipboardCheckIcon />,
  PENDING_SELF_EVAL: <ClipboardCheckIcon />,
  RESPOND_APPEAL: <GavelIcon />,
  ADMIN_OPEN_APPEAL: <GavelIcon />,
  ADMIN_DRAFT_PERIOD: <CalendarIcon />,
}

interface TaskGroup {
  type: MyTaskType
  count: number
  severity: MyTaskSeverity
  earliestDue: string | null
  link: string
}

function fmtDue(iso: string | null, lng: string): string {
  if (!iso) return ''
  const loc = lng === 'kg' ? 'ky-KG' : 'ru-RU'
  return new Date(iso).toLocaleDateString(loc, { day: '2-digit', month: 'short' })
}

function groupTasks(tasks: MyTask[]): TaskGroup[] {
  const map = new Map<MyTaskType, TaskGroup>()
  for (const t of tasks) {
    const existing = map.get(t.type)
    if (!existing) {
      map.set(t.type, {
        type: t.type,
        count: 1,
        severity: t.severity,
        earliestDue: t.dueAt,
        link: t.entityId !== null ? t.link : (GROUP_LINK[t.type] ?? t.link),
      })
      continue
    }
    existing.count += 1
    if (SEVERITY_RANK[t.severity] < SEVERITY_RANK[existing.severity]) {
      existing.severity = t.severity
    }
    if (t.dueAt && (!existing.earliestDue || t.dueAt < existing.earliestDue)) {
      existing.earliestDue = t.dueAt
    }
  }
  for (const g of map.values()) {
    if (g.count === 1) {
      const t = tasks.find(x => x.type === g.type)
      if (t) g.link = t.link
    } else {
      g.link = GROUP_LINK[g.type] ?? g.link
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (s !== 0) return s
    if (!a.earliestDue) return 1
    if (!b.earliestDue) return -1
    return a.earliestDue.localeCompare(b.earliestDue)
  })
}

export function MyTasksPanel() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const lng = i18n.language

  const { selectedPeriod, isAllPeriods } = usePeriod()
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    myTasksApi.list()
      .then(data => { if (!cancelled) setTasks(data) })
      .catch(() => { if (!cancelled) setTasks([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const scoped = useMemo(() =>
    isAllPeriods
      ? tasks
      : tasks.filter(t => t.periodId === null || t.periodId === selectedPeriod),
    [tasks, isAllPeriods, selectedPeriod])

  const groups = useMemo(() => groupTasks(scoped), [scoped])

  const total = scoped.length
  const critCount = scoped.filter(s => s.severity === 'OVERDUE').length
  const warnCount = scoped.filter(s => s.severity === 'DUE_SOON').length
  const infoCount = scoped.filter(s => s.severity === 'NORMAL').length

  const critPct = total > 0 ? (critCount / total) * 100 : 0
  const warnPct = total > 0 ? (warnCount / total) * 100 : 0
  const infoPct = total > 0 ? (infoCount / total) * 100 : 0

  const peek = groups.slice(0, 3)
  const remaining = Math.max(0, groups.length - peek.length)

  function dueText(g: TaskGroup): { text: string; icon: JSX.Element } {
    if (g.severity === 'OVERDUE') {
      return { text: t('dashboard.myTasksPanel.overdue'), icon: <AlertTriangleIcon /> }
    }
    if (g.severity === 'DUE_SOON') {
      return { text: t('dashboard.myTasksPanel.today', { defaultValue: 'сегодня' }), icon: <ClockIcon /> }
    }
    return { text: fmtDue(g.earliestDue, lng), icon: <CalendarIcon /> }
  }

  return (
    <section className="mtp-wrap" style={{ gridColumn: 'span 4' }}>
      <style>{MTP_CSS}</style>
      <article className="tcard">
        <div className="tc-head">
          <div className="tc-ico"><ListChecksIcon /></div>
          <div className="tc-ht">
            <div className="lbl">{t('dashboard.myTasksPanel.title')}</div>
            <div className="sub">{t('dashboard.myTasksPanel.subhead', { defaultValue: 'Открытые задачи' })}</div>
          </div>
          <span className="tc-tag">T-{String(total).padStart(2, '0')}</span>
        </div>

        <div className="tc-num">
          <b>{loading ? '·' : total}</b>
          <span className="of">{t('dashboard.myTasksPanel.open', { defaultValue: 'открытых' })}</span>
        </div>

        <div className="tc-bar" aria-hidden={total === 0}>
          {total > 0 ? (
            <>
              {critPct > 0 && <span className="b-crit" style={{ flexBasis: `${critPct}%` }} />}
              {warnPct > 0 && <span className="b-warn" style={{ flexBasis: `${warnPct}%` }} />}
              {infoPct > 0 && <span className="b-info" style={{ flexBasis: `${infoPct}%` }} />}
            </>
          ) : (
            <span className="b-empty" style={{ flexBasis: '100%' }} />
          )}
        </div>
        <div className="tc-legend">
          <span className="lg crit">{t('dashboard.myTasksPanel.legend.overdue', { defaultValue: 'Просрочено' })} <b>{critCount}</b></span>
          <span className="lg warn">{t('dashboard.myTasksPanel.legend.dueSoon', { defaultValue: 'Скоро' })} <b>{warnCount}</b></span>
          <span className="lg info">{t('dashboard.myTasksPanel.legend.scheduled', { defaultValue: 'Запланировано' })} <b>{infoCount}</b></span>
        </div>

        {peek.length > 0 && (
          <div className="tc-peek">
            {peek.map(g => {
              const tone = SEVERITY_TONE[g.severity]
              const d = dueText(g)
              return (
                <div
                  key={g.type}
                  className={`peek ${tone}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(g.link)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(g.link)
                    }
                  }}
                >
                  <span className="pk-ico">{TYPE_ICON[g.type]}</span>
                  <span className="pk-mid">
                    <span className="pk-t">
                      {g.count > 1
                        ? `${t(`dashboard.myTasksPanel.type.${g.type}`)} · ${g.count}`
                        : t(`dashboard.myTasksPanel.type.${g.type}`)}
                    </span>
                    <span className="pk-m">{t(`dashboard.myTasksPanel.kind.${g.type}`, { defaultValue: '' })}</span>
                  </span>
                  <span className="pk-due">{d.icon}{d.text}</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="tc-foot">
          <span className="more">
            {loading
              ? t('dashboard.myTasksPanel.footer.loading', { defaultValue: 'загрузка…' })
              : total === 0
                ? t('dashboard.myTasksPanel.empty')
                : remaining > 0
                  ? t('dashboard.myTasksPanel.footer.more', { defaultValue: 'ещё {{n}}', n: remaining })
                  : ''}
          </span>
          <button type="button" className="all" onClick={() => navigate('/my-tasks')}>
            {t('dashboard.myTasksPanel.allTasks', { defaultValue: 'Все задачи' })}
            <ArrowRightIcon />
          </button>
        </div>
      </article>
    </section>
  )
}

function ListChecksIcon() {
  return (
    <svg className="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" /><path d="M13 6h8" /><path d="M13 12h8" /><path d="M13 18h8" />
    </svg>
  )
}
function GavelIcon() {
  return (
    <svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8" /><path d="m16 16 6-6" /><path d="m8 8 6-6" /><path d="m9 7 8 8" /><path d="m21 11-8-8" />
    </svg>
  )
}
function ClipboardCheckIcon() {
  return (
    <svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" />
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function AlertTriangleIcon() {
  return (
    <svg className="ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
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

const MTP_CSS = `
.mtp-wrap {
  --tc-surface: #ffffff;
  --tc-surface-2: #f2f5fa;
  --tc-surface-3: #e6ebf3;
  --tc-ink: #16202e;
  --tc-ink-2: #48566a;
  --tc-ink-3: #8893a6;
  --tc-border: #e1e7f0;
  --tc-border-2: #cfd8e6;
  --tc-accent: #2456a6;
  --tc-accent-soft: #e2eaf6;
  --tc-crit: #c2392b;
  --tc-crit-soft: #fbe9e6;
  --tc-crit-ink: #8f261b;
  --tc-warn: #b07d16;
  --tc-warn-soft: #fbf2da;
  --tc-warn-ink: #7e5908;
  --tc-info: #2c5cc5;
  --tc-info-soft: #e8eefb;
  --tc-info-ink: #1f4296;
  --tc-shadow-sm: 0 1px 2px rgba(14,23,38,.06), 0 1px 3px rgba(14,23,38,.05);
  --tc-shadow-md: 0 2px 6px rgba(14,23,38,.07), 0 8px 24px rgba(14,23,38,.06);
}
[data-theme="dark"] .mtp-wrap {
  --tc-surface: #1a2433;
  --tc-surface-2: #20293a;
  --tc-surface-3: #2a3447;
  --tc-ink: #e6ecf5;
  --tc-ink-2: #aab6c8;
  --tc-ink-3: #7c8699;
  --tc-border: #2d3a51;
  --tc-border-2: #3a4660;
  --tc-accent-soft: rgba(36,86,166,0.22);
  --tc-crit-soft: rgba(194,57,43,0.18);
  --tc-warn-soft: rgba(176,125,22,0.18);
  --tc-info-soft: rgba(44,92,197,0.18);
}
.mtp-wrap .tcard {
  width: 100%;
  background: var(--tc-surface);
  border: 1px solid var(--tc-border);
  border-top: 3px solid var(--tc-accent);
  border-radius: 4px;
  box-shadow: var(--tc-shadow-sm);
  display: flex;
  flex-direction: column;
  transition: box-shadow .14s, transform .14s, border-color .14s;
  font-family: var(--font-sans, 'Fira Sans', system-ui, sans-serif);
  color: var(--tc-ink);
}
.mtp-wrap .tcard:hover {
  box-shadow: var(--tc-shadow-md);
  transform: translateY(-1px);
}
.mtp-wrap .ic { display: inline-block; vertical-align: middle; }

.mtp-wrap .tc-head { display: flex; align-items: center; gap: 11px; padding: 16px 18px 0; }
.mtp-wrap .tc-ico {
  width: 34px; height: 34px; border-radius: 9px;
  background: var(--tc-accent-soft);
  display: grid; place-items: center; flex: none;
  color: var(--tc-accent);
}
.mtp-wrap .tc-ht { min-width: 0; flex: 1; }
.mtp-wrap .tc-ht .lbl { font-size: 13px; font-weight: 600; line-height: 1.2; color: var(--tc-ink); }
.mtp-wrap .tc-ht .sub {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase;
  color: var(--tc-ink-3); margin-top: 2px;
}
.mtp-wrap .tc-tag {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10px; font-weight: 600; letter-spacing: .04em;
  color: var(--tc-ink-3);
  border: 1px solid var(--tc-border-2);
  border-radius: 5px; padding: 2px 6px;
}

.mtp-wrap .tc-num { display: flex; align-items: flex-end; gap: 10px; padding: 13px 18px 14px; }
.mtp-wrap .tc-num b {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 42px; font-weight: 600; line-height: .9; letter-spacing: -.02em;
  color: var(--tc-ink);
}
.mtp-wrap .tc-num .of {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 14px; color: var(--tc-ink-3); margin-bottom: 5px;
}

.mtp-wrap .tc-bar {
  display: flex; height: 8px; border-radius: 5px; overflow: hidden;
  gap: 2px; background: var(--tc-surface-3); margin: 0 18px;
}
.mtp-wrap .tc-bar span { display: block; transition: flex-basis .6s; }
.mtp-wrap .tc-bar .b-crit { background: var(--tc-crit); }
.mtp-wrap .tc-bar .b-warn { background: var(--tc-warn); }
.mtp-wrap .tc-bar .b-info { background: var(--tc-info); }
.mtp-wrap .tc-bar .b-empty { background: var(--tc-surface-3); }

.mtp-wrap .tc-legend {
  display: flex; flex-wrap: wrap; gap: 6px 16px;
  padding: 11px 18px 4px; font-size: 12px; color: var(--tc-ink-2);
}
.mtp-wrap .tc-legend .lg { display: inline-flex; align-items: center; gap: 7px; font-weight: 500; }
.mtp-wrap .tc-legend .lg b {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  color: var(--tc-ink); font-weight: 600;
}
.mtp-wrap .tc-legend .lg::before {
  content: ""; width: 9px; height: 9px; border-radius: 3px; flex: none;
}
.mtp-wrap .tc-legend .lg.crit::before { background: var(--tc-crit); }
.mtp-wrap .tc-legend .lg.warn::before { background: var(--tc-warn); }
.mtp-wrap .tc-legend .lg.info::before { background: var(--tc-info); }

.mtp-wrap .tc-peek { margin: 13px 0 0; border-top: 1px solid var(--tc-border); }
.mtp-wrap .peek {
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 11px; align-items: center;
  padding: 11px 18px;
  border-bottom: 1px solid var(--tc-border);
  cursor: pointer; transition: background .12s; position: relative;
  outline: none;
}
.mtp-wrap .peek:hover { background: var(--tc-surface-2); }
.mtp-wrap .peek:focus-visible { background: var(--tc-surface-2); box-shadow: inset 0 0 0 2px var(--tc-accent); }
.mtp-wrap .peek::before {
  content: ""; position: absolute; left: 0; top: 9px; bottom: 9px;
  width: 3px; border-radius: 0 3px 3px 0; background: var(--tc-ink-3);
}
.mtp-wrap .peek.crit::before { background: var(--tc-crit); }
.mtp-wrap .peek.warn::before { background: var(--tc-warn); }
.mtp-wrap .peek.info::before { background: var(--tc-info); }
.mtp-wrap .peek .pk-ico {
  width: 28px; height: 28px; border-radius: 7px;
  display: grid; place-items: center; background: var(--tc-surface-3);
  flex: none; color: var(--tc-ink-2);
}
.mtp-wrap .peek.crit .pk-ico { background: var(--tc-crit-soft); color: var(--tc-crit); }
.mtp-wrap .peek.warn .pk-ico { background: var(--tc-warn-soft); color: var(--tc-warn); }
.mtp-wrap .peek.info .pk-ico { background: var(--tc-info-soft); color: var(--tc-info); }
.mtp-wrap .peek .pk-mid { min-width: 0; display: flex; flex-direction: column; }
.mtp-wrap .peek .pk-t {
  font-size: 13px; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  color: var(--tc-ink);
}
.mtp-wrap .peek .pk-m {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 10.5px; letter-spacing: .03em; color: var(--tc-ink-3);
  text-transform: uppercase; margin-top: 1px;
}
.mtp-wrap .peek .pk-due {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  font-size: 11px; font-weight: 600;
  white-space: nowrap;
  display: inline-flex; align-items: center; gap: 4px;
}
.mtp-wrap .peek.crit .pk-due { color: var(--tc-crit-ink); }
.mtp-wrap .peek.warn .pk-due { color: var(--tc-warn-ink); }
.mtp-wrap .peek.info .pk-due { color: var(--tc-ink-3); }

.mtp-wrap .tc-foot { display: flex; align-items: center; gap: 9px; padding: 13px 18px; }
.mtp-wrap .tc-foot .more {
  font-size: 12px; color: var(--tc-ink-3);
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
}
.mtp-wrap .tc-foot .all {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 600;
  color: var(--tc-accent);
  background: none; border: none; cursor: pointer;
  font-family: inherit; padding: 4px 0;
}
.mtp-wrap .tc-foot .all .ic { transition: transform .14s; }
.mtp-wrap .tc-foot .all:hover .ic { transform: translateX(2px); }
`
