import { useEffect, useState, useMemo, Fragment } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useContactsStore } from '../../hooks/useContacts'
import { useAdminStore } from '../../hooks/useAdmin'
import { useAuthStore } from '../../hooks/useAuth'
import { useTavoliStore } from '../../hooks/useTavoli'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { STATO_PRENOTAZIONE, STATO_ISCRIZIONE, STATO_ISCRIZIONE_COLORE, MEZZO_TRASPORTO, TIPI_EVENTO_CON_TAVOLI, RUOLO_EVENTO, TIPO_PARTECIPANTE, INPUT_STYLE, SELECT_STYLE, FORM_CONTAINER_STYLE, SUMMARY_BAR_STYLE, GROUP_HEADING_STYLE, CARD_STYLE, ISCRIZIONE_CHIP_COLORS, BADGE_BASE, COLOR_BADGE, CONFERMATO_CHIP, CONFERMATO_BADGE, TAVOLO_COLORI } from '../../lib/constants'
import { ACTION_ICONS, NAV_ICONS, LOGISTICA_PERSONE_ICONS, TAVOLI_ICONS } from '../../lib/icons'
import { ContactPicker } from '../contatti/ContactPicker'
import { BulkImportModal } from '../contatti/BulkImportModal'
import { TavoloModal, HotelModal, TrasportoModal } from './LogisticaBulkModals'
import { PersonDetailModal } from './PersonDetailModal'
import { EventChecklistView } from './EventChecklistView'
import { EventLogisticaEventTimeline } from './EventLogisticaEventTimeline'
import { LogisticaAlertsBar, computeAlerts } from './LogisticaAlertsBar'
import { LogisticaProgressBar } from './LogisticaProgressBar'
import { StatusDot } from './StatusDot'
import { TrasportoCell } from './TrasportoCell'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ExportButton } from '../ui/ExportButton'
import { SearchInput } from '../ui/SearchInput'
import { formatTime, formatDateShort } from '../../lib/date-utils'
import { exportToExcel } from '../../lib/export-utils'

// ─── Constants ─────────────────────────────────────────────────
const GROUP_MAIN = [
  { id: null, label: 'Tutti' },
  { id: 'tipo', label: 'Per ruolo' },
  { id: 'trasporto', label: 'Per trasporto' },
]

const GROUP_MORE = [
  { id: 'tavolo', label: 'Per tavolo' },
  { id: 'zona', label: 'Per zona' },
]

const ISCRIZIONE_CYCLE = { invitato: 'confermato', confermato: 'presente', presente: 'invitato', assente: 'invitato' }

// ─── More menu (secondary actions) ────────────────────────────
function MoreMenu({ items }) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-label="Altre azioni">
        <Icon icon={ACTION_ICONS.more} size={18} />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]">
            {items.map((item, i) => item.divider ? (
              <div key={i} className="border-t border-gray-100 my-1" />
            ) : (
              <button key={i} onClick={() => { item.onClick(); setOpen(false) }}
                disabled={item.disabled} className="w-full text-left px-3 py-2 text-sm min-h-[48px] md:min-h-[44px] hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50">
                {item.icon && <Icon icon={item.icon} size={16} className="text-gray-400" />}
                <span>{item.label}</span>
                {item.active && <span className="ml-auto text-mikai-500">●</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Staff picker with search ─────────────────────────────────
function StaffPicker({ users, value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = users.find(u => u.id === value)
  const filtered = query
    ? users.filter(u => `${u.cognome} ${u.nome} ${u.ruolo}`.toLowerCase().includes(query.toLowerCase()))
    : users

  return (
    <div className="relative">
      <input
        className={INPUT_STYLE}
        value={selected ? `${selected.cognome} ${selected.nome}` : query}
        onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Cerca persona..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(u => (
            <button key={u.id} type="button"
              onClick={() => { onChange(u.id); setQuery(''); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 min-h-[44px]"
            >
              <span className="font-medium">{u.cognome} {u.nome}</span>
              <span className="text-gray-400 ml-1">({u.ruolo})</span>
            </button>
          ))}
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
      )}
    </div>
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

// ─── Tavolo badge: shows number + color dot + optional name ────
function TavoloBadge({ tavolo, compact }) {
  if (!tavolo) return <span className="text-gray-400">—</span>
  const colore = TAVOLO_COLORI[tavolo.colore]
  return (
    <span className="inline-flex items-center gap-1 font-medium"
      title={`Tavolo ${tavolo.numero}${colore ? ` (${colore.label})` : ''}${tavolo.nome ? ` — ${tavolo.nome}` : ''}`}>
      {colore && <span className={`w-2.5 h-2.5 rounded-full ${colore.dot} shrink-0`} aria-hidden="true" />}
      <span>T{tavolo.numero}</span>
      {!compact && colore && <span className="text-xs text-gray-500">{colore.label}</span>}
    </span>
  )
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

  const updateContact = useContactsStore(s => s.updateContact)
  const updateUser = useAdminStore(s => s.updateUser)

  const [selected, setSelected] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState(null)
  const [activeFilters, setActiveFilters] = useState(new Set())
  const [activeModal, setActiveModal] = useState(null) // 'tavolo'|'hotel'|'andata'|'ritorno'
  const [singleEdit, setSingleEdit] = useState(null)   // { type: 'hotel'|'andata'|'ritorno'|'dettagli', person, record }

  const [staffForm, setStaffForm] = useState(null)
  const [partForm, setPartForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [checklistMode, setChecklistMode] = useState(false)
  const [viewMode, setViewMode] = useState('lista')
  // dismissedAlerts state moved into LogisticaAlertsBar
  const [exporting, setExporting] = useState(false)
  const [statoConfirm, setStatoConfirm] = useState(null) // { person, newStato, label }
  const [moreGroupOpen, setMoreGroupOpen] = useState(false)

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
    if (error) { addToast(error || 'Errore', 'error'); return }
    addToast('Staff aggiunto', 'success')
    setStaffForm(null)
  }

  const handleAddParticipant = async () => {
    if (!partForm?.contact || !partForm?.tipo) return
    const { error } = await addParticipant(event.id, partForm.contact.id, partForm.tipo)
    if (error) { addToast(error || 'Errore', 'error'); return }
    addToast('Partecipante aggiunto', 'success')
    setPartForm(null)
  }

  // ── People list (memoized) ──
  const people = useMemo(() => [
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
  ].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || '', 'it') || (a.nome || '').localeCompare(b.nome || '', 'it'))
  , [staff, participants])

  const personKey = (p) => `${p.type}-${p.id}`

  // ── Lookups (Map for O(1) access) ──
  const hotelMap = useMemo(() => {
    const m = new Map()
    for (const h of hotels) m.set(`staff-${h.user_id}`, h).set(`participant-${h.contact_id}`, h)
    return m
  }, [hotels])
  const sortLegs = (legs) => legs.sort((a, b) => {
    if (a.orario && b.orario) return a.orario < b.orario ? -1 : a.orario > b.orario ? 1 : 0
    if (a.orario) return -1
    if (b.orario) return 1
    return (a.ordine || 1) - (b.ordine || 1)
  })
  const andataMap = useMemo(() => {
    const m = new Map()
    for (const t of trasporti) {
      if (t.direzione !== 'andata') continue
      const key = t.user_id ? `staff-${t.user_id}` : `participant-${t.contact_id}`
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(t)
    }
    for (const legs of m.values()) sortLegs(legs)
    return m
  }, [trasporti])
  const ritornoMap = useMemo(() => {
    const m = new Map()
    for (const t of trasporti) {
      if (t.direzione !== 'ritorno') continue
      const key = t.user_id ? `staff-${t.user_id}` : `participant-${t.contact_id}`
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(t)
    }
    for (const legs of m.values()) sortLegs(legs)
    return m
  }, [trasporti])
  const getHotel = (person) => hotelMap.get(`${person.type}-${person.id}`)
  const getAndata = (person) => andataMap.get(`${person.type}-${person.id}`) || []
  const getRitorno = (person) => ritornoMap.get(`${person.type}-${person.id}`) || []

  // ── Stats (memoized) ──
  const { confirmedCount, withHotel, withFullTransport } = useMemo(() => ({
    confirmedCount: staff.filter(s => s.confermato).length +
      participants.filter(p => ['confermato', 'presente'].includes(p.stato_iscrizione)).length,
    withHotel: people.filter(p => getHotel(p)).length,
    withFullTransport: people.filter(p => getAndata(p).length > 0 && getRitorno(p).length > 0).length,
  }), [people, staff, participants, hotelMap, andataMap, ritornoMap])

  // ── Filters ──
  const FILTER_OPTIONS = useMemo(() => [
    { id: 'invitati', label: 'Invitati', count: participants.filter(p => p.stato_iscrizione === 'invitato').length, filter: p => p.type === 'participant' && p.statoIscrizione === 'invitato' },
    { id: 'confermati', label: 'Confermati', count: confirmedCount, filter: p => (p.type === 'staff' && p.confermato) || (p.type === 'participant' && ['confermato', 'presente'].includes(p.statoIscrizione)) },
    { id: 'no_hotel', label: 'Senza hotel', count: people.length - withHotel, filter: p => !getHotel(p) },
    { id: 'no_trasporto', label: 'Senza trasporto', count: people.length - withFullTransport, filter: p => !getAndata(p).length || !getRitorno(p).length },
  ], [participants, people, confirmedCount, withHotel, withFullTransport, hotelMap, andataMap, ritornoMap])

  const toggleFilter = (filterId) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(filterId)) next.delete(filterId)
      else next.add(filterId)
      return next
    })
  }

  const filteredPeople = useMemo(() => {
    let result = people
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => `${p.cognome} ${p.nome}`.toLowerCase().includes(q))
    }
    if (activeFilters.size > 0) {
      result = result.filter(p => [...activeFilters].every(fId => FILTER_OPTIONS.find(f => f.id === fId)?.filter(p)))
    }
    return result
  }, [people, searchQuery, activeFilters, FILTER_OPTIONS])

  const selectedPeople = useMemo(() =>
    filteredPeople.filter(p => selected.has(personKey(p)))
  , [filteredPeople, selected])

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

  // ── Grouping (memoized) ──
  const groupedPeople = useMemo(() => {
    if (!groupBy) return [{ label: null, people: filteredPeople }]
    if (groupBy === 'tavolo') {
      const groups = []
      const assigned = new Set()
      for (const t of tavoli) {
        const inTavolo = filteredPeople.filter(p => {
          if (getPersonTavolo(p, [t])) { assigned.add(personKey(p)); return true }
          return false
        })
        if (inTavolo.length > 0) {
          const colore = TAVOLO_COLORI[t.colore]
          const coloreText = colore ? ` (${colore.label})` : ''
          groups.push({ label: `Tavolo ${t.numero}${coloreText}${t.nome ? ` — ${t.nome}` : ''}`, people: inTavolo, tavolo: t })
        }
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
      const withTransport = new Set()
      const addToGroup = (label, p) => {
        if (!transportMap[label]) transportMap[label] = []
        if (!transportMap[label].some(x => personKey(x) === personKey(p))) transportMap[label].push(p)
      }
      for (const p of filteredPeople) {
        const allLegs = [...getAndata(p), ...getRitorno(p)]
        for (const leg of allLegs) {
          withTransport.add(personKey(p))
          if (leg.mezzo === 'indipendente' || leg.stato === 'non_necessario') {
            addToGroup(leg.stato === 'non_necessario' ? 'zz_Non necessario' : 'zz_Indipendente', p)
          } else {
            const dirPrefix = leg.direzione === 'andata' ? 'A_' : 'B_'
            const dirLabel = leg.direzione === 'andata' ? 'Andata' : 'Ritorno'
            let tratta = ''
            if (leg.codice) tratta = `${MEZZO_TRASPORTO[leg.mezzo] || ''} ${leg.codice}`.trim()
            else if (leg.mezzo) tratta = MEZZO_TRASPORTO[leg.mezzo]
            else tratta = 'Trasporto'
            addToGroup(`${dirPrefix}${dirLabel} · ${tratta}`, p)
          }
        }
      }
      const noTransport = filteredPeople.filter(p => !withTransport.has(personKey(p)))
      const groups = Object.entries(transportMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, ppl]) => ({ label: label.replace(/^[AB]_|^zz_/, ''), people: ppl }))
      if (noTransport.length > 0) groups.push({ label: 'Senza trasporto', people: noTransport })
      return groups
    }
    return [{ label: null, people: filteredPeople }]
  }, [filteredPeople, groupBy, tavoli, andataMap, ritornoMap])

  // ── Alerts (memoized) ──
  const alerts = useMemo(() => computeAlerts(event, people, hotels, trasporti, staff, getHotel, getAndata)
  , [event, people, hotels, trasporti, staff, hotelMap, andataMap])

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
        ...(hasTavoli ? [{ label: 'Tavolo', key: 'tavolo', width: 14, format: (_, row) => { const t = getPersonTavolo(row, tavoli); if (!t) return ''; const c = TAVOLO_COLORI[t.colore]; return `T${t.numero}${c ? ` (${c.label})` : ''}` } }] : []),
        { label: 'Hotel', key: 'hotel', width: 25, format: (_, row) => getHotel(row)?.nome_hotel || '' },
        { label: 'Indirizzo Hotel', key: 'indirizzo', width: 30, format: (_, row) => getHotel(row)?.indirizzo_hotel || '' },
        { label: 'Check-in', key: 'checkin', width: 12, format: (_, row) => { const h = getHotel(row); return h?.check_in ? formatDateShort(h.check_in) : '' } },
        { label: 'Check-out', key: 'checkout', width: 12, format: (_, row) => { const h = getHotel(row); return h?.check_out ? formatDateShort(h.check_out) : '' } },
        { label: 'Andata', key: 'andata_summary', width: 40, format: (_, row) => getAndata(row).map(a => [MEZZO_TRASPORTO[a.mezzo], a.codice, a.luogo_partenza, a.luogo_arrivo ? `→ ${a.luogo_arrivo}` : '', a.orario ? formatTime(a.orario) : ''].filter(Boolean).join(' ')).join(' + ') || '' },
        { label: 'Ritorno', key: 'ritorno_summary', width: 40, format: (_, row) => getRitorno(row).map(r => [MEZZO_TRASPORTO[r.mezzo], r.codice, r.luogo_partenza, r.luogo_arrivo ? `→ ${r.luogo_arrivo}` : '', r.orario ? formatTime(r.orario) : ''].filter(Boolean).join(' ')).join(' + ') || '' },
        { label: 'Note', key: 'note', width: 25 },
        { label: 'Esigenze alimentari', key: 'esigenze_alimentari', width: 25 },
      ]
      const title = (event.titolo || 'evento').replace(/[^a-zA-Z0-9àèéìòù ]/g, '').trim().replace(/ +/g, '_')
      await exportToExcel({ columns, rows: people, filename: `Persone_${title}`, sheetName: 'Persone' })
      addToast('Esportazione completata', 'success')
    } catch {
      addToast('Errore durante l\'export', 'error')
    }
    setExporting(false)
  }

  // ── Note save ──
  const handleNoteSave = async (person, note) => {
    const { error } = person.type === 'staff'
      ? await updateStaff(person.staffId, { note })
      : await updateParticipant(person.participantId, { note })
    if (error) addToast('Errore nel salvataggio nota', 'error')
  }

  // ── Esigenze save (updates contact or user, then refreshes) ──
  const handleEsigenzeSave = async (person, updates) => {
    if (person.type === 'participant') {
      const { error } = await updateContact(person.id, updates)
      if (error) return addToast('Errore nel salvataggio esigenze', 'error')
      await fetchEventParticipants(event.id)
    } else {
      const { error } = await updateUser(person.id, updates)
      if (error) return addToast('Errore nel salvataggio esigenze', 'error')
      await fetchEventStaff(event.id)
    }
    addToast('Esigenze aggiornate', 'success')
  }

  if (loading || staffLoading) return <LoadingSkeleton lines={5} />
  if (logisticsError) return <div role="alert"><EmptyState title="Errore nel caricamento" description="Non siamo riusciti a caricare i dati logistica." /></div>

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
      <LogisticaAlertsBar alerts={alerts} />

      {/* ── Row 1: title + pills + search + actions ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-lg flex-shrink-0">Persone</h3>
        {people.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium flex-shrink-0">
            <span className={BADGE_BASE + ' ' + COLOR_BADGE.gray}>{people.length}</span>
            <span className={BADGE_BASE + ' ' + COLOR_BADGE.green}>{confirmedCount} conf.</span>
            <span className={BADGE_BASE + ' ' + COLOR_BADGE.blue}>{withHotel} hotel</span>
            <span className={BADGE_BASE + ' ' + COLOR_BADGE.purple}>{withFullTransport} trasporti</span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {people.length > 0 && (
            <div className="w-full max-w-[200px]">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Cerca..." delay={200} />
            </div>
          )}
          {canEditPart && (
            <Button variant="secondary" size="sm" onClick={() => setPartForm({ contact: null, tipo: 'discente' })}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1 hidden sm:inline">Partecipante</span>
            </Button>
          )}
          {canEditStaff && (
            <Button variant="secondary" size="sm" onClick={() => setStaffForm({ userId: '', ruolo: 'staff' })}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1 hidden sm:inline">Staff</span>
            </Button>
          )}
          {people.length > 0 && (
            <MoreMenu items={[
              { label: viewMode === 'lista' ? 'Vista lista' : 'Vista timeline', icon: NAV_ICONS.logistica, onClick: () => setViewMode(viewMode === 'lista' ? 'timeline' : 'lista') },
              { divider: true },
              { label: 'Esporta', icon: ACTION_ICONS.upload, onClick: handleExport, disabled: exporting },
              ...(canEditPart ? [{ label: 'Importa contatti', icon: ACTION_ICONS.upload, onClick: () => setShowImport(true) }] : []),
              ...(['pronto', 'in_corso'].includes(event.stato) ? [{ label: 'Checklist presenze', icon: NAV_ICONS.checklist, onClick: () => setChecklistMode(true) }] : []),
              ...(hasTavoli && canEdit && tavoli.length > 0 ? [{ divider: true }, { label: 'Distribuisci tavoli', icon: TAVOLI_ICONS.tavoli, onClick: handleDistribuisci }] : []),
            ]} />
          )}
        </div>
      </div>

      {/* Inline form: aggiungi staff */}
      {staffForm && (
        <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Persona</label>
              <StaffPicker
                users={users.filter(u => !staff.some(s => s.user_id === u.id))}
                value={staffForm.userId}
                onChange={userId => setStaffForm(f => ({ ...f, userId }))}
              />
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

      {/* ── Grouping + Filters (single row) ── */}
      {people.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            {GROUP_MAIN.map(g => (
              <button
                key={g.id || 'all'}
                onClick={() => { setGroupBy(g.id); setMoreGroupOpen(false) }}
                className={`px-3 py-1 rounded-md text-sm font-medium min-h-[48px] md:min-h-0 transition-colors ${
                  groupBy === g.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          {(hasTavoli || GROUP_MORE.some(g => g.id !== 'tavolo')) && (
            <div className="relative">
              <button
                onClick={() => setMoreGroupOpen(!moreGroupOpen)}
                className={`px-3 py-1 rounded-lg text-sm font-medium min-h-[48px] md:min-h-0 transition-colors ${
                  GROUP_MORE.some(g => g.id === groupBy) ? 'bg-mikai-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Altre opzioni di raggruppamento"
              >
                {GROUP_MORE.find(g => g.id === groupBy)?.label || <Icon icon={ACTION_ICONS.more} size={16} />}
              </button>
              {moreGroupOpen && (
                <div className="absolute z-20 left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                  {GROUP_MORE.filter(g => hasTavoli || g.id !== 'tavolo').map(g => (
                    <button
                      key={g.id}
                      onClick={() => { setGroupBy(g.id); setMoreGroupOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm min-h-[48px] md:min-h-[44px] transition-colors ${
                        groupBy === g.id ? 'bg-mikai-50 text-mikai-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <span className="w-px h-5 bg-gray-200 hidden md:block" />
          {FILTER_OPTIONS.map(f => {
            if (f.count === 0 && !activeFilters.has(f.id)) return null
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium min-h-[48px] md:min-h-0 transition-colors border ${
                  activeFilters.has(f.id)
                    ? 'bg-mikai-100 text-mikai-700 border-mikai-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label} ({f.count})
              </button>
            )
          })}
          {activeFilters.size > 0 && (
            <button onClick={() => setActiveFilters(new Set())} className="text-xs text-gray-500 hover:text-gray-700 px-2 min-h-[48px] md:min-h-0">
              Rimuovi filtri
            </button>
          )}
          <span className="hidden md:flex items-center gap-3 ml-auto text-xs text-gray-400">
            <span className="flex items-center gap-1"><StatusDot stato="da_prenotare" /> Da pren.</span>
            <span className="flex items-center gap-1"><StatusDot stato="prenotato" /> Pren.</span>
            <span className="flex items-center gap-1"><StatusDot stato="confermato" /> Conf.</span>
            <span className="flex items-center gap-1"><StatusDot stato="non_necessario" /> N/N</span>
          </span>
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

      {people.length === 0 && <EmptyState title="Nessuna persona" description="Aggiungi staff o partecipanti con i bottoni sopra" />}

      {/* ── Timeline view ── */}
      {viewMode === 'timeline' && people.length > 0 && (
        <EventLogisticaEventTimeline event={event} hotels={hotels} trasporti={trasporti} people={people} />
      )}

      {/* ── Table/Cards view ── */}
      {viewMode === 'lista' && groupedPeople.map((group, gi) => (
        <div key={gi}>
          {group.label && (
            <div className={GROUP_HEADING_STYLE + ' mb-2 flex items-center gap-2'}>
              {group.tavolo?.colore && TAVOLO_COLORI[group.tavolo.colore] && (
                <span className={`w-3 h-3 rounded-full ${TAVOLO_COLORI[group.tavolo.colore].dot}`} aria-hidden="true" />
              )}
              <span>{group.label}</span>
              <span className="text-gray-400 font-normal">({group.people.length})</span>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <colgroup>
                {canEdit && <col style={{ width: 40 }} />}
                <col style={{ width: '22%' }} />
                {hasTavoli && <col style={{ width: 50 }} />}
                <col style={{ width: '16%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              {gi === 0 && (
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    {canEdit && (
                      <th className="pb-2 px-2">
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
                      <tr className={`group border-b border-gray-100 hover:bg-gray-50 ${selected.has(key) ? 'bg-mikai-50/50' : ''}`}>
                        {canEdit && (
                          <td className="py-2 px-2">
                            <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(person)}
                              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" />
                          </td>
                        )}
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-1.5">
                            <div className="min-w-0 flex-1">
                              {/* Line 1: name + status chip */}
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{person.cognome} {person.nome}</span>
                                <span className="flex-shrink-0">
                                  {person.type === 'staff' && canEditStaff && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setStatoConfirm({ person, newStato: !person.confermato, label: person.confermato ? 'Da confermare' : 'Confermato', type: 'staff' }) }}
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${CONFERMATO_CHIP[person.confermato]}`}
                                    >
                                      {person.confermato ? 'Confermato' : 'Da confermare'}
                                    </button>
                                  )}
                                  {person.type === 'participant' && canEditPart && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); const nextStato = ISCRIZIONE_CYCLE[person.statoIscrizione || 'invitato']; setStatoConfirm({ person, newStato: nextStato, label: STATO_ISCRIZIONE[nextStato], type: 'participant' }) }}
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${ISCRIZIONE_CHIP_COLORS[person.statoIscrizione || 'invitato']}`}
                                    >
                                      {STATO_ISCRIZIONE[person.statoIscrizione || 'invitato']}
                                    </button>
                                  )}
                                  {person.type === 'participant' && !canEditPart && (
                                    <StatusBadge stato={person.statoIscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />
                                  )}
                                </span>
                              </div>
                              {/* Line 2: role + detail indicators — click opens modal */}
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span>{person.type === 'staff' ? RUOLO_EVENTO[person.ruolo] || 'staff' : TIPO_PARTECIPANTE[person.ruolo] || 'partecipante'}</span>
                                {(person.esigenze_alimentari || person.esigenze_accessibilita || person.note) && (
                                  <span className="inline-flex items-center gap-1.5">
                                    {person.esigenze_alimentari && <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={16} className="text-red-400" />}
                                    {person.esigenze_accessibilita && <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={16} className="text-blue-400" />}
                                    {person.note && <Icon icon={LOGISTICA_PERSONE_ICONS.note} size={16} className="text-mikai-400" />}
                                  </span>
                                )}
                                {(canEdit || canEditPart) && (
                                  <button type="button" onClick={() => setSingleEdit({ type: 'dettagli', person })}
                                    className="inline-flex items-center gap-1 text-gray-300 hover:text-mikai-500 transition-colors min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 md:p-0.5 justify-center"
                                    title="Modifica dettagli persona"
                                  >
                                    <Icon icon={ACTION_ICONS.edit} size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {(canEditStaff || canEditPart) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleting({ type: person.type, id: person.type === 'staff' ? person.staffId : person.participantId, personId: person.id, name: `${person.cognome} ${person.nome}` }) }}
                                className="text-gray-300 hover:text-red-500 p-1 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0 flex items-center justify-center"
                                aria-label={`Rimuovi ${person.cognome} ${person.nome}`}
                              >
                                <Icon icon={ACTION_ICONS.close} size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        {hasTavoli && (
                          <td className="py-2 px-2">
                            <TavoloBadge tavolo={currentTavolo} compact />
                          </td>
                        )}
                        <td className="py-2 px-2">
                          {hotel ? (
                            <button type="button" onClick={canEdit ? () => setSingleEdit({ type: 'hotel', person, record: hotel }) : undefined}
                              className={`text-left w-full ${canEdit ? 'hover:bg-mikai-50 rounded px-1 -mx-1 cursor-pointer' : ''} transition-colors`}
                              title={hotel.stato === 'non_necessario' ? 'Non necessario' : `${hotel.nome_hotel || 'Hotel'} — ${STATO_PRENOTAZIONE[hotel.stato] || ''}`}
                            >
                              <div className="flex items-center gap-1.5">
                                <StatusDot stato={hotel.stato} />
                                {hotel.stato === 'non_necessario' ? (
                                  <span className="text-gray-400 italic text-xs">Non nec.</span>
                                ) : (
                                  <div className="min-w-0">
                                    {hotel.nome_hotel && <div className="font-medium truncate">{hotel.nome_hotel}</div>}
                                    {(hotel.check_in || hotel.check_out) && (
                                      <div className="text-xs text-gray-400">
                                        {hotel.check_in && formatDateShort(hotel.check_in)}
                                        {hotel.check_in && hotel.check_out && ' → '}
                                        {hotel.check_out && formatDateShort(hotel.check_out)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </button>
                          ) : canEdit ? (
                            <button type="button" onClick={() => setSingleEdit({ type: 'hotel', person, record: null })}
                              className="w-7 h-7 rounded border border-dashed border-gray-200 text-gray-300 hover:border-mikai-400 hover:text-mikai-500 flex items-center justify-center transition-colors"
                              aria-label="Aggiungi hotel"
                            >
                              <Icon icon={ACTION_ICONS.add} size={14} />
                            </button>
                          ) : null}
                        </td>
                        <td className="py-2 px-2">
                          <TrasportoCell records={andata} canEdit={canEdit}
                            onClickLeg={(leg) => setSingleEdit({ type: 'andata', person, record: leg })}
                            onAddLeg={() => setSingleEdit({ type: 'andata', person, record: null, ordine: andata.length + 1 })} />
                        </td>
                        <td className="py-2 px-2">
                          <TrasportoCell records={ritorno} canEdit={canEdit}
                            onClickLeg={(leg) => setSingleEdit({ type: 'ritorno', person, record: leg })}
                            onAddLeg={() => setSingleEdit({ type: 'ritorno', person, record: null, ordine: ritorno.length + 1 })} />
                        </td>
                      </tr>
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
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

              return (
                <div key={key} className={CARD_STYLE + ` space-y-3 ${selected.has(key) ? 'border-mikai-300 bg-mikai-50/30' : ''}`}>
                  {/* Row 1: checkbox + name + role badge + delete */}
                  <div className="flex items-start gap-2">
                    {canEdit && (
                      <input type="checkbox" checked={selected.has(key)} onChange={() => toggleSelect(person)}
                        className="w-5 h-5 mt-1 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{person.cognome} {person.nome}</span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex-shrink-0">
                          {person.type === 'staff' ? RUOLO_EVENTO[person.ruolo] || 'staff' : TIPO_PARTECIPANTE[person.ruolo] || 'partecipante'}
                        </span>
                      </div>
                      {hasTavoli && currentTavolo && (
                        <span className="text-xs font-medium text-gray-500">Tavolo {currentTavolo.numero}{currentTavolo.nome ? ` — ${currentTavolo.nome}` : ''}</span>
                      )}
                    </div>
                    {(canEditStaff || canEditPart) && (
                      <button onClick={() => setDeleting({ type: person.type, id: person.type === 'staff' ? person.staffId : person.participantId, personId: person.id, name: `${person.cognome} ${person.nome}` })}
                        className="text-gray-400 hover:text-red-500 p-2 flex-shrink-0 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label={`Rimuovi ${person.cognome} ${person.nome}`}>
                        <Icon icon={ACTION_ICONS.close} size={16} />
                      </button>
                    )}
                  </div>

                  {/* Row 2: stato conferma chip — tappable with confirm */}
                  <div className="flex items-center gap-2">
                    {person.type === 'staff' && canEditStaff && (
                      <button
                        onClick={() => setStatoConfirm({ person, newStato: !person.confermato, label: person.confermato ? 'Da confermare' : 'Confermato', type: 'staff' })}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium min-h-[48px] transition-colors ${CONFERMATO_CHIP[person.confermato]}`}
                      >
                        {person.confermato ? 'Confermato' : 'Da confermare'}
                      </button>
                    )}
                    {person.type === 'staff' && !canEditStaff && (
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${CONFERMATO_BADGE[person.confermato]}`}>
                        {person.confermato ? 'Confermato' : 'Da confermare'}
                      </span>
                    )}
                    {person.type === 'participant' && canEditPart && (
                      <button
                        onClick={() => { const nextStato = ISCRIZIONE_CYCLE[person.statoIscrizione || 'invitato']; setStatoConfirm({ person, newStato: nextStato, label: STATO_ISCRIZIONE[nextStato], type: 'participant' }) }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium min-h-[48px] transition-colors ${ISCRIZIONE_CHIP_COLORS[person.statoIscrizione || 'invitato']}`}
                      >
                        {STATO_ISCRIZIONE[person.statoIscrizione || 'invitato']}
                      </button>
                    )}
                    {person.type === 'participant' && !canEditPart && (
                      <StatusBadge stato={person.statoIscrizione} labels={STATO_ISCRIZIONE} colors={STATO_ISCRIZIONE_COLORE} />
                    )}
                  </div>

                  {/* Row 3: hotel info */}
                  {hotel && (
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5">
                      <StatusDot stato={hotel.stato} />
                      <Icon icon={LOGISTICA_PERSONE_ICONS.hotel} size={16} className="text-gray-400 flex-shrink-0" />
                      {hotel.stato === 'non_necessario' ? (
                        <span className="text-sm text-gray-400 italic">Non nec.</span>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{hotel.nome_hotel || 'Hotel'}</div>
                          {(hotel.check_in || hotel.check_out) && (
                            <div className="text-xs text-gray-400">
                              {hotel.check_in && formatDateShort(hotel.check_in)}
                              {hotel.check_in && hotel.check_out && ' → '}
                              {hotel.check_out && formatDateShort(hotel.check_out)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Row 4: transport info */}
                  {(andata.length > 0 || ritorno.length > 0 || canEdit) && (
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
                        <Icon icon={ACTION_ICONS.forward} size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-500 font-medium mb-0.5">Andata</div>
                          <TrasportoCell records={andata} canEdit={canEdit}
                            onClickLeg={(leg) => setSingleEdit({ type: 'andata', person, record: leg })}
                            onAddLeg={() => setSingleEdit({ type: 'andata', person, record: null, ordine: andata.length + 1 })} />
                        </div>
                      </div>
                      <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2.5">
                        <Icon icon={ACTION_ICONS.back} size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-500 font-medium mb-0.5">Ritorno</div>
                          <TrasportoCell records={ritorno} canEdit={canEdit}
                            onClickLeg={(leg) => setSingleEdit({ type: 'ritorno', person, record: leg })}
                            onAddLeg={() => setSingleEdit({ type: 'ritorno', person, record: null, ordine: ritorno.length + 1 })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 5: detail indicators + edit button */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {person.esigenze_alimentari && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                        <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_alimentari} size={12} />{person.esigenze_alimentari}
                      </span>
                    )}
                    {person.esigenze_accessibilita && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        <Icon icon={LOGISTICA_PERSONE_ICONS.esigenze_accessibilita} size={12} />{person.esigenze_accessibilita}
                      </span>
                    )}
                    {person.note && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Icon icon={LOGISTICA_PERSONE_ICONS.note} size={12} className="text-mikai-400" />
                        {person.note.length > 30 ? person.note.slice(0, 30) + '...' : person.note}
                      </span>
                    )}
                    {(canEdit || canEditPart) && (
                      <button type="button" onClick={() => setSingleEdit({ type: 'dettagli', person })}
                        className="text-xs text-mikai-500 hover:text-mikai-700 font-medium min-h-[48px]">
                        Dettagli
                      </button>
                    )}
                  </div>
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

      {/* ── Single-person Modals ── */}
      {singleEdit?.type === 'hotel' && (
        <HotelModal selectedPeople={[singleEdit.person]} eventId={event.id} initialData={singleEdit.record}
          onDone={() => { setSingleEdit(null); fetchEventLogistics(event.id) }} onClose={() => setSingleEdit(null)} />
      )}
      {singleEdit?.type === 'andata' && (
        <TrasportoModal selectedPeople={[singleEdit.person]} eventId={event.id} direzione="andata" initialData={singleEdit.record}
          newOrdine={singleEdit.ordine} existingLegCount={getAndata(singleEdit.person).length}
          onDone={() => { setSingleEdit(null); fetchEventLogistics(event.id) }} onClose={() => setSingleEdit(null)} />
      )}
      {singleEdit?.type === 'ritorno' && (
        <TrasportoModal selectedPeople={[singleEdit.person]} eventId={event.id} direzione="ritorno" initialData={singleEdit.record}
          newOrdine={singleEdit.ordine} existingLegCount={getRitorno(singleEdit.person).length}
          onDone={() => { setSingleEdit(null); fetchEventLogistics(event.id) }} onClose={() => setSingleEdit(null)} />
      )}
      {singleEdit?.type === 'dettagli' && (
        <PersonDetailModal person={singleEdit.person}
          onSaveNote={handleNoteSave} onSaveEsigenze={handleEsigenzeSave}
          onClose={() => setSingleEdit(null)} />
      )}

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

      <ConfirmDialog
        open={!!statoConfirm}
        title="Cambia stato conferma"
        message={statoConfirm ? `Vuoi impostare ${statoConfirm.person.cognome} ${statoConfirm.person.nome} come "${statoConfirm.label}"?` : ''}
        confirmLabel={statoConfirm?.label || 'Conferma'}
        onConfirm={async () => {
          if (!statoConfirm) return
          if (statoConfirm.type === 'staff') {
            await updateStaff(statoConfirm.person.staffId, { confermato: statoConfirm.newStato })
          } else {
            await updateParticipant(statoConfirm.person.participantId, { stato_iscrizione: statoConfirm.newStato })
          }
          setStatoConfirm(null)
        }}
        onCancel={() => setStatoConfirm(null)}
      />
    </div>
  )
}
