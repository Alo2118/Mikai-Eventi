import { useMemo, useState, useCallback } from 'react'
import {
  formatDayISO, formatDayNumber, formatDate, getMonthDays, isSameMonthAs, isTodayDate, getWeekdayLabels
} from '../../lib/date-utils'
import { CalendarEventPill } from './CalendarEventPill'
import { CalendarDayModal } from './CalendarDayModal'

const dayNames = getWeekdayLabels()
const MAX_VISIBLE_EVENTS = 3

function getAttentionReason(event, semaphores) {
  if (event.stato === 'proposto') return 'approval'
  if (semaphores[event.id] === 'red') return 'overdue'
  return null
}

export function CalendarGrid({ date, events, viewMode = 'month', semaphores = {} }) {
  const [selectedDay, setSelectedDay] = useState(null)

  const days = useMemo(() => getMonthDays(date), [date])

  // Pre-compute day → events map (O(events × span) once, then O(1) lookup per cell)
  const dayEventsMap = useMemo(() => {
    const map = {}
    for (const e of events) {
      const startStr = e.data_inizio
      const endStr = e.data_fine || startStr
      if (!startStr) continue
      for (const day of days) {
        const dayStr = formatDayISO(day)
        if (dayStr >= startStr && dayStr <= endStr) {
          if (!map[dayStr]) map[dayStr] = []
          map[dayStr].push(e)
        }
      }
    }
    return map
  }, [events, days])

  const handleDayClick = useCallback((day) => {
    setSelectedDay(day)
  }, [])

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return []
    return dayEventsMap[formatDayISO(selectedDay)] || []
  }, [selectedDay, dayEventsMap])

  // Count attention events for summary
  const attentionCount = useMemo(() => {
    let count = 0
    for (const e of events) {
      if (getAttentionReason(e, semaphores)) count++
    }
    return count
  }, [events, semaphores])

  // Mobile agenda view — list of days with events
  if (viewMode === 'agenda') {
    const daysWithEvents = days
      .filter(day => isSameMonthAs(day, date))
      .filter(day => {
        const dayStr = formatDayISO(day)
        return dayEventsMap[dayStr] && dayEventsMap[dayStr].length > 0
      })

    return (
      <div className="space-y-3">
        {daysWithEvents.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nessun evento in questo mese</p>
        )}
        {daysWithEvents.map(day => {
          const dayStr = formatDayISO(day)
          const dayEvents = dayEventsMap[dayStr] || []
          const today = isTodayDate(day)
          const hasAttention = dayEvents.some(e => getAttentionReason(e, semaphores))
          return (
            <div key={dayStr} className={`rounded-xl border p-3 ${
              today ? 'border-mikai-400 bg-mikai-50' :
              hasAttention ? 'border-yellow-300 bg-yellow-50/30' :
              'border-gray-200 bg-white'
            }`}>
              <div className={`text-sm font-semibold mb-2 flex items-center gap-2 ${today ? 'text-mikai-600' : 'text-gray-700'}`}>
                <span>{formatDate(dayStr)}</span>
                {today && <span className="text-xs font-normal text-mikai-500">Oggi</span>}
                <span className="text-xs font-normal text-gray-400 ml-auto">{dayEvents.length} eventi</span>
              </div>
              <div className="space-y-1.5">
                {dayEvents.map(e => (
                  <CalendarEventPill
                    key={e.id}
                    event={e}
                    showStatus
                    attention={getAttentionReason(e, semaphores)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Desktop month grid view
  return (
    <>
      <div role="grid" aria-label="Calendario eventi mensile">
        {/* Day name headers */}
        <div role="row" className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden">
          {dayNames.map((d) => (
            <div key={d} role="columnheader" className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-600">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
          {days.map((day) => {
            const dayStr = formatDayISO(day)
            const dayEvents = dayEventsMap[dayStr] || []
            const inMonth = isSameMonthAs(day, date)
            const today = isTodayDate(day)
            const hasOverflow = dayEvents.length > MAX_VISIBLE_EVENTS
            const hasAttention = dayEvents.some(e => getAttentionReason(e, semaphores))

            return (
              <div
                key={dayStr}
                role="gridcell"
                aria-label={`${formatDate(dayStr)}${dayEvents.length > 0 ? `, ${dayEvents.length} eventi` : ''}`}
                className={`min-h-[90px] md:min-h-[110px] p-1 ${
                  !inMonth ? 'bg-gray-50 opacity-40' :
                  hasAttention ? 'bg-yellow-50/50' :
                  'bg-white'
                } ${inMonth && dayEvents.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                onClick={() => inMonth && dayEvents.length > 0 && handleDayClick(day)}
              >
                {/* Day number */}
                <div className={`text-sm font-medium mb-1 ${
                  today
                    ? 'bg-mikai-400 text-white w-7 h-7 rounded-full flex items-center justify-center'
                    : 'text-gray-700 px-1'
                }`}>
                  {formatDayNumber(day)}
                </div>

                {/* Event pills */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((e) => (
                    <CalendarEventPill
                      key={e.id}
                      event={e}
                      compact
                      attention={getAttentionReason(e, semaphores)}
                    />
                  ))}
                  {hasOverflow && (
                    <button
                      onClick={(ev) => { ev.stopPropagation(); handleDayClick(day) }}
                      className="text-xs font-medium text-mikai-600 hover:text-mikai-800 hover:underline px-1 py-0.5 min-h-[28px] flex items-center"
                      aria-label={`Vedi ${dayEvents.length - MAX_VISIBLE_EVENTS} altri eventi del ${formatDate(dayStr)}`}
                    >
                      +{dayEvents.length - MAX_VISIBLE_EVENTS} altri
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day detail modal */}
      <CalendarDayModal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        date={selectedDay ? formatDayISO(selectedDay) : null}
        events={selectedDayEvents}
        semaphores={semaphores}
      />
    </>
  )
}
