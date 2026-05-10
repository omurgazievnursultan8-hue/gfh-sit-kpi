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
