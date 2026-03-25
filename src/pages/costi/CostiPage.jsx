import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCostsStore } from '../../hooks/useCosts'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { ExportButton } from '../../components/ui/ExportButton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Tabs } from '../../components/ui/Tabs'
import { STATO_PREVENTIVO, STATO_PREVENTIVO_COLORE, TIPO_EVENTO, SELECT_STYLE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { exportToExcel } from '../../lib/export-utils'
import { useToastStore } from '../../components/ui/Toast'

const EXPORT_COLUMNS_PREVENTIVI = [
  { key: 'evento', label: 'Evento', format: v => v?.titolo || '' },
  { key: 'fornitore_ref', label: 'Fornitore', format: (v, row) => v ? `${v.nome} ${v.cognome}` : row.fornitore_nome || '' },
  { key: 'descrizione', label: 'Descrizione', width: 30 },
  { key: 'importo', label: 'Importo' },
  { key: 'stato', label: 'Stato', format: v => STATO_PREVENTIVO[v] || v },
]

const TABS = [
  { id: 'approvazioni', label: 'In attesa' },
  { id: 'analisi', label: 'Analisi costi' },
]

const PERIOD_OPTIONS = [
  { value: 'trimestre', label: 'Trimestre corrente' },
  { value: 'anno', label: 'Anno corrente' },
]

const ANALISI_VIEWS = [
  { id: 'fornitore', label: 'Per fornitore' },
  { id: 'tipo', label: 'Per tipo evento' },
  { id: 'mese', label: 'Per mese' },
]

const currencyFmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function getPeriodRange(period) {
  const now = new Date()
  const year = now.getFullYear()
  if (period === 'trimestre') {
    const qStart = new Date(year, Math.floor(now.getMonth() / 3) * 3, 1)
    const qEnd = new Date(year, Math.floor(now.getMonth() / 3) * 3 + 3, 0)
    return [qStart.toISOString().split('T')[0], qEnd.toISOString().split('T')[0]]
  }
  return [`${year}-01-01`, `${year}-12-31`]
}

function groupBy(data, keyFn) {
  return data.reduce((acc, item) => {
    const key = keyFn(item) || 'Sconosciuto'
    if (!acc[key]) acc[key] = { previsto: 0, effettivo: 0, count: 0 }
    acc[key].previsto += item.importo || 0
    acc[key].effettivo += item.importo_effettivo || 0
    acc[key].count += 1
    return acc
  }, {})
}

function AnalisiTable({ grouped }) {
  const entries = Object.entries(grouped).sort((a, b) => b[1].previsto - a[1].previsto)
  if (entries.length === 0) return <EmptyState title="Nessun dato" description="Non ci sono preventivi approvati nel periodo selezionato" />

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-3 px-3 text-sm font-semibold text-gray-600">Voce</th>
            <th className="py-3 px-3 text-sm font-semibold text-gray-600 text-right">Preventivato</th>
            <th className="py-3 px-3 text-sm font-semibold text-gray-600 text-right">Effettivo</th>
            <th className="py-3 px-3 text-sm font-semibold text-gray-600 text-right">Delta</th>
            <th className="py-3 px-3 text-sm font-semibold text-gray-600 text-right">N.</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, vals]) => {
            const delta = vals.effettivo - vals.previsto
            const deltaColor = delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-gray-500'
            return (
              <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-3 text-base font-medium">{key}</td>
                <td className="py-3 px-3 text-right">{currencyFmt.format(vals.previsto)}</td>
                <td className="py-3 px-3 text-right">{vals.effettivo > 0 ? currencyFmt.format(vals.effettivo) : '—'}</td>
                <td className={`py-3 px-3 text-right font-medium ${deltaColor}`}>
                  {vals.effettivo > 0 ? currencyFmt.format(delta) : '—'}
                </td>
                <td className="py-3 px-3 text-right text-gray-500">{vals.count}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 font-bold">
            <td className="py-3 px-3">Totale</td>
            <td className="py-3 px-3 text-right">{currencyFmt.format(entries.reduce((s, [, v]) => s + v.previsto, 0))}</td>
            <td className="py-3 px-3 text-right">{currencyFmt.format(entries.reduce((s, [, v]) => s + v.effettivo, 0))}</td>
            <td className="py-3 px-3 text-right">{currencyFmt.format(entries.reduce((s, [, v]) => s + (v.effettivo - v.previsto), 0))}</td>
            <td className="py-3 px-3 text-right text-gray-500">{entries.reduce((s, [, v]) => s + v.count, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function AnalisiCostiSection() {
  const fetchCostiAnalysis = useCostsStore(s => s.fetchCostiAnalysis)
  const [period, setPeriod] = useState('anno')
  const [view, setView] = useState('fornitore')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const [start, end] = getPeriodRange(period)
    fetchCostiAnalysis(start, end).then(({ data: d }) => {
      setData(d || [])
      setLoading(false)
    })
  }, [period])

  const fornitoreKey = (item) => {
    if (item.fornitore_ref?.nome) return `${item.fornitore_ref.nome} ${item.fornitore_ref.cognome}`
    return item.fornitore_nome
  }
  const tipoKey = (item) => TIPO_EVENTO[item.evento?.tipo_evento] || item.evento?.tipo_evento || 'Altro'
  const meseKey = (item) => {
    if (!item.evento?.data_inizio) return 'Sconosciuto'
    const d = new Date(item.evento.data_inizio)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const keyFn = view === 'fornitore' ? fornitoreKey : view === 'tipo' ? tipoKey : meseKey
  const grouped = groupBy(data, keyFn)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={SELECT_STYLE + ' max-w-[220px]'} value={period} onChange={e => setPeriod(e.target.value)}>
          {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className="flex gap-2">
          {ANALISI_VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`min-h-[48px] px-4 rounded-lg text-base font-medium border transition-colors ${
                view === v.id
                  ? 'bg-mikai-400 text-white border-mikai-400'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSkeleton lines={5} /> : (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <AnalisiTable grouped={grouped} />
        </div>
      )}
    </div>
  )
}

export function CostiPage() {
  const navigate = useNavigate()
  const fetchPendingPreventivi = useCostsStore(s => s.fetchPendingPreventivi)
  const addToast = useToastStore(s => s.add)
  const [preventivi, setPreventivi] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('approvazioni')

  useEffect(() => {
    fetchPendingPreventivi().then(({ data }) => {
      setPreventivi(data)
      setLoading(false)
    })
  }, [])

  const handleExport = async () => {
    if (preventivi.length === 0) { addToast('Nessun dato da esportare', 'warning'); return }
    setExporting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await exportToExcel({
        columns: EXPORT_COLUMNS_PREVENTIVI,
        rows: preventivi,
        filename: `preventivi_${today}.xlsx`,
        sheetName: 'Preventivi',
      })
      addToast('File esportato', 'success')
    } catch { addToast('Errore durante l\'esportazione', 'error') }
    setExporting(false)
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Costi' }]} />
      <PageHeader
        title="Costi"
        subtitle={activeTab === 'approvazioni' ? `${preventivi.length} preventivi da approvare` : 'Analisi costi cross-evento'}
        actions={activeTab === 'approvazioni' ? <ExportButton onClick={handleExport} loading={exporting} /> : null}
      />

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'approvazioni' && (
        <>
          {loading ? <LoadingSkeleton lines={5} /> : preventivi.length === 0 ? (
            <EmptyState title="Nessun preventivo in attesa" description="Tutti i preventivi sono stati gestiti" />
          ) : (
            <div className="space-y-2">
              {preventivi.map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/eventi/${p.evento?.id}`)}
                  className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-base">{p.descrizione}</p>
                      <p className="text-sm text-gray-500">{p.evento?.titolo} — {p.evento?.data_inizio ? formatDate(p.evento.data_inizio) : ''}</p>
                      {p.fornitore_nome && <p className="text-sm text-gray-400">{p.fornitore_nome}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {p.importo != null && <span className="font-semibold">{p.importo.toLocaleString('it-IT')} €</span>}
                      <StatusBadge stato={p.stato} labels={STATO_PREVENTIVO} colors={STATO_PREVENTIVO_COLORE} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'analisi' && <AnalisiCostiSection />}
    </div>
  )
}
