import { useState, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { STATO_EVENTO_COLORE, COLOR_BAND, COLOR_TEXT_600, COLOR_BG_50, COLOR_ICON_STATUS } from '../../lib/constants'
import { FEEDBACK_ICONS, NAV_ICONS, MATERIALE_ICONS, INFO_EVENTO_ICONS, CATEGORIA_ICONS, ACTION_ICONS } from '../../lib/icons'
import { formatDateRange, todayISO } from '../../lib/date-utils'
import { getPromotoreName } from '../../lib/format-utils'

const READINESS_STATES = new Set(['confermato', 'in_preparazione'])

function computeAreas(r, event) {
  const a = r.attivita || { total: 0, completate: 0, inRitardo: 0 }
  const m = r.materiale || { total: 0, approvato: 0, in_preparazione: 0, richiesto: 0, rifiutato: 0, spedito: 0 }
  const l = r.logistica || { hotelTotal: 0, hotelConfermato: 0, trasportoTotal: 0, trasportoConfermato: 0 }
  const lP = (l.hotelTotal - l.hotelConfermato) + (l.trasportoTotal - l.trasportoConfermato)
  const shipped = !!event?.spedizione_data
  return [
    { icon: MATERIALE_ICONS.package, label: 'Materiale', tab: 'materiale',
      ...(m.total === 0 ? { color: 'gray' } : m.rifiutato > 0 ? { text: `${m.rifiutato} rifiutati`, color: 'red' }
        : m.richiesto > 0 ? { text: `${m.richiesto} da confermare`, color: 'yellow' }
        : event?.modalita !== 'contributo' && !shipped ? { text: 'Da spedire', color: 'yellow' }
        : { color: 'green' }) },
    { icon: CATEGORIA_ICONS.organizzazione, label: 'Attività', tab: 'preparazione',
      ...(a.total === 0 ? { color: 'gray' } : a.inRitardo > 0 ? { text: `${a.inRitardo} in ritardo`, color: 'red' }
        : a.completate < a.total ? { text: `${a.total - a.completate} da fare`, color: 'yellow' } : { color: 'green' }) },
    { icon: NAV_ICONS.logistica, label: 'Spedizione', tab: 'materiale',
      ...(m.total === 0 ? { color: 'gray' }
        : shipped || (m.spedito > 0 && m.spedito + (m.rifiutato || 0) >= m.total) ? { text: 'Spedito', color: 'green' }
        : { text: 'Da spedire', color: 'yellow' }) },
    { icon: NAV_ICONS.contatti, label: 'Persone', tab: 'logistica',
      ...(l.hotelTotal + l.trasportoTotal === 0 ? { color: 'gray' }
        : lP > 0 ? { text: `${lP} da prenotare`, color: 'yellow' } : { color: 'green' }) },
  ]
}


export const EventCard = memo(function EventCard({ event, semaphore, readiness, involvement, currentUserId, tipoLabels, tipoIcons }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const TipoIcon = tipoIcons?.[event.tipo_evento]
  const color = STATO_EVENTO_COLORE[event.stato] || 'gray'
  const today = todayISO()
  const startDate = event.data_inizio ? event.data_inizio.slice(0, 10) : null
  const endDate = event.data_fine ? event.data_fine.slice(0, 10) : null
  const isPast = startDate !== null && startDate < today && event.stato !== 'in_corso'
  const promotore = getPromotoreName(event)
  const showReadiness = readiness && READINESS_STATES.has(event.stato)
  const areas = showReadiness ? computeAreas(readiness, event) : null
  const problemAreas = areas ? areas.filter(a => a.color === 'red' || a.color === 'yellow') : []

  const inv = involvement || (currentUserId ? {
    promotore: event.promotore_id === currentUserId,
    manager: event.manager_user_id === currentUserId,
  } : null)
  const myRoles = []
  if (inv?.promotore) myRoles.push('Promotore')
  if (inv?.manager) myRoles.push('Manager')
  if (inv?.staff) myRoles.push('Staff')

  // Urgency
  const urgency = event.stato === 'proposto'
    ? { label: 'Da approvare', cls: 'bg-yellow-100 text-yellow-700' }
    : readiness?.attivita?.inRitardo > 0 && READINESS_STATES.has(event.stato)
      ? { label: `${readiness.attivita.inRitardo} attività in ritardo`, cls: 'bg-red-100 text-red-700' }
      : startDate === today
        ? { label: 'Inizia oggi', cls: 'bg-orange-100 text-orange-700' }
        : endDate === today && !['concluso', 'cancellato'].includes(event.stato)
          ? { label: 'Finisce oggi', cls: 'bg-orange-100 text-orange-700' }
          : null

  return (
    <Link to={`/eventi/${event.id}`}
      className={`group block bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-mikai-300 transition-all overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex">
        <div className={`w-1.5 flex-shrink-0 ${isPast ? 'bg-gray-300' : COLOR_BAND[color] || 'bg-gray-400'}`} />
        <div className="flex-1 min-w-0 px-2.5 py-2 md:px-3">
          {/* Row 1: Date + Title + Status */}
          <div className="flex items-center gap-2">
            {/* Date — compact on mobile, prominent on desktop */}
            <div className="flex-shrink-0 w-10 md:w-12 text-center">
              <p className="text-base md:text-lg font-bold text-gray-900 leading-none">
                {startDate ? new Date(startDate).getDate() : '—'}
              </p>
              <p className="text-[9px] md:text-[10px] font-medium text-gray-400 uppercase leading-tight">
                {startDate ? new Date(startDate).toLocaleDateString('it-IT', { month: 'short' }) : ''}
              </p>
            </div>

            {/* Title + urgency */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{event.titolo}</h3>
              <p className="text-xs text-gray-500">
                <span>{tipoLabels?.[event.tipo_evento] || event.tipo_evento}</span>
                {event.luogo && <span className="hidden sm:inline"> · {event.luogo}</span>}
                {startDate !== endDate && endDate && <span className="hidden md:inline"> · {formatDateRange(event.data_inizio, event.data_fine)}</span>}
              </p>
            </div>

            {/* Right: Status + readiness */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {showReadiness && areas && (
                <button type="button"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(v => !v) }}
                  className="flex items-center gap-1 md:gap-1.5 hover:bg-gray-50 rounded-lg px-1 py-0.5 transition-colors"
                  title={areas.map(a => `${a.label}: ${a.text || 'OK'}`).join(' · ')}
                  aria-label={problemAreas.length > 0 ? `${problemAreas.length} aree da completare` : 'Tutto in ordine'}
                >
                  {areas.map(a => (
                    <Icon key={a.label} icon={a.icon} size={14} className={`md:w-[18px] md:h-[18px] ${COLOR_ICON_STATUS[a.color] || 'text-gray-200'}`} />
                  ))}
                </button>
              )}
              <StatusBadge stato={event.stato} />
            </div>
          </div>

          {/* Row 2: Promotore + roles + urgency — single line */}
          <div className="flex items-center gap-x-2 mt-1 ml-12 md:ml-14 text-xs text-gray-400 flex-wrap">
            {promotore && (
              <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                <Icon icon={NAV_ICONS.profilo} size={10} />{promotore}
              </span>
            )}
            {myRoles.length > 0 && (
              <span className="px-1.5 py-0 rounded-full font-medium bg-mikai-50 text-mikai-600 text-[10px]">{myRoles.join(', ')}</span>
            )}
            {urgency && (
              <span className={`px-1.5 py-0 rounded-full text-[10px] font-semibold ${urgency.cls}`}>{urgency.label}</span>
            )}
          </div>

          {/* Expandable: problem areas */}
          {expanded && problemAreas.length > 0 && (
            <div className={`mt-1.5 rounded-lg ${COLOR_BG_50[areas.some(a => a.color === 'red') ? 'red' : 'yellow'] || 'bg-yellow-50'} px-2 py-1 space-y-0.5`}>
              {problemAreas.map(a => (
                <button key={a.tab} type="button"
                  onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/eventi/${event.id}?tab=${a.tab}`) }}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-white/60 transition-colors text-left min-h-[48px] md:min-h-[36px]">
                  <Icon icon={a.icon} size={13} className={COLOR_TEXT_600[a.color] || 'text-gray-400'} />
                  <span className="flex-1 text-xs text-gray-700">{a.label}</span>
                  <span className={`text-xs font-medium ${COLOR_TEXT_600[a.color] || 'text-gray-400'}`}>{a.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
})
