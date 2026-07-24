import { Icon } from '../ui/Icon'
import { ExportButton } from '../ui/ExportButton'
import { DASHBOARD_ICONS } from '../../lib/icons'
import { CARD_STYLE, STATO_EVENTO, TIPO_EVENTO } from '../../lib/constants'
import { formatCurrency } from '../../lib/format-utils'
import { formatDate } from '../../lib/date-utils'
import { useExportHandler } from '../../hooks/useExportHandler'

const EXPORT_COLUMNS = [
  { key: 'titolo', label: 'Titolo', width: 32 },
  { key: 'tipo_evento', label: 'Tipo', width: 16, format: v => TIPO_EVENTO[v] || v || '' },
  { key: 'stato', label: 'Stato', width: 20, format: v => STATO_EVENTO[v] || v || '' },
  { key: 'luogo', label: 'Luogo', width: 24 },
  { key: 'data_inizio', label: 'Data inizio', width: 16, format: v => formatDate(v) },
  { key: 'data_fine', label: 'Data fine', width: 16, format: v => formatDate(v) },
  { key: 'budget_previsto', label: 'Budget previsto', width: 18, format: v => (v == null ? '' : formatCurrency(v)) },
]

export function MyNumbersSection({ myNumbers, events }) {
  const { exporting, handleExport } = useExportHandler()
  if (!myNumbers) return null

  const stats = [
    { label: 'I miei eventi', value: myNumbers.eventiCount, color: 'text-mikai-600' },
    { label: 'Partecipanti totali', value: myNumbers.partecipantiTotale, color: 'text-green-600' },
    { label: 'Budget totale', value: formatCurrency(myNumbers.budgetTotale), color: 'text-gray-900' },
  ]

  const onExport = () => handleExport({
    columns: EXPORT_COLUMNS,
    rows: events,
    filename: 'i_miei_eventi',
    sheetName: 'I miei eventi',
  })

  return (
    <div className={CARD_STYLE + ' space-y-3'}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon icon={DASHBOARD_ICONS.report} size={20} className="text-mikai-400" />
          <h3 className="font-semibold text-lg">I miei numeri</h3>
        </div>
        <ExportButton onClick={onExport} loading={exporting} label="Esporta i miei eventi" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-400">
        Riferito ai tuoi eventi attivi (proposti, confermati, in preparazione, pronti e in corso).
      </p>
    </div>
  )
}
