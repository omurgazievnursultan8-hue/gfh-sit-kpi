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
