import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns'
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
