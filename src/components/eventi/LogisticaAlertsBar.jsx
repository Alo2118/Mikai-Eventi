import { useState, useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { formatDateShort } from '../../lib/date-utils'

export function computeAlerts(event, people, hotels, trasporti, staff, getHotel, getAndata) {
  const alerts = []
  const eventStart = event.data_inizio
  const eventEnd = event.data_fine || event.data_inizio

  for (const h of hotels.filter(h => h.stato !== 'non_necessario')) {
    if (h.check_in && eventStart && h.check_in > eventStart) {
      const who = h.user_id ? `${h.user?.cognome || ''} ${h.user?.nome || ''}` : `${h.contact?.cognome || ''} ${h.contact?.nome || ''}`
      alerts.push({ type: 'warning', text: `Hotel check-in di ${who.trim()} (${formatDateShort(h.check_in)}) è dopo l'inizio evento (${formatDateShort(eventStart)})` })
    }
    if (h.check_out && eventEnd && h.check_out < eventEnd) {
      const who = h.user_id ? `${h.user?.cognome || ''} ${h.user?.nome || ''}` : `${h.contact?.cognome || ''} ${h.contact?.nome || ''}`
      alerts.push({ type: 'warning', text: `Hotel check-out di ${who.trim()} (${formatDateShort(h.check_out)}) è prima della fine evento (${formatDateShort(eventEnd)})` })
    }
  }

  for (const t of trasporti.filter(t => t.direzione === 'andata' && t.orario && t.stato !== 'non_necessario')) {
    const arrivalDate = t.orario.slice(0, 10)
    if (eventStart && arrivalDate > eventStart) {
      alerts.push({ type: 'error', text: `Trasporto andata il ${formatDateShort(arrivalDate)} ma l'evento inizia il ${formatDateShort(eventStart)}` })
    }
  }

  const confirmedNoHotel = people.filter(p => {
    const isConfirmed = p.type === 'staff' ? p.confermato : ['confermato', 'presente'].includes(p.statoIscrizione)
    return isConfirmed && !getHotel(p)
  })
  if (confirmedNoHotel.length > 0) {
    alerts.push({ type: 'warning', text: `${confirmedNoHotel.length} confermati senza hotel` })
  }

  const confirmedNoAndata = people.filter(p => {
    const isConfirmed = p.type === 'staff' ? p.confermato : ['confermato', 'presente'].includes(p.statoIscrizione)
    const andata = getAndata(p)
    return isConfirmed && (Array.isArray(andata) ? andata.length === 0 : !andata)
  })
  if (confirmedNoAndata.length > 0) {
    alerts.push({ type: 'warning', text: `${confirmedNoAndata.length} confermati senza trasporto andata` })
  }

  if (staff.length > 0 && !staff.some(s => s.confermato)) {
    alerts.push({ type: 'error', text: 'Nessuno staff confermato' })
  }

  return alerts
}

export function LogisticaAlertsBar({ alerts }) {
  const [dismissed, setDismissed] = useState(false)

  // Reset dismissed when alerts content changes
  useEffect(() => { setDismissed(false) }, [alerts.length])

  if (!alerts.length || dismissed) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3" role="alert">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Icon icon={a.type === 'error' ? FEEDBACK_ICONS.error : FEEDBACK_ICONS.warning} size={16} className={a.type === 'error' ? 'text-red-500' : 'text-orange-500'} />
              <span className={a.type === 'error' ? 'text-red-700' : 'text-orange-700'}>{a.text}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Chiudi avvisi">
          <Icon icon={ACTION_ICONS.close} size={16} />
        </button>
      </div>
    </div>
  )
}
