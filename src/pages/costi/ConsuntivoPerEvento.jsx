import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConsuntivoStore, aggregateByEvento, aggregateByFornitore } from '../../hooks/useConsuntivo'
import { useEventTypes } from '../../hooks/useEventTypes'
import { useExportHandler } from '../../hooks/useExportHandler'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { ExportButton } from '../../components/ui/ExportButton'
import { Icon } from '../../components/ui/Icon'
import { SELECT_STYLE, CARD_STYLE, CARD_HOVER_STYLE, COLOR_TEXT_600, COLOR_BG_400 } from '../../lib/constants'
import { formatCurrency, formatPercentage } from '../../lib/format-utils'
import { getQuarterRange, getYearRange } from '../../lib/date-utils'
import { ACTION_ICONS } from '../../lib/icons'

const PERIOD_OPTIONS = [
  { value: 'trimestre', label: 'Trimestre corrente' },
  { value: 'anno', label: 'Anno corrente' },
]

const SORT_COLUMNS = [
  { key: 'titolo', label: 'Evento', align: 'left' },
  { key: 'budget', label: 'Budget', align: 'right' },
  { key: 'approvato', label: 'Approvato', align: 'right' },
  { key: 'effettivo', label: 'Effettivo', align: 'right' },
  { key: 'scostamento', label: 'Scostamento', align: 'right' },
]

function sortRows(rows, sortKey, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = a[sortKey]
    const vb = b[sortKey]
    if (va == null && vb == null) return 0
    if (va == null) return 1 // valori mancanti sempre in fondo
    if (vb == null) return -1
    if (typeof va === 'string') return va.localeCompare(vb) * dir
    return (va - vb) * dir
  })
}

function ScostamentoCell({ row }) {
  if (row.scostamento == null) return <span className="text-gray-400">—</span>
  const sign = row.scostamento >= 0 ? '+' : ''
  return (
    <span className={`inline-flex items-center gap-2 font-medium ${COLOR_TEXT_600[row.semaforo]}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${COLOR_BG_400[row.semaforo]}`} aria-hidden="true" />
      {sign}{formatCurrency(row.scostamento)}
      {row.scostamentoPct != null && <span className="text-gray-400">({sign}{formatPercentage(row.scostamentoPct, 1)})</span>}
    </span>
  )
}

export function ConsuntivoPerEvento() {
  const navigate = useNavigate()
  const fetchConsuntivoData = useConsuntivoStore(s => s.fetchConsuntivoData)
  const { labels: eventTypeLabels, eventTypes } = useEventTypes()
  const { exporting, handleExportMultiSheet } = useExportHandler()

  const [period, setPeriod] = useState('anno')
  const [rows, setRows] = useState([])
  const [trasferte, setTrasferte] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sortKey, setSortKey] = useState('scostamento')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    const { start, end } = period === 'trimestre' ? getQuarterRange() : getYearRange()
    fetchConsuntivoData(start, end).then(({ data, trasferte: tr, error: err }) => {
      if (!active) return
      if (err) {
        setError(true)
        setRows([])
        setTrasferte(null)
      } else {
        setRows(data || [])
        setTrasferte(tr || null)
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [period])

  const eventTypesByCodice = useMemo(() => {
    const m = {}
    for (const t of eventTypes || []) m[t.codice] = t
    return m
  }, [eventTypes])

  const perEvento = useMemo(
    () => aggregateByEvento(rows, trasferte ? { ...trasferte, eventTypesByCodice } : null),
    [rows, trasferte, eventTypesByCodice]
  )
  const sorted = useMemo(() => sortRows(perEvento, sortKey, sortDir), [perEvento, sortKey, sortDir])

  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(key === 'titolo' ? 'asc' : 'desc') }
  }

  const tipoLabel = (r) => eventTypeLabels[r.tipo_evento] || r.tipo_evento || '—'

  const handleExport = () => {
    handleExportMultiSheet({
      filename: 'consuntivo',
      sheets: [
        {
          name: 'Per evento',
          columns: [
            { key: 'titolo', label: 'Evento', width: 32 },
            { key: 'tipo', label: 'Tipo', format: (_v, r) => tipoLabel(r) },
            { key: 'budget', label: 'Budget previsto', format: v => v || 0 },
            { key: 'approvato', label: 'Preventivato approvato' },
            { key: 'effettivo', label: 'Costo effettivo' },
            { key: 'scostamento', label: 'Scostamento', format: v => (v == null ? '' : v) },
            { key: 'scostamentoPct', label: 'Scostamento %', format: v => (v == null ? '' : Number(v.toFixed(1))) },
          ],
          rows: perEvento,
        },
        {
          name: 'Per fornitore',
          columns: [
            { key: 'fornitore', label: 'Fornitore', width: 28 },
            { key: 'approvato', label: 'Preventivato approvato' },
            { key: 'effettivo', label: 'Costo effettivo' },
            { key: 'delta', label: 'Delta' },
            { key: 'count', label: 'N. preventivi' },
          ],
          rows: aggregateByFornitore(rows),
        },
      ],
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select className={SELECT_STYLE + ' max-w-[220px]'} value={period} onChange={e => setPeriod(e.target.value)} aria-label="Periodo">
          {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ExportButton onClick={handleExport} loading={exporting} />
      </div>

      {loading ? <LoadingSkeleton lines={5} /> : error ? (
        <EmptyState title="Non siamo riusciti a caricare il consuntivo" description="Controlla la connessione e riprova." />
      ) : sorted.length === 0 ? (
        <EmptyState title="Nessun dato" description="Non ci sono eventi con preventivi nel periodo selezionato." />
      ) : (
        <>
        <div className={CARD_STYLE}>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  {SORT_COLUMNS.map(col => (
                    <th key={col.key} className={`py-3 px-3 text-sm font-semibold text-gray-600 ${col.align === 'right' ? 'text-right' : ''}`}>
                      <button
                        onClick={() => handleSort(col.key)}
                        className={`inline-flex items-center gap-1 min-h-[48px] hover:text-mikai-500 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                      >
                        {col.label}
                        {sortKey === col.key && (
                          <Icon icon={sortDir === 'asc' ? ACTION_ICONS.sortAsc : ACTION_ICONS.sortDesc} size={14} />
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/eventi/${r.id}`)}>
                    <td className="py-3 px-3 text-base font-medium">{r.titolo}<span className="block text-xs text-gray-400">{tipoLabel(r)}</span></td>
                    <td className="py-3 px-3 text-right">{r.budget > 0 ? formatCurrency(r.budget) : '—'}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(r.approvato)}</td>
                    <td className="py-3 px-3 text-right">{r.effettivo > 0 ? formatCurrency(r.effettivo) : '—'}</td>
                    <td className="py-3 px-3 text-right"><ScostamentoCell row={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {sorted.map(r => (
              <button key={r.id} onClick={() => navigate(`/eventi/${r.id}`)} className={CARD_HOVER_STYLE + ' w-full text-left'}>
                <p className="font-medium text-gray-900">{r.titolo}</p>
                <p className="text-xs text-gray-400">{tipoLabel(r)}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                  <div>
                    <p className="text-gray-400">Budget</p>
                    <p className="font-medium">{r.budget > 0 ? formatCurrency(r.budget) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Approvato</p>
                    <p className="font-medium">{formatCurrency(r.approvato)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Effettivo</p>
                    <p className="font-medium">{r.effettivo > 0 ? formatCurrency(r.effettivo) : '—'}</p>
                  </div>
                </div>
                <div className="mt-2 text-sm"><ScostamentoCell row={r} /></div>
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 px-1">
          "Effettivo" include i preventivi approvati (consuntivo se presente, altrimenti importo approvato), le voci manuali, l'ospitalità e i trasporti, come nel tab Costi dell'evento. "Approvato" mostra solo il preventivato approvato, come confronto.
        </p>
        </>
      )}
    </div>
  )
}
