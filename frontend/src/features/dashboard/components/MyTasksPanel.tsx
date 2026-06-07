import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePeriod } from '@/features/periods/PeriodContext'
import { myTasksApi, type MyTask, type MyTaskSeverity, type MyTaskType } from '../myTasksApi'
import { PanelShell } from './PanelShell'

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
  const emptySlots = Math.max(0, 3 - peek.length)

  function dueText(g: TaskGroup): { text: string; icon: JSX.Element } {
    if (g.severity === 'OVERDUE') {
      return { text: t('dashboard.myTasksPanel.overdue'), icon: <AlertTriangleIcon /> }
    }
    if (g.severity === 'DUE_SOON') {
      return { text: t('dashboard.myTasksPanel.today', { defaultValue: 'сегодня' }), icon: <ClockIcon /> }
    }
    return { text: fmtDue(g.earliestDue, lng), icon: <CalendarIcon /> }
  }

  const dominantTone: 'crit' | 'warn' | 'accent' =
    critCount > 0 ? 'crit' : warnCount > 0 ? 'warn' : 'accent'

  return (
    <PanelShell
      tone={dominantTone}
      head={{
        icon: <ListChecksIcon />,
        title: t('dashboard.myTasksPanel.title'),
        sub: t('dashboard.myTasksPanel.subhead', { defaultValue: 'Открытые задачи' }),
        tag: `T-${String(total).padStart(2, '0')}`,
      }}
      stat={{
        value: loading ? '·' : total,
        unit: t('dashboard.myTasksPanel.open', { defaultValue: 'открытых' }),
      }}
      viz={
        <div className="mtp-viz">
          <style>{MTP_LOCAL_CSS}</style>
          <div className="mtp-bar" aria-hidden={total === 0}>
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
          <div className="mtp-legend">
            <span className="lg crit">{t('dashboard.myTasksPanel.legend.overdue', { defaultValue: 'Просрочено' })} <b>{critCount}</b></span>
            <span className="lg warn">{t('dashboard.myTasksPanel.legend.dueSoon', { defaultValue: 'Скоро' })} <b>{warnCount}</b></span>
            <span className="lg info">{t('dashboard.myTasksPanel.legend.scheduled', { defaultValue: 'Запланировано' })} <b>{infoCount}</b></span>
          </div>
        </div>
      }
      peek={
        <>
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
                <span className="pk-right">{d.icon}{d.text}</span>
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
          ? t('dashboard.myTasksPanel.footer.loading', { defaultValue: 'загрузка…' })
          : total === 0
            ? t('dashboard.myTasksPanel.empty')
            : remaining > 0
              ? t('dashboard.myTasksPanel.footer.more', { defaultValue: 'ещё {{n}}', n: remaining })
              : '',
        cta: {
          label: t('dashboard.myTasksPanel.allTasks', { defaultValue: 'Все задачи' }),
          onClick: () => navigate('/my-tasks'),
          icon: <ArrowRightIcon />,
        },
      }}
    />
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

const MTP_LOCAL_CSS = `
.mtp-viz { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
.mtp-bar {
  display: flex; height: 9px; border-radius: 5px; overflow: hidden;
  gap: 2px; background: var(--ps-surface-3);
}
.mtp-bar span { display: block; transition: flex-basis .6s; }
.mtp-bar .b-crit { background: var(--ps-crit); }
.mtp-bar .b-warn { background: var(--ps-warn); }
.mtp-bar .b-info { background: var(--ps-info); }
.mtp-bar .b-empty { background: var(--ps-surface-3); }
.mtp-legend {
  display: flex; flex-wrap: wrap; gap: 6px 14px;
  font-size: 11.5px; color: var(--ps-ink-2);
}
.mtp-legend .lg { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
.mtp-legend .lg b {
  font-family: var(--font-mono, 'IBM Plex Mono', ui-monospace, monospace);
  color: var(--ps-ink); font-weight: 600;
}
.mtp-legend .lg::before {
  content: ""; width: 8px; height: 8px; border-radius: 3px; flex: none;
}
.mtp-legend .lg.crit::before { background: var(--ps-crit); }
.mtp-legend .lg.warn::before { background: var(--ps-warn); }
.mtp-legend .lg.info::before { background: var(--ps-info); }
`
