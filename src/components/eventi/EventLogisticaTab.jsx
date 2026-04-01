import { useEffect, useState, Fragment, useRef } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { useTavoliStore } from '../../hooks/useTavoli'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { STATO_PRENOTAZIONE, STATO_PRENOTAZIONE_COLORE, STATO_ISCRIZIONE, STATO_ISCRIZIONE_COLORE, MEZZO_TRASPORTO, TIPI_EVENTO_CON_TAVOLI, RUOLO_EVENTO, TIPO_PARTECIPANTE, SELECT_STYLE, FORM_CONTAINER_STYLE, SUMMARY_BAR_STYLE, GROUP_HEADING_STYLE } from '../../lib/constants'
import { TRASPORTO_ICONS, ACTION_ICONS, NAV_ICONS, LOGISTICA_PERSONE_ICONS, TAVOLI_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { ContactPicker } from '../contatti/ContactPicker'
import { BulkImportModal } from '../contatti/BulkImportModal'
import { TrasportoForm } from './TrasportoForm'
import { TavoloModal, HotelModal, TrasportoModal } from './LogisticaBulkModals'
import { EventChecklistView } from './EventChecklistView'
import { EventLogisticaEventTimeline } from './EventLogisticaEventTimeline'
import { ProgressIndicator } from '../ui/ProgressIndicator'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ExportButton } from '../ui/ExportButton'
import { formatTime, formatDateShort } from '../../lib/date-utils'
import { exportToExcel } from '../../lib/export-utils'

// ─── Constants ─────────────────────────────────────────────────
const GROUP_OPTIONS = [
  { id: null, label: 'Tutti' },
  { id: 'tavolo', label: 'Per tavolo' },
  { id: 'tipo', label: 'Per tipo' },
  { id: 'zona', label: 'Per zona' },
  { id: 'trasporto', label: 'Per trasporto' },
]

const ISCRIZIONE_CYCLE = { invitato: 'confermato', confermato: 'presente', presente: 'invitato', assente: 'invitato' }
const ISCRIZIONE_CHIP_COLORS = {
  invitato: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  confermato: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  presente: 'bg-green-100 text-green-700 hover:bg-green-200',
  assente: 'bg-red-100 text-red-700 hover:bg-red-200',
}

// ─── Alerts engine ─────────────────────────────────────────────
function computeAlerts(event, people, hotels, trasporti, staff, getHotel, getAndata) {
  const alerts = []
  const eventStart = event.data_inizio
  const eventEnd = event.data_fine || event.data_inizio

  for (const h of hotels) {
    if (h.check_in && eventStart && h.check_in > eventStart) {
      const who = h.user_id ? `${h.user?.cognome || ''} ${h.user?.nome || ''}` : `${h.contact?.cognome || ''} ${h.contact?.nome || ''}`
      alerts.push({ type: 'warning', text: `Hotel check-in di ${who.trim()} (${formatDateShort(h.check_in)}) è dopo l'inizio evento (${formatDateShort(eventStart)})` })
    }
    if (h.check_out && eventEnd && h.check_out < eventEnd) {
      const who = h.user_id ? `${h.user?.cognome || ''} ${h.user?.nome || ''}` : `${h.contact?.cognome || ''} ${h.contact?.nome || ''}`
      alerts.push({ type: 'warning', text: `Hotel check-out di ${who.trim()} (${formatDateShort(h.check_out)}) è prima della fine evento (${formatDateShort(eventEnd)})` })
    }
  }

  for (const t of trasporti.filter(t => t.direzione === 'andata' && t.orario)) {
    const arrivalDate = t.orario.slice(0, 10)
    if (eventStart && arrivalDate > eventStart) {
      alerts.push({ type: 'error', text: `Trasporto andata il ${formatDateShort(arrivalDate)} ma l'evento inizia il ${formatDateShort(eventStart)}` })
    }
  }

  const confirmedNoHotel = people.filter(p => {
    const isConfirmed = p.type === 'staff' ? p.confermato : ['confermato', 'presente'].includes(p.statoIscrizione)
    return isConfirmed && !getHotel(p)
  })
  if (confirmedNoHotel.length > 0) {
    alerts.push({ type: 'warning', text: `${confirmedNoHotel.length} confermati senza hotel` })
  }

  const confirmedNoAndata = people.filter(p => {
    const isConfirmed = p.type === 'staff' ? p.confermato : ['confermato', 'presente'].includes(p.statoIscrizione)
    return isConfirmed && !getAndata(p)
  })
  if (confirmedNoAndata.length > 0) {
    alerts.push({ type: 'warning', text: `${confirmedNoAndata.length} confermati senza trasporto andata` })
  }

  if (staff.length > 0 && !staff.some(s => s.confermato)) {
    alerts.push({ type: 'error', text: 'Nessuno staff confermato' })
  }

  return alerts
}

// ─── Transport cell display ────────────────────────────────────
function TrasportoCell({ record }) {
  if (!record) return <span className="text-gray-400">—</span>
  if (!record.mezzo) {
    return <StatusBadge stato={record.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
  }
  const icon = TRASPORTO_ICONS[record.mezzo]
  const time = record.orario ? formatTime(record.orario) : null
  const pickupTime = record.orario_pickup ? formatTime(record.orario_pickup) : null
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        {icon && <Icon icon={icon} size={16} className="text-gray-500" />}
        {record.codice && <span className="text-sm font-medium">{record.codice}</span>}
        {time && <span className="text-sm text-gray-600">{time}</span>}
        {!record.codice && !time && <span className="text-sm">{MEZZO_TRASPORTO[record.mezzo]}</span>}
      </div>
      {record.autista && (
        <div className="text-xs text-gray-400">
          {record.autista}{pickupTime ? ` pickup ${pickupTime}` : ''}
        </div>
      )}
      <StatusBadge stato={record.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
    </div>
  )
}

// ─── Note popover ──────────────────────────────────────────────
function NotePopover({ note, onSave, canEdit }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note || '')
  const ref = useRef(null)

  if (!note && !canEdit) return null

  const handleSave = () => {
    if (draft !== note) onSave(draft.trim() || null)
    setEditing(false)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setDraft(note || '') }}
        className={`p-1 rounded transition-colors ${note ? 'text-mikai-500 hover:text-mikai-700' : 'text-gray-300 hover:text-gray-500'}`}
        aria-label={note ? 'Vedi nota' : 'Aggiungi nota'}
      >
        <Icon icon={LOGISTICA_PERSONE_ICONS.note} size={14} />
      </button>
      {open && (
        <div className="absolute z-20 left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-[220px]">
          {editing || !note ? (
            <div className="space-y-2">
              <textarea
                className="w-full text-sm border border-gray-200 rounded p-2 min-h-[60px] focus:ring-2 focus:ring-mikai-400 focus:outline-none"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Scrivi una nota..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setOpen(false); setEditing(false) }} className="text-xs text-gray-500 hover:text-gray-700">Annulla</button>
                <button onClick={handleSave} className="text-xs text-mikai-600 font-medium hover:text-mikai-800">Salva</button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
              {canEdit && (
                <button onClick={() => setEditing(true)} className="text-xs text-mikai-500 mt-2 hover:text-mikai-700">Modifica</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Esigenze icons ────────────────────────────────────────────
function EsigenzeIcons({ person }) {
  const alimentari = person.esigenze_alimentari
  const accessibilita = person.esigenze_accessibilita
  if (!alimentari && !accessibilita) return null
  return (
    <span className="inline-flex gap-0.5">
      {alimentari && (
        <span title={`Alimentari: ${alimentari}`} className="text-orange-400">
          <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={14} />
        </span>
      )}
      {accessibilita && (
        <span title={`Accessibilità: ${accessibilita}`} className="text-blue-400">
          <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={14} />
        </span>
      )}
    </span>
  )
}

// ─── Helpers ───────────────────────────────────────────────────
function getPersonTavolo(person, tavoli) {
  for (const t of tavoli) {
    if (person.type === 'staff') {
      if ((t.formatori || []).some(f => f.staff?.user_id === person.id)) return t
    } else {
      if ((t.discenti || []).some(d => d.participant?.contact_id === person.id)) return t
    }
  }
  return null
}

// ─── Main Component ────────────────────────────────────────────
export function EventLogisticaTab({ event, users = [] }) {
  const hotels = useLogisticsStore(s => s.hotels)
  const trasporti = useLogisticsStore(s => s.trasporti)
  const loading = useLogisticsStore(s => s.loading)
  const logisticsError = useLogisticsStore(s => s.error)
  const fetchEventLogistics = useLogisticsStore(s => s.fetchEventLogistics)
  const removeHotel = useLogisticsStore(s => s.removeHotel)
  const removeTrasporto = useLogisticsStore(s => s.removeTrasporto)

  const staff = useStaffStore(s => s.staff)
  const staffLoading = useStaffStore(s => s.loading)
  const fetchEventStaff = useStaffStore(s => s.fetchEventStaff)
  const addStaff = useStaffStore(s => s.addStaff)
  const updateStaff = useStaffStore(s => s.updateStaff)
  const removeStaff = useStaffStore(s => s.removeStaff)

  const participants = useParticipantsStore(s => s.participants)
  const fetchEventParticipants = useParticipantsStore(s => s.fetchEventParticipants)
  const addParticipant = useParticipantsStore(s => s.addParticipant)
  const updateParticipant = useParticipantsStore(s => s.updateParticipant)
  const removeParticipant = useParticipantsStore(s => s.removeParticipant)

  const hasPermission = useAuthStore(s => s.hasPermission)
  const canEdit = hasPermission('gestione_logistica')
  const canEditStaff = hasPermission('gestione_staff_evento')
  const canEditPart = hasPermission('gestione_contatti') || hasPermission('gestione_staff_evento')
  const addToast = useToastStore(s => s.add)

  const tavoli = useTavoliStore(s => s.tavoli)
  const fetchEventTavoli = useTavoliStore(s => s.fetchEventTavoli)
  const distributeDiscenti = useTavoliStore(s => s.distributeDiscenti)

  const [selected, setSelected] = useState(new Set())
  const [groupBy, setGroupBy] = useState(null)
  const [activeFilters, setActiveFilters] = useState(new Set())
  const [activeModal, setActiveModal] = useState(null)
  const [editingTransport, setEditingTransport] = useState(null)
  const [staffForm, setStaffForm] = useState(null)
  const [partForm, setPartForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [checklistMode, setChecklistMode] = useState(false)
  const [viewMode, setViewMode] = useState('lista')
  const [dismissedAlerts, setDismissedAlerts] = useState(false)
  const [exporting, setExporting] = useState(false)

  const hasTavoli = TIPI_EVENTO_CON_TAVOLI.includes(event.tipo_evento)

  useEffect(() => {
    fetchEventStaff(event.id)
    fetchEventParticipants(event.id)
    fetchEventLogistics(event.id)
    if (hasTavoli) fetchEventTavoli(event.id)
  }, [event.id])

  // ── People CRUD ──
  const handleAddStaff = async () => {
    if (!staffForm?.userId || !staffForm?.ruolo) return
    const { error } = await addStaff(event.id, staffForm.userId, staffForm.ruolo)
    if (error) { addToast(error.message || 'Errore', 'error'); return }
    addToast('Staff aggiunto', 'success')
    setStaffForm(null)
  }

  const handleAddParticipant = async () => {
    if (!partForm?.contact || !partForm?.tipo) return
    const { error } = await addParticipant(event.id, partForm.contact.id, partForm.tipo)
    if (error) { addToast(error.message || 'Errore', 'error'); return }
    addToast('Partecipante aggiunto', 'success')
    setPartForm(null)
  }

  // ── People list ──
  const people = [
    ...staff.map(s => ({
      type: 'staff', id: s.user_id, staffId: s.id,
      nome: s.user?.nome, cognome: s.user?.cognome,
      ruolo: s.ruolo_evento, confermato: s.confermato, note: s.note,
      esigenze_alimentari: s.user?.esigenze_alimentari,
      esigenze_accessibilita: s.user?.esigenze_accessibilita,
    })),
    ...participants.map(p => ({
      type: 'participant', id: p.contact_id, participantId: p.id,
      nome: p.contact?.nome, cognome: p.contact?.cognome,
      ruolo: p.tipo, statoIscrizione: p.stato_iscrizione, note: p.note,
      zona: p.contact?.zona?.nome || p.contact?.citta || null,
      esigenze_alimentari: p.contact?.esigenze_alimentari,
      esigenze_accessibilita: p.contact?.esigenze_accessibilita,
    })),
  ]

  const personKey = (p) => `${p.type}-${p.id}`

  // ── Lookups ──
  const getHotel = (person) => hotels.find(h => person.type === 'staff' ? h.user_id === person.id : h.contact_id === person.id)
  const getAndata = (person) => trasporti.find(t => t.direzione === 'andata' && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id))
  const getRitorno = (person) => trasporti.find(t => t.direzione === 'ritorno' && (person.type === 'staff' ? t.user_id === person.id : t.contact_id === person.id))

  // ── Stats ──
  const confirmedCount = staff.filter(s => s.confermato).length +
    participants.filter(p => ['confermato', 'presente'].includes(p.stato_iscrizione)).length
  const withHotel = people.filter(p => getHotel(p)).length
  const withFullTransport = people.filter(p => getAndata(p) && getRitorno(p)).length

  // ── Filters ──
  const FILTER_OPTIONS = [
    { id: 'invitati', label: 'Invitati', count: () => participants.filter(p => p.stato_iscrizione === 'invitato').length, filter: p => p.type === 'participant' && p.statoIscrizione === 'invitato' },
    { id: 'confermati', label: 'Confermati', count: () => confirmedCount, filter: p => (p.type === 'staff' && p.confermato) || (p.type === 'participant' && ['confermato', 'presente'].includes(p.statoIscrizione)) },
    { id: 'no_hotel', label: 'Senza hotel', count: () => people.length - withHotel, filter: p => !getHotel(p) },
    { id: 'no_trasporto', label: 'Senza trasporto', count: () => people.length - withFullTransport, filter: p => !getAndata(p) || !getRitorno(p) },
  ]

  const toggleFilter = (filterId) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(filterId)) next.delete(filterId)
      else next.add(filterId)
      return next
    })
  }

  const filteredPeople = activeFilters.size === 0 ? people :
    people.filter(p => [...activeFilters].every(fId => FILTER_OPTIONS.find(f => f.id === fId)?.filter(p)))

  const selectedPeople = filteredPeople.filter(p => selected.has(personKey(p)))

  // ── Selection ──
  const toggleSelect = (person) => {
    setSelected(prev => {
      const next = new Set(prev)
      const key = personKey(person)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filteredPeople.length) setSelected(new Set())
    else setSelected(new Set(filteredPeople.map(p => personKey(p))))
  }

  // ── Grouping ──
  const groupedPeople = (() => {
    if (!groupBy) return [{ label: null, people: filteredPeople }]
    if (groupBy === 'tavolo') {
      const groups = []
      const assigned = new Set()
      for (const t of tavoli) {
        const inTavolo = filteredPeople.filter(p => {
          if (getPersonTavolo(p, [t])) { assigned.add(personKey(p)); return true }
          return false
        })
        if (inTavolo.length > 0) groups.push({ label: `Tavolo ${t.numero}${t.nome ? ` — ${t.nome}` : ''}`, people: inTavolo })
      }
      const unassigned = filteredPeople.filter(p => !assigned.has(personKey(p)))
      if (unassigned.length > 0) groups.push({ label: 'Non assegnati', people: unassigned })
      return groups
    }
    if (groupBy === 'tipo') {
      const groups = []
      const staffP = filteredPeople.filter(p => p.type === 'staff')
      const partP = filteredPeople.filter(p => p.type === 'participant')
      if (staffP.length > 0) groups.push({ label: 'Staff', people: staffP })
      if (partP.length > 0) groups.push({ label: 'Partecipanti', people: partP })
      return groups
    }
    if (groupBy === 'zona') {
      const zoneMap = {}
      for (const p of filteredPeople) {
        const zona = p.zona || 'Zona non assegnata'
        if (!zoneMap[zona]) zoneMap[zona] = []
        zoneMap[zona].push(p)
      }
      return Object.entries(zoneMap).map(([label, ppl]) => ({ label, people: ppl }))
    }
    if (groupBy === 'trasporto') {
      const transportMap = {}
      for (const p of filteredPeople) {
        const andata = getAndata(p)
        const ritorno = getRitorno(p)
        const parts = []
        if (andata?.codice) parts.push(`${MEZZO_TRASPORTO[andata.mezzo] || ''} ${andata.codice}`.trim())
        if (ritorno?.codice) parts.push(`${MEZZO_TRASPORTO[ritorno.mezzo] || ''} ${ritorno.codice}`.trim())
        if (parts.length === 0) {
          const mezzi = [andata?.mezzo, ritorno?.mezzo].filter(Boolean)
          if (mezzi.length > 0) parts.push(mezzi.map(m => MEZZO_TRASPORTO[m]).join(' / '))
          else parts.push('Senza trasporto')
        }
        const groupKey = parts.join(' + ')
        if (!transportMap[groupKey]) transportMap[groupKey] = []
        transportMap[groupKey].push(p)
      }
      return Object.entries(transportMap)
        .sort(([a], [b]) => a === 'Senza trasporto' ? 1 : b === 'Senza trasporto' ? -1 : a.localeCompare(b))
        .map(([label, ppl]) => ({ label, people: ppl }))
    }
    return [{ label: null, people: filteredPeople }]
  })()

  // ── Alerts ──
  const alerts = computeAlerts(event, people, hotels, trasporti, staff, getHotel, getAndata)

  // ── Bulk modal done ──
  const handleModalDone = () => {
    setActiveModal(null)
    setSelected(new Set())
    fetchEventLogistics(event.id)
    if (hasTavoli) fetchEventTavoli(event.id)
  }

  const handleDistribuisci = async () => {
    const { error } = await distributeDiscenti(event.id)
    if (error) addToast(error, 'error')
    else addToast('Discenti distribuiti ai tavoli', 'success')
  }

  // ── Export ──
  const handleExport = async () => {
    setExporting(true)
    try {
      const columns = [
        { label: 'Cognome', key: 'cognome', width: 20 },
        { label: 'Nome', key: 'nome', width: 20 },
        { label: 'Tipo', key: 'tipo', width: 15, format: (_, row) => row.type === 'staff' ? 'Staff' : 'Partecipante' },
        { label: 'Ruolo', key: 'ruolo', width: 18, format: (v, row) => row.type === 'staff' ? (RUOLO_EVENTO[v] || '') : (TIPO_PARTECIPANTE[v] || '') },
        { label: 'Stato', key: 'stato', width: 15, format: (_, row) => row.type === 'staff' ? (row.confermato ? 'Confermato' : 'Da confermare') : (STATO_ISCRIZIONE[row.statoIscrizione] || '') },
        ...(hasTavoli ? [{ label: 'Tavolo', key: 'tavolo', width: 10, format: (_, row) => { const t = getPersonTavolo(row, tavoli); return t ? `T${t.numero}` : '' } }] : []),
        { label: 'Hotel', key: 'hotel', width: 25, format: (_, row) => getHotel(row)?.nome_hotel || '' },
        { label: 'Indirizzo Hotel', key: 'indirizzo', width: 30, format: (_, row) => getHotel(row)?.indirizzo_hotel || '' },
        { label: 'Check-in', key: 'checkin', width: 12, format: (_, row) => { const h = getHotel(row); return h?.check_in ? formatDateShort(h.check_in) : '' } },
        { label: 'Check-out', key: 'checkout', width: 12, format: (_, row) => { const h = getHotel(row); return h?.check_out ? formatDateShort(h.check_out) : '' } },
        { label: 'Andata mezzo', key: 'andata_mezzo', width: 14, format: (_, row) => { const a = getAndata(row); return a?.mezzo ? (MEZZO_TRASPORTO[a.mezzo] || '') : '' } },
        { label: 'Andata codice', key: 'andata_codice', width: 14, format: (_, row) => getAndata(row)?.codice || '' },
        { label: 'Andata orario', key: 'andata_orario', width: 14, format: (_, row) => { const a = getAndata(row); return a?.orario ? formatTime(a.orario) : '' } },
        { label: 'Ritorno mezzo', key: 'ritorno_mezzo', width: 14, format: (_, row) => { const r = getRitorno(row); return r?.mezzo ? (MEZZO_TRASPORTO[r.mezzo] || '') : '' } },
        { label: 'Ritorno codice', key: 'ritorno_codice', width: 14, format: (_, row) => getRitorno(row)?.codice || '' },
        { label: 'Ritorno orario', key: 'ritorno_orario', width: 14, format: (_, row) => { const r = getRitorno(row); return r?.orario ? formatTime(r.orario) : '' } },
        { label: 'Note', key: 'note', width: 25 },
        { label: 'Esigenze alimentari', key: 'esigenze_alimentari', width: 25 },
      ]
      const title = (event.titolo || 'evento').replace(/[^a-zA-Z0-9àèéìòù ]/g, '').trim().replace(/ +/g, '_')
      await exportToExcel({ columns, rows: people, filename: `Persone_${title}`, sheetName: 'Persone' })
      addToast('Export completato', 'success')
    } catch {
      addToast('Errore durante l\'export', 'error')
    }
    setExporting(false)
  }

  // ── Note save ──
  const handleNoteSave = async (person, note) => {
    if (person.type === 'staff') await updateStaff(person.staffId, { note })
    else await updateParticipant(person.participantId, { note })
  }

  const colSpan = (hasTavoli ? 6 : 5)

  if (loading || staffLoading) return <LoadingSkeleton lines={5} />
  if (logisticsError) return <EmptyState title="Errore nel caricamento" description="Non siamo riusciti a caricare i dati logistica." />

  // ── Checklist presenze mode ──
  if (checklistMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Checklist presenze</h3>
          <Button variant="secondary" size="sm" onClick={() => setChecklistMode(false)}>
            <Icon icon={ACTION_ICONS.back} size={16} className="mr-1" />
            Torna alla gestione
          </Button>
        </div>
        <EventChecklistView event={event} participants={participants} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Alert bar ── */}
      {alerts.length > 0 && !dismissedAlerts && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Icon icon={a.type === 'error' ? FEEDBACK_ICONS.error : FEEDBACK_ICONS.warning} size={16} className={a.type === 'error' ? 'text-red-500' : 'text-orange-500'} />
                  <span className={a.type === 'error' ? 'text-red-700' : 'text-orange-700'}>{a.text}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setDismissedAlerts(true)} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0" aria-label="Chiudi avvisi">
              <Icon icon={ACTION_ICONS.close} size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Header: Persone + chip riepilogo + azioni ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Icon icon={NAV_ICONS.contatti} size={20} className="text-gray-400" />
              Persone
            </h3>
            {people.length > 0 && (
              <>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{people.length}</span>
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">{confirmedCount} conf.</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{withHotel} hotel</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">{withFullTransport} trasporti</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {people.length > 0 && (
              <ExportButton onClick={handleExport} loading={exporting} label="Esporta" />
            )}
            {['pronto', 'in_corso'].includes(event.stato) && (
              <Button variant="secondary" size="sm" onClick={() => setChecklistMode(true)}>
                <Icon icon={NAV_ICONS.checklist} size={16} className="mr-1" />
                Presenze
              </Button>
            )}
            {canEditPart && (
              <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
                <Icon icon={ACTION_ICONS.upload} size={16} />
                <span className="ml-1 hidden sm:inline">Importa</span>
              </Button>
            )}
            {canEditPart && (
              <Button variant="secondary" size="sm" onClick={() => setPartForm({ contact: null, tipo: 'discente' })}>
                <Icon icon={ACTION_ICONS.add} size={16} />
                <span className="ml-1">Partecipante</span>
              </Button>
            )}
            {canEditStaff && (
              <Button variant="secondary" size="sm" onClick={() => setStaffForm({ userId: '', ruolo: 'staff' })}>
                <Icon icon={ACTION_ICONS.add} size={16} />
                <span className="ml-1">Staff</span>
              </Button>
            )}
          </div>
        </div>

        {/* Inline form: aggiungi staff */}
        {staffForm && (
          <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
                <select className={SELECT_STYLE} value={staffForm.userId} onChange={e => setStaffForm(f => ({ ...f, userId: e.target.value }))}>
                  <option value="">Seleziona persona...</option>
                  {users.filter(u => !staff.some(s => s.user_id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.cognome} {u.nome} ({u.ruolo})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo nell'evento</label>
                <select className={SELECT_STYLE} value={staffForm.ruolo} onChange={e => setStaffForm(f => ({ ...f, ruolo: e.target.value }))}>
                  {Object.entries(RUOLO_EVENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAddStaff} disabled={!staffForm.userId}>Aggiungi</Button>
              <Button variant="ghost" onClick={() => setStaffForm(null)}>Annulla</Button>
            </div>
          </div>
        )}

        {/* Inline form: aggiungi partecipante */}
        {partForm && (
          <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contatto</label>
                <ContactPicker value={partForm.contact} onChange={c => setPartForm(f => ({ ...f, contact: c }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo partecipante</label>
                <select className={SELECT_STYLE} value={partForm.tipo} onChange={e => setPartForm(f => ({ ...f, tipo: e.target.value }))}>
                  {Object.entries(TIPO_PARTECIPANTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAddParticipant} disabled={!partForm.contact}>Aggiungi</Button>
              <Button variant="ghost" onClick={() => setPartForm(null)}>Annulla</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Logistica: grouping + filters + view toggle ── */}
      {people.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Icon icon={NAV_ICONS.logistica} size={20} className="text-gray-400" />
              Logistica
            </h3>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex rounded-lg bg-gray-100 p-0.5">
                <button
                  onClick={() => setViewMode('lista')}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${viewMode === 'lista' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  Lista
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${viewMode === 'timeline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                  Timeline
                </button>
              </div>
              {hasTavoli && canEdit && tavoli.length > 0 && (
                <Button variant="secondary" size="sm" onClick={handleDistribuisci}>Distribuisci</Button>
              )}
            </div>
          </div>

          {/* Grouping chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {GROUP_OPTIONS.filter(g => hasTavoli || g.id !== 'tavolo').map(g => (
              <button
                key={g.id || 'all'}
                onClick={() => setGroupBy(g.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${
                  groupBy === g.id ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_OPTIONS.map(f => {
              const count = f.count()
              if (count === 0 && !activeFilters.has(f.id)) return null
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium min-h-[32px] transition-colors border ${
                    activeFilters.has(f.id)
                      ? 'bg-mikai-100 text-mikai-700 border-mikai-300'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {f.label} ({count})
                </button>
              )
            })}
            {activeFilters.size > 0 && (
              <button onClick={() => setActiveFilters(new Set())} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
                Rimuovi filtri
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Toolbar: bulk actions ── */}
      {canEdit && selected.size > 0 && (
        <div className={SUMMARY_BAR_STYLE + ' flex items-center gap-3 flex-wrap'}>
          <span className="text-sm font-medium text-mikai-700">{selected.size} selezionati</span>
          <div className="flex gap-3 ml-auto flex-wrap">
            {hasTavoli && tavoli.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setActiveModal('tavolo')}>
                <Icon icon={TAVOLI_ICONS.tavoli} size={16} className="mr-1" />
                Imposta tavolo
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('hotel')}>
              <Icon icon={LOGISTICA_PERSONE_ICONS.hotel} size={16} className="mr-1" />
              Imposta hotel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('andata')}>
              <Icon icon={ACTION_ICONS.forward} size={16} className="mr-1" />
              Imposta andata
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setActiveModal('ritorno')}>
              <Icon icon={ACTION_ICONS.back} size={16} className="mr-1" />
              Imposta ritorno
            </Button>
          </div>
        </div>
      )}

      {/* ── Progress indicators ── */}
      {people.length > 0 && viewMode === 'lista' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {hasTavoli && (
            <ProgressIndicator label="Tavoli" current={people.filter(p => getPersonTavolo(p, tavoli)).length} total={people.length} color="mikai" />
          )}
          <ProgressIndicator label="Hotel" current={hotels.length} total={people.length} color="blue" />
          <ProgressIndicator label="Andata" current={trasporti.filter(t => t.direzione === 'andata').length} total={people.length} />
          <ProgressIndicator label="Ritorno" current={trasporti.filter(t => t.direzione === 'ritorno').length} total={people.length} />
        </div>
      )}

      {people.length === 0 && <EmptyState title="Nessuna persona" description="Aggiungi staff o partecipanti con i bottoni sopra" />}

      {/* ── Timeline view ── */}
      {viewMode === 'timeline' && people.length > 0 && (
        <EventLogisticaEventTimeline event={event} hotels={hotels} trasporti={trasporti} people={people} getHotel={getHotel} />
      )}

      {/* ── Table/Cards view ── */}
      {viewMode === 'lista' && groupedPeople.map((group, gi) => (
        <div key={gi}>
          {group.label && (
            <div className={GROUP_HEADING_STYLE + ' mb-2'}>
              {group.label} <span className="text-gray-400 font-normal">({group.people.length})</span>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-base">
              {gi === 0 && (
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    {canEdit && (
                      <th className="pb-2 px-2 w-10">
                        <input type="checkbox" checked={selected.size === filteredPeople.length && filteredPeople.length > 0} onChange={toggleSelectAll}
                          className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" />
                      </th>
                    )}
                    <th className="pb-2 pr-4">Persona</th>
                    {hasTavoli && <th className="pb-2 px-2">Tavolo</th>}
                    <th className="pb-2 px-2">Hotel</th>
                    <th className="pb-2 px-2">Andata</th>
                    <th className="pb-2 px-2">Ritorno</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {group.people.map(person => {
                  const key = personKey(person)
                  const hotel = getHotel(person)
                  const andata = getAndata(person)
                  const ritorno = getRitorno(person)
                  const currentTavolo = hasTavoli ? getPersonTavolo(person, tavoli) : null

                  return (
                    <Fragment key={key}>
                      <tr className={`border-b border-gray-100 hover:bg-gray-50 ${selected.has(key) ? 'bg-mikai-50/50' : ''}`}>
                        {canEdit && (
                          <td className="py-3 px-2">
                            <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(person)}
                              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" />
                          </td>
                        )}
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium truncate">{person.cognome} {person.nome}</span>
                                <EsigenzeIcons person={person} />
                                <NotePopover note={person.note} canEdit={canEdit || canEditStaff || canEditPart} onSave={(note) => handleNoteSave(person, note)} />
                              </div>
                              <span className="text-gray-400 text-sm">{person.type === 'staff' ? RUOLO_EVENTO[person.ruolo] || 'staff' : TIPO_PARTECIPANTE[person.ruolo] || 'partecipante'}</span>
                            </div>
                            {/* Clickable status chip */}
                            {person.type === 'staff' && canEditStaff && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateStaff(person.staffId, { confermato: !person.confermato }) }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium min-h-[28px] transition-colors ${person.confermato ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                              >
                                {person.confermato ? 'Confermato' : 'Da confermare'}
                              </button>
                            )}
                            {person.type === 'participant' && canEditPart && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateParticipant(person.participantId, { stato_iscrizione: ISCRIZIONE_CYCLE[person.statoIscrizione || 'invitato'] }) }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium min-h-[28px] transition-colors ${ISCRIZIONE_CHIP_COLORS[person.statoIscrizione || 'invitato']}`}
                              >
                                {STATO_ISCRIZIONE[person.statoIscrizione || 'invitato']}
                              </button>
                            )}
                            {person.type === 'participant' && !canEditPart && (
                              <StatusBadge stato={person.statoIscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />
                            )}
                            {(canEditStaff || canEditPart) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleting({ type: person.type, id: person.type === 'staff' ? person.staffId : person.participantId, personId: person.id, name: `${person.cognome} ${person.nome}` }) }}
                                className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                aria-label={`Rimuovi ${person.cognome} ${person.nome}`}
                              >
                                <Icon icon={ACTION_ICONS.close} size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        {hasTavoli && (
                          <td className="py-3 px-2">
                            {currentTavolo ? <span className="text-sm font-medium">T{currentTavolo.numero}</span> : <span className="text-gray-400">—</span>}
                          </td>
                        )}
                        <td className="py-3 px-2">
                          {hotel ? (
                            <div className="space-y-0.5">
                              {hotel.nome_hotel && <div className="text-sm font-medium truncate max-w-[180px]">{hotel.nome_hotel}</div>}
                              {hotel.indirizzo_hotel && <div className="text-xs text-gray-400 truncate max-w-[180px]">{hotel.indirizzo_hotel}</div>}
                              {(hotel.check_in || hotel.check_out) && (
                                <div className="text-xs text-gray-400">
                                  {hotel.check_in && formatDateShort(hotel.check_in)}
                                  {hotel.check_in && hotel.check_out && ' → '}
                                  {hotel.check_out && formatDateShort(hotel.check_out)}
                                </div>
                              )}
                              <StatusBadge stato={hotel.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-3 px-2"><TrasportoCell record={andata} /></td>
                        <td className="py-3 px-2"><TrasportoCell record={ritorno} /></td>
                      </tr>
                      {editingTransport?.personId === person.id && (
                        <tr key={`form-${key}`}>
                          <td colSpan={colSpan} className="p-2">
                            <TrasportoForm trasporto={editingTransport.record} eventId={event.id} personId={person.id} personType={person.type} direzione={editingTransport.direzione} onSave={() => setEditingTransport(null)} onCancel={() => setEditingTransport(null)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {canEdit && gi === 0 && (
              <label className="flex items-center gap-2 p-2 min-h-[48px]">
                <input type="checkbox" checked={selected.size === filteredPeople.length && filteredPeople.length > 0} onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" />
                <span className="text-sm text-gray-500">Seleziona tutti</span>
              </label>
            )}
            {group.people.map(person => {
              const key = personKey(person)
              const hotel = getHotel(person)
              const andata = getAndata(person)
              const ritorno = getRitorno(person)
              const currentTavolo = hasTavoli ? getPersonTavolo(person, tavoli) : null
              const hasAnyData = hotel || andata || ritorno

              return (
                <div key={key} className={`bg-white rounded-xl border border-gray-200 p-3 space-y-2 ${selected.has(key) ? 'border-mikai-300 bg-mikai-50/30' : ''}`}>
                  {/* Row 1: checkbox + name + icons + delete */}
                  <div className="flex items-start gap-2">
                    {canEdit && (
                      <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(person)}
                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm">{person.cognome} {person.nome}</span>
                        <EsigenzeIcons person={person} />
                        <NotePopover note={person.note} canEdit={canEdit || canEditStaff || canEditPart} onSave={(note) => handleNoteSave(person, note)} />
                      </div>
                      <span className="text-gray-400 text-xs">{person.type === 'staff' ? RUOLO_EVENTO[person.ruolo] || 'staff' : TIPO_PARTECIPANTE[person.ruolo] || 'partecipante'}</span>
                    </div>
                    {(canEditStaff || canEditPart) && (
                      <button onClick={() => setDeleting({ type: person.type, id: person.type === 'staff' ? person.staffId : person.participantId, personId: person.id, name: `${person.cognome} ${person.nome}` })}
                        className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0" aria-label={`Rimuovi ${person.cognome} ${person.nome}`}>
                        <Icon icon={ACTION_ICONS.close} size={14} />
                      </button>
                    )}
                  </div>

                  {/* Row 2: tavolo + stato conferma chip */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasTavoli && currentTavolo && (
                      <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded">T{currentTavolo.numero}</span>
                    )}
                    {person.type === 'staff' && canEditStaff && (
                      <button
                        onClick={() => updateStaff(person.staffId, { confermato: !person.confermato })}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium min-h-[32px] transition-colors ${person.confermato ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                      >
                        {person.confermato ? 'Confermato' : 'Da confermare'}
                      </button>
                    )}
                    {person.type === 'participant' && (
                      canEditPart ? (
                        <button
                          onClick={() => updateParticipant(person.participantId, { stato_iscrizione: ISCRIZIONE_CYCLE[person.statoIscrizione || 'invitato'] })}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium min-h-[32px] transition-colors ${ISCRIZIONE_CHIP_COLORS[person.statoIscrizione || 'invitato']}`}
                        >
                          {STATO_ISCRIZIONE[person.statoIscrizione || 'invitato']}
                        </button>
                      ) : (
                        <StatusBadge stato={person.statoIscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />
                      )
                    )}
                  </div>

                  {/* Row 3: logistica */}
                  {hasAnyData && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs border-t border-gray-100 pt-2">
                      {hotel && (
                        <div className="flex items-center gap-1">
                          <Icon icon={LOGISTICA_PERSONE_ICONS.hotel} size={14} className="text-gray-400" />
                          {hotel.nome_hotel && <span className="text-gray-600 truncate max-w-[120px]">{hotel.nome_hotel}</span>}
                          <StatusBadge stato={hotel.stato} labels={STATO_PRENOTAZIONE} colors={STATO_PRENOTAZIONE_COLORE} />
                        </div>
                      )}
                      {andata && (
                        <div className="flex items-center gap-1">
                          <Icon icon={ACTION_ICONS.forward} size={14} className="text-gray-400" />
                          <TrasportoCell record={andata} />
                        </div>
                      )}
                      {ritorno && (
                        <div className="flex items-center gap-1">
                          <Icon icon={ACTION_ICONS.back} size={14} className="text-gray-400" />
                          <TrasportoCell record={ritorno} />
                        </div>
                      )}
                    </div>
                  )}
                  {editingTransport?.personId === person.id && (
                    <TrasportoForm trasporto={editingTransport.record} eventId={event.id} personId={person.id} personType={person.type} direzione={editingTransport.direzione} onSave={() => setEditingTransport(null)} onCancel={() => setEditingTransport(null)} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* ── Bulk Modals ── */}
      {activeModal === 'tavolo' && <TavoloModal selectedPeople={selectedPeople} eventId={event.id} tavoli={tavoli} onDone={handleModalDone} onClose={() => setActiveModal(null)} />}
      {activeModal === 'hotel' && <HotelModal selectedPeople={selectedPeople} eventId={event.id} onDone={handleModalDone} onClose={() => setActiveModal(null)} />}
      {activeModal === 'andata' && <TrasportoModal selectedPeople={selectedPeople} eventId={event.id} direzione="andata" onDone={handleModalDone} onClose={() => setActiveModal(null)} />}
      {activeModal === 'ritorno' && <TrasportoModal selectedPeople={selectedPeople} eventId={event.id} direzione="ritorno" onDone={handleModalDone} onClose={() => setActiveModal(null)} />}

      <BulkImportModal open={showImport} eventId={event.id} onComplete={() => { setShowImport(false); fetchEventParticipants(event.id) }} onClose={() => setShowImport(false)} />

      <ConfirmDialog
        open={!!deleting}
        title="Rimuovi persona"
        message={`Rimuovere ${deleting?.name} dall'evento?`}
        confirmLabel="Rimuovi"
        danger
        onConfirm={async () => {
          if (deleting.type === 'staff') await removeStaff(deleting.id)
          else await removeParticipant(deleting.id)
          const personKey = deleting.type === 'staff' ? 'user_id' : 'contact_id'
          const orphanedHotels = hotels.filter(h => h[personKey] === deleting.personId)
          const orphanedTrasporti = trasporti.filter(t => t[personKey] === deleting.personId)
          await Promise.all([
            ...orphanedHotels.map(h => removeHotel(h.id)),
            ...orphanedTrasporti.map(t => removeTrasporto(t.id)),
          ])
          if (hasTavoli) fetchEventTavoli(event.id)
          setDeleting(null)
          addToast('Rimosso', 'success')
        }}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
