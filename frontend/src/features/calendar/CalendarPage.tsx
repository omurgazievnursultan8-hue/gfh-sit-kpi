import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  ChevronLeft, ChevronRight, Plus, Download, X, Trash2, Pencil, CalendarDays,
} from 'lucide-react'
import { RootState } from '../../app/store'
import { DataTable, type Column } from '../../components/DataTable'
import { CalendarDay, DayType, calendarApi } from './calendarApi'

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

        <div className="pc-modal-body">
          <label className="pc-field">
            <span>Дата</span>
            <input
              type="date"
              value={d.day}
              disabled={d.existing}
              onChange={e => setD({ ...d, day: e.target.value })}
            />
          </label>

          <label className="pc-field">
            <span>Тип дня</span>
            <select
              value={d.dayType}
              onChange={e => setD({ ...d, dayType: e.target.value as DayType })}
            >
              <option value="HOLIDAY">Праздник — нерабочий</option>
              <option value="WORKING">Рабочий день — перенос</option>
              <option value="DAY_OFF">Выходной — перенос</option>
            </select>
          </label>

          <label className="pc-field">
            <span>Описание (RU)</span>
            <input
              type="text"
              value={d.descriptionRu}
              placeholder="Напр. День Конституции"
              onChange={e => setD({ ...d, descriptionRu: e.target.value })}
            />
          </label>

          <label className="pc-field">
            <span>Описание (KG)</span>
            <input
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
              className="pc-btn pc-btn-danger"
              onClick={() => onDelete(d.day)}
              disabled={saving}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
              Удалить
            </button>
          )}
          <div className="pc-modal-foot-main">
            <button className="pc-btn pc-btn-ghost" onClick={onClose} disabled={saving}>
              Отмена
            </button>
            <button
              className="pc-btn pc-btn-primary"
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
    <div className="pc-root">
      <style>{CSS}</style>

      {/* HEAD */}
      <header className="pc-head">
        <div className="pc-head-main">
          <nav className="pc-crumb" aria-label="Хлебные крошки">
            <a href="/">Главная</a>
            <span aria-hidden="true">/</span>
            <a href="/admin">Админ-панель</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Календарь</span>
          </nav>
          <h1>Производственный календарь</h1>
          <p className="pc-subtitle">
            Государственные праздники и переносы рабочих дней Кыргызской Республики.
            Используется при расчёте нормы рабочих дней и периодов оценки KPI.
          </p>
        </div>

        <div className="pc-head-actions">
          <div className="pc-years" role="group" aria-label="Год">
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
          </div>
          {isAdmin && (
            <>
              <button className="pc-btn pc-btn-ghost" onClick={runImport} disabled={importing || loading}>
                <Download size={15} strokeWidth={2} aria-hidden="true" />
                {importing ? 'Импорт…' : 'Импорт'}
              </button>
              <button className="pc-btn pc-btn-primary" onClick={openNew}>
                <Plus size={15} strokeWidth={2.4} aria-hidden="true" />
                Добавить день
              </button>
            </>
          )}
        </div>
      </header>

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
  --ink: #14213d;
  --muted: #64748b;
  --line: #e7e9ef;
  --brand: #1e40af;
  --brand-soft: #e8edfb;
  --workday: #efe9df;
  --weekend: #dce7f4;
  --holiday: #f6dade;
  --shift: #f5e7c8;
  color: var(--ink);
  padding-bottom: 64px;
}

/* HEAD */
.pc-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 24px; flex-wrap: wrap; margin-bottom: 18px;
}
.pc-crumb {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; letter-spacing: .04em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 12px;
}
.pc-crumb a { color: var(--muted); text-decoration: none; }
.pc-crumb a:hover { color: var(--brand); }
.pc-crumb span[aria-current] { color: var(--ink); font-weight: 600; }
.pc-head h1 {
  font-family: "Source Serif Pro", Georgia, serif;
  font-size: 30px; font-weight: 600; line-height: 1.1;
  letter-spacing: -0.015em; margin: 0;
}
.pc-subtitle {
  margin: 10px 0 0; max-width: 60ch;
  font-size: 13.5px; line-height: 1.6; color: var(--muted);
}
.pc-head-actions {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}

/* YEAR TABS */
.pc-years {
  display: flex; gap: 2px;
  background: #fff; border: 1px solid var(--line);
  border-radius: 9px; padding: 3px;
}
.pc-years button {
  font-family: "JetBrains Mono", monospace;
  font-size: 12.5px; font-weight: 600; color: var(--muted);
  border: none; background: transparent; cursor: pointer;
  padding: 6px 11px; border-radius: 6px;
  transition: all .14s ease;
}
.pc-years button:hover { color: var(--brand); }
.pc-years button.is-active { background: var(--brand); color: #fff; }

/* BUTTONS */
.pc-btn {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 13px; font-weight: 600;
  border-radius: 9px; padding: 8px 14px; cursor: pointer;
  border: 1px solid transparent; transition: all .14s ease;
}
.pc-btn:disabled { opacity: .55; cursor: default; }
.pc-btn-primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.pc-btn-primary:hover:not(:disabled) { background: #1b39a0; }
.pc-btn-ghost { background: #fff; color: var(--ink); border-color: var(--line); }
.pc-btn-ghost:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.pc-btn-danger { background: #fff; color: #dc2626; border-color: #fecaca; margin-right: auto; }
.pc-btn-danger:hover:not(:disabled) { background: #fef2f2; }

/* LEGEND */
.pc-legend {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  margin-bottom: 16px;
}
.pc-leg {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--muted);
}
.pc-leg .sw {
  width: 13px; height: 13px; border-radius: 4px;
  border: 1px solid rgba(20,33,61,.1);
}
.sw.workday { background: var(--workday); }
.sw.weekend { background: var(--weekend); }
.sw.holiday { background: var(--holiday); }
.sw.shift   { background: var(--shift); }
.pc-monthnav { display: flex; gap: 3px; margin-left: auto; }
.pc-monthnav button {
  display: grid; place-items: center;
  width: 30px; height: 30px;
  border: 1px solid var(--line); border-radius: 7px;
  background: #fff; color: var(--muted); cursor: pointer;
  transition: all .14s ease;
}
.pc-monthnav button:hover:not(:disabled) { border-color: var(--brand); color: var(--brand); }
.pc-monthnav button:disabled { opacity: .4; cursor: default; }

/* MONTH STRIP */
.pc-strip {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  margin-bottom: 24px;
}
.pc-month {
  background: #fff; border: 1px solid var(--line);
  border-radius: 14px; padding: 16px 16px 18px;
  box-shadow: 0 1px 2px rgba(20,33,61,.04);
}
.pc-month.is-focus {
  border-color: var(--brand);
  box-shadow: 0 6px 22px rgba(30,64,175,.13);
}
.pc-skeleton {
  min-height: 360px;
  background: linear-gradient(90deg,#f1f2f5 25%,#f8f9fb 50%,#f1f2f5 75%);
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
  font-family: "Source Serif Pro", Georgia, serif;
  font-size: 18px; font-weight: 600; margin: 0; line-height: 1.1;
}
.pc-tag {
  font-size: 9px; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: var(--brand);
  background: var(--brand-soft); border-radius: 5px; padding: 3px 6px;
}
.pc-month-stat {
  font-size: 11px; color: var(--muted); text-align: right;
  white-space: nowrap; padding-top: 3px;
}

/* DAY GRID */
.pc-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
}
.pc-wd {
  font-size: 10px; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase; color: #aab1bd;
  text-align: center; padding-bottom: 5px;
}
.pc-wd.is-wknd { color: #c5995e; }

.pc-day {
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex; flex-direction: column;
  border: 1px solid transparent; border-radius: 8px;
  padding: 5px 6px; cursor: default;
  background: var(--workday);
  text-align: left; font: inherit;
  transition: transform .1s ease, box-shadow .12s ease, outline-color .12s ease;
  overflow: hidden;
}
.pc-day.st-workday { background: var(--workday); }
.pc-day.st-weekend { background: var(--weekend); }
.pc-day.st-holiday { background: var(--holiday); }
.pc-day.st-shift   { background: var(--shift); }
.pc-day.is-out { background: transparent; opacity: .38; }
.pc-day.is-clickable:not(.is-out) { cursor: pointer; }
.pc-day.is-clickable:not(.is-out):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(20,33,61,.16);
  z-index: 2;
}
.pc-day.is-today {
  outline: 2px solid var(--brand);
  outline-offset: -2px;
}
.pc-day-num {
  font-family: "JetBrains Mono", monospace;
  font-size: 12.5px; font-weight: 600; color: var(--ink);
}
.pc-day.st-holiday .pc-day-num { color: #b03a4a; }
.pc-day.st-weekend .pc-day-num { color: #3f6a9e; }
.pc-day.is-out .pc-day-num { color: var(--muted); }
.pc-day-today {
  font-size: 8px; font-weight: 700; letter-spacing: .03em;
  text-transform: uppercase; color: var(--brand);
  margin-top: auto;
}
.pc-day-label {
  font-size: 8.5px; line-height: 1.2; color: #9a4452;
  margin-top: 2px;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden;
}
.pc-day.st-shift .pc-day-label { color: #9a7223; }

/* SPECIAL DAYS TABLE */
.pc-special {
  background: #fff; border: 1px solid var(--line);
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 1px 2px rgba(20,33,61,.04);
}
.pc-special-head {
  display: flex; align-items: center; gap: 10px;
  padding: 15px 20px; border-bottom: 1px solid var(--line);
}
.pc-special-head h2 {
  font-family: "Source Serif Pro", Georgia, serif;
  font-size: 17px; font-weight: 600; margin: 0;
}
.pc-special-count {
  font-family: "JetBrains Mono", monospace;
  font-size: 11px; font-weight: 600; color: var(--brand);
  background: var(--brand-soft); border-radius: 999px; padding: 3px 9px;
}
.pc-special-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px 20px; color: var(--muted); font-size: 13px;
}
.pc-table { width: 100%; border-collapse: collapse; }
.pc-table th {
  text-align: left;
  font-size: 10px; font-weight: 700; letter-spacing: .05em;
  text-transform: uppercase; color: #9aa3b0;
  padding: 10px 16px; background: #fafbfc;
  border-bottom: 1px solid var(--line);
}
.pc-table td {
  padding: 11px 16px; font-size: 13px;
  border-bottom: 1px solid #f1f2f5;
}
.pc-table tr:last-child td { border-bottom: none; }
.pc-table tbody tr:hover { background: #fafbfd; }
.pc-td-date { font-family: "JetBrains Mono", monospace; font-weight: 600; }
.pc-td-wd { color: var(--muted); }
.pc-dash { color: #c5cad2; }
.pc-td-act { width: 48px; text-align: right; }
.pc-icon-btn {
  display: inline-grid; place-items: center;
  width: 28px; height: 28px;
  border: 1px solid var(--line); border-radius: 7px;
  background: #fff; color: var(--muted); cursor: pointer;
  transition: all .14s ease;
}
.pc-icon-btn:hover { border-color: var(--brand); color: var(--brand); }

.pc-chip {
  display: inline-block;
  font-size: 10px; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase;
  border-radius: 5px; padding: 3px 8px;
}
.pc-chip.holiday { background: var(--holiday); color: #b03a4a; }
.pc-chip.shift   { background: var(--shift); color: #9a7223; }
.pc-chip.dayoff  { background: var(--weekend); color: #3f6a9e; }

/* MODAL */
.pc-modal-scrim {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(20,33,61,.42);
  display: grid; place-items: center; padding: 20px;
  animation: pc-fade .14s ease;
}
@keyframes pc-fade { from { opacity: 0; } }
.pc-modal {
  width: 100%; max-width: 420px;
  background: #fff; border-radius: 16px;
  box-shadow: 0 24px 60px rgba(20,33,61,.3);
  animation: pc-pop .16s cubic-bezier(.2,.7,.3,1.2);
}
@keyframes pc-pop { from { transform: scale(.96); opacity: 0; } }
.pc-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px;
}
.pc-modal-head h3 {
  font-family: "Source Serif Pro", Georgia, serif;
  font-size: 18px; font-weight: 600; margin: 0;
}
.pc-modal-x {
  display: grid; place-items: center;
  width: 30px; height: 30px; border-radius: 8px;
  border: none; background: #f4f5f8; color: var(--muted); cursor: pointer;
}
.pc-modal-x:hover { background: #e9ebf0; color: var(--ink); }
.pc-modal-body {
  display: flex; flex-direction: column; gap: 13px;
  padding: 4px 20px 18px;
}
.pc-field { display: flex; flex-direction: column; gap: 5px; }
.pc-field span {
  font-size: 11px; font-weight: 700; letter-spacing: .03em;
  text-transform: uppercase; color: var(--muted);
}
.pc-field input, .pc-field select {
  font: inherit; font-size: 13.5px; color: var(--ink);
  border: 1px solid var(--line); border-radius: 9px;
  padding: 9px 11px; background: #fff;
}
.pc-field input:focus, .pc-field select:focus {
  outline: none; border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}
.pc-field input:disabled { background: #f4f5f8; color: var(--muted); }
.pc-modal-foot {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 20px 18px; border-top: 1px solid var(--line);
}
.pc-modal-foot-main { display: flex; gap: 8px; margin-left: auto; }

@media (max-width: 900px) {
  .pc-strip { grid-template-columns: 1fr; }
  .pc-month:not(.is-focus) { display: none; }
  .pc-table th:nth-child(5), .pc-table td:nth-child(5) { display: none; }
}
`
