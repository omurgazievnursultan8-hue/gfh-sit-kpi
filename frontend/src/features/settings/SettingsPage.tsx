import { useEffect, useMemo, useState } from 'react'
import {
  Check, X, Pencil, ShieldCheck, ClipboardCheck, FileText, Settings2,
  RotateCcw, AlertCircle, Clock,
} from 'lucide-react'
import { SystemSetting, settingsApi } from './settingsApi'

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

  return (
    <div className="set-root">
      <style>{CSS}</style>

      {/* HEAD */}
      <header className="set-head">
        <nav className="set-crumb" aria-label="Хлебные крошки">
          <a href="/">Главная</a>
          <span aria-hidden="true">/</span>
          <a href="/admin">Админ-панель</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Настройки</span>
        </nav>
        <h1>Системные настройки</h1>
        <div className="set-meta">
          <span>Параметров: <strong>{settings.length}</strong></span>
          {lastUpdated && (
            <>
              <span aria-hidden="true">·</span>
              <span className="set-meta-time" title={lastUpdated.toISOString()}>
                <Clock size={12} strokeWidth={2} aria-hidden="true" />
                Изменено {lastUpdated.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </span>
            </>
          )}
          <button className="set-refresh" onClick={loadSettings} disabled={loading} title="Обновить">
            <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
            Обновить
          </button>
        </div>
        <p className="set-subtitle">
          Глобальные параметры платформы. Изменения вступают в силу немедленно и
          применяются ко всем пользователям.
        </p>
      </header>

      {loading ? (
        <div className="set-cards">
          {[0, 1, 2].map(i => (
            <div className="set-card set-skeleton" key={i} aria-hidden="true">
              <div className="set-sk-bar set-sk-head" />
              <div className="set-sk-bar" />
              <div className="set-sk-bar" />
            </div>
          ))}
        </div>
      ) : (
        <div className="set-cards">
          {CATS.map(({ key, title, caption, Icon }) => {
            const items = grouped.get(key)
            if (!items || items.length === 0) return null
            return (
              <section className={`set-card cat-${key}`} key={key}>
                <div className="set-card-head">
                  <span className="set-card-icon" aria-hidden="true">
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <div>
                    <h2>{title}</h2>
                    <span className="set-card-caption">{caption}</span>
                  </div>
                  <span className="set-card-count">{items.length}</span>
                </div>

                <ul className="set-list">
                  {items.map(s => {
                    const m = metaFor(s.key)
                    const editing = editingKey === s.key
                    return (
                      <li className={`set-row ${editing ? 'is-editing' : ''}`} key={s.key}>
                        <div className="set-row-info">
                          <div className="set-row-label">{m.label}</div>
                          {(m.hint || s.description) && (
                            <div className="set-row-hint">{m.hint || s.description}</div>
                          )}
                          <code className="set-row-key">{s.key}</code>
                        </div>

                        <div className="set-row-control">
                          {editing ? (
                            <div className="set-edit">
                              <div className="set-edit-field">
                                {m.type === 'select' ? (
                                  <select
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    autoFocus
                                    className="set-input"
                                    aria-label={m.label}
                                  >
                                    {m.options!.map(o => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <>
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
                                      className="set-input"
                                      aria-label={m.label}
                                    />
                                    {m.unit && <span className="set-input-unit">{m.unit}</span>}
                                  </>
                                )}
                              </div>
                              <div className="set-edit-actions">
                                <button
                                  onClick={() => saveEdit(s.key)}
                                  disabled={saving}
                                  className="set-btn set-btn-save"
                                  title="Сохранить"
                                >
                                  <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="set-btn set-btn-cancel"
                                  title="Отмена"
                                >
                                  <X size={15} strokeWidth={2.4} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="set-value">{displayValue(s)}</span>
                              <button
                                onClick={() => startEdit(s)}
                                className="set-btn set-btn-edit"
                                aria-label={`Изменить «${m.label}»`}
                              >
                                <Pencil size={13} strokeWidth={2} aria-hidden="true" />
                                Изменить
                              </button>
                            </>
                          )}
                        </div>

                        {editing && error && (
                          <div className="set-row-error" role="alert">
                            <AlertCircle size={13} strokeWidth={2} aria-hidden="true" />
                            {error}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Scoped styles ────────────────────────────────────────────────── */

const CSS = `
.set-root {
  --ink: #14213d;
  --muted: #64748b;
  --line: #e7e9ef;
  --paper: #ffffff;
  max-width: 880px;
  margin: 0 auto;
  padding-bottom: 64px;
  color: var(--ink);
}

/* HEAD */
.set-head { margin-bottom: 28px; }
.set-crumb {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; color: var(--muted); margin-bottom: 12px;
}
.set-crumb a { color: var(--muted); text-decoration: none; }
.set-crumb a:hover { color: #1e40af; text-decoration: underline; }
.set-crumb span[aria-current] { color: var(--ink); font-weight: 600; }
.set-head h1 {
  font-family: "Source Serif Pro", Georgia, serif;
  font-size: 30px; font-weight: 600; line-height: 1.1;
  letter-spacing: -0.015em; margin: 0;
}
.set-meta {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: var(--muted); margin-top: 10px;
}
.set-meta strong { color: var(--ink); font-weight: 700; }
.set-meta-time { display: inline-flex; align-items: center; gap: 5px; }
.set-refresh {
  display: inline-flex; align-items: center; gap: 5px;
  margin-left: auto;
  font-size: 12px; font-weight: 600; color: var(--muted);
  background: transparent; border: 1px solid var(--line);
  border-radius: 7px; padding: 5px 10px; cursor: pointer;
  transition: all .15s ease;
}
.set-refresh:hover:not(:disabled) { border-color: #1e40af; color: #1e40af; }
.set-refresh:disabled { opacity: .5; cursor: default; }
.set-subtitle {
  margin: 14px 0 0; max-width: 60ch;
  font-size: 13.5px; line-height: 1.6; color: var(--muted);
}

/* CARDS */
.set-cards { display: flex; flex-direction: column; gap: 18px; }
.set-card {
  position: relative;
  background: var(--paper);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(20,33,61,.04);
}
.set-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0;
  width: 3px; background: var(--accent);
}
.cat-security   { --accent: #b45309; --accent-soft: #fef3e2; }
.cat-evaluation { --accent: #1e40af; --accent-soft: #e8edfb; }
.cat-compliance { --accent: #15803d; --accent-soft: #e6f4ea; }
.cat-other      { --accent: #64748b; --accent-soft: #eef1f5; }

.set-card-head {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; border-bottom: 1px solid var(--line);
}
.set-card-icon {
  display: grid; place-items: center;
  width: 34px; height: 34px; flex-shrink: 0;
  border-radius: 9px;
  background: var(--accent-soft); color: var(--accent);
}
.set-card-head h2 {
  font-family: "Source Serif Pro", Georgia, serif;
  font-size: 17px; font-weight: 600; margin: 0; line-height: 1.2;
}
.set-card-caption { font-size: 12px; color: var(--muted); }
.set-card-count {
  margin-left: auto;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px; font-weight: 600;
  color: var(--accent); background: var(--accent-soft);
  border-radius: 999px; padding: 3px 9px;
}

/* ROWS */
.set-list { list-style: none; margin: 0; padding: 0; }
.set-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px 24px;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--line);
  transition: background .12s ease;
}
.set-row:last-child { border-bottom: none; }
.set-row:hover { background: #fafbfd; }
.set-row.is-editing { background: var(--accent-soft); }

.set-row-info { min-width: 0; }
.set-row-label {
  font-size: 14px; font-weight: 600; color: var(--ink);
}
.set-row-hint {
  font-size: 12.5px; line-height: 1.5; color: var(--muted);
  margin-top: 3px; max-width: 48ch;
}
.set-row-key {
  display: inline-block; margin-top: 6px;
  font-family: "JetBrains Mono", monospace;
  font-size: 10.5px; color: #94a3b8;
  background: #f4f5f8; border-radius: 4px; padding: 1px 6px;
}

/* CONTROL */
.set-row-control {
  display: flex; align-items: center; gap: 10px;
  justify-content: flex-end;
}
.set-value {
  font-family: "JetBrains Mono", monospace;
  font-size: 13px; font-weight: 600; color: var(--ink);
  background: #f4f5f8; border: 1px solid var(--line);
  border-radius: 7px; padding: 5px 11px;
  white-space: nowrap;
}

.set-btn {
  display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--line); border-radius: 7px;
  background: var(--paper); cursor: pointer;
  font-size: 12px; font-weight: 600;
  transition: all .14s ease;
}
.set-btn-edit { padding: 6px 11px; color: var(--muted); }
.set-btn-edit:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.set-btn-save, .set-btn-cancel {
  width: 32px; height: 32px; justify-content: center; padding: 0;
}
.set-btn-save { background: #15803d; border-color: #15803d; color: #fff; }
.set-btn-save:hover:not(:disabled) { background: #166534; }
.set-btn-cancel { color: var(--muted); }
.set-btn-cancel:hover:not(:disabled) { border-color: #dc2626; color: #dc2626; background: #fef2f2; }
.set-btn:disabled { opacity: .55; cursor: default; }

/* EDIT */
.set-edit { display: flex; align-items: center; gap: 8px; }
.set-edit-field { position: relative; display: flex; align-items: center; }
.set-input {
  font-family: "JetBrains Mono", monospace;
  font-size: 13px; color: var(--ink);
  border: 1.5px solid var(--accent); border-radius: 7px;
  padding: 6px 10px; width: 168px;
  background: var(--paper);
}
.set-input:focus { outline: none; box-shadow: 0 0 0 3px var(--accent-soft); }
.set-edit-field:has(.set-input-unit) .set-input { padding-right: 42px; }
.set-input-unit {
  position: absolute; right: 10px;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px; font-weight: 600; color: var(--muted);
  pointer-events: none;
}
.set-edit-actions { display: flex; gap: 6px; }

.set-row-error {
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 500; color: #dc2626;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 7px; padding: 6px 10px;
}

/* SKELETON */
.set-skeleton { padding: 20px; }
.set-sk-bar {
  height: 14px; border-radius: 6px; margin-bottom: 14px;
  background: linear-gradient(90deg,#eef0f4 25%,#f6f7f9 50%,#eef0f4 75%);
  background-size: 200% 100%;
  animation: set-shimmer 1.3s infinite linear;
}
.set-sk-bar:last-child { margin-bottom: 0; width: 70%; }
.set-sk-head { width: 40%; height: 20px; }
@keyframes set-shimmer { to { background-position: -200% 0; } }

@media (max-width: 560px) {
  .set-row { grid-template-columns: 1fr; }
  .set-row-control { justify-content: flex-start; }
  .set-input { width: 140px; }
}
`
