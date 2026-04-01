import { Icon } from '../ui/Icon'
import { TRASPORTO_ICONS, LOGISTICA_PERSONE_ICONS } from '../../lib/icons'
import { formatDateShort, formatTime } from '../../lib/date-utils'
import { MEZZO_TRASPORTO } from '../../lib/constants'
import { EmptyState } from '../ui/EmptyState'

function buildTimelineEntries(event, hotels, trasporti, people) {
  const entries = []

  // Event markers
  if (event.data_inizio) {
    entries.push({
      date: event.data_inizio,
      time: event.ora_inizio || null,
      type: 'evento',
      label: 'Inizio evento',
      icon: null,
      people: [],
      color: 'text-mikai-500',
    })
  }
  if (event.data_fine && event.data_fine !== event.data_inizio) {
    entries.push({
      date: event.data_fine,
      time: null,
      type: 'evento',
      label: 'Fine evento',
      icon: null,
      people: [],
      color: 'text-mikai-500',
    })
  }

  // Helper: find person name by user_id or contact_id
  const findName = (userId, contactId) => {
    const p = people.find(p => (p.type === 'staff' && p.id === userId) || (p.type === 'participant' && p.id === contactId))
    return p ? `${p.cognome} ${p.nome}` : '?'
  }

  // Group hotels by name+check_in for check-in events
  const checkinGroups = {}
  const checkoutGroups = {}
  for (const h of hotels) {
    const name = findName(h.user_id, h.contact_id)
    if (h.check_in) {
      const key = `${h.check_in}_${h.nome_hotel || ''}`
      if (!checkinGroups[key]) checkinGroups[key] = { date: h.check_in, hotel: h.nome_hotel, people: [] }
      checkinGroups[key].people.push(name)
    }
    if (h.check_out) {
      const key = `${h.check_out}_${h.nome_hotel || ''}`
      if (!checkoutGroups[key]) checkoutGroups[key] = { date: h.check_out, hotel: h.nome_hotel, people: [] }
      checkoutGroups[key].people.push(name)
    }
  }
  for (const g of Object.values(checkinGroups)) {
    entries.push({
      date: g.date,
      time: null,
      type: 'checkin',
      label: `Check-in${g.hotel ? ` ${g.hotel}` : ''}`,
      icon: LOGISTICA_PERSONE_ICONS.hotel,
      people: g.people,
      color: 'text-blue-500',
    })
  }
  for (const g of Object.values(checkoutGroups)) {
    entries.push({
      date: g.date,
      time: null,
      type: 'checkout',
      label: `Check-out${g.hotel ? ` ${g.hotel}` : ''}`,
      icon: LOGISTICA_PERSONE_ICONS.bed,
      people: g.people,
      color: 'text-gray-500',
    })
  }

  // Group trasporti by codice+orario+direzione
  const transportGroups = {}
  for (const t of trasporti) {
    const name = findName(t.user_id, t.contact_id)
    const date = t.orario ? t.orario.slice(0, 10) : (t.direzione === 'andata' ? event.data_inizio : event.data_fine)
    if (!date) continue
    const time = t.orario ? formatTime(t.orario) : null
    const key = `${date}_${t.direzione}_${t.codice || ''}_${time || ''}_${t.mezzo || ''}`
    if (!transportGroups[key]) {
      transportGroups[key] = {
        date, time, direzione: t.direzione, mezzo: t.mezzo, codice: t.codice, people: [],
      }
    }
    transportGroups[key].people.push(name)
  }
  for (const g of Object.values(transportGroups)) {
    const mezzoLabel = g.mezzo ? (MEZZO_TRASPORTO[g.mezzo] || '') : ''
    const parts = [mezzoLabel, g.codice].filter(Boolean).join(' ')
    entries.push({
      date: g.date,
      time: g.time,
      type: g.direzione,
      label: `${g.direzione === 'andata' ? 'Arrivo' : 'Partenza'}${parts ? ` — ${parts}` : ''}`,
      icon: g.mezzo ? TRASPORTO_ICONS[g.mezzo] : LOGISTICA_PERSONE_ICONS.trasporto,
      people: g.people,
      color: g.direzione === 'andata' ? 'text-green-500' : 'text-orange-500',
    })
  }

  // Sort by date then time
  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    if (a.time) return -1
    if (b.time) return 1
    return 0
  })

  return entries
}

function groupByDate(entries) {
  const groups = []
  let currentDate = null
  let currentGroup = null
  for (const entry of entries) {
    if (entry.date !== currentDate) {
      currentDate = entry.date
      currentGroup = { date: currentDate, entries: [] }
      groups.push(currentGroup)
    }
    currentGroup.entries.push(entry)
  }
  return groups
}

export function EventLogisticaEventTimeline({ event, hotels, trasporti, people }) {
  const entries = buildTimelineEntries(event, hotels, trasporti, people)

  if (entries.length === 0) {
    return <EmptyState title="Nessun dato logistico" description="Aggiungi hotel e trasporti per vedere la timeline" />
  }

  const dayGroups = groupByDate(entries)

  return (
    <div className="space-y-4">
      {dayGroups.map(group => (
        <div key={group.date}>
          <div className="font-semibold text-sm text-gray-700 mb-2 bg-gray-100 px-3 py-1.5 rounded-lg">
            {formatDateShort(group.date)}
          </div>
          <div className="space-y-2 pl-2 border-l-2 border-gray-200 ml-3">
            {group.entries.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 pl-3 relative">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 -ml-[17px] ${
                  entry.type === 'evento' ? 'bg-mikai-400 ring-2 ring-mikai-100' : 'bg-gray-300'
                }`} />
                <div className="flex items-center gap-2 flex-shrink-0 w-12 text-sm text-gray-500">
                  {entry.time || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {entry.icon && <Icon icon={entry.icon} size={16} className={entry.color} />}
                    <span className={`text-sm font-medium ${entry.type === 'evento' ? 'text-mikai-600' : 'text-gray-800'}`}>
                      {entry.label}
                    </span>
                  </div>
                  {entry.people.length > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {entry.people.join(', ')} ({entry.people.length})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
