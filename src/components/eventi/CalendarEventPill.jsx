import { Link } from 'react-router-dom'
import { STATO_EVENTO_COLORE } from '../../lib/constants'

const pillColors = {
  yellow: 'bg-yellow-200 text-yellow-900',
  blue: 'bg-blue-200 text-blue-900',
  mikai: 'bg-mikai-200 text-mikai-800',
  green: 'bg-green-200 text-green-900',
  emerald: 'bg-emerald-200 text-emerald-900',
  gray: 'bg-gray-200 text-gray-700',
  red: 'bg-red-200 text-red-900',
}

export function CalendarEventPill({ event }) {
  const color = STATO_EVENTO_COLORE[event.stato] || 'gray'
  return (
    <Link
      to={`/eventi/${event.id}`}
      className={`block truncate px-2 py-0.5 rounded text-sm font-medium ${pillColors[color]} hover:opacity-80`}
      title={event.titolo}
    >
      {event.titolo}
    </Link>
  )
}
