import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialAnalyticsStore } from '../../hooks/useMaterialAnalytics'
import { useProductTypes } from '../../hooks/useProductTypes'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ExportButton } from '../../components/ui/ExportButton'
import { Icon } from '../../components/ui/Icon'
import { SearchInput } from '../../components/ui/SearchInput'
import { SUMMARY_BAR_STYLE, STATO_MATERIALE_LISTA, COLOR_BG_50, COLOR_TEXT_700, COLOR_BORDER_200 } from '../../lib/constants'
import { ACTION_ICONS, NAV_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { formatDate } from '../../lib/date-utils'
import { useExportHandler } from '../../hooks/useExportHandler'

export function LogisticaFabbisogno() {
  const navigate = useNavigate()
  const fabbisogno = useMaterialAnalyticsStore(s => s.fabbisogno)
  const loading = useMaterialAnalyticsStore(s => s.fabbisognoLoading)
  const fetchFabbisogno = useMaterialAnalyticsStore(s => s.fetchFabbisogno)
  const { labels: tipoLabels, colors: tipoColors } = useProductTypes()

  const [search, setSearch] = useState('')
  const [includiProposti, setIncludiProposti] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { fetchFabbisogno({ includiProposti }) }, [includiProposti])

  const filtered = fabbisogno.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.product?.nome?.toLowerCase().includes(q) ||
      item.product?.codice?.toLowerCase().includes(q) ||
      item.product?.brand?.nome?.toLowerCase().includes(q)
    )
  })

  // Group by product type
  const grouped = {}
  for (const item of filtered) {
    const tipo = item.product?.tipo || 'altro'
    if (!grouped[tipo]) grouped[tipo] = { items: [], totale: 0 }
    grouped[tipo].items.push(item)
    grouped[tipo].totale += item.totaleRichiesto
  }
  const groupKeys = Object.keys(grouped).sort((a, b) => grouped[b].totale - grouped[a].totale)

  // Totals
  const totaleRichiesto = filtered.reduce((s, i) => s + i.totaleRichiesto, 0)
  const totaleInsufficiente = filtered.filter(i => {
    const disp = i.product?.quantita_disponibile
    return disp != null && i.totaleRichiesto > disp
  }).length

  const exportColumns = [
    { key: 'prodotto', label: 'Prodotto', width: 25 },
    { key: 'codice', label: 'Codice', width: 12 },
    { key: 'tipo', label: 'Tipo', width: 12 },
    { key: 'brand', label: 'Brand', width: 12 },
    { key: 'fabbisogno', label: 'Fabbisogno', width: 10 },
    { key: 'giacenza', label: 'Giacenza', width: 10 },
    { key: 'delta', label: 'Delta', width: 8 },
    { key: 'richiesti', label: 'Da confermare', width: 12 },
    { key: 'approvati', label: 'Confermati', width: 10 },
    { key: 'inPrep', label: 'In prep.', width: 10 },
    { key: 'spediti', label: 'Spediti', width: 8 },
    { key: 'eventi', label: 'Eventi', width: 8 },
  ]

  const exportRows = filtered.map(item => {
    const disp = item.product?.quantita_disponibile
    return {
      prodotto: item.product?.nome || '—',
      codice: item.product?.codice || '',
      tipo: tipoLabels[item.product?.tipo] || item.product?.tipo || '',
      brand: item.product?.brand?.nome || '',
      fabbisogno: item.totaleRichiesto,
      giacenza: disp ?? '—',
      delta: disp != null ? disp - item.totaleRichiesto : '—',
      richiesti: item.richiesti || 0,
      approvati: item.approvati || 0,
      inPrep: item.inPreparazione || 0,
      spediti: item.spediti || 0,
      eventi: item.eventiCount,
    }
  })

  const { handleExport, exporting } = useExportHandler()

  const onExport = () => handleExport({
    columns: exportColumns, rows: exportRows,
    filename: 'fabbisogno_materiale', sheetName: 'Fabbisogno',
  })

  return (
    <div className="px-4 md:px-6 space-y-4 pb-8">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex-1 max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Cerca prodotto..." />
        </div>
        <label className="flex items-center gap-2 cursor-pointer min-h-[48px]">
          <input type="checkbox" checked={includiProposti} onChange={e => setIncludiProposti(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" />
          <span className="text-sm text-gray-700">Includi proposti</span>
        </label>
        {filtered.length > 0 && <ExportButton onClick={onExport} loading={exporting} label="Esporta" />}
      </div>

      {!loading && filtered.length > 0 && (
        <div className={SUMMARY_BAR_STYLE + ' flex flex-wrap gap-x-6 gap-y-1 text-sm'}>
          <span className="font-medium text-mikai-700">{filtered.length} prodotti · {totaleRichiesto} pezzi</span>
          <span className="text-mikai-600">{groupKeys.length} tipologie · {new Set(filtered.flatMap(i => i.dettaglio.map(d => d.eventoId))).size} eventi</span>
          {totaleInsufficiente > 0 && (
            <span className="font-medium text-red-600 flex items-center gap-1">
              <Icon icon={FEEDBACK_ICONS.warning} size={14} />
              {totaleInsufficiente} con giacenza insufficiente
            </span>
          )}
        </div>
      )}

      {loading ? <LoadingSkeleton lines={8} /> : filtered.length === 0 ? (
        <EmptyState title="Nessun fabbisogno" description={fabbisogno.length === 0 ? 'Non ci sono richieste materiale per eventi attivi.' : 'Nessun risultato per la ricerca.'} />
      ) : (
        <div className="space-y-4">
          {groupKeys.map(tipo => {
            const group = grouped[tipo]
            const color = tipoColors[tipo] || 'gray'
            return (
              <div key={tipo}>
                {/* Group header */}
                <div className={`flex items-center justify-between px-3 py-1.5 rounded-t-lg border border-b-0 ${COLOR_BORDER_200[color] || 'border-gray-200'} ${COLOR_BG_50[color] || 'bg-gray-50'}`}>
                  <span className={`text-xs font-semibold uppercase ${COLOR_TEXT_700[color] || 'text-gray-700'}`}>
                    {tipoLabels[tipo] || tipo}
                  </span>
                  <span className="text-xs text-gray-500">{group.items.length} prodotti · {group.totale} pz</span>
                </div>

                {/* Table */}
                <div className="border border-gray-200 rounded-b-lg overflow-hidden divide-y divide-gray-100">
                  {/* Desktop header */}
                  <div className="hidden md:grid grid-cols-12 gap-1 px-3 py-1 text-[11px] font-medium text-gray-400 uppercase bg-gray-50/50">
                    <div className="col-span-4">Prodotto</div>
                    <div className="col-span-1 text-right">Fabbisogno</div>
                    <div className="col-span-1 text-right">Giacenza</div>
                    <div className="col-span-1 text-right">Delta</div>
                    <div className="col-span-4">Stato</div>
                    <div className="col-span-1 text-center">Ev.</div>
                  </div>

                  {group.items.map(item => {
                    const isExpanded = expandedId === item.product?.id
                    const disp = item.product?.quantita_disponibile
                    const delta = disp != null ? disp - item.totaleRichiesto : null
                    const insufficient = delta != null && delta < 0

                    return (
                      <div key={item.product?.id}>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.product?.id)}
                          className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors ${insufficient ? 'bg-red-50/30' : ''}`}
                          aria-expanded={isExpanded}
                        >
                          <div className="md:grid md:grid-cols-12 md:gap-1 md:items-center flex items-center gap-2">
                            {/* Product */}
                            <div className="col-span-4 min-w-0 flex-1">
                              <span className="text-sm font-medium text-gray-900 truncate block">{item.product?.nome}</span>
                              <span className="text-xs text-gray-400 md:hidden">
                                {item.product?.brand?.nome && `${item.product.brand.nome} · `}×{item.totaleRichiesto}
                                {disp != null && ` / ${disp} disp.`}
                              </span>
                            </div>

                            {/* Fabbisogno */}
                            <div className="col-span-1 text-right hidden md:block">
                              <span className="text-sm font-bold text-gray-900">{item.totaleRichiesto}</span>
                            </div>

                            {/* Giacenza */}
                            <div className="col-span-1 text-right hidden md:block">
                              <span className={`text-sm ${disp != null ? 'text-gray-700' : 'text-gray-300'}`}>
                                {disp ?? '—'}
                              </span>
                            </div>

                            {/* Delta */}
                            <div className="col-span-1 text-right hidden md:block">
                              {delta != null ? (
                                <span className={`text-sm font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {delta >= 0 ? `+${delta}` : delta}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-300">—</span>
                              )}
                            </div>

                            {/* Status pills */}
                            <div className="col-span-4 hidden md:flex flex-wrap gap-1">
                              {item.richiesti > 0 && <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-yellow-100 text-yellow-700">{item.richiesti} att.</span>}
                              {item.approvati > 0 && <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700">{item.approvati} conf.</span>}
                              {item.inPreparazione > 0 && <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-mikai-100 text-mikai-700">{item.inPreparazione} prep.</span>}
                              {item.spediti > 0 && <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-700">{item.spediti} sped.</span>}
                            </div>

                            {/* Events count */}
                            <div className="col-span-1 text-center hidden md:block">
                              <span className="text-xs text-gray-500">{item.eventiCount}</span>
                            </div>

                            {/* Mobile: delta badge */}
                            {insufficient && (
                              <span className="md:hidden text-xs font-semibold text-red-600">{delta}</span>
                            )}

                            <Icon icon={isExpanded ? ACTION_ICONS.chevronUp : ACTION_ICONS.chevronDown} size={12} className="text-gray-300 shrink-0 md:hidden" />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="bg-gray-50 px-3 py-1.5 space-y-0.5">
                            {item.dettaglio
                              .sort((a, b) => (a.eventoData || '').localeCompare(b.eventoData || ''))
                              .map((det, i) => (
                              <div key={i}
                                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white text-xs cursor-pointer transition-colors"
                                onClick={(e) => { e.stopPropagation(); navigate(`/eventi/${det.eventoId}`) }}
                              >
                                <Icon icon={NAV_ICONS.eventi} size={11} className="text-gray-400 shrink-0" />
                                <span className="flex-1 min-w-0 truncate text-gray-700">{det.eventoTitolo}</span>
                                {det.eventoData && <span className="text-gray-400 shrink-0">{formatDate(det.eventoData)}</span>}
                                <span className="font-medium text-gray-900 shrink-0">×{det.quantitaApprovata || det.quantita}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  det.stato === 'richiesto' ? 'bg-yellow-100 text-yellow-700' :
                                  det.stato === 'approvato' ? 'bg-green-100 text-green-700' :
                                  det.stato === 'in_preparazione' ? 'bg-mikai-100 text-mikai-700' :
                                  'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {STATO_MATERIALE_LISTA[det.stato] || det.stato}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
