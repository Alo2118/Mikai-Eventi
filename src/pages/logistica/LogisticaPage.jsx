import { useState } from 'react'
import { Tabs } from '../../components/ui/Tabs'
import { PageHeader } from '../../components/ui/PageHeader'
import { ExportButton } from '../../components/ui/ExportButton'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { LogisticaTimeline } from './LogisticaTimeline'
import { LogisticaMatrice } from './LogisticaMatrice'
import { LogisticaRientri } from './LogisticaRientri'
import { LogisticaInventario } from './LogisticaInventario'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { exportToExcelMultiSheet } from '../../lib/export-utils'
import { STATO_PRENOTAZIONE, DIREZIONE_TRASPORTO, MEZZO_TRASPORTO } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { useToastStore } from '../../components/ui/Toast'

const TABS = [
  { id: 'timeline', label: 'Spedizioni' },
  { id: 'matrice', label: 'Matrice' },
  { id: 'rientri', label: 'Rientri' },
  { id: 'inventario', label: 'Inventario' },
]

const EXPORT_COLUMNS_HOTEL = [
  { key: 'evento', label: 'Evento', format: v => v?.titolo || '' },
  { key: '_persona', label: 'Persona' },
  { key: 'nome_hotel', label: 'Hotel', width: 25 },
  { key: 'check_in', label: 'Check-in', format: v => v ? formatDate(v) : '' },
  { key: 'check_out', label: 'Check-out', format: v => v ? formatDate(v) : '' },
  { key: 'stato', label: 'Stato', format: v => STATO_PRENOTAZIONE[v] || v },
  { key: 'note', label: 'Note', width: 30 },
]

const EXPORT_COLUMNS_TRASPORTI = [
  { key: 'evento', label: 'Evento', format: v => v?.titolo || '' },
  { key: '_persona', label: 'Persona' },
  { key: 'direzione', label: 'Direzione', format: v => DIREZIONE_TRASPORTO[v] || v },
  { key: 'mezzo', label: 'Mezzo', format: v => MEZZO_TRASPORTO[v] || v },
  { key: 'codice_prenotazione', label: 'Codice' },
  { key: 'orario', label: 'Orario' },
  { key: 'stato', label: 'Stato', format: v => STATO_PRENOTAZIONE[v] || v },
  { key: 'note', label: 'Note', width: 30 },
]

function personName(r) {
  if (r.user) return `${r.user.nome} ${r.user.cognome}`
  if (r.contact) return `${r.contact.nome} ${r.contact.cognome}`
  return ''
}

export function LogisticaPage() {
  const [activeTab, setActiveTab] = useState('timeline')
  const [exporting, setExporting] = useState(false)
  const fetchAllPendingHotels = useLogisticsStore(s => s.fetchAllPendingHotels)
  const fetchAllPendingTrasporti = useLogisticsStore(s => s.fetchAllPendingTrasporti)
  const addToast = useToastStore(s => s.add)

  const handleExport = async () => {
    setExporting(true)
    try {
      const [hotelRes, trasportiRes] = await Promise.all([
        fetchAllPendingHotels(),
        fetchAllPendingTrasporti(),
      ])
      const hotels = (hotelRes.data || []).map(r => ({ ...r, _persona: personName(r) }))
      const trasporti = (trasportiRes.data || []).map(r => ({ ...r, _persona: personName(r) }))
      if (hotels.length === 0 && trasporti.length === 0) {
        addToast('Nessun dato da esportare', 'warning')
        setExporting(false)
        return
      }
      const today = new Date().toISOString().slice(0, 10)
      await exportToExcelMultiSheet({
        sheets: [
          { name: 'Hotel', columns: EXPORT_COLUMNS_HOTEL, rows: hotels },
          { name: 'Trasporti', columns: EXPORT_COLUMNS_TRASPORTI, rows: trasporti },
        ],
        filename: `logistica_${today}.xlsx`,
      })
      addToast('File esportato', 'success')
    } catch { addToast('Errore durante l\'esportazione', 'error') }
    setExporting(false)
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Logistica' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader title="Logistica" showBack={false} />
      </div>
      <PageHeader
        title="Logistica"
        subtitle="Gestione spedizioni, rientri e inventario"
        actions={<ExportButton onClick={handleExport} loading={exporting} />}
      />
      <div className="px-4 md:px-8">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === 'timeline' && <LogisticaTimeline />}
      {activeTab === 'matrice' && <LogisticaMatrice />}
      {activeTab === 'rientri' && <LogisticaRientri />}
      {activeTab === 'inventario' && <LogisticaInventario />}
    </div>
  )
}
