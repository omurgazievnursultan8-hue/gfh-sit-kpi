import { useEffect, useMemo, useState } from 'react'
import {
  Check, X, Pencil, ShieldCheck, ClipboardCheck, FileText, Settings2,
  RotateCcw, AlertCircle,
} from 'lucide-react'
import { SystemSetting, settingsApi } from './settingsApi'
import { DASHBOARD_CSS } from '../dashboard/dashboardStyles'
import { DV3_FORM_CSS } from '../dashboard/dv3FormStyles'

const PLACEHOLDER = '··'

/* ── Setting metadata ─────────────────────────────────────────────── */

type CatKey = 'security' | 'evaluation' | 'compliance' | 'other'
type FieldType = 'number' | 'text' | 'select'

interface SettingMeta {
  cat: CatKey
  label: string
  hint?: string
  type: FieldType
  unit?: string
  min?: number
  max?: number
  options?: { value: string; label: string }[]
}

const FORMULA_OPTIONS = [
  { value: 'FORMULA_1', label: 'Формула 1 — линейная' },
  { value: 'FORMULA_2', label: 'Формула 2 — взвешенная' },
  { value: 'FORMULA_3', label: 'Формула 3 — пороговая' },
  { value: 'FORMULA_4', label: 'Формула 4 — комбинированная' },
]

const META: Record<string, SettingMeta> = {
  idle_timeout_minutes: {
    cat: 'security', type: 'number', unit: 'мин', min: 1, max: 480,
    label: 'Таймаут бездействия',
    hint: 'Время до автоматического выхода неактивного пользователя.',
  },
  password_expiry_days: {
    cat: 'security', type: 'number', unit: 'дн', min: 1, max: 365,
    label: 'Срок действия пароля',
    hint: 'Через сколько дней пароль требует обязательной смены.',
  },
  evaluation_period_days: {
    cat: 'evaluation', type: 'number', unit: 'дн', min: 1, max: 365,
    label: 'Длительность периода оценки',
    hint: 'Стандартная продолжительность одного периода оценки.',
  },
  appeal_deadline_days: {
    cat: 'evaluation', type: 'number', unit: 'дн', min: 1, max: 90,
    label: 'Срок подачи апелляции',
    hint: 'Сколько дней после результата сотрудник может подать апелляцию.',
  },
  auto_agree_timeout_hours: {
    cat: 'evaluation', type: 'number', unit: 'ч', min: 1, max: 720,
    label: 'Авто-согласие',
    hint: 'Оценка считается принятой, если сотрудник не ответил за это время.',
  },
  rating_formula: {
    cat: 'evaluation', type: 'select', options: FORMULA_OPTIONS,
    label: 'Формула рейтинга',
    hint: 'Алгоритм расчёта итогового рейтинга. Результат всегда ≥ 0.',
  },
  pdpa_version: {
    cat: 'compliance', type: 'text',
    label: 'Версия PDPA',
    hint: 'Версия согласия на обработку персональных данных. Смена требует повторного согласия.',
  },
}

const CATS: { key: CatKey; title: string; caption: string; Icon: typeof ShieldCheck }[] = [
  { key: 'security',   title: 'Безопасность',  caption: 'Сессии и доступ',          Icon: ShieldCheck },
  { key: 'evaluation', title: 'Оценка',        caption: 'Периоды, апелляции, рейтинг', Icon: ClipboardCheck },
  { key: 'compliance', title: 'Соответствие',  caption: 'Персональные данные',       Icon: FileText },
  { key: 'other',      title: 'Прочее',        caption: 'Незаведённые параметры',    Icon: Settings2 },
]

function metaFor(key: string): SettingMeta {
  return META[key] || { cat: 'other', type: 'text', label: key }
}

function displayValue(s: SystemSetting): string {
  const m = metaFor(s.key)
  if (m.type === 'select') {
    const opt = m.options?.find(o => o.value === s.value)
    return opt ? opt.label : s.value
  }
  if (m.type === 'number' && m.unit) return `${s.value} ${m.unit}`
  return s.value
}

/* ── Page ─────────────────────────────────────────────────────────── */

export function SettingsPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      setSettings(await settingsApi.list())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSettings() }, [])

  const startEdit = (s: SystemSetting) => {
    setEditingKey(s.key)
    setEditValue(s.value)
    setError('')
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setEditValue('')
    setError('')
  }

  const saveEdit = async (key: string) => {
    if (!editValue.trim()) { setError('Значение не может быть пустым'); return }
    setSaving(true); setError('')
    try {
      const updated = await settingsApi.update(key, editValue.trim())
      setSettings(prev => prev.map(s => (s.key === key ? updated : s)))
      setEditingKey(null)
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const grouped = useMemo(() => {
    const byCat = new Map<CatKey, SystemSetting[]>()
    for (const s of settings) {
      const cat = metaFor(s.key).cat
      if (!byCat.has(cat)) byCat.set(cat, [])
      byCat.get(cat)!.push(s)
    }
    for (const list of byCat.values()) {
      list.sort((a, b) => metaFor(a.key).label.localeCompare(metaFor(b.key).label, 'ru'))
    }
    return byCat
  }, [settings])

  const lastUpdated = useMemo(() => {
    const stamps = settings.map(s => s.updatedAt).filter(Boolean).sort()
    return stamps.length ? new Date(stamps[stamps.length - 1]) : null
  }, [settings])

  /* ── time / clock ──────────────────────────────────────────────────── */
  const hours = now.getHours()
  const timeGreeting = hours < 12 ? 'Доброе утро' : hours < 18 ? 'Добрый день' : 'Добрый вечер'
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const todayLine = `${datePart} · ${hh}:${mm}`
  const clockKgt = `${hh}:${mm}`

  const updatedLabel = lastUpdated
    ? `изменено ${lastUpdated.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`
    : ''

  const visibleCats = CATS.filter(c => (grouped.get(c.key)?.length ?? 0) > 0)

  return (
    <>
      <div className="dv3-root">
        <style>{DASHBOARD_CSS}</style>
        <style>{DV3_FORM_CSS}</style>

        <div className="dv3-terminal" style={{ maxWidth: 960 }}>
        </div>
      </div>

      {/* SETTINGS PANELS */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px 48px' }}>
        <div className="dv3-banner" style={{ marginBottom: 18 }}>
          Глобальные параметры платформы. Изменения вступают в силу немедленно и
          применяются ко всем пользователям.
          <button
            className="dv3-btn"
            onClick={loadSettings}
            disabled={loading}
            title="Обновить"
            style={{ float: 'right', marginTop: -4 }}
          >
            <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
            Обновить
          </button>
        </div>

        <div className="dv3-form">
          {CATS.map(({ key, title, caption, Icon }) => {
            const items = grouped.get(key)
            if (!items || items.length === 0) return null
            return (
              <section className="dv3-panel dv3-panel--accent" key={key}>
                <div className="dv3-section-head">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={14} strokeWidth={2} aria-hidden="true" />
                    {title} · {caption}
                  </span>
                  <span>{items.length}</span>
                </div>

                {items.map(s => {
                  const m = metaFor(s.key)
                  const editing = editingKey === s.key
                  return (
                    <div className="dv3-setrow" key={s.key}>
                      <div className="dv3-setrow-main">
                        <span className="dv3-setrow-title">{m.label}</span>
                        {(m.hint || s.description) && (
                          <span className="dv3-setrow-desc">{m.hint || s.description}</span>
                        )}
                        <span className="dv3-help" style={{ marginTop: 2 }}>{s.key}</span>
                        {editing && error && (
                          <span
                            className="dv3-banner dv3-banner--error"
                            role="alert"
                            style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                            {error}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {editing ? (
                          <>
                            {m.type === 'select' ? (
                              <select
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                autoFocus
                                className="dv3-select"
                                aria-label={m.label}
                              >
                                {m.options!.map(o => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={m.type === 'number' ? 'number' : 'text'}
                                value={editValue}
                                min={m.min}
                                max={m.max}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEdit(s.key)
                                  if (e.key === 'Escape') cancelEdit()
                                }}
                                autoFocus
                                className={`dv3-input${m.type === 'number' ? ' dv3-input--num' : ''}`}
                                aria-label={m.label}
                              />
                            )}
                            {m.unit && <span className="dv3-help">{m.unit}</span>}
                            <button
                              onClick={() => saveEdit(s.key)}
                              disabled={saving}
                              className="dv3-btn dv3-btn--primary"
                              title="Сохранить"
                            >
                              <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="dv3-btn dv3-btn--danger"
                              title="Отмена"
                            >
                              <X size={15} strokeWidth={2.4} aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="dv3-help" style={{ fontSize: 13 }}>{displayValue(s)}</span>
                            <button
                              onClick={() => startEdit(s)}
                              className="dv3-btn"
                              aria-label={`Изменить «${m.label}»`}
                            >
                              <Pencil size={13} strokeWidth={2} aria-hidden="true" />
                              Изменить
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}
