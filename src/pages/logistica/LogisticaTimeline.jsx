import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ProgressIndicator } from '../../components/ui/ProgressIndicator'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { MATERIALE_ICONS, NAV_ICONS, ACTION_ICONS } from '../../lib/icons'
import { STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE, CARD_STYLE, SUMMARY_BAR_STYLE } from '../../lib/constants'
import { formatDate, formatDateRange, subtractDays } from '../../lib/date-utils'

// Type icon + color (same as MaterialListRow)
const TIPO_ICON = {
  demo_kit: { icon: MATERIALE_ICONS.package, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Kit' },
  strumentario: { icon: MATERIALE_ICONS.package_open, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Strum.' },
  montaggio: { icon: MATERIALE_ICONS.manutenzione, bg: 'bg-orange-100', text: 'text-orange-600', label: 'Mont.' },
  pezzo_sfuso: { icon: MATERIALE_ICONS.package, bg: 'bg-gray-100', text: 'text-gray-600', label: 'Sfuso' },
  gadget: { icon: MATERIALE_ICONS.gadget, bg: 'bg-pink-100', text: 'text-pink-600', label: 'Gadget' },
}

function groupByEvent(items) {
  const map = {}
  for (const item of items) {
    const eventId = item.evento?.id
    if (!eventId) continue
    if (!map[eventId]) {
      map[eventId] = {
        evento: item.evento,
        items: [],
        shippingDate: item.evento?.data_spedizione_prevista
          || (item.evento?.data_inizio ? subtractDays(item.evento.data_inizio, 7) : null),
      }
    }
    map[eventId].items.push(item)
  }
  // Sort by shipping date ascending
  return Object.values(map).sort((a, b) => (a.shippingDate || '').localeCompare(b.shippingDate || ''))
}

function groupByTipo(items) {
  const map = {}
  for (const item of items) {
    const tipo = item.product?.tipo || 'altro'
    if (!map[tipo]) map[tipo] = []
    map[tipo].push(item)
  }
  // Sort: demo_kit first, then strumentario, montaggio, gadget, altro
  const order = ['demo_kit', 'strumentario', 'montaggio', 'pezzo_sfuso', 'gadget', 'altro']
  return order.filter(t => map[t]).map(t => ({ tipo: t, items: map[t] }))
}

function EventShippingCard({ group, onNavigate }) {
  const { evento, items, shippingDate } = group
  const inPrep = items.filter(i => i.stato === 'in_preparazione').length
  const confirmed = items.filter(i => i.stato === 'approvato').length
  const total = items.length
  const tipoGroups = groupByTipo(items)

  return (
    <div className={CARD_STYLE + ' space-y-4'}>
      {/* Event header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onNavigate(`/eventi/${evento?.id}?tab=materiale`)}
            className="text-left group"
          >
            <h3 className="font-semibold text-base text-gray-900 group-hover:text-mikai-500 transition-colors">
              {evento?.titolo}
            </h3>
          </button>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Icon icon={NAV_ICONS.eventi} size={14} />
              {formatDateRange(evento?.data_inizio, evento?.data_fine)}
            </span>
            {evento?.indirizzo_spedizione && (
              <span className="flex items-center gap-1 truncate max-w-[250px]">
                <Icon icon={MATERIALE_ICONS.truck} size={14} />
                {evento.indirizzo_spedizione}
              </span>
            )}
          </div>
        </div>
        {shippingDate && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-400">Spedizione</p>
            <p className="text-sm font-semibold text-mikai-600">{formatDate(shippingDate)}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <ProgressIndicator
        label="Preparazione"
        current={inPrep}
        total={total}
        color={inPrep === total ? 'green' : confirmed > 0 ? 'yellow' : 'gray'}
      />

      {/* Materials grouped by type */}
      <div className="space-y-3">
        {tipoGroups.map(({ tipo, items: tipoItems }) => {
          const tipoInfo = TIPO_ICON[tipo] || TIPO_ICON.demo_kit
          return (
            <div key={tipo}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${tipoInfo.bg}`}>
                  <Icon icon={tipoInfo.icon} size={14} className={tipoInfo.text} />
                </div>
                <span className={`text-sm font-medium ${tipoInfo.text}`}>{tipoInfo.label}</span>
                <span className="text-xs text-gray-400">({tipoItems.length})</span>
              </div>
              <div className="space-y-1 pl-8">
                {tipoItems.map(item => {
                  const nome = item.product?.nome || item.materiale?.nome || 'Materiale'
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-gray-900 truncate">{nome}</span>
                        {item.quantita > 1 && <span className="text-xs text-gray-400 flex-shrink-0">×{item.quantita}</span>}
                      </div>
                      <StatusBadge stato={item.stato} labels={STATO_MATERIALE_LISTA} colors={STATO_MATERIALE_LISTA_COLORE} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onNavigate(`/eventi/${evento?.id}?tab=materiale`)}
      >
        <Icon icon={ACTION_ICONS.forward} size={16} className="mr-1" />
        Vai al materiale
      </Button>
    </div>
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

  const eventGroups = groupByEvent(timeline)

  return (
    <div className="px-4 md:px-8 py-4 space-y-4">
      {eventGroups.map(group => (
        <EventShippingCard key={group.evento.id} group={group} onNavigate={navigate} />
      ))}
    </div>
  )
}
