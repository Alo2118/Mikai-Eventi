import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useCatalogStore } from '../../hooks/useCatalog'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { CARD_STYLE, CARD_HOVER_STYLE } from '../../lib/constants'
import { MAGAZZINO_ICONS, ACTION_ICONS, FEEDBACK_ICONS, NAV_ICONS } from '../../lib/icons'
import { formatDateShort } from '../../lib/date-utils'
import { MagazzinoSummaryBar } from './MagazzinoSummaryBar'
import { MagazzinoSezioneList } from './MagazzinoSezioneList'
import { ProductThumb } from './ProductThumb'
import { BulkReturnModal } from './BulkReturnModal'

const SEVERITY_FOR_DAYS = (days, thresholdYellow, thresholdRed) => {
  if (days == null) return 'gray'
  if (days >= thresholdRed) return 'red'
  if (days >= thresholdYellow) return 'yellow'
  return 'green'
}

function PreparazioneCard({ evento }) {
  const giorni = evento.giorni_mancanti
  const giorniLabel = giorni === 0 ? 'oggi' : giorni === 1 ? 'domani' : `tra ${giorni} giorni`
  const severity = giorni <= 0 ? 'red' : giorni <= 2 ? 'yellow' : 'gray'
  const dotColor = severity === 'red' ? 'bg-red-500' : severity === 'yellow' ? 'bg-yellow-400' : 'bg-gray-300'

  return (
    <div className={CARD_HOVER_STYLE + ' flex items-center gap-3 flex-wrap'}>
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 truncate">{evento.titolo}</div>
        <div className="text-sm text-gray-500">
          {formatDateShort(evento.data_inizio)} · {giorniLabel} · {evento.da_preparare.length} pezzi da preparare
          {evento.totale > evento.da_preparare.length && (
            <span className="text-gray-400"> ({evento.totale - evento.da_preparare.length} già preparati)</span>
          )}
        </div>
      </div>
      <Link
        to={`/eventi/${evento.id}?tab=materiale`}
        className="inline-flex items-center gap-1 text-sm font-medium text-mikai-600 hover:text-mikai-700 min-h-[48px] px-2"
      >
        Apri preparazione
        <Icon icon={ACTION_ICONS.forward} size={14} />
      </Link>
    </div>
  )
}

function RientroCard({ evento, count, giorniDaConclusione, onRegistraRientro }) {
  const giorniLabel = giorniDaConclusione == null
    ? 'concluso'
    : giorniDaConclusione === 0
      ? 'concluso oggi'
      : `concluso ${giorniDaConclusione} ${giorniDaConclusione === 1 ? 'giorno' : 'giorni'} fa`
  const severity = giorniDaConclusione >= 10 ? 'red' : giorniDaConclusione >= 5 ? 'yellow' : 'gray'
  const dotColor = severity === 'red' ? 'bg-red-500' : severity === 'yellow' ? 'bg-yellow-400' : 'bg-gray-300'

  return (
    <div className={CARD_HOVER_STYLE + ' flex items-center gap-3 flex-wrap'}>
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 truncate">{evento.titolo}</div>
        <div className="text-sm text-gray-500">
          {giorniLabel} · {count} {count === 1 ? 'pezzo da rientrare' : 'pezzi da rientrare'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRegistraRientro(evento)}
        className="inline-flex items-center gap-1 text-sm font-medium text-mikai-600 hover:text-mikai-700 min-h-[48px] px-2"
      >
        Registra rientro
        <Icon icon={MAGAZZINO_ICONS.rientro} size={14} />
      </button>
    </div>
  )
}

function AgenteRiassuntoCard({ agente, kit_count, giorni_max, materials }) {
  const severity = SEVERITY_FOR_DAYS(giorni_max, 30, 60)
  const dotColor = severity === 'red' ? 'bg-red-500' : severity === 'yellow' ? 'bg-yellow-400' : 'bg-gray-300'
  const giorniLabel = giorni_max != null ? `da ${giorni_max} ${giorni_max === 1 ? 'giorno' : 'giorni'}` : 'fuori'
  const senzaEvento = materials.filter(m => !m.evento_collegato).length

  return (
    <div className={CARD_HOVER_STYLE + ' flex items-center gap-3 flex-wrap'}>
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 truncate">
          {agente?.cognome} {agente?.nome}
          {agente?.zona && <span className="text-gray-400 font-normal"> · {agente.zona}</span>}
        </div>
        <div className="text-sm text-gray-500">
          {kit_count} {kit_count === 1 ? 'kit' : 'kit'} fuori · {giorniLabel}
          {senzaEvento > 0 && (
            <span className="text-orange-600 font-medium"> · {senzaEvento} senza evento</span>
          )}
        </div>
      </div>
      <Link
        to={`/materiale/agenti?id=${agente?.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-mikai-600 hover:text-mikai-700 min-h-[48px] px-2"
      >
        Vedi kit
        <Icon icon={ACTION_ICONS.forward} size={14} />
      </Link>
    </div>
  )
}

function SottoSogliaCard({ product }) {
  return (
    <div className={CARD_HOVER_STYLE + ' flex items-center gap-3 flex-wrap'}>
      <ProductThumb product={product} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900 truncate">
          {product.nome}
          {product.brand?.nome && <span className="text-gray-400 font-normal"> · {product.brand.nome}</span>}
        </div>
        <div className="text-sm text-gray-500">
          Disponibili: <span className="font-semibold text-red-600">{product.quantita_disponibile ?? 0}</span>
          {' '}/ soglia minima {product.soglia_minima}
        </div>
      </div>
    </div>
  )
}

export function MagazzinoOggi({ onSwitchToStock }) {
  const navigate = useNavigate()
  const fetchMaterialsByAgent = useMaterialsStore(s => s.fetchMaterialsByAgent)
  const fetchEventsPendingReturn = useMaterialsStore(s => s.fetchEventsPendingReturn)
  const fetchPreparazioniImminenti = useMaterialsStore(s => s.fetchPreparazioniImminenti)
  const stockProducts = useCatalogStore(s => s.stockProducts)
  const fetchStockProducts = useCatalogStore(s => s.fetchStockProducts)

  const [loading, setLoading] = useState(true)
  const [preparazioni, setPreparazioni] = useState([])
  const [rientri, setRientri] = useState([])
  const [agenti, setAgenti] = useState([])
  const [returnModalEvento, setReturnModalEvento] = useState(null)

  const reload = async () => {
    setLoading(true)
    const [pRes, rRes, aRes] = await Promise.all([
      fetchPreparazioniImminenti(7),
      fetchEventsPendingReturn(),
      fetchMaterialsByAgent(),
    ])
    setPreparazioni(pRes.data || [])
    setRientri(rRes.data || [])
    setAgenti(aRes.data || [])
    if ((stockProducts || []).length === 0) await fetchStockProducts()
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  const sottoSoglia = useMemo(
    () => stockProducts.filter(p => p.soglia_minima != null && p.quantita_disponibile <= p.soglia_minima),
    [stockProducts]
  )

  const agentiCritici = useMemo(
    () => agenti.filter(a => (a.giorni_max || 0) >= 30),
    [agenti]
  )

  const rientriUrgenti = useMemo(
    () => rientri.filter(r => (r.giorni_da_conclusione || 0) >= 5),
    [rientri]
  )

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const kpis = [
    {
      id: 'kpi-prep',
      label: 'Da preparare entro 7 giorni',
      count: preparazioni.length,
      severity: preparazioni.length === 0 ? 'green' : preparazioni.some(p => p.giorni_mancanti <= 2) ? 'red' : 'yellow',
      icon: MAGAZZINO_ICONS.imminente,
      onClick: () => scrollTo('sez-prep'),
    },
    {
      id: 'kpi-rientri',
      label: 'Rientri scaduti',
      hint: rientriUrgenti.length > 0 ? `${rientriUrgenti.length} concluso da ≥5 giorni` : null,
      count: rientri.length,
      severity: rientriUrgenti.length > 0 ? 'red' : rientri.length > 0 ? 'yellow' : 'green',
      icon: MAGAZZINO_ICONS.scaduto,
      onClick: () => scrollTo('sez-rientri'),
    },
    {
      id: 'kpi-agenti',
      label: 'Agenti con kit fuori',
      hint: agentiCritici.length > 0 ? `${agentiCritici.length} oltre 30 giorni` : null,
      count: agenti.length,
      severity: agenti.some(a => (a.giorni_max || 0) >= 60) ? 'red' : agentiCritici.length > 0 ? 'yellow' : 'gray',
      icon: NAV_ICONS.profilo,
      onClick: () => scrollTo('sez-agenti'),
    },
    {
      id: 'kpi-soglia',
      label: 'Sotto soglia',
      count: sottoSoglia.length,
      severity: sottoSoglia.length > 0 ? 'yellow' : 'green',
      icon: FEEDBACK_ICONS.warning,
      onClick: () => scrollTo('sez-soglia'),
    },
  ]

  if (loading) {
    return (
      <div className="px-4 md:px-6 space-y-4">
        <LoadingSkeleton lines={6} />
      </div>
    )
  }

  return (
    <div className="px-4 md:px-6 space-y-6 pb-8">
      <MagazzinoSummaryBar kpis={kpis} />

      <MagazzinoSezioneList
        id="sez-prep"
        title="Eventi da preparare"
        count={preparazioni.length}
        severity={preparazioni.length === 0 ? 'green' : preparazioni.some(p => p.giorni_mancanti <= 2) ? 'red' : 'yellow'}
        emptyTitle="Nessun evento da preparare nei prossimi 7 giorni"
        emptyDescription="Quando si avvicineranno eventi con materiale ancora da approvare o preparare, li vedrai qui."
      >
        {preparazioni.map(ev => <PreparazioneCard key={ev.id} evento={ev} />)}
      </MagazzinoSezioneList>

      <MagazzinoSezioneList
        id="sez-rientri"
        title="Rientri da registrare"
        count={rientri.length}
        severity={rientri.length === 0 ? 'green' : rientriUrgenti.length > 0 ? 'red' : 'yellow'}
        emptyTitle="Nessun rientro pendente"
        emptyDescription="Quando un evento si concluderà e ci sarà materiale da far rientrare, lo vedrai qui."
      >
        {rientri.map(r => (
          <RientroCard
            key={r.evento.id}
            evento={r.evento}
            count={r.count}
            giorniDaConclusione={r.giorni_da_conclusione}
            onRegistraRientro={(ev) => setReturnModalEvento(ev)}
          />
        ))}
      </MagazzinoSezioneList>

      <MagazzinoSezioneList
        id="sez-agenti"
        title="Kit presso agenti"
        count={agenti.length}
        severity={agenti.some(a => (a.giorni_max || 0) >= 60) ? 'red' : agentiCritici.length > 0 ? 'yellow' : 'gray'}
        emptyTitle="Nessun materiale presso agenti"
        emptyDescription="Quando consegnerai kit a un agente sul campo, qui vedrai chi ha cosa e da quanto tempo."
        actionLabel={agenti.length > 0 ? 'Vedi tutti →' : null}
        onAction={agenti.length > 0 ? () => navigate('/materiale/agenti') : null}
      >
        {agenti.slice(0, 5).map(a => (
          <AgenteRiassuntoCard key={a.agente?.id} {...a} />
        ))}
      </MagazzinoSezioneList>

      <MagazzinoSezioneList
        id="sez-soglia"
        title="Prodotti sotto soglia"
        count={sottoSoglia.length}
        severity={sottoSoglia.length === 0 ? 'green' : 'yellow'}
        emptyTitle="Tutte le scorte sopra la soglia minima"
        emptyDescription="Imposta la soglia minima sui prodotti per essere avvisato quando le scorte calano."
        actionLabel={sottoSoglia.length > 0 && onSwitchToStock ? 'Vai a Stock →' : null}
        onAction={onSwitchToStock}
      >
        {sottoSoglia.slice(0, 6).map(p => <SottoSogliaCard key={p.id} product={p} />)}
      </MagazzinoSezioneList>

      <BulkReturnModal
        open={!!returnModalEvento}
        eventId={returnModalEvento?.id}
        eventTitolo={returnModalEvento?.titolo}
        onClose={() => setReturnModalEvento(null)}
        onDone={() => { setReturnModalEvento(null); reload() }}
      />
    </div>
  )
}
