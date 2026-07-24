import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useEventTypes } from '../../hooks/useEventTypes'
import { richiedeHotel, richiedeTrasporti } from '../../lib/event-flow'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useToastStore } from '../../components/ui/Toast'
import { LOGISTICA_PERSONE_ICONS, ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import {
  CARD_ITEM_STYLE,
  GROUP_HEADING_STYLE,
  STATO_PRENOTAZIONE,
  STATO_PRENOTAZIONE_COLORE,
  MEZZO_TRASPORTO,
  DIREZIONE_TRASPORTO,
} from '../../lib/constants'
import { GROUP_PRENOTAZIONI, groupPrenotazioni } from '../../lib/logistics-utils'
import { formatDate, formatDateTime, daysBetween, todayISO } from '../../lib/date-utils'

const GROUPBY_KEY = 'eventi.logistica.prenotazioni.groupBy'
const VALID_GROUPBY = GROUP_PRENOTAZIONI.map(g => g.id)

// Avanzamento stato: da_prenotare → prenotato → confermato
const NEXT_STATO = { da_prenotare: 'prenotato', prenotato: 'confermato' }
const NEXT_LABEL = { da_prenotare: 'Segna prenotato', prenotato: 'Segna confermato' }

function loadGroupBy() {
  try {
    const raw = localStorage.getItem(GROUPBY_KEY)
    return VALID_GROUPBY.includes(raw) ? raw : 'urgenza'
  } catch {
    return 'urgenza'
  }
}

function saveGroupBy(value) {
  try {
    localStorage.setItem(GROUPBY_KEY, value)
  } catch {
    // localStorage non disponibile — ignora silenziosamente
  }
}

function personName(r) {
  if (r.user) return `${r.user.nome} ${r.user.cognome}`.trim()
  if (r.contact) return `${r.contact.nome} ${r.contact.cognome}`.trim()
  return 'Persona da definire'
}

function normalizeHotel(r) {
  const dettaglio = [
    r.check_in ? `dal ${formatDate(r.check_in)}` : null,
    r.check_out ? `al ${formatDate(r.check_out)}` : null,
  ].filter(Boolean).join(' ')
  return {
    id: r.id,
    kind: 'hotel',
    stato: r.stato,
    evento: r.evento,
    persona: personName(r),
    primario: r.nome_hotel || 'Hotel da assegnare',
    dettaglio,
  }
}

function normalizeTrasporto(r) {
  const primario = [
    MEZZO_TRASPORTO[r.mezzo] || null,
    r.codice || null,
    r.luogo_partenza || null,
    r.luogo_arrivo ? `→ ${r.luogo_arrivo}` : null,
  ].filter(Boolean).join(' ') || 'Trasporto da definire'
  const dettaglio = [
    DIREZIONE_TRASPORTO[r.direzione] || null,
    r.orario ? formatDateTime(r.orario) : null,
  ].filter(Boolean).join(' · ')
  return {
    id: r.id,
    kind: 'trasporto',
    stato: r.stato,
    evento: r.evento,
    persona: personName(r),
    primario,
    dettaglio,
  }
}

function giorniLabel(dataInizio) {
  if (!dataInizio) return null
  const g = daysBetween(dataInizio, todayISO())
  if (g < 0) return 'iniziato'
  if (g === 0) return 'oggi'
  if (g === 1) return 'domani'
  return `tra ${g} gg`
}

function PrenotazioneCard({ item, hideEvento, advancing, onAdvance, onNavigate }) {
  const icon = item.kind === 'hotel' ? LOGISTICA_PERSONE_ICONS.hotel : LOGISTICA_PERSONE_ICONS.trasporto
  const giorni = giorniLabel(item.evento?.data_inizio)
  const meta = [
    hideEvento ? null : (item.evento?.titolo || 'Senza evento'),
    item.dettaglio || null,
  ].filter(Boolean).join(' · ')
  const nextLabel = NEXT_LABEL[item.stato]

  return (
    <div className={CARD_ITEM_STYLE + ' bg-white space-y-3'}>
      <div className="flex items-start gap-3">
        <Icon icon={icon} size={20} className="shrink-0 mt-0.5 text-gray-400" />
        <button
          type="button"
          onClick={() => item.evento?.id && onNavigate(`/eventi/${item.evento.id}`)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="font-semibold text-gray-900 text-base truncate">{item.persona}</p>
          <p className="text-base text-gray-700 truncate">{item.primario}</p>
          {meta && <p className="text-sm text-gray-500 truncate">{meta}</p>}
        </button>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <StatusBadge stato={item.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
          {giorni && <span className="text-sm text-gray-500">{giorni}</span>}
        </div>
      </div>
      {nextLabel && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          loading={advancing}
          onClick={() => onAdvance(item)}
        >
          <Icon icon={ACTION_ICONS.check} size={18} className="mr-2" />
          {nextLabel}
        </Button>
      )}
    </div>
  )
}

function GroupHeader({ group }) {
  const accentText =
    group.accent === 'red' ? 'text-red-600' : group.accent === 'yellow' ? 'text-yellow-600' : 'text-gray-700'
  return (
    <div className={`${GROUP_HEADING_STYLE} flex items-center justify-between gap-2`}>
      <span className={`flex items-center gap-2 min-w-0 ${accentText}`}>
        {group.accent === 'red' && <Icon icon={FEEDBACK_ICONS.warning} size={16} className="shrink-0" />}
        <span className="font-medium truncate">{group.label}</span>
        {group.sublabel && <span className="text-gray-500 font-normal truncate">· {group.sublabel}</span>}
      </span>
      <span className="shrink-0 text-gray-600 font-semibold">{group.count}</span>
    </div>
  )
}

export function LogisticaPrenotazioni() {
  const fetchAllPendingHotels = useLogisticsStore(s => s.fetchAllPendingHotels)
  const fetchAllPendingTrasporti = useLogisticsStore(s => s.fetchAllPendingTrasporti)
  const updateHotel = useLogisticsStore(s => s.updateHotel)
  const updateTrasporto = useLogisticsStore(s => s.updateTrasporto)
  const { eventTypes } = useEventTypes()
  const addToast = useToastStore(s => s.add)
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [advancingId, setAdvancingId] = useState(null)
  const [groupBy, setGroupBy] = useState(loadGroupBy)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(false)
      const [hotelRes, trasportiRes] = await Promise.all([fetchAllPendingHotels(), fetchAllPendingTrasporti()])
      if (!active) return
      if (hotelRes.error || trasportiRes.error) {
        setError(true)
        setLoading(false)
        return
      }
      const normalized = [
        ...(hotelRes.data || []).map(normalizeHotel),
        ...(trasportiRes.data || []).map(normalizeTrasporto),
      ]
      setItems(normalized)
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  useEffect(() => { saveGroupBy(groupBy) }, [groupBy])

  // Branching per tipo evento: nascondi hotel/trasporti per tipi che non li richiedono
  const visibleItems = useMemo(() => {
    return items.filter(it => {
      const et = eventTypes.find(t => t.codice === it.evento?.tipo_evento) || null
      return it.kind === 'hotel' ? richiedeHotel(et) : richiedeTrasporti(et)
    })
  }, [items, eventTypes])

  const handleAdvance = async (item) => {
    const next = NEXT_STATO[item.stato]
    if (!next) return
    setAdvancingId(`${item.kind}-${item.id}`)
    const action = item.kind === 'hotel' ? updateHotel : updateTrasporto
    const { error: err } = await action(item.id, { stato: next })
    setAdvancingId(null)
    if (err) {
      addToast('Non siamo riusciti ad aggiornare lo stato. Riprova.', 'error')
      return
    }
    addToast(next === 'confermato' ? 'Prenotazione confermata' : 'Segnato come prenotato', 'success')
    setItems(prev =>
      next === 'confermato'
        ? prev.filter(i => !(i.id === item.id && i.kind === item.kind))
        : prev.map(i => (i.id === item.id && i.kind === item.kind ? { ...i, stato: next } : i)),
    )
  }

  if (loading) return <div className="px-4 md:px-8 py-4"><LoadingSkeleton lines={4} /></div>

  if (error) {
    return (
      <EmptyState
        title="Non siamo riusciti a caricare le prenotazioni"
        description="Controlla la connessione e riprova."
      />
    )
  }

  if (visibleItems.length === 0) {
    return (
      <EmptyState
        title="Nessuna prenotazione in sospeso"
        description="Hotel e trasporti di tutti gli eventi sono già prenotati o confermati."
      />
    )
  }

  const groups = groupPrenotazioni(visibleItems, groupBy)
  const hideEvento = groupBy === 'evento'

  return (
    <div className="px-4 md:px-8 py-4 space-y-4">
      <p className="text-sm text-gray-500">
        {visibleItems.length} prenotazion{visibleItems.length !== 1 ? 'i' : 'e'} da gestire
      </p>
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Raggruppa le prenotazioni">
        <span className="text-sm text-gray-400">Raggruppa per:</span>
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {GROUP_PRENOTAZIONI.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupBy(g.id)}
              aria-pressed={groupBy === g.id}
              className={`px-3 py-1 rounded-md text-sm font-medium min-h-[48px] md:min-h-0 transition-colors ${
                groupBy === g.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-5">
        {groups.map(group => (
          <div key={group.key} className="space-y-2">
            <GroupHeader group={group} />
            {group.items.map(item => (
              <PrenotazioneCard
                key={`${item.kind}-${item.id}`}
                item={item}
                hideEvento={hideEvento}
                advancing={advancingId === `${item.kind}-${item.id}`}
                onAdvance={handleAdvance}
                onNavigate={navigate}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
