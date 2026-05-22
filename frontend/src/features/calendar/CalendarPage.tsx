import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  ChevronLeft, ChevronRight, Plus, Download, X, Trash2, Pencil, CalendarDays,
} from 'lucide-react'
import { RootState } from '../../app/store'
import { DataTable, type Column } from '../../components/DataTable'
import { CalendarDay, DayType, calendarApi } from './calendarApi'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { StatCard, STAT_CARD_CSS } from '../../components/StatCard'
import { DV3_FORM_CSS } from '../dashboard/dv3FormStyles'

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WD_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const TYPE_META: Record<DayType, { label: string; cls: string }> = {
  HOLIDAY: { label: 'Праздник', cls: 'holiday' },
  WORKING: { label: 'Рабочий день', cls: 'shift' },
  DAY_OFF: { label: 'Выходной', cls: 'dayoff' },
}

type Status = 'WORKDAY' | 'WEEKEND' | 'HOLIDAY' | 'SHIFT'

const pad = (n: number) => String(n).padStart(2, '0')
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6

function statusOf(d: Date, entry?: CalendarDay): Status {
  if (entry?.dayType === 'HOLIDAY') return 'HOLIDAY'
  const wknd = isWeekend(d)
  if (entry?.dayType === 'WORKING') return wknd ? 'SHIFT' : 'WORKDAY'
  if (entry?.dayType === 'DAY_OFF') return wknd ? 'WEEKEND' : 'SHIFT'
  return wknd ? 'WEEKEND' : 'WORKDAY'
}

function isWorkingDay(d: Date, entry?: CalendarDay): boolean {
  if (entry?.dayType === 'HOLIDAY' || entry?.dayType === 'DAY_OFF') return false
  if (entry?.dayType === 'WORKING') return true
  return !isWeekend(d)
}

function monthWeeks(year: number, month: number) {
  const first = new Date(year, month - 1, 1)
  const offset = (first.getDay() + 6) % 7 // Monday-first
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(year, month - 1, 1 - offset + i)
    cells.push({ date: d, inMonth: d.getMonth() === month - 1 })
  }
  const weeks: typeof cells[] = []
  for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7))
  // drop a trailing week with no in-month days
  while (weeks.length > 4 && weeks[weeks.length - 1].every(c => !c.inMonth)) weeks.pop()
  return weeks
}

const plural = (n: number, forms: [string, string, string]) => {
  const m100 = n % 100, m10 = n % 10
  if (m100 >= 11 && m100 <= 14) return forms[2]
  if (m10 === 1) return forms[0]
  if (m10 >= 2 && m10 <= 4) return forms[1]
  return forms[2]
}

/* ── Day editor modal ─────────────────────────────────────────────── */

interface DraftDay {
  day: string
  dayType: DayType
  descriptionRu: string
  descriptionKg: string
  existing: boolean
}

function DayModal({
  draft, onClose, onSave, onDelete, saving,
}: {
  draft: DraftDay
  onClose: () => void
  onSave: (d: DraftDay) => void
  onDelete: (day: string) => void
  saving: boolean
}) {
  const [d, setD] = useState(draft)
  useEffect(() => setD(draft), [draft])

  return (
    <div className="pc-modal-scrim" onClick={onClose}>
      <div
        className="pc-modal"
        role="dialog"
        aria-modal="true"
        aria-label={d.existing ? 'Редактировать день' : 'Добавить день'}
        onClick={e => e.stopPropagation()}
      >
        <div className="pc-modal-head">
          <h3>{d.existing ? 'Редактировать день' : 'Добавить особый день'}</h3>
          <button className="pc-modal-x" onClick={onClose} aria-label="Закрыть">
            <X size={17} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        <div className="pc-modal-body dv3-form">
          <label className="dv3-field">
            <span className="dv3-label">Дата</span>
            <input
              className="dv3-input"
              type="date"
              value={d.day}
              disabled={d.existing}
              onChange={e => setD({ ...d, day: e.target.value })}
            />
          </label>

          <label className="dv3-field">
            <span className="dv3-label">Тип дня</span>
            <select
              className="dv3-select"
              value={d.dayType}
              onChange={e => setD({ ...d, dayType: e.target.value as DayType })}
            >
              <option value="HOLIDAY">Праздник — нерабочий</option>
              <option value="WORKING">Рабочий день — перенос</option>
              <option value="DAY_OFF">Выходной — перенос</option>
            </select>
          </label>

          <label className="dv3-field">
            <span className="dv3-label">Описание (RU)</span>
            <input
              className="dv3-input"
              type="text"
              value={d.descriptionRu}
              placeholder="Напр. День Конституции"
              onChange={e => setD({ ...d, descriptionRu: e.target.value })}
            />
          </label>

          <label className="dv3-field">
            <span className="dv3-label">Описание (KG)</span>
            <input
              className="dv3-input"
              type="text"
              value={d.descriptionKg}
              placeholder="Мис. Конституция күнү"
              onChange={e => setD({ ...d, descriptionKg: e.target.value })}
            />
          </label>
        </div>

        <div className="pc-modal-foot">
          {d.existing && (
            <button
              className="dv3-btn dv3-btn--danger"
              style={{ marginRight: 'auto' }}
              onClick={() => onDelete(d.day)}
              disabled={saving}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
              Удалить
            </button>
          )}
          <div className="pc-modal-foot-main">
            <button className="dv3-btn" onClick={onClose} disabled={saving}>
              Отмена
            </button>
            <button
              className="dv3-btn dv3-btn--primary"
              onClick={() => onSave(d)}
              disabled={saving || !d.day}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */

export function CalendarPage() {
  const role = useSelector((s: RootState) => s.auth.role)
  const isAdmin = role === 'ADMIN'

  const today = new Date()
  const todayKey = dayKey(today)
  const currentYear = today.getFullYear()

  const [year, setYear] = useState(currentYear)
  const [focus, setFocus] = useState(() =>
    Math.min(11, Math.max(2, today.getMonth() + 1)))
  const [days, setDays] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<DraftDay | null>(null)

  const yearTabs = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  const loadDays = useCallback(async (y: number) => {
    setLoading(true)
    try {
      setDays(await calendarApi.listDays(y))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDays(year) }, [year, loadDays])

  const entryMap = useMemo(() => {
    const m = new Map<string, CalendarDay>()
    for (const d of days) m.set(d.day, d)
    return m
  }, [days])

  const monthStats = useCallback((month: number) => {
    let working = 0, holidays = 0
    const dim = new Date(year, month, 0).getDate()
    for (let day = 1; day <= dim; day++) {
      const date = new Date(year, month - 1, day)
      const entry = entryMap.get(dayKey(date))
      if (isWorkingDay(date, entry)) working++
      if (entry?.dayType === 'HOLIDAY') holidays++
    }
    return { working, holidays }
  }, [year, entryMap])

  const specialDays = useMemo(
    () => [...days].sort((a, b) => a.day.localeCompare(b.day)),
    [days],
  )

  // Year-wide totals for the hero / StatCards.
  const yearStats = useMemo(() => {
    let working = 0, holidays = 0
    for (let month = 1; month <= 12; month++) {
      const dim = new Date(year, month, 0).getDate()
      for (let day = 1; day <= dim; day++) {
        const date = new Date(year, month - 1, day)
        const entry = entryMap.get(dayKey(date))
        if (isWorkingDay(date, entry)) working++
        if (entry?.dayType === 'HOLIDAY') holidays++
      }
    }
    return { working, holidays, special: days.length }
  }, [year, entryMap, days.length])

  // Live clock for the hero meta-bar.
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const datePart = now.toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const specialColumns = useMemo<Column<CalendarDay>[]>(() => {
    const cols: Column<CalendarDay>[] = [
      {
        key: 'date',
        header: 'Дата',
        render: d => (
          <span style={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>
            {new Date(d.day + 'T00:00:00').toLocaleDateString('ru-RU', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </span>
        ),
      },
      {
        key: 'weekday',
        header: 'День недели',
        render: d => (
          <span style={{ color: 'var(--muted)' }}>
            {WD_SHORT[new Date(d.day + 'T00:00:00').getDay()]}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Тип',
        render: d => {
          const meta = TYPE_META[d.dayType]
          return <span className={`pc-chip ${meta.cls}`}>{meta.label}</span>
        },
      },
      {
        key: 'descriptionRu',
        header: 'Описание (RU)',
        render: d => d.descriptionRu || <span className="pc-dash">—</span>,
      },
      {
        key: 'descriptionKg',
        header: 'Описание (KG)',
        render: d => d.descriptionKg || <span className="pc-dash">—</span>,
      },
    ]
    if (isAdmin) {
      cols.push({
        key: 'actions',
        header: 'Действия',
        srOnlyHeader: true,
        align: 'right',
        width: '48px',
        render: d => (
          <button
            className="pc-icon-btn"
            onClick={() => setDraft({
              day: d.day,
              dayType: d.dayType,
              descriptionRu: d.descriptionRu ?? '',
              descriptionKg: d.descriptionKg ?? '',
              existing: true,
            })}
            aria-label={`Редактировать ${d.day}`}
          >
            <Pencil size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        ),
      })
    }
    return cols
  }, [isAdmin])

  const openDay = (date: Date) => {
    if (!isAdmin) return
    const key = dayKey(date)
    const e = entryMap.get(key)
    setDraft({
      day: key,
      dayType: e?.dayType ?? 'HOLIDAY',
      descriptionRu: e?.descriptionRu ?? '',
      descriptionKg: e?.descriptionKg ?? '',
      existing: !!e,
    })
  }

  const openNew = () => {
    const def = today.getFullYear() === year ? todayKey : `${year}-01-01`
    setDraft({ day: def, dayType: 'HOLIDAY', descriptionRu: '', descriptionKg: '', existing: false })
  }

  const saveDraft = async (d: DraftDay) => {
    setSaving(true)
    try {
      const saved = await calendarApi.upsertDay({
        day: d.day,
        dayType: d.dayType,
        descriptionRu: d.descriptionRu.trim() || null,
        descriptionKg: d.descriptionKg.trim() || null,
      })
      setDays(prev => [...prev.filter(x => x.day !== saved.day), saved])
      setDraft(null)
    } finally {
      setSaving(false)
    }
  }

  const deleteDay = async (day: string) => {
    setSaving(true)
    try {
      await calendarApi.deleteDay(day)
      setDays(prev => prev.filter(x => x.day !== day))
      setDraft(null)
    } finally {
      setSaving(false)
    }
  }

  const runImport = async () => {
    setImporting(true)
    try {
      setDays(await calendarApi.importHolidays(year))
    } finally {
      setImporting(false)
    }
  }

  const visibleMonths = [focus - 1, focus, focus + 1]

  return (
    <div className="dv3-root pc-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{STAT_CARD_CSS}</style>
      <style>{DV3_FORM_CSS}</style>
      <style>{CSS}</style>

      <div className="dv3-terminal">
        {/* HERO */}
        <div className="dv3-hero">
          <div className="dv3-hero-meta">
            <span className="dv3-hero-meta-l">CALENDAR.OPS</span>
            <span className="dv3-hero-meta-r">KGT {hh}:{mm}</span>
          </div>
          <div className="dv3-hero-main">
            <div>
              <h1 className="dv3-hero-title">
                <span className="dv3-accent">Производственный календарь</span>
              </h1>
              <p className="dv3-hero-sub">
                Государственные праздники и переносы рабочих дней КР · {datePart}
              </p>
            </div>
            <div className="dv3-hero-metrics">
              <div className="dv3-hero-metric">
                <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                  {loading ? '··' : yearStats.working}
                </span>
                <span className="dv3-hero-metric-lab">раб. дней {year}</span>
              </div>
              <div className="dv3-hero-metric">
                <span className={`dv3-hero-metric-num${loading ? ' dv3-loading' : ''}`}>
                  {loading ? '··' : yearStats.holidays}
                </span>
                <span className="dv3-hero-metric-lab">праздников</span>
              </div>
            </div>
          </div>
          <div className="dv3-hero-foot">
            <span className="dv3-hero-foot-ok">STATUS · {loading ? 'загрузка' : 'ок'}</span>
            <span className="pc-head-actions">
              <span className="pc-years" role="group" aria-label="Год">
                {yearTabs.map(y => (
                  <button
                    key={y}
                    className={y === year ? 'is-active' : ''}
                    onClick={() => setYear(y)}
                    aria-pressed={y === year}
                  >
                    {y}
                  </button>
                ))}
              </span>
              {isAdmin && (
                <>
                  <button className="dv3-btn" onClick={runImport} disabled={importing || loading}>
                    <Download size={15} strokeWidth={2} aria-hidden="true" />
                    {importing ? 'Импорт…' : 'Импорт'}
                  </button>
                  <button className="dv3-btn dv3-btn--primary" onClick={openNew}>
                    <Plus size={15} strokeWidth={2.4} aria-hidden="true" />
                    Добавить день
                  </button>
                </>
              )}
            </span>
          </div>
        </div>

        {/* STAT GRID */}
        <div className="dv3-grid">
          <StatCard
            className="dv3-col-4"
            title="WORKING.DAYS" id="W01" loading={loading}
            value={yearStats.working} label={`раб. ${plural(yearStats.working, ['день', 'дня', 'дней'])} ${year}`}
          />
          <StatCard
            className="dv3-col-4"
            title="HOLIDAYS" id="H01" loading={loading}
            value={yearStats.holidays} label="праздников"
          />
          <StatCard
            className="dv3-col-4"
            title="SPECIAL.DAYS" id="S01" loading={loading}
            value={yearStats.special} label="особых дней"
          />
        </div>
      </div>

      <div className="pc-below">
      {/* LEGEND */}
      <div className="pc-legend">
        <span className="pc-leg"><i className="sw workday" />Рабочий день</span>
        <span className="pc-leg"><i className="sw weekend" />Выходной</span>
        <span className="pc-leg"><i className="sw holiday" />Праздник</span>
        <span className="pc-leg"><i className="sw shift" />Перенос</span>
        <div className="pc-monthnav" role="group" aria-label="Листать месяцы">
          <button onClick={() => setFocus(f => Math.max(2, f - 1))}
            disabled={focus <= 2} aria-label="Предыдущие месяцы">
            <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button onClick={() => setFocus(f => Math.min(11, f + 1))}
            disabled={focus >= 11} aria-label="Следующие месяцы">
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* MONTH STRIP */}
      {loading ? (
        <div className="pc-strip">
          {[0, 1, 2].map(i => <div className="pc-month pc-skeleton" key={i} aria-hidden="true" />)}
        </div>
      ) : (
        <div className="pc-strip">
          {visibleMonths.map(month => {
            const isFocus = month === focus
            const isCurrentMonth = year === currentYear && month === today.getMonth() + 1
            const stats = monthStats(month)
            const weeks = monthWeeks(year, month)
            return (
              <section className={`pc-month ${isFocus ? 'is-focus' : ''}`} key={month}>
                <div className="pc-month-head">
                  <div className="pc-month-title">
                    <h2>{MONTHS_RU[month - 1]} {year}</h2>
                    {isCurrentMonth && <span className="pc-tag">текущий</span>}
                  </div>
                  <div className="pc-month-stat">
                    {stats.working} раб. {plural(stats.working, ['день', 'дня', 'дней'])}
                    <span aria-hidden="true"> · </span>
                    {stats.holidays} {plural(stats.holidays, ['праздник', 'праздника', 'праздников'])}
                  </div>
                </div>

                <div className="pc-grid">
                  {WEEKDAYS_RU.map((w, i) => (
                    <div className={`pc-wd ${i >= 5 ? 'is-wknd' : ''}`} key={w}>{w}</div>
                  ))}
                  {weeks.flat().map(({ date, inMonth }, i) => {
                    const key = dayKey(date)
                    const entry = entryMap.get(key)
                    const st = statusOf(date, entry)
                    const isToday = key === todayKey
                    return (
                      <button
                        key={i}
                        type="button"
                        className={[
                          'pc-day', `st-${st.toLowerCase()}`,
                          inMonth ? '' : 'is-out',
                          isToday ? 'is-today' : '',
                          isAdmin ? 'is-clickable' : '',
                        ].join(' ')}
                        onClick={() => inMonth && openDay(date)}
                        disabled={!isAdmin || !inMonth}
                        aria-label={`${date.getDate()} ${MONTHS_RU[date.getMonth()]}${
                          entry?.descriptionRu ? ` — ${entry.descriptionRu}` : ''
                        }`}
                      >
                        <span className="pc-day-num">{date.getDate()}</span>
                        {isToday && <span className="pc-day-today">сегодня</span>}
                        {inMonth && entry?.descriptionRu && (
                          <span className="pc-day-label">{entry.descriptionRu}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* SPECIAL DAYS TABLE */}
      <section className="pc-special">
        <div className="pc-special-head">
          <h2>Особые дни {year}</h2>
          <span className="pc-special-count">{specialDays.length}</span>
        </div>
        <DataTable<CalendarDay>
          columns={specialColumns}
          rows={specialDays}
          rowKey={d => d.id}
          caption={`Особые дни ${year}`}
          loading={loading}
          empty={
            <div className="pc-special-empty">
              <CalendarDays size={20} strokeWidth={1.6} aria-hidden="true" />
              Нет особых дней за {year} год.
              {isAdmin && ' Нажмите «Импорт» или «Добавить день».'}
            </div>
          }
          totalCount={specialDays.length}
        />
      </section>
      </div>

      {draft && (
        <DayModal
          draft={draft}
          saving={saving}
          onClose={() => setDraft(null)}
          onSave={saveDraft}
          onDelete={deleteDay}
        />
      )}
    </div>
  )
}

/* ── Scoped styles ────────────────────────────────────────────────── */

const CSS = `
.pc-root {
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  color: var(--dv3-text);
}
.pc-below { max-width: 1280px; margin: 0 auto; padding: 0 32px 48px; }
@media (max-width: 640px) { .pc-below { padding: 0 12px 24px; } }

/* YEAR TABS (in hero foot) */
.pc-head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pc-years {
  display: flex; gap: 2px;
  background: var(--dv3-bg3); border: 1px solid var(--dv3-border2);
  padding: 2px;
}
.pc-years button {
  font-family: inherit;
  font-size: 11px; font-weight: 600; color: var(--dv3-text3);
  border: none; background: transparent; cursor: pointer;
  padding: 5px 10px; letter-spacing: 0.04em;
  transition: color .14s ease, background .14s ease;
}
.pc-years button:hover { color: var(--dv3-text); }
.pc-years button.is-active { background: var(--dv3-accent); color: var(--dv3-bg); }

/* LEGEND */
.pc-legend {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  margin: 24px 0 16px;
  font-size: 11px; letter-spacing: 0.04em;
}
.pc-leg {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11px; color: var(--dv3-text3); text-transform: uppercase;
}
.pc-leg .sw {
  width: 12px; height: 12px;
  border: 1px solid var(--dv3-border2);
}
.sw.workday { background: var(--dv3-bg3); }
.sw.weekend { background: var(--dv3-bg2); border-color: var(--dv3-border-hi); }
.sw.holiday { background: color-mix(in srgb, var(--dv3-zone-down) 22%, var(--dv3-bg2)); border-color: var(--dv3-zone-down); }
.sw.shift   { background: color-mix(in srgb, var(--dv3-zone-warn) 22%, var(--dv3-bg2)); border-color: var(--dv3-zone-warn); }
.pc-monthnav { display: flex; gap: 3px; margin-left: auto; }
.pc-monthnav button {
  display: grid; place-items: center;
  width: 30px; height: 30px;
  border: 1px solid var(--dv3-border2);
  background: var(--dv3-bg3); color: var(--dv3-text3); cursor: pointer;
  transition: border-color .14s ease, color .14s ease;
}
.pc-monthnav button:hover:not(:disabled) { border-color: var(--dv3-border-hi); color: var(--dv3-text); }
.pc-monthnav button:disabled { opacity: .4; cursor: default; }

/* MONTH STRIP */
.pc-strip {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  margin-bottom: 24px;
}
.pc-month {
  background: var(--dv3-bg2); border: 1px solid var(--dv3-border);
  padding: 16px 16px 18px;
}
.pc-month.is-focus { border-color: var(--dv3-accent); }
.pc-skeleton {
  min-height: 360px;
  background: linear-gradient(90deg, var(--dv3-bg2) 25%, var(--dv3-bg3) 50%, var(--dv3-bg2) 75%);
  background-size: 200% 100%;
  animation: pc-shimmer 1.3s infinite linear;
}
@keyframes pc-shimmer { to { background-position: -200% 0; } }

.pc-month-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px; margin-bottom: 14px;
}
.pc-month-title { display: flex; align-items: center; gap: 8px; }
.pc-month-head h2 {
  font-family: inherit;
  font-size: 13px; font-weight: 600; margin: 0; line-height: 1.1;
  letter-spacing: 0.04em; text-transform: uppercase; color: var(--dv3-text);
}
.pc-tag {
  font-size: 9px; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: var(--dv3-accent);
  background: var(--dv3-accent-bg); border: 1px solid var(--dv3-accent);
  padding: 2px 6px;
}
.pc-month-stat {
  font-size: 10px; color: var(--dv3-text3); text-align: right;
  white-space: nowrap; padding-top: 3px; letter-spacing: 0.03em;
}

/* DAY GRID */
.pc-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
}
.pc-wd {
  font-size: 9px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: var(--dv3-text4);
  text-align: center; padding-bottom: 5px;
}
.pc-wd.is-wknd { color: var(--dv3-text3); }

.pc-day {
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex; flex-direction: column;
  border: 1px solid var(--dv3-border);
  padding: 5px 6px; cursor: default;
  background: var(--dv3-bg3);
  text-align: left; font: inherit;
  transition: border-color .12s ease, background .12s ease;
  overflow: hidden;
}
.pc-day.st-workday { background: var(--dv3-bg3); }
.pc-day.st-weekend { background: var(--dv3-bg2); }
.pc-day.st-holiday { background: color-mix(in srgb, var(--dv3-zone-down) 16%, var(--dv3-bg2)); border-color: color-mix(in srgb, var(--dv3-zone-down) 45%, var(--dv3-border)); }
.pc-day.st-shift   { background: color-mix(in srgb, var(--dv3-zone-warn) 16%, var(--dv3-bg2)); border-color: color-mix(in srgb, var(--dv3-zone-warn) 45%, var(--dv3-border)); }
.pc-day.is-out { background: transparent; border-color: transparent; opacity: .38; }
.pc-day.is-clickable:not(.is-out) { cursor: pointer; }
.pc-day.is-clickable:not(.is-out):hover {
  border-color: var(--dv3-border-hi);
  z-index: 2;
}
.pc-day.is-today {
  outline: 2px solid var(--dv3-accent);
  outline-offset: -2px;
  border-color: var(--dv3-accent);
}
.pc-day-num {
  font-family: inherit;
  font-size: 12px; font-weight: 600; color: var(--dv3-text);
  font-variant-numeric: tabular-nums;
}
.pc-day.st-holiday .pc-day-num { color: var(--dv3-zone-down); }
.pc-day.st-weekend .pc-day-num { color: var(--dv3-text3); }
.pc-day.is-out .pc-day-num { color: var(--dv3-text4); }
.pc-day-today {
  font-size: 8px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: var(--dv3-accent);
  margin-top: auto;
}
.pc-day-label {
  font-size: 8.5px; line-height: 1.2; color: var(--dv3-zone-down);
  margin-top: 2px;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}
.pc-day.st-shift .pc-day-label { color: var(--dv3-zone-warn); }

/* SPECIAL DAYS TABLE */
.pc-special {
  background: var(--dv3-bg2); border: 1px solid var(--dv3-border);
  overflow: hidden;
}
.pc-special-head {
  display: flex; align-items: center; gap: 10px;
  padding: 13px 18px; border-bottom: 1px solid var(--dv3-border);
  background: var(--dv3-bg3);
}
.pc-special-head h2 {
  font-family: inherit;
  font-size: 11px; font-weight: 600; margin: 0;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--dv3-text);
}
.pc-special-count {
  font-family: inherit;
  font-size: 11px; font-weight: 600; color: var(--dv3-accent);
  background: var(--dv3-accent-bg); border: 1px solid var(--dv3-accent);
  padding: 2px 8px; font-variant-numeric: tabular-nums;
}
.pc-special-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 20px; color: var(--dv3-text3); font-size: 13px;
}
.pc-dash { color: var(--dv3-text4); }
.pc-icon-btn {
  display: inline-grid; place-items: center;
  width: 28px; height: 28px;
  border: 1px solid var(--dv3-border2);
  background: var(--dv3-bg3); color: var(--dv3-text3); cursor: pointer;
  transition: border-color .14s ease, color .14s ease;
}
.pc-icon-btn:hover { border-color: var(--dv3-border-hi); color: var(--dv3-text); }

.pc-chip {
  display: inline-block;
  font-size: 10px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase;
  border: 1px solid var(--dv3-border2);
  padding: 2px 8px;
}
.pc-chip.holiday { background: color-mix(in srgb, var(--dv3-zone-down) 16%, var(--dv3-bg2)); color: var(--dv3-zone-down); border-color: color-mix(in srgb, var(--dv3-zone-down) 45%, var(--dv3-border)); }
.pc-chip.shift   { background: color-mix(in srgb, var(--dv3-zone-warn) 16%, var(--dv3-bg2)); color: var(--dv3-zone-warn); border-color: color-mix(in srgb, var(--dv3-zone-warn) 45%, var(--dv3-border)); }
.pc-chip.dayoff  { background: var(--dv3-bg3); color: var(--dv3-text3); }

/* MODAL */
.pc-modal-scrim {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,.55);
  display: grid; place-items: center; padding: 20px;
  animation: pc-fade .14s ease;
}
@keyframes pc-fade { from { opacity: 0; } }
.pc-modal {
  width: 100%; max-width: 440px;
  background: var(--dv3-bg2); border: 1px solid var(--dv3-border);
  border-top: 2px solid var(--dv3-zone-info);
  font-family: 'Geist Mono', ui-monospace, Menlo, monospace;
  color: var(--dv3-text);
  animation: pc-pop .16s cubic-bezier(.2,.7,.3,1.2);
}
@keyframes pc-pop { from { transform: scale(.96); opacity: 0; } }
.pc-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 14px; border-bottom: 1px solid var(--dv3-border);
}
.pc-modal-head h3 {
  font-family: inherit;
  font-size: 12px; font-weight: 600; margin: 0;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--dv3-text);
}
.pc-modal-x {
  display: grid; place-items: center;
  width: 30px; height: 30px;
  border: 1px solid var(--dv3-border2); background: var(--dv3-bg3);
  color: var(--dv3-text3); cursor: pointer;
}
.pc-modal-x:hover { border-color: var(--dv3-border-hi); color: var(--dv3-text); }
.pc-modal-body {
  padding: 18px 20px;
}
.pc-modal-foot {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 20px 18px; border-top: 1px solid var(--dv3-border);
}
.pc-modal-foot-main { display: flex; gap: 8px; margin-left: auto; }

@media (max-width: 900px) {
  .pc-strip { grid-template-columns: 1fr; }
  .pc-month:not(.is-focus) { display: none; }
}
`
