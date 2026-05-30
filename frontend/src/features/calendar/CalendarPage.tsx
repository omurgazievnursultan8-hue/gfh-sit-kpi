import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Pencil,
} from 'lucide-react'
import { RootState } from '../../app/store'
import { DataPanel, type Column, type FilterDef } from '../../components/datapanel/DataPanel'
import { CalendarDay, DayType, calendarApi } from './calendarApi'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
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
  const [focus, setFocus] = useState(() => today.getMonth() + 1)
  const [days, setDays] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<DraftDay | null>(null)
  const [yearOffset, setYearOffset] = useState(0)

  const yearTabs = useMemo(() => {
    const base = currentYear + yearOffset
    return [base - 2, base - 1, base, base + 1]
  }, [currentYear, yearOffset])

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

  const specialSearchText = useCallback((d: CalendarDay) => {
    const dt = new Date(d.day + 'T00:00:00')
    return [
      d.day,
      dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      TYPE_META[d.dayType].label,
      d.descriptionRu ?? '',
      d.descriptionKg ?? '',
    ].join(' ')
  }, [])

  const specialFilters = useMemo<FilterDef[]>(() => [
    {
      key: 'type',
      label: 'Тип',
      type: 'select',
      options: [
        { value: 'HOLIDAY', label: 'Праздник' },
        { value: 'WORKING', label: 'Рабочий день' },
        { value: 'DAY_OFF', label: 'Выходной' },
      ],
    },
  ], [])

  const specialClientFilter = useCallback(
    (d: CalendarDay, v: Record<string, string>) => !v.type || d.dayType === v.type,
    [],
  )

  const specialComparator = useCallback((key: string) => (a: CalendarDay, b: CalendarDay) => {
    switch (key) {
      case 'date': return a.day.localeCompare(b.day)
      case 'weekday': return new Date(a.day + 'T00:00:00').getDay() - new Date(b.day + 'T00:00:00').getDay()
      case 'type': return TYPE_META[a.dayType].label.localeCompare(TYPE_META[b.dayType].label, 'ru')
      case 'descriptionRu': return (a.descriptionRu ?? '').localeCompare(b.descriptionRu ?? '', 'ru')
      case 'descriptionKg': return (a.descriptionKg ?? '').localeCompare(b.descriptionKg ?? '', 'ru')
      default: return 0
    }
  }, [])

  const specialColumns = useMemo<Column<CalendarDay>[]>(() => {
    const cols: Column<CalendarDay>[] = [
      {
        key: 'date',
        header: 'Дата',
        sortable: true,
        render: d => (
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {new Date(d.day + 'T00:00:00').toLocaleDateString('ru-RU', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </span>
        ),
      },
      {
        key: 'weekday',
        header: 'День недели',
        sortable: true,
        render: d => (
          <span style={{ color: 'var(--muted)' }}>
            {WD_SHORT[new Date(d.day + 'T00:00:00').getDay()]}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Тип',
        sortable: true,
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

  /* ── Focus month grid ─────────────────────────────────────────── */
  const focusWeeks = useMemo(() => monthWeeks(year, focus), [year, focus])
  const focusStats = useMemo(() => monthStats(focus), [focus, monthStats])

  /* ── Keyboard navigation in focus month ─────────────────────── */
  const [cursorKey, setCursorKey] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const moveCursor = (delta: number) => {
    const base = cursorKey ? new Date(cursorKey + 'T00:00:00') : new Date(year, focus - 1, 1)
    const next = new Date(base)
    next.setDate(next.getDate() + delta)
    if (next.getFullYear() !== year) return
    setFocus(next.getMonth() + 1)
    setCursorKey(dayKey(next))
  }

  const onGridKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); moveCursor(1); break
      case 'ArrowLeft':  e.preventDefault(); moveCursor(-1); break
      case 'ArrowDown':  e.preventDefault(); moveCursor(7); break
      case 'ArrowUp':    e.preventDefault(); moveCursor(-7); break
      case 'Enter':
      case ' ': {
        if (!cursorKey) return
        e.preventDefault()
        openDay(new Date(cursorKey + 'T00:00:00'))
        break
      }
    }
  }

  return (
    <div className="dv3-root pc-root">
      <style>{DASHBOARD_CSS}</style>
      <style>{DV3_FORM_CSS}</style>
      <style>{CSS}</style>

      <div className="pc-shell">

        {/* FOCUS MONTH */}
        <section className={`pc-focus ${loading ? 'is-loading' : ''}`}>
          <div className="pc-yearbar">
            <button
              className="pc-year-shift"
              onClick={() => setYearOffset(o => o - 1)}
              aria-label="Раньше"
            >
              <ChevronLeft size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
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
            <button
              className="pc-year-shift"
              onClick={() => setYearOffset(o => o + 1)}
              aria-label="Позже"
            >
              <ChevronRight size={14} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <div className="pc-legend" role="group" aria-label="Легенда">
              <span className="pc-leg"><i className="sw workday" />Рабочий</span>
              <span className="pc-leg"><i className="sw weekend" />Выходной</span>
              <span className="pc-leg"><i className="sw holiday" />Праздник</span>
              <span className="pc-leg"><i className="sw shift" />Перенос</span>
            </div>
          </div>
          <header className="pc-focus-head">
            <button
              className="pc-focus-nav"
              onClick={() => setFocus(f => Math.max(1, f - 1))}
              disabled={focus <= 1}
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <div className="pc-focus-title">
              <h2>{MONTHS_RU[focus - 1]} {year}</h2>
              {year === currentYear && focus === today.getMonth() + 1 && (
                <span className="pc-tag">текущий</span>
              )}
            </div>
            <div className="pc-focus-meter">
              <span><b>{focusStats.working}</b> раб.</span>
              <span><b>{focusStats.holidays}</b> празд.</span>
            </div>
            <button
              className="pc-focus-nav"
              onClick={() => setFocus(f => Math.min(12, f + 1))}
              disabled={focus >= 12}
              aria-label="Следующий месяц"
            >
              <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </header>

          <div
            ref={gridRef}
            className="pc-focus-grid"
            role="grid"
            tabIndex={0}
            onKeyDown={onGridKey}
            aria-label={`${MONTHS_RU[focus - 1]} ${year}`}
          >
            {WEEKDAYS_RU.map((w, i) => (
              <div className={`pc-wd ${i >= 5 ? 'is-wknd' : ''}`} key={w}>{w}</div>
            ))}
            {focusWeeks.flat().map(({ date, inMonth }, i) => {
              const key = dayKey(date)
              const entry = entryMap.get(key)
              const st = statusOf(date, entry)
              const isToday = key === todayKey
              const isCursor = key === cursorKey
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  className={[
                    'pc-day', `st-${st.toLowerCase()}`,
                    inMonth ? '' : 'is-out',
                    isToday ? 'is-today' : '',
                    isCursor ? 'is-cursor' : '',
                    isAdmin && inMonth ? 'is-clickable' : '',
                  ].join(' ')}
                  onClick={() => inMonth && openDay(date)}
                  disabled={!isAdmin || !inMonth}
                  aria-label={`${date.getDate()} ${MONTHS_RU[date.getMonth()]}${
                    entry?.descriptionRu ? ` — ${entry.descriptionRu}` : ''
                  }`}
                  aria-current={isToday ? 'date' : undefined}
                >
                  <span className="pc-day-num">
                    <span className="pc-day-num-inner">{date.getDate()}</span>
                  </span>
                  {inMonth && entry?.descriptionRu && (
                    <span className="pc-day-label" title={entry.descriptionRu}>
                      <i className="pc-day-mark" aria-hidden="true" />
                      <span className="pc-day-text">{entry.descriptionRu}</span>
                    </span>
                  )}
                  {inMonth && entry && !entry.descriptionRu && (
                    <span className="pc-day-label pc-day-label--bare" aria-hidden="true">
                      <i className="pc-day-mark" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* SPECIAL DAYS PANEL */}
        <section className="pc-special-panel">
          <div className="pc-special-head">
            <h2>Особые дни {year}</h2>
            <span className="pc-special-count">{specialDays.length}</span>
          </div>
          <DataPanel<CalendarDay>
            mode="client"
            columns={specialColumns}
            rows={specialDays}
            rowKey={d => d.id}
            loading={loading}
            caption={`Особые дни ${year}`}
            empty={`Нет особых дней за ${year} год.${isAdmin ? ' Нажмите «Импорт» или «Добавить день».' : ''}`}
            searchable
            searchText={specialSearchText}
            searchPlaceholder="Поиск по дате или описанию…"
            filters={specialFilters}
            clientFilter={specialClientFilter}
            comparator={specialComparator}
            defaultSort={{ key: 'date', dir: 'asc' }}
            panelStorageKey="calendar:special-days"
            columnConfig
            pageSize={10}
            toolbarActions={isAdmin && (
              <button className="pc-btn pc-btn--primary" onClick={openNew}>
                <Plus size={15} strokeWidth={2.4} aria-hidden="true" />
                Добавить день
              </button>
            )}
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
/* ── Modern minimal calendar — Linear/Vercel-inspired ───────────── */
.pc-root {
  --pc-radius:    14px;
  --pc-radius-sm: 10px;
  --pc-radius-xs: 8px;
  --pc-shadow-sm: 0 1px 2px rgba(0,0,0,.18);
  --pc-shadow-md: 0 4px 14px -4px rgba(0,0,0,.35), 0 2px 4px rgba(0,0,0,.18);
  --pc-shadow-lg: 0 20px 50px -12px rgba(0,0,0,.55);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  color: var(--dv3-text);
}
.pc-shell {
  max-width: 1240px; margin: 0 auto; padding: 28px 28px 56px;
  display: flex; flex-direction: column; gap: 20px;
}
@media (max-width: 640px) { .pc-shell { padding: 16px 14px 32px; gap: 14px; } }

/* BUTTONS */
.pc-btn {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: inherit; font-size: 13px; font-weight: 500;
  color: var(--dv3-text); cursor: pointer;
  background: var(--dv3-bg2); border: 1px solid var(--dv3-border2);
  padding: 8px 14px; border-radius: var(--pc-radius-sm);
  box-shadow: var(--pc-shadow-sm);
  transition: background .14s, border-color .14s, transform .08s, box-shadow .14s;
}
.pc-btn:hover { background: var(--dv3-bg3); border-color: var(--dv3-border-hi); }
.pc-btn:active { transform: translateY(1px); }
.pc-btn:disabled { opacity: .55; cursor: default; }
.pc-btn--primary {
  background: var(--dv3-accent); color: var(--dv3-bg);
  border-color: var(--dv3-accent);
  box-shadow: var(--pc-shadow-md);
}
.pc-btn--primary:hover {
  background: color-mix(in srgb, var(--dv3-accent) 88%, white);
  border-color: color-mix(in srgb, var(--dv3-accent) 88%, white);
}

@keyframes pc-shimmer { to { background-position: -200% 0; } }

/* ── FOCUS MONTH — Cron/Apple-Calendar style ─────────────────────── */
.pc-focus {
  position: relative;
  background:
    radial-gradient(120% 60% at 0% 0%, color-mix(in srgb, var(--dv3-accent) 8%, transparent) 0%, transparent 55%),
    var(--dv3-bg2);
  border: 1px solid var(--dv3-border);
  border-radius: 18px;
  padding: 20px 22px 22px;
  box-shadow: 0 1px 0 color-mix(in srgb, white 4%, transparent) inset,
              0 24px 60px -30px rgba(0,0,0,.55),
              0 4px 14px -8px rgba(0,0,0,.35);
}
.pc-focus.is-loading {
  min-height: 520px;
  background: linear-gradient(90deg, var(--dv3-bg2) 25%, var(--dv3-bg3) 50%, var(--dv3-bg2) 75%);
  background-size: 200% 100%;
  animation: pc-shimmer 1.3s infinite linear;
}
.pc-focus.is-loading > * { visibility: hidden; }

/* TOP STRIP — year tabs + legend */
.pc-yearbar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding-bottom: 16px; margin-bottom: 16px;
  border-bottom: 1px dashed color-mix(in srgb, var(--dv3-border) 80%, transparent);
}
.pc-years {
  display: inline-flex; gap: 2px;
  background: color-mix(in srgb, var(--dv3-bg3) 70%, transparent);
  border: 1px solid var(--dv3-border2);
  padding: 3px; border-radius: 999px;
}
.pc-years button {
  font-family: inherit;
  font-size: 12.5px; font-weight: 500; color: var(--dv3-text3);
  border: none; background: transparent; cursor: pointer;
  padding: 5px 13px; border-radius: 999px;
  transition: color .14s, background .14s;
  font-variant-numeric: tabular-nums;
}
.pc-years button:hover { color: var(--dv3-text); background: var(--dv3-bg3); }
.pc-years button.is-active {
  background: var(--dv3-text); color: var(--dv3-bg);
  font-weight: 600;
}
.pc-year-shift {
  display: grid; place-items: center;
  width: 30px; height: 30px;
  border: 1px solid var(--dv3-border2);
  background: transparent; color: var(--dv3-text3); cursor: pointer;
  border-radius: 999px;
  transition: background .14s, border-color .14s, color .14s;
}
.pc-year-shift:hover { background: var(--dv3-bg3); border-color: var(--dv3-border-hi); color: var(--dv3-text); }

.pc-legend {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin-left: auto;
}
.pc-leg {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--dv3-text3);
}
.pc-leg .sw {
  width: 8px; height: 8px; border-radius: 50%;
}
.sw.workday { background: color-mix(in srgb, var(--dv3-text3) 55%, transparent); }
.sw.weekend { background: color-mix(in srgb, var(--dv3-text4) 70%, transparent); }
.sw.holiday { background: var(--dv3-zone-down); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dv3-zone-down) 22%, transparent); }
.sw.shift   { background: var(--dv3-zone-warn); box-shadow: 0 0 0 2px color-mix(in srgb, var(--dv3-zone-warn) 22%, transparent); }

/* MONTH HEAD — big title left, stats + nav right */
.pc-focus-head {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 14px;
}
.pc-focus-title { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.pc-focus-head h2 {
  font-family: inherit;
  font-size: 28px; font-weight: 700; margin: 0;
  letter-spacing: -0.025em; line-height: 1.1;
  color: var(--dv3-text);
  text-transform: none;
}
.pc-focus-meter {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 12px; border-radius: 999px;
  font-size: 12px; color: var(--dv3-text3);
  background: color-mix(in srgb, var(--dv3-bg3) 60%, transparent);
  border: 1px solid var(--dv3-border2);
}
.pc-focus-meter span + span::before {
  content: '·'; margin: 0 6px; color: var(--dv3-text4);
}
.pc-focus-meter b {
  font-weight: 600; color: var(--dv3-text);
  font-variant-numeric: tabular-nums; margin-right: 3px;
}
.pc-focus-nav {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border: 1px solid var(--dv3-border2);
  background: color-mix(in srgb, var(--dv3-bg3) 60%, transparent);
  color: var(--dv3-text3); cursor: pointer;
  border-radius: 999px;
  transition: background .14s, border-color .14s, color .14s;
}
.pc-focus-nav:hover:not(:disabled) { background: var(--dv3-bg3); border-color: var(--dv3-border-hi); color: var(--dv3-text); }
.pc-focus-nav:disabled { opacity: .3; cursor: default; }

.pc-tag {
  font-size: 10.5px; font-weight: 600; letter-spacing: .04em;
  text-transform: uppercase; color: var(--dv3-accent);
  background: var(--dv3-accent-bg);
  padding: 3px 8px; border-radius: 4px;
  align-self: center;
}

/* GRID — borderless, subtle alternating wash, hover fill */
.pc-focus-grid {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
  outline: none;
  padding-top: 4px;
}
.pc-focus-grid:focus-visible { outline: 2px solid var(--dv3-accent); outline-offset: 4px; border-radius: 10px; }
.pc-wd {
  font-size: 10.5px; font-weight: 600; letter-spacing: .08em;
  text-transform: uppercase; color: var(--dv3-text4);
  text-align: center; padding: 6px 0 10px;
}
.pc-wd.is-wknd { color: color-mix(in srgb, var(--dv3-text4) 70%, var(--dv3-zone-down)); }

.pc-day {
  position: relative;
  min-height: 92px;
  display: flex; flex-direction: column; align-items: stretch;
  border: 0;
  padding: 8px 10px 10px; cursor: default;
  background: transparent;
  text-align: left; font: inherit;
  border-radius: 10px;
  transition: background .14s, box-shadow .14s;
  overflow: hidden;
}
.pc-day.st-weekend { background: color-mix(in srgb, var(--dv3-bg3) 35%, transparent); }
.pc-day.st-holiday { background: color-mix(in srgb, var(--dv3-zone-down) 9%, transparent); }
.pc-day.st-shift   { background: color-mix(in srgb, var(--dv3-zone-warn) 9%, transparent); }
.pc-day.is-out { opacity: .3; }
.pc-day.is-clickable:not(.is-out) { cursor: pointer; }
.pc-day.is-clickable:not(.is-out):hover {
  background: color-mix(in srgb, var(--dv3-text) 6%, var(--dv3-bg3));
  box-shadow: inset 0 0 0 1px var(--dv3-border-hi);
}
.pc-day.is-cursor {
  box-shadow: inset 0 0 0 2px var(--dv3-accent);
}

/* DATE NUMBER — today gets filled accent disc */
.pc-day-num {
  display: inline-flex; align-items: center; justify-content: flex-start;
  font-family: inherit;
  font-size: 13px; font-weight: 500; color: var(--dv3-text);
  font-variant-numeric: tabular-nums;
  margin-bottom: auto;
}
.pc-day-num-inner {
  display: inline-grid; place-items: center;
  min-width: 26px; height: 26px; padding: 0 6px;
  border-radius: 999px;
  line-height: 1;
}
.pc-day.st-holiday .pc-day-num-inner { color: var(--dv3-zone-down); font-weight: 600; }
.pc-day.st-weekend .pc-day-num-inner { color: var(--dv3-text3); }
.pc-day.is-out .pc-day-num-inner { color: var(--dv3-text4); }
.pc-day.is-today .pc-day-num-inner {
  background: var(--dv3-accent);
  color: var(--dv3-bg);
  font-weight: 700;
  box-shadow: 0 4px 12px -4px color-mix(in srgb, var(--dv3-accent) 60%, transparent);
}

/* EVENT MARKER — bottom strip with dot + label */
.pc-day-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 10.5px; line-height: 1.25; font-weight: 500;
  color: var(--dv3-zone-down);
  margin-top: 6px; padding: 4px 6px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--dv3-zone-down) 14%, transparent);
  white-space: nowrap; overflow: hidden;
}
.pc-day-label.pc-day-label--bare {
  width: fit-content; padding: 3px 5px;
}
.pc-day-mark {
  flex: 0 0 auto;
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--dv3-zone-down);
}
.pc-day-text {
  overflow: hidden; text-overflow: ellipsis;
}
.pc-day.st-shift .pc-day-label {
  color: var(--dv3-zone-warn);
  background: color-mix(in srgb, var(--dv3-zone-warn) 14%, transparent);
}
.pc-day.st-shift .pc-day-mark { background: var(--dv3-zone-warn); }

/* SPECIAL DAYS PANEL */
.pc-special-panel {
  display: flex; flex-direction: column; gap: 12px;
}
.pc-special-head {
  display: flex; align-items: center; gap: 10px;
  padding: 0 2px;
}
.pc-special-head h2 {
  font-family: inherit;
  font-size: 18px; font-weight: 600; margin: 0;
  letter-spacing: -0.01em; text-transform: none; color: var(--dv3-text);
}
.pc-special-count {
  font-family: inherit;
  font-size: 12px; font-weight: 600; color: var(--dv3-accent);
  background: var(--dv3-accent-bg);
  border: 1px solid color-mix(in srgb, var(--dv3-accent) 40%, transparent);
  padding: 2px 10px; border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
.pc-dash { color: var(--dv3-text4); }
.pc-icon-btn {
  display: inline-grid; place-items: center;
  width: 30px; height: 30px;
  border: 1px solid var(--dv3-border2);
  background: var(--dv3-bg3); color: var(--dv3-text3); cursor: pointer;
  border-radius: 8px;
  transition: background .14s, border-color .14s, color .14s;
}
.pc-icon-btn:hover { background: var(--dv3-bg2); border-color: var(--dv3-border-hi); color: var(--dv3-text); }

.pc-chip {
  display: inline-flex; align-items: center;
  font-family: inherit;
  font-size: 12px; font-weight: 500; letter-spacing: 0;
  text-transform: none;
  border: 1px solid var(--dv3-border2);
  padding: 3px 10px; border-radius: 999px;
  background: var(--dv3-bg3); color: var(--dv3-text3);
}
.pc-chip.holiday {
  background: color-mix(in srgb, var(--dv3-zone-down) 14%, var(--dv3-bg2));
  color: var(--dv3-zone-down);
  border-color: color-mix(in srgb, var(--dv3-zone-down) 40%, transparent);
}
.pc-chip.shift {
  background: color-mix(in srgb, var(--dv3-zone-warn) 14%, var(--dv3-bg2));
  color: var(--dv3-zone-warn);
  border-color: color-mix(in srgb, var(--dv3-zone-warn) 40%, transparent);
}
.pc-chip.dayoff { background: var(--dv3-bg3); color: var(--dv3-text3); }

/* MODAL */
.pc-modal-scrim {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(4px);
  display: grid; place-items: center; padding: 20px;
  animation: pc-fade .18s ease;
}
@keyframes pc-fade { from { opacity: 0; } }
.pc-modal {
  width: 100%; max-width: 460px;
  background: var(--dv3-bg2); border: 1px solid var(--dv3-border);
  border-radius: var(--pc-radius);
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
  color: var(--dv3-text);
  box-shadow: var(--pc-shadow-lg);
  animation: pc-pop .18s cubic-bezier(.2,.7,.3,1.2);
  overflow: hidden;
}
@keyframes pc-pop { from { transform: translateY(8px) scale(.97); opacity: 0; } }
.pc-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px 16px; border-bottom: 1px solid var(--dv3-border);
}
.pc-modal-head h3 {
  font-family: inherit;
  font-size: 16px; font-weight: 600; margin: 0;
  letter-spacing: -0.01em; text-transform: none; color: var(--dv3-text);
}
.pc-modal-x {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border: 1px solid var(--dv3-border2); background: var(--dv3-bg3);
  color: var(--dv3-text3); cursor: pointer;
  border-radius: 8px;
  transition: background .14s, color .14s;
}
.pc-modal-x:hover { background: var(--dv3-bg2); color: var(--dv3-text); }
.pc-modal-body { padding: 20px 22px; }
.pc-modal-foot {
  display: flex; align-items: center; gap: 8px;
  padding: 16px 22px 20px; border-top: 1px solid var(--dv3-border);
  background: color-mix(in srgb, var(--dv3-bg3) 50%, transparent);
}
.pc-modal-foot-main { display: flex; gap: 8px; margin-left: auto; }

@media (max-width: 900px) {
  .pc-day { min-height: 64px; }
  .pc-focus { padding: 16px; }
  .pc-focus-head h2 { font-size: 18px; }
}
@media (max-width: 640px) {
  .pc-legend { margin-left: 0; padding-left: 0; width: 100%; }
  .pc-focus { padding: 14px; }
  .pc-focus-meter { display: none; }
  .pc-day { min-height: 52px; padding: 6px 7px; }
  .pc-day-num { font-size: 12.5px; }
  .pc-day-label { font-size: 10px; }
}
`

