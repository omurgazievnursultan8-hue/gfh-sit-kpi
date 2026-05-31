import type { Period } from '@/features/periods/api'

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]

interface YearMonth { y: number; m: number }

function parseYearMonth(iso: string): YearMonth | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso)
  if (!match) return null
  const m = Number(match[2]) - 1
  if (m < 0 || m > 11) return null
  return { y: Number(match[1]), m }
}

/**
 * Human label for a period as a date range.
 *  - same month        → "май 2026"
 *  - same year         → "апр–июн 2026"
 *  - spans years       → "дек 2025 – фев 2026"
 *  - period missing /
 *    unparseable dates → "Период #{periodId}"
 */
export function formatPeriodRange(period: Period | undefined, periodId: number): string {
  if (!period) return `Период #${periodId}`
  const start = parseYearMonth(period.startDate)
  const end = parseYearMonth(period.endDate)
  if (!start || !end) return `Период #${periodId}`

  if (start.y === end.y && start.m === end.m) {
    return `${MONTHS_SHORT[start.m]} ${start.y}`
  }
  if (start.y === end.y) {
    return `${MONTHS_SHORT[start.m]}–${MONTHS_SHORT[end.m]} ${start.y}`
  }
  return `${MONTHS_SHORT[start.m]} ${start.y} – ${MONTHS_SHORT[end.m]} ${end.y}`
}
