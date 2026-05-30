import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, X, Pencil, RotateCcw, AlertCircle } from 'lucide-react'
import { SystemSetting, settingsApi } from './settingsApi'
import { DataPanel, type Column } from '../../components/datapanel/DataPanel'

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

const CAT_LABEL: Record<CatKey, string> = {
  security:   'Безопасность',
  evaluation: 'Оценка',
  compliance: 'Соответствие',
  other:      'Прочее',
}

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

function formatUpdatedAt(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PANEL_KEY = 'admin.settings.panel'

const SETTINGS_PAGE_CSS = `
.sp-shell { max-width: 1200px; margin: 0 auto; padding: 24px 32px 48px; display: flex; flex-direction: column; gap: 16px; }
.sp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.sp-header-text { font-size: 13px; color: var(--ink-soft, #4d5544); line-height: 1.5; max-width: 760px; }
.sp-refresh-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; padding: 6px 12px; border-radius: 6px;
  border: 1px solid var(--line); background: var(--surface); color: var(--ink-soft);
  cursor: pointer; transition: background 0.12s, border-color 0.12s;
}
.sp-refresh-btn:hover:not(:disabled) { background: var(--bg-soft, #ebe6db); }
.sp-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sp-key { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--ink-faint); }
.sp-label { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.sp-hint { font-size: 11.5px; color: var(--ink-faint); line-height: 1.4; margin-top: 2px; max-width: 520px; }
.sp-value { font-size: 13px; color: var(--ink); font-variant-numeric: tabular-nums; }
.sp-edit-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sp-edit-input {
  font: inherit; font-size: 13px;
  padding: 5px 8px; border: 1px solid var(--line); border-radius: 6px;
  background: var(--surface); color: var(--ink);
  min-width: 0; width: 160px;
}
.sp-edit-input--num { width: 110px; font-variant-numeric: tabular-nums; }
.sp-edit-input:focus { outline: 2px solid var(--accent-2, #2f9e6d); outline-offset: 1px; }
.sp-unit { font-size: 11px; color: var(--ink-faint); }
.sp-action-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 4px;
  font-size: 11px; font-weight: 500;
  padding: 5px 10px; border-radius: 6px; border: 1px solid var(--line);
  background: var(--surface); color: var(--ink-soft); cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.sp-action-btn:hover:not(:disabled) { background: var(--bg-soft, #ebe6db); color: var(--ink); }
.sp-action-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.sp-action-btn--primary { background: var(--accent-2, #2f9e6d); color: #fff; border-color: var(--accent-2, #2f9e6d); }
.sp-action-btn--primary:hover:not(:disabled) { filter: brightness(1.08); }
.sp-action-btn--danger { color: var(--danger, #c0533f); border-color: var(--danger, #c0533f); background: transparent; }
.sp-action-btn--danger:hover:not(:disabled) { background: color-mix(in srgb, var(--danger, #c0533f) 10%, transparent); color: var(--danger, #c0533f); }
.sp-cat-pill {
  display: inline-block; font-size: 10.5px; font-weight: 500;
  padding: 2px 8px; border-radius: 999px;
  background: var(--bg-soft, #ebe6db); color: var(--ink-soft);
  letter-spacing: 0.02em;
}
.sp-card {
  display: flex; flex-direction: column; gap: 10px;
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 12px; padding: 14px 16px;
  box-shadow: var(--shadow-sm);
  min-height: 100%;
}
.sp-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.sp-card-value-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding-top: 8px; border-top: 1px dashed var(--line);
}
.sp-card-value { font-size: 15px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.sp-card-meta { font-size: 10.5px; color: var(--ink-faint); }
.sp-error {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--danger, #c0533f); margin-top: 4px;
}
`

interface Row extends SystemSetting {
  _label: string
  _cat: CatKey
  _catLabel: string
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

  const rows: Row[] = useMemo(() => settings.map(s => {
    const m = metaFor(s.key)
    return { ...s, _label: m.label, _cat: m.cat, _catLabel: CAT_LABEL[m.cat] }
  }), [settings])

  const categoryOptions = useMemo(() => {
    const seen = new Set<CatKey>()
    rows.forEach(r => seen.add(r._cat))
    const opts = (Object.keys(CAT_LABEL) as CatKey[])
      .filter(k => seen.has(k))
      .map(k => ({ value: k, label: CAT_LABEL[k] }))
    return [{ value: '', label: 'Все категории' }, ...opts]
  }, [rows])

  const columns: Column<Row>[] = [
    {
      key: 'label', header: 'Параметр', sortable: true, hideable: false,
      render: (r) => {
        const m = metaFor(r.key)
        const editing = editingKey === r.key
        return (
          <div>
            <div className="sp-label">{r._label}</div>
            {m.hint && <div className="sp-hint">{m.hint}</div>}
            <div className="sp-key" style={{ marginTop: 2 }}>{r.key}</div>
            {editing && error && (
              <div className="sp-error" role="alert">
                <AlertCircle size={12} strokeWidth={2} aria-hidden="true" />
                {error}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'value', header: 'Значение',
      render: (r) => {
        const m = metaFor(r.key)
        const editing = editingKey === r.key
        if (!editing) {
          return <span className="sp-value">{displayValue(r)}</span>
        }
        return (
          <div className="sp-edit-row" onClick={e => e.stopPropagation()}>
            {m.type === 'select' ? (
              <select
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus
                className="sp-edit-input"
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
                  if (e.key === 'Enter') saveEdit(r.key)
                  if (e.key === 'Escape') cancelEdit()
                }}
                autoFocus
                className={`sp-edit-input${m.type === 'number' ? ' sp-edit-input--num' : ''}`}
                aria-label={m.label}
              />
            )}
            {m.unit && <span className="sp-unit">{m.unit}</span>}
          </div>
        )
      },
    },
    {
      key: 'category', header: 'Категория', sortable: true,
      render: (r) => <span className="sp-cat-pill">{r._catLabel}</span>,
    },
    {
      key: 'updatedAt', header: 'Изменено', sortable: true,
      render: (r) => (
        <span className="sp-key" style={{ fontSize: 12 }}>{formatUpdatedAt(r.updatedAt)}</span>
      ),
    },
    {
      key: 'actions', header: 'Действия', align: 'right', srOnlyHeader: true, hideable: false,
      render: (r) => {
        const editing = editingKey === r.key
        return (
          <div onClick={e => e.stopPropagation()} className="sp-edit-row" style={{ justifyContent: 'flex-end' }}>
            {editing ? (
              <>
                <button
                  type="button"
                  className="sp-action-btn sp-action-btn--primary"
                  onClick={() => saveEdit(r.key)}
                  disabled={saving}
                  title="Сохранить"
                  aria-label="Сохранить"
                >
                  <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="sp-action-btn sp-action-btn--danger"
                  onClick={cancelEdit}
                  disabled={saving}
                  title="Отмена"
                  aria-label="Отмена"
                >
                  <X size={13} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="sp-action-btn"
                onClick={() => startEdit(r)}
                aria-label={`Изменить «${r._label}»`}
              >
                <Pencil size={11} strokeWidth={2} aria-hidden="true" />
                Изменить
              </button>
            )}
          </div>
        )
      },
    },
  ]

  const searchText = (r: Row) => `${r._label} ${r.key} ${r._catLabel} ${r.value}`

  const clientFilter = (r: Row, v: Record<string, string>) => {
    if (v.category && r._cat !== v.category) return false
    return true
  }

  const renderCard = (r: Row): ReactNode => {
    const m = metaFor(r.key)
    const editing = editingKey === r.key
    return (
      <div className="sp-card">
        <div className="sp-card-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="sp-label">{r._label}</div>
            <div className="sp-key" style={{ marginTop: 2 }}>{r.key}</div>
          </div>
          <span className="sp-cat-pill">{r._catLabel}</span>
        </div>

        {m.hint && <div className="sp-hint" style={{ maxWidth: 'none' }}>{m.hint}</div>}

        {editing && error && (
          <div className="sp-error" role="alert">
            <AlertCircle size={12} strokeWidth={2} aria-hidden="true" />
            {error}
          </div>
        )}

        <div className="sp-card-value-row">
          {editing ? (
            <div className="sp-edit-row" style={{ flex: 1 }}>
              {m.type === 'select' ? (
                <select
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  autoFocus
                  className="sp-edit-input"
                  style={{ width: '100%' }}
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
                    if (e.key === 'Enter') saveEdit(r.key)
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  autoFocus
                  className={`sp-edit-input${m.type === 'number' ? ' sp-edit-input--num' : ''}`}
                  aria-label={m.label}
                />
              )}
              {m.unit && <span className="sp-unit">{m.unit}</span>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span className="sp-card-value">{displayValue(r)}</span>
              <span className="sp-card-meta">изм. {formatUpdatedAt(r.updatedAt)}</span>
            </div>
          )}

          <div className="sp-edit-row">
            {editing ? (
              <>
                <button
                  type="button"
                  className="sp-action-btn sp-action-btn--primary"
                  onClick={() => saveEdit(r.key)}
                  disabled={saving}
                  title="Сохранить"
                  aria-label="Сохранить"
                >
                  <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="sp-action-btn sp-action-btn--danger"
                  onClick={cancelEdit}
                  disabled={saving}
                  title="Отмена"
                  aria-label="Отмена"
                >
                  <X size={13} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </>
            ) : (
              <button
                type="button"
                className="sp-action-btn"
                onClick={() => startEdit(r)}
                aria-label={`Изменить «${r._label}»`}
              >
                <Pencil size={11} strokeWidth={2} aria-hidden="true" />
                Изменить
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const comparator = (key: string) => (a: Row, b: Row): number => {
    switch (key) {
      case 'category':  return a._catLabel.localeCompare(b._catLabel, 'ru')
      case 'updatedAt': return (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '')
      default:          return a._label.localeCompare(b._label, 'ru')
    }
  }

  return (
    <div className="sp-shell">
      <style>{SETTINGS_PAGE_CSS}</style>

      <div className="sp-header">
        <p className="sp-header-text">
          Глобальные параметры платформы. Изменения вступают в силу немедленно
          и применяются ко всем пользователям.
        </p>
        <button
          type="button"
          className="sp-refresh-btn"
          onClick={loadSettings}
          disabled={loading}
          title="Обновить"
        >
          <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
          Обновить
        </button>
      </div>

      <DataPanel<Row>
        mode="client"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.key}
        loading={loading}
        caption="Параметры системы"
        empty="Параметры не настроены"
        searchable
        searchText={searchText}
        searchPlaceholder="Поиск по параметру…"
        filters={[
          { key: 'category', label: 'Категория', type: 'select', options: categoryOptions },
        ]}
        clientFilter={clientFilter}
        comparator={comparator}
        defaultSort={{ key: 'label', dir: 'asc' }}
        views={['table', 'cards']}
        renderCard={renderCard}
        panelStorageKey={PANEL_KEY}
        columnConfig
      />
    </div>
  )
}
