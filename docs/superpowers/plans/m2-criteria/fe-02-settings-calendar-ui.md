# M2-FE-02: System Settings UI + Production Calendar UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the system settings page (editable key-value grid for ADMIN) and the production calendar page (year view with working-day counts per month, inline editing).

**Architecture:** `SettingsPage` fetches all settings and renders them as an inline-editable table — click a value to edit it, press Enter or click Save. `CalendarPage` shows a 12-column grid for a selected year; ADMIN can click any month cell to set working days via an inline input. Both pages are ADMIN-only.

**Tech Stack:** React 18, react-i18next, Tailwind CSS.

**Depends on:** m2-criteria/fe-01-criteria-ui.md

---

### Task 1: Settings page

**Files:**
- Create: `frontend/src/features/settings/settingsApi.ts`
- Create: `frontend/src/features/settings/SettingsPage.tsx`

- [ ] **Step 1: Create settings API client**

`frontend/src/features/settings/settingsApi.ts`:
```ts
import api from '../../app/api'

export interface SystemSetting {
  key: string
  value: string
  description: string | null
  updatedAt: string
}

export const settingsApi = {
  list: () => api.get<SystemSetting[]>('/settings').then(r => r.data),
  update: (key: string, value: string) =>
    api.put<SystemSetting>(`/settings/${key}`, { value }).then(r => r.data),
}
```

- [ ] **Step 2: Create SettingsPage**

`frontend/src/features/settings/SettingsPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { Check, X, Pencil } from 'lucide-react'
import { SystemSetting, settingsApi } from './settingsApi'

const SETTING_LABELS: Record<string, string> = {
  idle_timeout_minutes: 'Таймаут бездействия (минуты)',
  password_expiry_days: 'Срок действия пароля (дни)',
  evaluation_period_days: 'Длительность периода оценки (дни)',
  appeal_deadline_days: 'Срок подачи апелляции (дни)',
  auto_agree_timeout_hours: 'Авто-согласие через (часы)',
  pdpa_version: 'Версия PDPA',
  rating_formula: 'Формула рейтинга (FORMULA_1–4)',
}

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
      const data = await settingsApi.list()
      setSettings(data)
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
      const updated = await settingsApi.update(key, editValue)
      setSettings(prev => prev.map(s => s.key === key ? updated : s))
      setEditingKey(null)
    } catch (err: any) {
      setError(err.response?.data?.message_ru || 'Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Системные настройки</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/3">Параметр</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Значение</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settings.map(s => (
                <tr key={s.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">
                      {SETTING_LABELS[s.key] || s.key}
                    </div>
                    {s.description && (
                      <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingKey === s.key ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(s.key)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          autoFocus
                          className="px-2 py-1 border border-primary rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {error && <span className="text-xs text-red-600">{error}</span>}
                      </div>
                    ) : (
                      <span className="text-sm font-mono text-gray-800">{s.value}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingKey === s.key ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveEdit(s.key)}
                          disabled={saving}
                          className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                          title="Сохранить"
                        >
                          <Check size={16} />
                        </button>
                        <button onClick={cancelEdit}
                          className="p-1 text-gray-400 hover:text-gray-600" title="Отмена">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(s)}
                        className="p-1 text-gray-400 hover:text-blue-600" title="Изменить">
                        <Pencil size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/settings/
git commit -m "feat(fe/settings): add system settings page with inline editing"
```

---

### Task 2: Production calendar page

**Files:**
- Create: `frontend/src/features/calendar/calendarApi.ts`
- Create: `frontend/src/features/calendar/CalendarPage.tsx`

- [ ] **Step 1: Create calendar API client**

`frontend/src/features/calendar/calendarApi.ts`:
```ts
import api from '../../app/api'

export interface CalendarEntry {
  id: number | null
  year: number
  month: number
  workingDays: number
}

export const calendarApi = {
  list: () => api.get<CalendarEntry[]>('/calendar').then(r => r.data),
  upsert: (year: number, month: number, workingDays: number) =>
    api.post<CalendarEntry>('/calendar', { year, month, workingDays }).then(r => r.data),
}
```

- [ ] **Step 2: Create CalendarPage**

`frontend/src/features/calendar/CalendarPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CalendarEntry, calendarApi } from './calendarApi'

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export function CalendarPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMonth, setEditingMonth] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const loadCalendar = async () => {
    setLoading(true)
    try {
      const data = await calendarApi.list()
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCalendar() }, [])

  const getEntry = (month: number): CalendarEntry | undefined =>
    entries.find(e => e.year === year && e.month === month)

  const startEdit = (month: number) => {
    const entry = getEntry(month)
    setEditingMonth(month)
    setEditValue(entry?.workingDays.toString() ?? '')
  }

  const saveEdit = async (month: number) => {
    const days = parseInt(editValue)
    if (isNaN(days) || days < 0 || days > 31) return
    setSaving(true)
    try {
      const updated = await calendarApi.upsert(year, month, days)
      setEntries(prev => {
        const without = prev.filter(e => !(e.year === year && e.month === month))
        return [...without, updated]
      })
      setEditingMonth(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Производственный календарь</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setYear(y => y - 1)}
            className="p-1 text-gray-500 hover:text-gray-800">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-semibold text-gray-900 w-16 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)}
            className="p-1 text-gray-500 hover:text-gray-800">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {MONTHS_RU.map((monthName, idx) => {
            const month = idx + 1
            const entry = getEntry(month)
            const isEditing = editingMonth === month

            return (
              <div
                key={month}
                className={`bg-white rounded-lg border p-4 text-center cursor-pointer transition-shadow hover:shadow-md ${
                  entry ? 'border-gray-200' : 'border-dashed border-gray-300'
                }`}
                onClick={() => !isEditing && startEdit(month)}
              >
                <div className="text-xs font-medium text-gray-500 mb-2">{monthName}</div>
                {isEditing ? (
                  <div onClick={e => e.stopPropagation()}>
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(month)
                        if (e.key === 'Escape') setEditingMonth(null)
                      }}
                      autoFocus
                      className="w-16 text-center px-2 py-1 border border-primary rounded text-sm focus:outline-none"
                    />
                    <div className="flex justify-center gap-2 mt-2">
                      <button
                        onClick={() => saveEdit(month)}
                        disabled={saving}
                        className="text-xs text-green-600 hover:underline disabled:opacity-50"
                      >
                        ОК
                      </button>
                      <button
                        onClick={() => setEditingMonth(null)}
                        className="text-xs text-gray-400 hover:underline"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {entry ? (
                      <>
                        <div className="text-2xl font-bold text-gray-900">{entry.workingDays}</div>
                        <div className="text-xs text-gray-400">раб. дней</div>
                      </>
                    ) : (
                      <div className="text-sm text-gray-300 py-2">—</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Нажмите на месяц, чтобы указать количество рабочих дней. Enter — сохранить, Escape — отмена.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Wire routes in App.tsx**

```tsx
import { SettingsPage } from './features/settings/SettingsPage'
import { CalendarPage } from './features/calendar/CalendarPage'

// Inside Layout routes:
<Route path="settings" element={
  <ProtectedRoute allowedRoles={['ADMIN']}>
    <SettingsPage />
  </ProtectedRoute>
} />
<Route path="calendar" element={
  <ProtectedRoute allowedRoles={['ADMIN']}>
    <CalendarPage />
  </ProtectedRoute>
} />
```

Add to `Sidebar.tsx`:
```tsx
{ to: '/settings', label: t('nav.settings'), roles: ['ADMIN'] },
{ to: '/calendar', label: t('nav.calendar'), roles: ['ADMIN'] },
```

Add to translations:
```json
{
  "nav": {
    "settings": "Настройки",
    "calendar": "Календарь"
  }
}
```

- [ ] **Step 4: Manual verification**

```bash
cd frontend && npm run dev
```

1. Log in as ADMIN → `/settings` shows all 7 settings in editable table
2. Click a value → input appears; press Enter → value updates inline
3. `/calendar` → 12 month cards for current year; empty cells show dashed border
4. Click a month cell → number input appears; type 22, Enter → cell shows "22 раб. дней"
5. Navigate to next year → same entries not visible (correct, different year)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/calendar/ \
        frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat(fe/calendar): add production calendar page with year navigation and inline working-day editing"
```
