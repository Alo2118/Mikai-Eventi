import {
  format, parseISO, isValid, formatDistanceToNow,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday,
  addMonths, subMonths, getMonth, getYear,
  differenceInDays, subDays,
  startOfYear, endOfYear
} from 'date-fns'
import { it } from 'date-fns/locale'

/** Returns today's date as 'YYYY-MM-DD' */
export function todayISO() {
  return formatDayISO(new Date())
}

/** Returns current instant as full ISO string (for timestamps) */
export function nowISO() {
  return new Date().toISOString()
}

/** Converts a date value (string, Date) to ISO string. Returns null if falsy. */
export function toISO(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

export function formatDayISO(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'yyyy-MM-dd')
}

export function formatDayNumber(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'd')
}

export function formatMonth(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return ''
  return format(d, 'MMMM yyyy', { locale: it })
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (!isValid(d)) return ''
  return format(d, 'd MMM yyyy', { locale: it })
}

export function formatDateRange(start, end) {
  if (!start) return ''
  const s = formatDate(start)
  if (!end || start === end) return s
  return `${formatDate(start)} — ${formatDate(end)}`
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (!isValid(d)) return ''
  return format(d, "d MMM yyyy 'alle' HH:mm", { locale: it })
}

export function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (!isValid(d)) return ''
  return format(d, 'HH:mm', { locale: it })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (!isValid(d)) return ''
  return format(d, 'd MMM', { locale: it })
}

export function toLocalDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60_000) return 'adesso'
  return formatDistanceToNow(date, { addSuffix: true, locale: it })
}

export function calculateDeadline(eventDate, giorniPrima) {
  if (!giorniPrima && giorniPrima !== 0) return null
  const d = new Date(eventDate)
  d.setDate(d.getDate() + giorniPrima)
  return d.toISOString().split('T')[0]
}

// --- Calendar helpers (CalendarGrid) ---

export function getMonthDays(date) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: calStart, end: calEnd })
}

export function isSameMonthAs(day, reference) {
  return isSameMonth(day, reference)
}

export function isTodayDate(date) {
  return isToday(date)
}

export function getWeekdayLabels() {
  return ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
}

// --- Month navigation helpers (EventiCalendar) ---

export function addOneMonth(date) {
  return addMonths(date, 1)
}

export function subtractOneMonth(date) {
  return subMonths(date, 1)
}

export function getMonthIndex(date) {
  return getMonth(date)
}

export function getFullYear(date) {
  return getYear(date)
}

// --- Logistics helpers ---

export function daysFromToday(isoDateString) {
  if (!isoDateString) return 0
  try {
    const d = parseISO(isoDateString)
    if (!isValid(d)) return 0
    return Math.max(0, differenceInDays(new Date(), d))
  } catch {
    return 0
  }
}

export function subtractDays(isoDateString, days) {
  if (!isoDateString) return null
  try {
    const d = parseISO(isoDateString)
    if (!isValid(d)) return null
    return formatDayISO(subDays(d, days))
  } catch {
    return null
  }
}

// --- Date range presets (TimeRangeFilter) ---

export function getMonthRange() {
  const now = new Date()
  return { start: formatDayISO(startOfMonth(now)), end: formatDayISO(endOfMonth(now)) }
}

export function getQuarterRange() {
  const now = new Date()
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0)
  return { start: formatDayISO(qStart), end: formatDayISO(qEnd) }
}

export function getYearRange() {
  const now = new Date()
  return { start: formatDayISO(startOfYear(now)), end: formatDayISO(endOfYear(now)) }
}
