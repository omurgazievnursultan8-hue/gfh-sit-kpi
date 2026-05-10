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
