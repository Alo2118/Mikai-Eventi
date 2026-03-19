import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday
} from 'date-fns'
import { formatDayISO, formatDayNumber } from '../../lib/date-utils'
import { CalendarEventPill } from './CalendarEventPill'

const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

export function CalendarGrid({ date, events }) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getEventsForDay = (day) => {
    const dayStr = formatDayISO(day)
    return events.filter((e) => {
      const startStr = e.data_inizio
      const endStr = e.data_fine || startStr
      return dayStr >= startStr && dayStr <= endStr
    })
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
        {dayNames.map((d) => (
          <div key={d} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-600">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day)
          const inMonth = isSameMonth(day, date)
          return (
            <div
              key={day.toISOString()}
              className={`bg-white min-h-[80px] md:min-h-[100px] p-1 ${!inMonth ? 'opacity-40' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'bg-mikai-400 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-gray-700 px-1'}`}>
                {formatDayNumber(day)}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((e) => (
                  <CalendarEventPill key={e.id} event={e} />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-sm text-gray-400 px-1">+{dayEvents.length - 3} altri</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
