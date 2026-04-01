import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { TIPO_EVENTO_ICONS, STATO_EVENTO_ICONS, MODALITA_ICONS, FEEDBACK_ICONS, MATERIALE_ICONS, ADMIN_ICONS } from '../../lib/icons'
import { STATO_EVENTO_COLORE, STATO_EVENTO, TIPO_EVENTO, MODALITA_EVENTO_SHORT, MODALITA_COLORE, PILL_COLORS } from '../../lib/constants'

const MODALITA_BORDER = {
  mikai: 'border-l-mikai-400',
  gray: 'border-l-gray-400',
  yellow: 'border-l-yellow-400',
}

const ATTENTION_DOT = {
  approval: 'bg-yellow-400',
  overdue: 'bg-red-500',
}

export function CalendarEventPill({ event, compact = false, showStatus = false, attention = null, indicators = null }) {
  const color = STATO_EVENTO_COLORE[event.stato] || 'gray'
  const TipoIcon = TIPO_EVENTO_ICONS[event.tipo_evento]
  const StatoIcon = STATO_EVENTO_ICONS[event.stato]
  const ModalitaIcon = MODALITA_ICONS[event.modalita]
  const pillClass = PILL_COLORS[color] || PILL_COLORS.gray
  const modalitaColor = MODALITA_COLORE[event.modalita] || 'gray'
  const borderClass = MODALITA_BORDER[modalitaColor] || MODALITA_BORDER.gray

  // Compact mode — used in calendar grid cells
  if (compact) {
    return (
      <Link
        to={`/eventi/${event.id}`}
        className={`relative flex items-center gap-1 px-2 py-1 rounded-r-lg text-xs font-medium border-l-[3px] ${borderClass} ${pillClass} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-mikai-400 focus:ring-offset-1`}
        title={`${event.titolo} — ${STATO_EVENTO[event.stato]} — ${MODALITA_EVENTO_SHORT[event.modalita] || ''}`}
        aria-label={`${event.titolo}, ${TIPO_EVENTO[event.tipo_evento] || ''}, ${STATO_EVENTO[event.stato]}`}
        onClick={e => e.stopPropagation()}
      >
        {TipoIcon && <Icon icon={TipoIcon} size={12} className="flex-shrink-0" />}
        <span className="truncate">{event.titolo}</span>
        {indicators?.hasMaterials && <Icon icon={MATERIALE_ICONS.package} size={10} className="flex-shrink-0 opacity-50" />}
        {indicators?.hasPeople && <Icon icon={ADMIN_ICONS.utenti} size={10} className="flex-shrink-0 opacity-50" />}
        {attention && (
          <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${ATTENTION_DOT[attention]} ring-1 ring-white animate-pulse`} />
        )}
      </Link>
    )
  }

  // Full mode — used in agenda view and day modal
  return (
    <Link
      to={`/eventi/${event.id}`}
      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-r-xl text-sm font-medium min-h-[48px] border-l-4 ${borderClass} ${pillClass} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-mikai-400 focus:ring-offset-1`}
      title={`${event.titolo} — ${STATO_EVENTO[event.stato]}`}
      aria-label={`${event.titolo}, ${TIPO_EVENTO[event.tipo_evento] || ''}, ${STATO_EVENTO[event.stato]}`}
    >
      {TipoIcon && <Icon icon={TipoIcon} size={16} className="flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="block truncate">{event.titolo}</span>
        {/* Modalita + location on second line */}
        <span className="flex items-center gap-1.5 text-xs opacity-70 mt-0.5">
          {ModalitaIcon && <Icon icon={ModalitaIcon} size={12} className="flex-shrink-0" />}
          <span>{MODALITA_EVENTO_SHORT[event.modalita] || ''}</span>
          {event.luogo && <span className="truncate">· {event.luogo}</span>}
        </span>
      </div>
      {/* Indicators */}
      {indicators?.hasMaterials && (
        <span className="flex items-center gap-0.5 text-xs opacity-60 flex-shrink-0" title="Materiale previsto">
          <Icon icon={MATERIALE_ICONS.package} size={14} />
        </span>
      )}
      {indicators?.hasPeople && (
        <span className="flex items-center gap-0.5 text-xs opacity-60 flex-shrink-0" title="Persone assegnate">
          <Icon icon={ADMIN_ICONS.utenti} size={14} />
        </span>
      )}
      {/* Status icon */}
      {showStatus && StatoIcon && (
        <Icon icon={StatoIcon} size={14} className="flex-shrink-0 opacity-60" />
      )}
      {/* Attention indicator */}
      {attention && (
        <div className={`flex items-center gap-1 text-xs font-semibold flex-shrink-0 ${attention === 'overdue' ? 'text-red-600' : 'text-yellow-700'}`}>
          <Icon icon={FEEDBACK_ICONS.warning} size={14} />
          <span className="hidden sm:inline">{attention === 'overdue' ? 'In ritardo' : 'Da approvare'}</span>
        </div>
      )}
    </Link>
  )
}
