import api from '../../app/api'

export interface CalendarEntry {
  id: number | null
  year: number
  month: number
  workingDays: number
}

export type DayType = 'HOLIDAY' | 'WORKING' | 'DAY_OFF'

export interface CalendarDay {
  id: number
  day: string // ISO yyyy-MM-dd
  dayType: DayType
  descriptionRu: string | null
  descriptionKg: string | null
}

export interface CalendarDayRequest {
  day: string
  dayType: DayType
  descriptionRu: string | null
  descriptionKg: string | null
}

export const calendarApi = {
  list: () => api.get<CalendarEntry[]>('/calendar').then(r => r.data),
  upsert: (year: number, month: number, workingDays: number) =>
    api.post<CalendarEntry>('/calendar', { year, month, workingDays }).then(r => r.data),

  listDays: (year: number) =>
    api.get<CalendarDay[]>('/calendar/days', { params: { year } }).then(r => r.data),
  upsertDay: (req: CalendarDayRequest) =>
    api.post<CalendarDay>('/calendar/days', req).then(r => r.data),
  deleteDay: (day: string) =>
    api.delete(`/calendar/days/${day}`).then(r => r.data),
  importHolidays: (year: number) =>
    api.post<CalendarDay[]>('/calendar/days/import', null, { params: { year } }).then(r => r.data),
}
