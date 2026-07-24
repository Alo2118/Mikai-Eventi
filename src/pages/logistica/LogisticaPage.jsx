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
import { LogisticaFabbisogno } from './LogisticaFabbisogno'
import { LogisticaPrenotazioni } from './LogisticaPrenotazioni'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { exportToExcelMultiSheet } from '../../lib/export-utils'
import { STATO_PRENOTAZIONE, DIREZIONE_TRASPORTO, MEZZO_TRASPORTO } from '../../lib/constants'
import { DOCUMENTO_ICONS } from '../../lib/icons'
import { formatDate, todayISO } from '../../lib/date-utils'
import { useToastStore } from '../../components/ui/Toast'

const TABS = [
  { id: 'fabbisogno', label: 'Fabbisogno' },
  { id: 'timeline', label: 'Spedizioni' },
  { id: 'matrice', label: 'Matrice' },
  { id: 'rientri', label: 'Rientri' },
  { id: 'prenotazioni', label: 'Hotel & Trasporti' },
  { id: 'inventario', label: 'Inventario' },
]

const EXPORT_COLUMNS_HOTEL = [
  { key: 'evento', label: 'Evento', format: v => v?.titolo || '' },
  { key: '_persona', label: 'Persona' },
  { key: 'nome_hotel', label: 'Hotel', width: 25 },
  { key: 'check_in', label: 'Check-in', format: v => v ? formatDate(v) : '' },
  { key: 'check_out', label: 'Check-out', format: v => v ? formatDate(v) : '' },
  { key: 'stato', label: 'Stato', format: v => STATO_PRENOTAZIONE[v] || v },
  { key: 'costo', label: 'Costo €', format: v => v ?? '' },
  { key: 'note', label: 'Note', width: 30 },
]

const EXPORT_COLUMNS_TRASPORTI = [
  { key: 'evento', label: 'Evento' },
  { key: '_persona', label: 'Persona' },
  { key: '_andata', label: 'Andata', width: 40 },
  { key: '_ritorno', label: 'Ritorno', width: 40 },
]

function personName(r) {
  if (r.user) return `${r.user.nome} ${r.user.cognome}`
  if (r.contact) return `${r.contact.nome} ${r.contact.cognome}`
  return ''
}

export function LogisticaPage() {
  const [activeTab, setActiveTab] = useState('fabbisogno')
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
      // Group trasporti by person+event, with andata/ritorno as columns
      const trasportiRaw = trasportiRes.data || []
      const trasportiMap = {}
      for (const t of trasportiRaw) {
        const key = `${t.event_id}-${t.user_id || t.contact_id}`
        if (!trasportiMap[key]) trasportiMap[key] = { evento: t.evento, _persona: personName(t), _andata: [], _ritorno: [] }
        const leg = [MEZZO_TRASPORTO[t.mezzo], t.codice, t.luogo_partenza, t.luogo_arrivo ? `→ ${t.luogo_arrivo}` : '', t.orario ? formatDate(t.orario) : ''].filter(Boolean).join(' ')
        if (t.direzione === 'andata') trasportiMap[key]._andata.push(leg)
        else trasportiMap[key]._ritorno.push(leg)
      }
      const trasporti = Object.values(trasportiMap).map(r => ({
        ...r,
        evento: r.evento?.titolo || '',
        _andata: r._andata.join(' + '),
        _ritorno: r._ritorno.join(' + '),
      }))
      if (hotels.length === 0 && trasporti.length === 0) {
        addToast('Nessun dato da esportare', 'warning')
        setExporting(false)
        return
      }
      const today = todayISO()
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
      <div className="hidden md:block px-6 pt-4">
        <Breadcrumb items={[{ label: 'Logistica' }]} />
      </div>
      <div className="md:hidden">
        <MobileHeader
          title="Logistica"
          showBack={false}
          actions={[
            { icon: DOCUMENTO_ICONS.spreadsheet, label: 'Esporta Excel', onClick: handleExport, loading: exporting },
          ]}
        />
      </div>
      <PageHeader
        mobileHidden
        title="Logistica"
        subtitle="Gestione spedizioni, rientri e inventario"
        actions={<ExportButton onClick={handleExport} loading={exporting} />}
      />
      <div className="px-4 md:px-6">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === 'fabbisogno' && <LogisticaFabbisogno />}
      {activeTab === 'timeline' && <LogisticaTimeline />}
      {activeTab === 'matrice' && <LogisticaMatrice />}
      {activeTab === 'rientri' && <LogisticaRientri />}
      {activeTab === 'prenotazioni' && <LogisticaPrenotazioni />}
      {activeTab === 'inventario' && <LogisticaInventario />}
    </div>
  )
}
