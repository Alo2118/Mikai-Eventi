import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialAnalyticsStore } from '../../hooks/useMaterialAnalytics'
import { useCatalogStore } from '../../hooks/useCatalog'
import { useToastStore } from '../../components/ui/Toast'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ProgressIndicator } from '../../components/ui/ProgressIndicator'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Button'
import { MATERIALE_ICONS, TIPO_PRODOTTO_ICONS, NAV_ICONS, ACTION_ICONS, DOCUMENTO_ICONS } from '../../lib/icons'
import { STATO_MATERIALE_LISTA, STATO_MATERIALE_LISTA_COLORE, CARD_STYLE, SUMMARY_BAR_STYLE } from '../../lib/constants'
import { formatDate, formatDateRange, subtractDays, todayISO } from '../../lib/date-utils'
import { generateShippingPDF } from '../../lib/generate-shipping-pdf'

// Type icon + color (same as MaterialListRow)
const TIPO_ICON = {
  demo_kit: { icon: TIPO_PRODOTTO_ICONS.demo_kit, bg: 'bg-blue-100', text: 'text-blue-600', label: 'Kit' },
  strumentario: { icon: TIPO_PRODOTTO_ICONS.strumentario, bg: 'bg-purple-100', text: 'text-purple-600', label: 'Strum.' },
  montaggio: { icon: TIPO_PRODOTTO_ICONS.montaggio, bg: 'bg-orange-100', text: 'text-orange-600', label: 'Mont.' },
  pezzo_sfuso: { icon: TIPO_PRODOTTO_ICONS.pezzo_sfuso, bg: 'bg-gray-100', text: 'text-gray-600', label: 'Sfuso' },
  gadget: { icon: TIPO_PRODOTTO_ICONS.gadget, bg: 'bg-pink-100', text: 'text-pink-600', label: 'Gadget' },
  ossa: { icon: TIPO_PRODOTTO_ICONS.ossa, bg: 'bg-amber-100', text: 'text-amber-600', label: 'Ossa' },
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

function KitContentsExpander({ contents }) {
  const [open, setOpen] = useState(false)
  if (!contents?.length) return null
  return (
    <div className="ml-7 mt-1 mb-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="text-xs text-mikai-600 hover:text-mikai-700 inline-flex items-center gap-1 min-h-[28px]"
        aria-expanded={open}
      >
        <Icon icon={open ? ACTION_ICONS.chevronUp : ACTION_ICONS.chevronDown} size={12} />
        Distinta ({contents.length} {contents.length === 1 ? 'pezzo' : 'pezzi'})
      </button>
      {open && (
        <ul className="mt-1 ml-4 space-y-0.5 border-l-2 border-mikai-100 pl-3">
          {contents.map(c => (
            <li key={c.id} className="text-xs text-gray-600 flex items-center gap-2">
              <span className="text-gray-400 font-mono shrink-0 min-w-[2rem]">×{c.quantity}</span>
              <span className="text-gray-700">{c.piece_name}</span>
              {c.piece_code && <span className="text-gray-400 font-mono text-[10px]">{c.piece_code}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EventShippingCard({ group, onNavigate, kitContents }) {
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
                  const contents = kitContents?.[item.product_id]
                  return (
                    <div key={item.id} className="py-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-gray-900 truncate">{nome}</span>
                          {item.quantita > 1 && <span className="text-xs text-gray-400 flex-shrink-0">×{item.quantita}</span>}
                        </div>
                        <StatusBadge stato={item.stato} labels={STATO_MATERIALE_LISTA} colors={STATO_MATERIALE_LISTA_COLORE} />
                      </div>
                      <KitContentsExpander contents={contents} />
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
  const timeline = useMaterialAnalyticsStore(s => s.logisticsTimeline)
  const loading = useMaterialAnalyticsStore(s => s.timelineLoading)
  const fetchLogisticsTimeline = useMaterialAnalyticsStore(s => s.fetchLogisticsTimeline)
  const fetchKitContentsBatch = useCatalogStore(s => s.fetchKitContentsBatch)
  const navigate = useNavigate()
  const addToast = useToastStore(s => s.add)
  const [generating, setGenerating] = useState(false)
  const [kitContents, setKitContents] = useState({})

  useEffect(() => { fetchLogisticsTimeline() }, [])

  useEffect(() => {
    if (!timeline.length) { setKitContents({}); return }
    const ids = [...new Set(timeline.map(t => t.product_id).filter(Boolean))]
    fetchKitContentsBatch(ids).then(({ data }) => setKitContents(data || {}))
  }, [timeline])

  const eventGroups = timeline.length > 0 ? groupByEvent(timeline) : []

  const handleDownloadPDF = async () => {
    if (eventGroups.length === 0) return
    setGenerating(true)
    try {
      const doc = await generateShippingPDF(eventGroups, kitContents)
      doc.save(`spedizioni_materiale_${todayISO()}.pdf`)
      addToast('PDF generato', 'success')
    } catch {
      addToast('Errore nella generazione del PDF', 'error')
    }
    setGenerating(false)
  }

  if (loading) return <div className="px-4 md:px-8 py-4"><LoadingSkeleton lines={5} /></div>

  if (eventGroups.length === 0) {
    return (
      <EmptyState
        title="Nessuna spedizione in programma"
        description="Non ci sono materiali approvati o in preparazione al momento."
      />
    )
  }

  return (
    <div className="px-4 md:px-8 py-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">{eventGroups.length} {eventGroups.length === 1 ? 'evento' : 'eventi'} con materiale da spedire</p>
        <Button variant="secondary" size="sm" onClick={handleDownloadPDF} loading={generating}>
          <Icon icon={DOCUMENTO_ICONS.dossier} size={16} className="mr-1" />
          Scarica PDF
        </Button>
      </div>
      {eventGroups.map(group => (
        <EventShippingCard key={group.evento.id} group={group} onNavigate={navigate} kitContents={kitContents} />
      ))}
    </div>
  )
}
