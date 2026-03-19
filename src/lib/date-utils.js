import { format, parseISO, isValid } from 'date-fns'
import { it } from 'date-fns/locale'

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
