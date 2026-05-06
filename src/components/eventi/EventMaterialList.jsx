import { useState, useEffect, useMemo } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useActivityTemplatesStore } from '../../hooks/useActivityTemplates'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { useEventsStore } from '../../hooks/useEvents'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { usePackingListStore } from '../../hooks/usePackingList'
import { CatalogBrowser } from '../materiale/CatalogBrowser'
import { MovementHistory } from '../materiale/MovementHistory'
import { PickingPrintView } from '../materiale/PickingPrintView'
import { MAGAZZINO_ICONS } from '../../lib/icons'
import { MaterialListRow } from './MaterialListRow'
import { RejectMaterialDialog } from './RejectMaterialDialog'
import { EventMaterialShipping } from './EventMaterialShipping'
import { SUMMARY_BAR_STYLE, BADGE_BASE, COLOR_BADGE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { useMaterialBulkActions } from './useMaterialBulkActions'
import { ConsumptionReport } from './ConsumptionReport'
import { useProductTypes } from '../../hooks/useProductTypes'

// Section header colors per status group
const SECTION_STYLES = {
  richiesto: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  approvato: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  in_preparazione: { bg: 'bg-mikai-50', text: 'text-mikai-800', border: 'border-mikai-200' },
  spedito: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  rifiutato: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
}

export function EventMaterialList({ event, onShowPackingList, onUpdate }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCatalog, setShowCatalog] = useState(false)
  const [showPicking, setShowPicking] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [rejectTarget, setRejectTarget] = useState(null)
  const [movements, setMovements] = useState([])
  const [availability, setAvailability] = useState({})
  const [stockLocations, setStockLocations] = useState({})
  const [eventZoneId, setEventZoneId] = useState(null)
  const [packingItems, setPackingItems] = useState([])
  const updateEvent = useEventsStore(s => s.updateEvent)

  const fetchEventMovements = useMaterialsStore(s => s.fetchEventMovements)
  const fetchPackingList = usePackingListStore(s => s.fetchPackingList)
  const fetchBatchAvailability = useMaterialsStore(s => s.fetchBatchAvailability)
  const fetchStockByLocation = useMaterialsStore(s => s.fetchStockByLocation)
  const fetchVenueZone = useMaterialsStore(s => s.fetchVenueZone)

  const addToMaterialList = useMaterialsStore(s => s.addToMaterialList)
  const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)
  const updateMaterialListRow = useMaterialsStore(s => s.updateMaterialListRow)
  const removeMaterialListRow = useMaterialsStore(s => s.removeMaterialListRow)
  const confirmMaterialRow = useMaterialsStore(s => s.confirmMaterialRow)
  const rejectMaterialRow = useMaterialsStore(s => s.rejectMaterialRow)
  const restoreGadgetStock = useMaterialsStore(s => s.restoreGadgetStock)
  const reportConsumption = useMaterialsStore(s => s.reportConsumption)
  const registerEventShipping = useMaterialsStore(s => s.registerEventShipping)

  const instantiateMaterialTemplate = useActivityTemplatesStore(s => s.instantiateMaterialTemplate)

  const user = useAuthStore(s => s.user)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const { labels: tipoLabels, colors: tipoColors, icons: tipoIcons } = useProductTypes()

  const closedStates = ['concluso', 'cancellato', 'rifiutato']
  const canEdit = hasPermission('richiedi_materiale') && !closedStates.includes(event.stato)
  const canApprove = hasPermission('approva_materiale')

  const handleApplyTemplate = async () => {
    setApplyingTemplate(true)
    const { data, error } = await instantiateMaterialTemplate(event.id, event.tipo_evento, event.modalita, user.id)
    setApplyingTemplate(false)
    if (error) { addToast(error, 'warning'); return }
    addToast(`Materiale caricato da template (${data.length} prodotti)`, 'success')
    loadData()
  }

  const loadData = async () => {
    setLoading(true)
    const [matRes, movRes, packRes] = await Promise.all([
      fetchEventMaterialList(event.id),
      fetchEventMovements(event.id),
      fetchPackingList(event.id),
    ])
    setRows(matRes.data)
    setMovements(movRes.data)
    setPackingItems(packRes.data || [])
    const productIds = [...new Set((matRes.data || []).map(r => r.product_id).filter(Boolean))]
    const [avail, stockLocs] = await Promise.all([
      fetchBatchAvailability(productIds),
      fetchStockByLocation(productIds),
    ])
    setAvailability(avail)
    setStockLocations(stockLocs.data || {})
    // Fetch venue zone_id if event has a venue
    if (event.venue_id) {
      const zoneId = await fetchVenueZone(event.venue_id)
      if (zoneId) setEventZoneId(zoneId)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [event.id])

  // Cart save: handles new items, quantity updates, removals
  const handleSaveCart = async (cartMap) => {
    let changes = 0
    let errors = 0

    for (const [productId, item] of Object.entries(cartMap)) {
      const existingRow = rows.find(r => r.product_id === productId)

      if (item.quantity === 0 && item.dbRowId) {
        const removedRow = rows.find(r => r.id === item.dbRowId)
        if (removedRow) {
          const stockRes = await restoreGadgetStock(removedRow)
          if (stockRes?.error) { errors++; continue }
        }
        const { error } = await removeMaterialListRow(item.dbRowId)
        if (error) errors++
        else changes++
      } else if (item.dbRowId && existingRow) {
        const qtyChanged = item.quantity !== (existingRow.quantita || 1)
        const noteChanged = (item.note || '') !== (existingRow.note_commerciale || '')
        if (qtyChanged || noteChanged) {
          if (existingRow.stato === 'approvato' && existingRow.quantita_approvata && existingRow.product?.tipo === 'gadget') {
            const stockRes = await restoreGadgetStock(existingRow)
            if (stockRes?.error) { errors++; continue }
          }
          const updates = {}
          if (qtyChanged) {
            updates.quantita = item.quantity
            if (existingRow.stato === 'approvato') updates.stato = 'richiesto'
          }
          if (noteChanged) updates.note_commerciale = item.note
          const { error } = await updateMaterialListRow(item.dbRowId, updates)
          if (error) errors++
          else changes++
        }
      } else if (!item.dbRowId && item.quantity > 0) {
        const { error } = await addToMaterialList(event.id, productId, user.id, item.note, item.quantity)
        if (error) { errors++; continue }
        changes++
      }
    }

    if (errors > 0) addToast(`${errors} errori durante il salvataggio`, 'error')
    if (changes > 0) addToast('Lista materiale aggiornata', 'success')
    setShowCatalog(false)
    loadData()
  }

  // Inline row update — if confirmed/in-prep row quantity changes, reset to pending
  const handleUpdate = async (id, updates) => {
    const row = rows.find(r => r.id === id)
    if ((row?.stato === 'approvato' || row?.stato === 'in_preparazione') && updates.quantita) {
      const stockRes = await restoreGadgetStock(row)
      if (stockRes?.error) { addToast(stockRes.error, 'error'); return }
      updates.stato = 'richiesto'
      updates.quantita_approvata = null
    }
    const { error } = await updateMaterialListRow(id, updates)
    if (error) addToast(error, 'error')
    else loadData()
  }

  const handleRemove = async (id) => {
    const row = rows.find(r => r.id === id)
    if (row) {
      const stockRes = await restoreGadgetStock(row)
      if (stockRes?.error) { addToast(stockRes.error, 'error'); return }
    }
    const { error } = await removeMaterialListRow(id)
    if (error) addToast(error, 'error')
    else { addToast('Rimosso dalla lista', 'success'); loadData() }
  }

  const handleConfirm = async (id, quantitaApprovata, noteUfficio) => {
    const { error } = await confirmMaterialRow(id, quantitaApprovata, noteUfficio)
    if (error) addToast(error, 'error')
    else { addToast('Confermato!', 'success'); loadData() }
  }

  const handleReject = async (motivo) => {
    if (!rejectTarget) return
    const { error } = await rejectMaterialRow(rejectTarget.id, motivo)
    setRejectTarget(null)
    if (error) addToast(error, 'error')
    else { addToast('Rifiutato', 'success'); loadData() }
  }

  const handleStartPreparation = async (id) => {
    const { error } = await updateMaterialListRow(id, { stato: 'in_preparazione' })
    if (error) addToast(error, 'error')
    else { addToast('In preparazione', 'success'); loadData() }
  }

  const handleRevert = async (id) => {
    const row = rows.find(r => r.id === id)
    if (row) {
      const stockRes = await restoreGadgetStock(row)
      if (stockRes?.error) { addToast(stockRes.error, 'error'); return }
    }
    const { error } = await updateMaterialListRow(id, { stato: 'richiesto', quantita_approvata: null, approvato_da: null, data_approvazione: null })
    if (error) addToast(error, 'error')
    else { addToast('Riportato in attesa di conferma', 'success'); loadData() }
  }

  const pendingCount = rows.filter(r => r.stato === 'richiesto').length
  const confirmedCount = rows.filter(r => r.stato === 'approvato').length
  const inPrepCount = rows.filter(r => r.stato === 'in_preparazione').length

  const bulk = useMaterialBulkActions({
    rows, canApprove, pendingCount, confirmedCount,
    confirmMaterialRow, updateMaterialListRow, rejectMaterialRow,
    loadData,
  })

  // Map event_material_id → collo info (numero + imballato) aggregating quantities across multi-collo splits
  const colloByMaterialId = useMemo(() => {
    const map = {}
    for (const p of packingItems) {
      if (!p.event_material_id || p.collo_numero == null) continue
      if (!map[p.event_material_id]) {
        map[p.event_material_id] = { numeri: new Set(), imballatiCount: 0, totalCount: 0 }
      }
      map[p.event_material_id].numeri.add(p.collo_numero)
      map[p.event_material_id].totalCount++
      if (p.imballato) map[p.event_material_id].imballatiCount++
    }
    const result = {}
    for (const [id, info] of Object.entries(map)) {
      const numeri = [...info.numeri].sort((a, b) => a - b)
      result[id] = { numeri, imballato: info.imballatiCount === info.totalCount && info.totalCount > 0 }
    }
    return result
  }, [packingItems])

  if (loading) return <LoadingSkeleton lines={5} />
  const speditoCount = rows.filter(r => r.stato === 'spedito').length
  const allPrepared = rows.length > 0 && pendingCount === 0 && confirmedCount === 0

  // Packing list derived data for readyToShip
  const packingColliNumbers = [...new Set(packingItems.map(i => i.collo_numero).filter(n => n != null))]
  const allPacked = packingItems.length > 0 && packingItems.every(i => i.imballato)
  const readyToShip = allPrepared && allPacked && packingColliNumbers.length > 0 && !event.spedizione_data

  // Group rows by status for workflow
  const groups = [
    { key: 'richiesto', label: 'Da confermare', icon: FEEDBACK_ICONS.warning, color: 'text-yellow-600', rows: rows.filter(r => r.stato === 'richiesto') },
    { key: 'approvato', label: 'Da preparare', icon: MATERIALE_ICONS.package, color: 'text-blue-600', rows: rows.filter(r => r.stato === 'approvato') },
    { key: 'in_preparazione', label: 'In preparazione', icon: ACTION_ICONS.forward, color: 'text-mikai-600', rows: rows.filter(r => r.stato === 'in_preparazione') },
    { key: 'spedito', label: 'Spediti', icon: MATERIALE_ICONS.truck, color: 'text-emerald-600', rows: rows.filter(r => r.stato === 'spedito') },
    { key: 'rifiutato', label: 'Rifiutati', icon: ACTION_ICONS.reject, color: 'text-red-500', rows: rows.filter(r => r.stato === 'rifiutato') },
  ].filter(g => g.rows.length > 0)

  return (
    <div className="space-y-4">
      {/* ── Compact header: info + actions unified ── */}
      <div className={SUMMARY_BAR_STYLE + ' space-y-2'}>
        {/* Row 1: Key info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mikai-600">
          {event.indirizzo_spedizione && (
            <span className="flex items-center gap-1 text-mikai-700 font-medium">
              <Icon icon={MATERIALE_ICONS.truck} size={14} />
              {event.indirizzo_spedizione}
            </span>
          )}
          {event.deadline_preparazione && (
            <span className="flex items-center gap-1">
              <Icon icon={FEEDBACK_ICONS.warning} size={14} />
              Prep. entro: {formatDate(event.deadline_preparazione)}
            </span>
          )}
          {event.data_spedizione_prevista && (
            <span className="flex items-center gap-1">
              <Icon icon={MATERIALE_ICONS.truck} size={14} />
              Sped. entro: {formatDate(event.data_spedizione_prevista)}
            </span>
          )}
        </div>
        {/* Row 2: Counts inline */}
        {rows.length > 0 && (
          <div className="flex items-center gap-3 text-xs font-medium flex-wrap">
            <span className="text-gray-600">{rows.length} materiali</span>
            {pendingCount > 0 && <span className={BADGE_BASE + ' ' + COLOR_BADGE.yellow}>{pendingCount} da confermare</span>}
            {confirmedCount > 0 && <span className={BADGE_BASE + ' ' + COLOR_BADGE.green}>{confirmedCount} confermati</span>}
            {inPrepCount > 0 && <span className={BADGE_BASE + ' ' + COLOR_BADGE.mikai}>{inPrepCount} in preparazione</span>}
            {speditoCount > 0 && <span className={BADGE_BASE + ' ' + COLOR_BADGE.emerald}>{speditoCount} spediti</span>}
          </div>
        )}
      </div>

      {/* ── Toolbar: title + actions ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon icon={MATERIALE_ICONS.package} size={20} className="text-gray-400" />
          Lista materiale
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && rows.length === 0 && (
            <Button variant="secondary" size="sm" onClick={handleApplyTemplate} loading={applyingTemplate}>Template</Button>
          )}
          {rows.some(r => ['approvato', 'in_preparazione'].includes(r.stato)) && (
            <Button variant="secondary" size="sm" onClick={() => setShowPicking(true)}>
              <Icon icon={MAGAZZINO_ICONS.stampa} size={16} className="mr-1" />
              Stampa picking
            </Button>
          )}
          {canEdit && !showCatalog && (
            <Button size="sm" onClick={() => setShowCatalog(true)}>
              <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
              Aggiungi
            </Button>
          )}
        </div>
      </div>

      {/* Bulk action bar — sticky, compact */}
      {!showCatalog && canApprove && pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 sticky top-0 z-10 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold text-yellow-800 flex items-center gap-1.5">
            <Icon icon={FEEDBACK_ICONS.warning} size={14} className="text-yellow-600" />
            {pendingCount} da confermare
          </span>
          <div className="flex items-center gap-2">
            {bulk.selectedIds.size > 0 && (
              <Button variant="danger" size="sm" onClick={() => bulk.showRejectSelected()}>
                Rifiuta ({bulk.selectedIds.size})
              </Button>
            )}
            {bulk.renderConfirmAllButton()}
          </div>
        </div>
      )}

      {/* Catalog browser */}
      {showCatalog && (
        <CatalogBrowser
          existingRows={rows}
          onSave={handleSaveCart}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Material list — hidden when catalog is open */}
      {showCatalog ? null : rows.length === 0 ? (
        <EmptyState
          title="Nessun materiale nella lista"
          description={canEdit ? 'Aggiungi il materiale necessario per questo evento.' : undefined}
        />
      ) : rows.length > 0 ? (
        <div className="space-y-3">
          {groups.map(group => {
            const isApprovableGroup = group.key === 'richiesto' && canApprove
            const sectionStyle = SECTION_STYLES[group.key] || SECTION_STYLES.richiesto
            const isCollapsed = collapsedSections.has(group.key)

            return (
              <div key={group.key}>
                {/* Colored section header — collapsible */}
                <button
                  onClick={() => setCollapsedSections(prev => {
                    const next = new Set(prev)
                    if (next.has(group.key)) next.delete(group.key)
                    else next.add(group.key)
                    return next
                  })}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg font-medium text-sm cursor-pointer select-none transition-colors ${sectionStyle.bg} ${sectionStyle.text} border ${sectionStyle.border}`}
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex items-center gap-2">
                    <Icon icon={group.icon} size={16} />
                    <span>{group.label} ({group.rows.length})</span>
                    {/* Select-all checkbox for pending group */}
                    {isApprovableGroup && !isCollapsed && (
                      <label
                        className="flex items-center gap-1.5 ml-3 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={
                            group.rows.every(r => bulk.selectedIds.has(r.id)) &&
                            group.rows.length > 0
                          }
                          onChange={() => bulk.toggleSelectAll(group.rows.map(r => r.id))}
                          className="w-4 h-4 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 cursor-pointer"
                          aria-label="Seleziona tutte le righe da confermare"
                        />
                        <span className="text-xs font-normal opacity-75">Seleziona tutto</span>
                      </label>
                    )}
                  </div>
                  <Icon
                    icon={isCollapsed ? ACTION_ICONS.chevronDown : ACTION_ICONS.chevronUp}
                    size={16}
                    className="opacity-60"
                  />
                </button>

                {/* Bulk prep button for confirmed group */}
                {group.key === 'approvato' && !isCollapsed && bulk.renderPrepAllButton()}

                {/* Section content */}
                {!isCollapsed && (
                  <div className="space-y-3 mt-3">
                    {group.rows.map((row) => (
                      <div key={row.id} className={`flex items-start ${isApprovableGroup ? 'gap-2' : ''}`}>
                        {/* Checkbox — only for pending rows */}
                        {isApprovableGroup && (
                          <div className="flex items-center justify-center min-h-[48px] min-w-[48px] shrink-0 pt-0.5">
                            <input
                              type="checkbox"
                              checked={bulk.selectedIds.has(row.id)}
                              onChange={() => bulk.toggleSelect(row.id)}
                              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 cursor-pointer"
                              aria-label={`Seleziona: ${row.product?.nome || 'materiale'}`}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <MaterialListRow
                            row={row}
                            availability={availability[row.product_id]}
                            stockLocations={stockLocations[row.product_id] || []}
                            eventZoneId={eventZoneId}
                            collo={colloByMaterialId[row.id]}
                            eventSpedizioneData={event.spedizione_data}
                            eventTracking={event.spedizione_tracking}
                            canEdit={canEdit}
                            canApprove={canApprove}
                            tipoLabels={tipoLabels}
                            tipoColors={tipoColors}
                            tipoIcons={tipoIcons}
                            onUpdate={handleUpdate}
                            onRemove={handleRemove}
                            onConfirm={handleConfirm}
                            onReject={(id, name) => setRejectTarget({ id, productName: name })}
                            onStartPreparation={handleStartPreparation}
                            onRevert={handleRevert}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}

      <RejectMaterialDialog
        open={!!rejectTarget}
        productName={rejectTarget?.productName}
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Bulk action bar + reject dialog */}
      {bulk.renderBulkBar()}

      {/* Shipping section — event level, driven by packing list data */}
      {rows.length > 0 && (
        <EventMaterialShipping
          event={event}
          packingItems={packingItems}
          readyToShip={readyToShip}
          canApprove={canApprove}
          onShowPackingList={onShowPackingList}
          allPrepared={allPrepared}
          pendingCount={pendingCount}
          confirmedCount={confirmedCount}
          inPrepCount={inPrepCount}
          speditoCount={speditoCount}
          onSaveShipping={async (shippingData) => {
            // 1. Save event-level shipping fields
            const { error: eventError } = await updateEvent(event.id, shippingData)
            if (eventError) { addToast(eventError, 'error'); return { ok: false } }

            // 2. Create movements + update material states (only on first registration)
            if (!event.spedizione_data) {
              const { error: shipError, movementsCreated } = await registerEventShipping(event.id, shippingData)
              if (shipError) { addToast(shipError, 'error'); return { ok: false } }
              addToast(`Spedizione registrata — ${movementsCreated || 0} movimenti creati`, 'success', 6000)
            } else {
              addToast('Spedizione aggiornata', 'success')
            }

            loadData()
            if (onUpdate) onUpdate()
            return { ok: true }
          }}
        />
      )}

      {/* Movements */}
      {movements.length > 0 && (
        <section className="pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Icon icon={MATERIALE_ICONS.uscita} size={20} className="text-gray-400" />
            Movimenti
          </h3>
          <MovementHistory movements={movements} />
        </section>
      )}

      {/* Picking print view (fullscreen overlay) */}
      {showPicking && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto">
          <PickingPrintView
            event={event}
            rows={rows}
            onClose={() => setShowPicking(false)}
          />
        </div>
      )}
    </div>
  )
}
