import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Icon } from '../../components/ui/Icon'
import { MATERIALE_ICONS } from '../../lib/icons'
import { STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE } from '../../lib/constants'
import { formatDate, formatDateRange } from '../../lib/date-utils'
import { parseISO, subDays, isValid } from 'date-fns'

function getShippingDate(evento) {
  if (!evento?.data_inizio) return null
  try {
    const d = parseISO(evento.data_inizio)
    return isValid(d) ? subDays(d, 7) : null
  } catch {
    return null
  }
}

function groupByShippingDate(items) {
  const groups = {}
  for (const item of items) {
    const date = getShippingDate(item.evento)
    const key = date ? formatDate(date) : 'Data sconosciuta'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}

function TimelineCard({ item, onNavigate }) {
  const { evento, materiale, stato, quantita, note_commerciale } = item
  const destination = evento?.indirizzo_spedizione || 'Destinazione non specificata'

  return (
    <button
      type="button"
      onClick={() => onNavigate(`/eventi/${evento?.id}`)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all min-h-[48px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon icon={MATERIALE_ICONS.package} size={20} className="text-gray-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-base truncate">
              {materiale?.nome || 'Materiale sconosciuto'}
            </p>
            <p className="text-sm text-gray-500 truncate">{evento?.titolo || '—'}</p>
            <p className="text-sm text-gray-400 mt-1 truncate">{destination}</p>
            {note_commerciale && (
              <p className="text-sm text-gray-400 mt-0.5 truncate italic">{note_commerciale}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge stato={stato} labels={STATO_MATERIALE_LISTA} colors={STATO_MATERIALE_LISTA_COLORE} />
          {quantita > 1 && (
            <span className="text-sm text-gray-500">x{quantita}</span>
          )}
        </div>
      </div>
      {evento?.data_inizio && (
        <p className="mt-2 text-xs text-gray-400">
          Evento: {formatDateRange(evento.data_inizio, evento.data_fine)}
        </p>
      )}
    </button>
  )
}

export function LogisticaTimeline() {
  const timeline = useMaterialsStore(s => s.logisticsTimeline)
  const loading = useMaterialsStore(s => s.loading)
  const fetchLogisticsTimeline = useMaterialsStore(s => s.fetchLogisticsTimeline)
  const navigate = useNavigate()

  useEffect(() => { fetchLogisticsTimeline() }, [])

  if (loading) return <div className="px-4 md:px-8 py-4"><LoadingSkeleton lines={5} /></div>

  if (timeline.length === 0) {
    return (
      <EmptyState
        title="Nessuna spedizione in programma"
        description="Non ci sono materiali approvati o in preparazione al momento."
      />
    )
  }

  const groups = groupByShippingDate(timeline)

  return (
    <div className="px-4 md:px-8 py-4 space-y-6">
      {Object.entries(groups).map(([dateLabel, items]) => (
        <div key={dateLabel}>
          <div className="flex items-center gap-2 mb-3">
            <Icon icon={MATERIALE_ICONS.uscita} size={16} className="text-mikai-400" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Spedizione prevista: {dateLabel}
            </h2>
          </div>
          <div className="space-y-3">
            {items.map(item => (
              <TimelineCard key={item.id} item={item} onNavigate={navigate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
