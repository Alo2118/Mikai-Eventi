import { useEffect, useState, useMemo } from 'react'
import { useLogisticsStore } from '../../hooks/useLogistics'
import { useStaffStore } from '../../hooks/useStaff'
import { useParticipantsStore } from '../../hooks/useParticipants'
import { useAuthStore } from '../../hooks/useAuth'
import { useTavoliStore } from '../../hooks/useTavoli'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import {
  STATO_ISCRIZIONE, MEZZO_TRASPORTO,
  RUOLO_EVENTO, TIPO_PARTECIPANTE, TIPO_CONTATTO,
  SELECT_STYLE, FORM_CONTAINER_STYLE, SUMMARY_BAR_STYLE, GROUP_HEADING_STYLE,
  BADGE_BASE, COLOR_BADGE, TAVOLO_COLORI,
} from '../../lib/constants'
import { ACTION_ICONS, NAV_ICONS, LOGISTICA_PERSONE_ICONS, TAVOLI_ICONS } from '../../lib/icons'
import { ContactPicker } from '../contatti/ContactPicker'
import { BulkImportModal } from '../contatti/BulkImportModal'
import { TavoloModal, HotelModal, TrasportoModal } from './LogisticaBulkModals'
import { PersonDetailModal } from './PersonDetailModal'
import { EventChecklistView } from './EventChecklistView'
import { EventLogisticaEventTimeline } from './EventLogisticaEventTimeline'
import { LogisticaAlertsBar, computeAlerts } from './LogisticaAlertsBar'
import { MoreMenu, StaffPicker } from './LogisticaPickers'
import { LogisticaPeopleFilters } from './LogisticaPeopleFilters'
import { LogisticaPersonRow } from './LogisticaPersonRow'
import { LogisticaPersonCard } from './LogisticaPersonCard'
import { CateringSummary } from './CateringSummary'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { SearchInput } from '../ui/SearchInput'
import { formatTime, formatDateShort } from '../../lib/date-utils'
import { formatCurrency } from '../../lib/format-utils'
import { exportToExcel } from '../../lib/export-utils'
import { personKey, getPersonTavolo, sortLegs } from '../../lib/logistics-utils'
import { useEventTypes } from '../../hooks/useEventTypes'
import { richiedeHotel, richiedeTrasporti, usaTavoli } from '../../lib/event-flow'

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
  const checkStaffConflict = useStaffStore(s => s.checkStaffConflict)
  const fetchStaffConflicts = useStaffStore(s => s.fetchStaffConflicts)

  const participants = useParticipantsStore(s => s.participants)
  const fetchEventParticipants = useParticipantsStore(s => s.fetchEventParticipants)
  const addParticipant = useParticipantsStore(s => s.addParticipant)
  const updateParticipant = useParticipantsStore(s => s.updateParticipant)
  const removeParticipant = useParticipantsStore(s => s.removeParticipant)
  const bulkUpdateStatoIscrizione = useParticipantsStore(s => s.bulkUpdateStatoIscrizione)

  const hasPermission = useAuthStore(s => s.hasPermission)
  const canEdit = hasPermission('gestione_logistica')
  const canEditStaff = hasPermission('gestione_staff_evento')
  const canEditPart = hasPermission('gestione_contatti') || hasPermission('gestione_staff_evento')
  const addToast = useToastStore(s => s.add)

  const tavoli = useTavoliStore(s => s.tavoli)
  const fetchEventTavoli = useTavoliStore(s => s.fetchEventTavoli)
  const distributeDiscenti = useTavoliStore(s => s.distributeDiscenti)

  const [selected, setSelected] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState(null)
  const [activeFilters, setActiveFilters] = useState(new Set())
  const [activeModal, setActiveModal] = useState(null)
  const [singleEdit, setSingleEdit] = useState(null)

  const [staffForm, setStaffForm] = useState(null)
  const [staffConflictGate, setStaffConflictGate] = useState(null)
  const [staffConflicts, setStaffConflicts] = useState([])
  const [partForm, setPartForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showImport, setShowImport] = useState(false)
  const [checklistMode, setChecklistMode] = useState(false)
  const [viewMode, setViewMode] = useState('lista')
  const [exporting, setExporting] = useState(false)
  const [statoConfirm, setStatoConfirm] = useState(null)
  const [bulkStatoConfirm, setBulkStatoConfirm] = useState(null)

  const { eventTypes } = useEventTypes()
  const eventType = useMemo(() => eventTypes.find(t => t.codice === event.tipo_evento) || null, [eventTypes, event.tipo_evento])
  const hasTavoli = usaTavoli(eventType)
  const hotelEnabled = richiedeHotel(eventType)
  const trasportiEnabled = richiedeTrasporti(eventType)

  useEffect(() => {
    fetchEventStaff(event.id)
    fetchEventParticipants(event.id)
    fetchEventLogistics(event.id)
    if (hasTavoli) fetchEventTavoli(event.id)
  }, [event.id])

  const doAddStaff = async () => {
    const { error } = await addStaff(event.id, staffForm.userId, staffForm.ruolo)
    if (error) { addToast(error || 'Non è stato possibile aggiungere lo staff. Riprova.', 'error'); return }
    addToast('Staff aggiunto', 'success')
    setStaffForm(null)
    setStaffConflictGate(null)
  }

  // Gate non bloccante: se la persona è già staff di un altro evento negli stessi giorni,
  // chiediamo conferma esplicita (a volte è legittimo) invece di procedere alla cieca.
  const handleAddStaff = async () => {
    if (!staffForm?.userId || !staffForm?.ruolo) return
    const usageWindow = { start: event.data_inizio, end: event.data_fine }
    const { data: conflict } = await checkStaffConflict(staffForm.userId, { window: usageWindow, excludeEventId: event.id })
    if (conflict?.hasConflict) {
      const u = users.find(x => x.id === staffForm.userId)
      const nome = u ? `${u.nome || ''} ${u.cognome || ''}`.trim() : 'Questa persona'
      setStaffConflictGate({ nome, eventi: conflict.eventi })
      return
    }
    doAddStaff()
  }

  const handleAddParticipant = async () => {
    if (!partForm?.contact || !partForm?.tipo) return
    const { error } = await addParticipant(event.id, partForm.contact.id, partForm.tipo)
    if (error) { addToast(error || 'Non è stato possibile aggiungere il partecipante. Riprova.', 'error'); return }
    addToast('Partecipante aggiunto', 'success')
    setPartForm(null)
  }

  const people = useMemo(() => [
    ...staff.map(s => ({
      type: 'staff', id: s.user_id, staffId: s.id,
      nome: s.user?.nome, cognome: s.user?.cognome,
      ruolo: s.ruolo_evento, confermato: s.confermato, note: s.note,
      // Esigenze per-evento con fallback al master SOLO se mai impostate (null): '' = azzerate per l'evento
      esigenze_alimentari: s.esigenze_alimentari_evento ?? s.user?.esigenze_alimentari,
      esigenze_accessibilita: s.esigenze_accessibilita_evento ?? s.user?.esigenze_accessibilita,
      costo_pasti: s.costo_pasti,
    })),
    ...participants.map(p => ({
      type: 'participant', id: p.contact_id, participantId: p.id,
      nome: p.contact?.nome, cognome: p.contact?.cognome,
      tipo_contatto: p.contact?.tipo_contatto,
      ruolo: p.tipo, statoIscrizione: p.stato_iscrizione, note: p.note,
      zona: p.contact?.zona?.nome || p.contact?.citta || null,
      esigenze_alimentari: p.esigenze_alimentari_evento ?? p.contact?.esigenze_alimentari,
      esigenze_accessibilita: p.esigenze_accessibilita_evento ?? p.contact?.esigenze_accessibilita,
      costo_pasti: p.costo_pasti,
    })),
  ].sort((a, b) => (a.cognome || '').localeCompare(b.cognome || '', 'it') || (a.nome || '').localeCompare(b.nome || '', 'it'))
  , [staff, participants])

  const hotelMap = useMemo(() => {
    const m = new Map()
    for (const h of hotels) m.set(`staff-${h.user_id}`, h).set(`participant-${h.contact_id}`, h)
    return m
  }, [hotels])
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

  const { confirmedCount, withHotel, withFullTransport } = useMemo(() => ({
    confirmedCount: staff.filter(s => s.confermato).length +
      participants.filter(p => ['confermato', 'presente'].includes(p.stato_iscrizione)).length,
    withHotel: people.filter(p => getHotel(p)).length,
    withFullTransport: people.filter(p => getAndata(p).length > 0 && getRitorno(p).length > 0).length,
  }), [people, staff, participants, hotelMap, andataMap, ritornoMap])

  const FILTER_OPTIONS = useMemo(() => [
    { id: 'invitati', label: 'Invitati', count: participants.filter(p => p.stato_iscrizione === 'invitato').length, filter: p => p.type === 'participant' && p.statoIscrizione === 'invitato' },
    { id: 'confermati', label: 'Confermati', count: confirmedCount, filter: p => (p.type === 'staff' && p.confermato) || (p.type === 'participant' && ['confermato', 'presente'].includes(p.statoIscrizione)) },
    ...(hotelEnabled ? [{ id: 'no_hotel', label: 'Senza hotel', count: people.length - withHotel, filter: p => !getHotel(p) }] : []),
    ...(trasportiEnabled ? [{ id: 'no_trasporto', label: 'Senza trasporto', count: people.length - withFullTransport, filter: p => !getAndata(p).length || !getRitorno(p).length }] : []),
  ], [participants, people, confirmedCount, withHotel, withFullTransport, hotelMap, andataMap, ritornoMap, hotelEnabled, trasportiEnabled])

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

  // Bundle condivisi da tutte le righe/card persona (permessi + handler)
  const personPerms = { canEdit, canEditStaff, canEditPart }
  const personActions = {
    onToggleSelect: toggleSelect,
    onSetStatoConfirm: setStatoConfirm,
    onSetSingleEdit: setSingleEdit,
    onSetDeleting: setDeleting,
  }

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

  // Conflitti staff cross-evento (doppia prenotazione persona su eventi sovrapposti).
  // Sola lettura, best-effort: alimenta la barra avvisi. Simmetrico al conflitto materiale.
  // Chiave stabile sui MEMBRI: note/ruolo/conferma/esigenze non ri-eseguono il check (solo add/remove).
  const staffKey = useMemo(() => staff.map(s => s.user_id).sort().join(','), [staff])
  useEffect(() => {
    let cancelled = false
    if (staff.length === 0) { setStaffConflicts([]); return }
    const run = async () => {
      const usageWindow = { start: event.data_inizio, end: event.data_fine }
      const { data: map } = await fetchStaffConflicts(staff.map(s => s.user_id), usageWindow, event.id)
      if (cancelled || !map) return
      const list = staff
        .filter(s => map[s.user_id]?.length)
        .map(s => ({ nome: s.user?.nome, cognome: s.user?.cognome, eventi: map[s.user_id] }))
      setStaffConflicts(list)
    }
    run()
    return () => { cancelled = true }
  }, [staffKey, event.id, event.data_inizio, event.data_fine])

  const alerts = useMemo(() => {
    const base = computeAlerts(event, people, hotels, trasporti, staff, getHotel, getAndata, { hotelEnabled, trasportiEnabled })
    const conflictAlerts = staffConflicts.map(c => ({
      type: 'warning',
      text: `${`${c.cognome || ''} ${c.nome || ''}`.trim() || 'Una persona'} è già staff di ${c.eventi.map(e => e.titolo).join(', ')} negli stessi giorni`,
    }))
    return [...conflictAlerts, ...base]
  }, [event, people, hotels, trasporti, staff, hotelMap, andataMap, hotelEnabled, trasportiEnabled, staffConflicts])

  const handleModalDone = () => {
    setActiveModal(null)
    setSelected(new Set())
    fetchEventLogistics(event.id)
    if (hasTavoli) fetchEventTavoli(event.id)
  }

  const requestBulkStato = (nuovoStato) => {
    const partIds = selectedPeople
      .filter(p => p.type === 'participant')
      .map(p => p.participantId)
    if (partIds.length === 0) {
      addToast('Seleziona almeno un partecipante (lo staff non ha iscrizione)', 'error')
      return
    }
    const hasStaff = selectedPeople.some(p => p.type === 'staff')
    setBulkStatoConfirm({ nuovoStato, partIds, hasStaff })
  }

  const handleBulkStato = async () => {
    if (!bulkStatoConfirm) return
    const { nuovoStato, partIds, hasStaff } = bulkStatoConfirm
    const { error, updated, requested } = await bulkUpdateStatoIscrizione(partIds, nuovoStato)
    setBulkStatoConfirm(null)
    if (error) { addToast('Non è stato possibile aggiornare lo stato. Riprova.', 'error'); return }
    if (updated < requested) {
      addToast(`Aggiornati ${updated} di ${requested} — alcuni non modificabili con i tuoi permessi`, 'warning')
    } else {
      const parola = nuovoStato === 'confermato'
        ? (updated === 1 ? 'confermato' : 'confermati')
        : (updated === 1 ? 'segnato come invitato' : 'segnati come invitati')
      const nota = hasStaff ? ' (lo staff selezionato non è coinvolto)' : ''
      addToast(`${updated} ${updated === 1 ? 'partecipante' : 'partecipanti'} ${parola}${nota}`, 'success')
    }
    setSelected(new Set())
  }

  const handleDistribuisci = async () => {
    const { error } = await distributeDiscenti(event.id)
    if (error) addToast(error, 'error')
    else addToast('Discenti distribuiti ai tavoli', 'success')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const columns = [
        { label: 'Cognome', key: 'cognome', width: 20 },
        { label: 'Nome', key: 'nome', width: 20 },
        { label: 'Tipo', key: 'tipo', width: 15, format: (_, row) => row.type === 'staff' ? 'Staff' : 'Partecipante' },
        { label: 'Tipo contatto', key: 'tipo_contatto', width: 15, format: v => TIPO_CONTATTO[v] || '' },
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
        { label: 'Esigenze accessibilità', key: 'esigenze_accessibilita', width: 25 },
        { label: 'Costo pasti', key: 'costo_pasti', width: 14, format: v => v != null ? formatCurrency(v) : '' },
      ]
      const title = (event.titolo || 'evento').replace(/[^a-zA-Z0-9àèéìòù ]/g, '').trim().replace(/ +/g, '_')
      await exportToExcel({ columns, rows: people, filename: `Persone_${title}`, sheetName: 'Persone' })
      addToast('Esportazione completata', 'success')
    } catch {
      addToast('Non è stato possibile esportare. Riprova.', 'error')
    }
    setExporting(false)
  }

  const handleNoteSave = async (person, note) => {
    const { error } = person.type === 'staff'
      ? await updateStaff(person.staffId, { note })
      : await updateParticipant(person.participantId, { note })
    if (error) addToast('Non è stato possibile salvare la nota. Riprova.', 'error')
  }

  const handleRoleSave = async (person, newRuolo) => {
    if (person.type === 'staff') {
      const { error } = await updateStaff(person.staffId, { ruolo_evento: newRuolo })
      if (error) return addToast('Non è stato possibile salvare il ruolo. Riprova.', 'error')
      await fetchEventStaff(event.id)
    } else {
      const { error } = await updateParticipant(person.participantId, { tipo: newRuolo })
      if (error) return addToast('Non è stato possibile salvare il ruolo. Riprova.', 'error')
      await fetchEventParticipants(event.id)
    }
    addToast('Ruolo aggiornato', 'success')
  }

  // Scrive le esigenze sulle colonne PER-EVENTO (event_participants / event_staff),
  // non più sul profilo master del contatto/utente. `updates` arriva dal modal con
  // { esigenze_alimentari, esigenze_accessibilita, costo_pasti }.
  const handleEsigenzeSave = async (person, updates) => {
    const payload = {
      esigenze_alimentari_evento: updates.esigenze_alimentari,
      esigenze_accessibilita_evento: updates.esigenze_accessibilita,
    }
    if ('costo_pasti' in updates) payload.costo_pasti = updates.costo_pasti
    if (person.type === 'participant') {
      const { error } = await updateParticipant(person.participantId, payload)
      if (error) return addToast('Non è stato possibile salvare le esigenze. Riprova.', 'error')
    } else {
      const { error } = await updateStaff(person.staffId, payload)
      if (error) return addToast('Non è stato possibile salvare le esigenze. Riprova.', 'error')
    }
    addToast('Esigenze aggiornate', 'success')
  }

  if (loading || staffLoading) return <LoadingSkeleton lines={5} />
  if (logisticsError) return <div role="alert"><EmptyState title="Errore nel caricamento" description="Non siamo riusciti a caricare i dati logistica." /></div>

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

      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-lg flex-shrink-0">Persone</h3>
        {people.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium flex-shrink-0">
            <span className={BADGE_BASE + ' ' + COLOR_BADGE.gray}>{people.length}</span>
            <span className={BADGE_BASE + ' ' + COLOR_BADGE.green}>{confirmedCount} conf.</span>
            {hotelEnabled && <span className={BADGE_BASE + ' ' + COLOR_BADGE.blue}>{withHotel} hotel</span>}
            {trasportiEnabled && <span className={BADGE_BASE + ' ' + COLOR_BADGE.purple}>{withFullTransport} trasporti</span>}
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
            <Button onClick={handleAddStaff} disabled={!staffForm.userId} title={!staffForm.userId ? 'Seleziona prima una persona' : ''}>Aggiungi</Button>
            <Button variant="ghost" onClick={() => setStaffForm(null)}>Annulla</Button>
          </div>
        </div>
      )}

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
            <Button onClick={handleAddParticipant} disabled={!partForm.contact} title={!partForm.contact ? 'Seleziona prima un contatto' : ''}>Aggiungi</Button>
            <Button variant="ghost" onClick={() => setPartForm(null)}>Annulla</Button>
          </div>
        </div>
      )}

      {people.length > 0 && (
        <LogisticaPeopleFilters
          groupBy={groupBy} setGroupBy={setGroupBy} hasTavoli={hasTavoli}
          filterOptions={FILTER_OPTIONS}
          activeFilters={activeFilters} toggleFilter={toggleFilter}
          clearFilters={() => setActiveFilters(new Set())}
        />
      )}

      {people.length > 0 && <CateringSummary people={people} />}

      {canEdit && selected.size > 0 && (
        <div className={SUMMARY_BAR_STYLE + ' flex items-center gap-3 flex-wrap'}>
          <span className="text-sm font-medium text-mikai-700">{selected.size} selezionati</span>
          <div className="flex gap-3 ml-auto flex-wrap">
            {selectedPeople.some(p => p.type === 'participant') && (
              <>
                <Button variant="secondary" size="sm" onClick={() => requestBulkStato('confermato')}>
                  <Icon icon={ACTION_ICONS.check} size={16} className="mr-1" />
                  Conferma selezionati
                </Button>
                <Button variant="secondary" size="sm" onClick={() => requestBulkStato('invitato')}>
                  <Icon icon={ACTION_ICONS.refresh} size={16} className="mr-1" />
                  Segna come invitati
                </Button>
              </>
            )}
            {hasTavoli && tavoli.length > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setActiveModal('tavolo')}>
                <Icon icon={TAVOLI_ICONS.tavoli} size={16} className="mr-1" />
                Imposta tavolo
              </Button>
            )}
            {hotelEnabled && (
              <Button variant="secondary" size="sm" onClick={() => setActiveModal('hotel')}>
                <Icon icon={LOGISTICA_PERSONE_ICONS.hotel} size={16} className="mr-1" />
                Imposta hotel
              </Button>
            )}
            {trasportiEnabled && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setActiveModal('andata')}>
                  <Icon icon={ACTION_ICONS.forward} size={16} className="mr-1" />
                  Imposta andata
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setActiveModal('ritorno')}>
                  <Icon icon={ACTION_ICONS.back} size={16} className="mr-1" />
                  Imposta ritorno
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {people.length === 0 && <EmptyState title="Nessuna persona" description="Aggiungi staff o partecipanti con i bottoni sopra" />}

      {viewMode === 'timeline' && people.length > 0 && (
        <EventLogisticaEventTimeline event={event} hotels={hotels} trasporti={trasporti} people={people} />
      )}

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
                {group.people.map(person => (
                  <LogisticaPersonRow
                    key={personKey(person)}
                    person={person}
                    logistics={{ hotel: getHotel(person), andata: getAndata(person), ritorno: getRitorno(person), tavoli }}
                    hasTavoli={hasTavoli}
                    selected={selected.has(personKey(person))}
                    perms={personPerms}
                    actions={personActions}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {canEdit && gi === 0 && (
              <label className="flex items-center gap-2 p-2 min-h-[48px]">
                <input type="checkbox" checked={selected.size === filteredPeople.length && filteredPeople.length > 0} onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400" />
                <span className="text-sm text-gray-500">Seleziona tutti</span>
              </label>
            )}
            {group.people.map(person => (
              <LogisticaPersonCard
                key={personKey(person)}
                person={person}
                logistics={{ hotel: getHotel(person), andata: getAndata(person), ritorno: getRitorno(person), tavoli }}
                hasTavoli={hasTavoli}
                selected={selected.has(personKey(person))}
                perms={personPerms}
                actions={personActions}
              />
            ))}
          </div>
        </div>
      ))}

      {activeModal === 'tavolo' && <TavoloModal selectedPeople={selectedPeople} eventId={event.id} tavoli={tavoli} onDone={handleModalDone} onClose={() => setActiveModal(null)} />}
      {activeModal === 'hotel' && <HotelModal selectedPeople={selectedPeople} eventId={event.id} onDone={handleModalDone} onClose={() => setActiveModal(null)} />}
      {activeModal === 'andata' && <TrasportoModal selectedPeople={selectedPeople} eventId={event.id} direzione="andata" onDone={handleModalDone} onClose={() => setActiveModal(null)} />}
      {activeModal === 'ritorno' && <TrasportoModal selectedPeople={selectedPeople} eventId={event.id} direzione="ritorno" onDone={handleModalDone} onClose={() => setActiveModal(null)} />}

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
          onSaveRole={handleRoleSave}
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
          const orphanKey = deleting.type === 'staff' ? 'user_id' : 'contact_id'
          const orphanedHotels = hotels.filter(h => h[orphanKey] === deleting.personId)
          const orphanedTrasporti = trasporti.filter(t => t[orphanKey] === deleting.personId)
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
          const { error } = statoConfirm.type === 'staff'
            ? await updateStaff(statoConfirm.person.staffId, { confermato: statoConfirm.newStato })
            : await updateParticipant(statoConfirm.person.participantId, { stato_iscrizione: statoConfirm.newStato })
          setStatoConfirm(null)
          if (error) addToast('Non è stato possibile aggiornare lo stato. Riprova.', 'error')
        }}
        onCancel={() => setStatoConfirm(null)}
      />

      <ConfirmDialog
        open={!!staffConflictGate}
        title="Persona già impegnata"
        message={staffConflictGate
          ? (
            <span>
              <strong>{staffConflictGate.nome}</strong> è già staff di{' '}
              <strong>{staffConflictGate.eventi.map(e => e.titolo).join(', ')}</strong>{' '}
              negli stessi giorni. Aggiungere comunque?
            </span>
          )
          : ''}
        confirmLabel="Aggiungi comunque"
        onConfirm={doAddStaff}
        onCancel={() => setStaffConflictGate(null)}
      />

      <ConfirmDialog
        open={!!bulkStatoConfirm}
        title="Cambia stato conferma"
        message={bulkStatoConfirm
          ? `Confermi ${bulkStatoConfirm.partIds.length} ${bulkStatoConfirm.partIds.length === 1 ? 'partecipante' : 'partecipanti'} come "${STATO_ISCRIZIONE[bulkStatoConfirm.nuovoStato]}"?`
          : ''}
        confirmLabel={bulkStatoConfirm ? STATO_ISCRIZIONE[bulkStatoConfirm.nuovoStato] : 'Conferma'}
        onConfirm={handleBulkStato}
        onCancel={() => setBulkStatoConfirm(null)}
      />
    </div>
  )
}
