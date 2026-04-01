import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { TIPO_EVENTO, STATO_EVENTO_COLORE, MODALITA_EVENTO } from '../../lib/constants'
import { TIPO_EVENTO_ICONS, FEEDBACK_ICONS, NAV_ICONS, MATERIALE_ICONS, INFO_EVENTO_ICONS, CATEGORIA_ICONS, COSTI_ICONS, ACTION_ICONS, ATTIVITA_STATO_ICONS } from '../../lib/icons'
import { formatDateRange, todayISO } from '../../lib/date-utils'
import { formatCurrency } from '../../lib/format-utils'

const bandaColore = { yellow: 'bg-yellow-400', blue: 'bg-blue-400', mikai: 'bg-mikai-400', green: 'bg-green-400', emerald: 'bg-emerald-400', gray: 'bg-gray-400', red: 'bg-red-400' }
const SEMAPHORE_STATES = new Set(['in_preparazione', 'pronto', 'confermato'])
const READINESS_STATES = new Set(['confermato', 'in_preparazione', 'pronto', 'in_corso'])
const SEMAPHORE_CFG = {
  red: { dot: 'bg-red-500', text: 'text-red-600', label: 'Ritardi' },
  green: { dot: 'bg-green-500', text: 'text-green-600', label: 'In ordine' },
}
const COLOR = { green: 'text-green-600', yellow: 'text-yellow-600', red: 'text-red-600', gray: 'text-gray-400' }
const BG = { green: 'bg-green-50', yellow: 'bg-amber-50', red: 'bg-red-50' }

function computeAreas(r) {
  const a = r.attivita || { total: 0, completate: 0, inRitardo: 0 }
  const m = r.materiale || { total: 0, approvato: 0, in_preparazione: 0, richiesto: 0, rifiutato: 0 }
  const l = r.logistica || { hotelTotal: 0, hotelConfermato: 0, trasportoTotal: 0, trasportoConfermato: 0 }
  const c = r.costi || { total: 0, approvato: 0, in_attesa: 0, rifiutato: 0, in_revisione: 0 }
  const lP = (l.hotelTotal - l.hotelConfermato) + (l.trasportoTotal - l.trasportoConfermato)
  const cP = (c.in_attesa || 0) + (c.in_revisione || 0)
  return [
    { icon: CATEGORIA_ICONS.organizzazione, label: 'Attivita', tab: 'preparazione',
      ...(a.total === 0 ? { text: 'Nessuna attivita', color: 'gray' } : a.inRitardo > 0 ? { text: `${a.inRitardo} in ritardo`, color: 'red' }
        : a.completate < a.total ? { text: `${a.total - a.completate} da completare`, color: 'yellow' } : { text: 'Completate', color: 'green' }) },
    { icon: MATERIALE_ICONS.package, label: 'Materiale', tab: 'materiale',
      ...(m.total === 0 ? { text: 'Nessun materiale', color: 'gray' } : m.rifiutato > 0 ? { text: `${m.rifiutato} rifiutati`, color: 'red' }
        : m.richiesto > 0 ? { text: `${m.richiesto} da confermare`, color: 'yellow' } : { text: 'Confermato', color: 'green' }) },
    { icon: NAV_ICONS.logistica, label: 'Logistica', tab: 'logistica',
      ...(l.hotelTotal + l.trasportoTotal === 0 ? { text: 'Nessuna prenotazione', color: 'gray' }
        : lP > 0 ? { text: `${lP} da prenotare`, color: 'yellow' } : { text: 'Confermata', color: 'green' }) },
    { icon: COSTI_ICONS.costo, label: 'Costi', tab: 'costi',
      ...(c.total === 0 ? { text: 'Nessun preventivo', color: 'gray' } : c.rifiutato > 0 ? { text: `${c.rifiutato} rifiutati`, color: 'red' }
        : cP > 0 ? { text: `${cP} in attesa`, color: 'yellow' } : { text: 'Approvati', color: 'green' }) },
  ]
}

export function EventCard({ event, semaphore, readiness }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const TipoIcon = TIPO_EVENTO_ICONS[event.tipo_evento]
  const color = STATO_EVENTO_COLORE[event.stato] || 'gray'
  const today = todayISO()
  const daysUntil = event.data_inizio ? Math.ceil((new Date(event.data_inizio) - new Date(today)) / 86400000) : null
  const isPast = daysUntil !== null && daysUntil < 0
  const promotore = event.promotore ? `${event.promotore.nome} ${event.promotore.cognome}` : null
  const sem = semaphore && SEMAPHORE_STATES.has(event.stato) ? SEMAPHORE_CFG[semaphore] : null
  const showReadiness = readiness && READINESS_STATES.has(event.stato)
  const areas = showReadiness ? computeAreas(readiness) : null
  const overall = areas ? (areas.some(a => a.color === 'red') ? 'red' : areas.some(a => a.color === 'yellow') ? 'yellow' : 'green') : null
  const issues = areas ? areas.filter(a => a.color === 'red' || a.color === 'yellow').length : 0

  return (
    <Link to={`/eventi/${event.id}`}
      className={`group block bg-white rounded-xl border border-gray-200 hover:shadow-md hover:border-mikai-300 transition-all overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex">
        <div className={`w-1.5 flex-shrink-0 ${bandaColore[color]}`} />
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-mikai-50 flex items-center justify-center text-mikai-500">
                {TipoIcon ? <Icon icon={TipoIcon} size={20} /> : <Icon name="eventi" size={20} />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate">{event.titolo}</h3>
                <p className="text-sm text-gray-500">{formatDateRange(event.data_inizio, event.data_fine)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {sem && <span className={`flex items-center gap-1 text-xs font-medium ${sem.text}`}>
                <span className={`w-2 h-2 rounded-full ${sem.dot}`} />{sem.label}
              </span>}
              <StatusBadge stato={event.stato} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-sm text-gray-500">
            {event.luogo && <span className="flex items-center gap-1">
              <Icon icon={INFO_EVENTO_ICONS.luogo} size={14} className="text-gray-400" />{event.luogo}
            </span>}
            <span className="flex items-center gap-1">
              <Icon icon={TipoIcon || NAV_ICONS.eventi} size={14} className="text-gray-400" />{TIPO_EVENTO[event.tipo_evento]}
            </span>
            {event.modalita && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              event.modalita === 'interno' ? 'bg-mikai-50 text-mikai-600' : event.modalita === 'contributo' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-600'
            }`}>{MODALITA_EVENTO[event.modalita]}</span>}
            {event.desk_richiesto && <span className="flex items-center gap-1 text-xs text-blue-600">
              <Icon icon={INFO_EVENTO_ICONS.desk} size={12} />Desk
            </span>}
          </div>

          {showReadiness && (
            <div className={`mt-2 rounded-lg ${BG[overall] || 'bg-green-50'}`}>
              <button type="button" onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(v => !v) }}
                className="w-full flex items-center justify-between px-3 py-2 min-h-[48px]"
                aria-label={expanded ? 'Comprimi dettagli prontezza' : 'Espandi dettagli prontezza'}>
                <span className={`flex items-center gap-2 text-sm font-medium ${COLOR[overall]}`}>
                  <Icon icon={issues === 0 ? ACTION_ICONS.check : FEEDBACK_ICONS.warning} size={16} />
                  {issues === 0 ? 'Tutto pronto' : `${issues} cose da fare`}
                  {daysUntil !== null && daysUntil >= 0 && issues > 0 && <span className="text-xs text-gray-500 font-normal">{`· ${daysUntil}gg`}</span>}
                </span>
                <Icon icon={ACTION_ICONS.chevronDown} size={18} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && <div className="px-3 pb-2 space-y-1">
                {areas.map(a => (
                  <button key={a.tab} type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/eventi/${event.id}?tab=${a.tab}`) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/60 transition-colors text-left min-h-[48px]">
                    <Icon icon={a.icon} size={16} className={COLOR[a.color]} />
                    <span className="flex-1 text-sm text-gray-700">{a.label}</span>
                    <span className={`text-sm font-medium ${COLOR[a.color]}`}>{a.text}</span>
                    <Icon icon={ACTION_ICONS.chevron_right} size={14} className="text-gray-400" />
                  </button>
                ))}
              </div>}
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {promotore && <span className="text-sm text-gray-500 font-medium flex items-center gap-1">
              <Icon icon={NAV_ICONS.profilo} size={14} className="text-gray-400" />{promotore}
            </span>}
            {event.budget_previsto > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              {formatCurrency(event.budget_previsto)}
            </span>}
          </div>

          {(event.stato === 'proposto' || (daysUntil !== null && daysUntil <= 7 && daysUntil >= 0 && !['concluso', 'cancellato'].includes(event.stato)) || (readiness?.attivita?.inRitardo > 0 && SEMAPHORE_STATES.has(event.stato))) && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {event.stato === 'proposto' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                  <Icon icon={ATTIVITA_STATO_ICONS.in_ritardo} size={11} />Approvazione richiesta
                </span>
              )}
              {daysUntil !== null && daysUntil <= 7 && daysUntil >= 0 && !['concluso', 'cancellato'].includes(event.stato) && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                  <Icon icon={FEEDBACK_ICONS.warning} size={11} />
                  {daysUntil === 0 ? 'Oggi' : daysUntil === 1 ? 'Domani' : `Scadenza tra ${daysUntil} giorni`}
                </span>
              )}
              {readiness?.attivita?.inRitardo > 0 && SEMAPHORE_STATES.has(event.stato) && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  <Icon icon={ATTIVITA_STATO_ICONS.in_ritardo} size={11} />In ritardo
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
