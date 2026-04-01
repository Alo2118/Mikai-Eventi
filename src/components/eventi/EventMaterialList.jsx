import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useActivitiesStore } from '../../hooks/useActivities'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { BulkActionBar } from '../ui/BulkActionBar'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ACTION_ICONS, MATERIALE_ICONS, NAV_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { SUMMARY_BAR_STYLE, CARD_STYLE, INPUT_STYLE, FORM_CONTAINER_STYLE } from '../../lib/constants'
import { useEventsStore } from '../../hooks/useEvents'
import { formatDateRange, formatDate } from '../../lib/date-utils'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { usePackingListStore } from '../../hooks/usePackingList'
import { CatalogBrowser } from '../materiale/CatalogBrowser'
import { MovementHistory } from '../materiale/MovementHistory'
import { MaterialListRow } from './MaterialListRow'
import { RejectMaterialDialog } from './RejectMaterialDialog'
import { ProgressIndicator } from '../ui/ProgressIndicator'

export function EventMaterialList({ event, onShowPackingList, onUpdate }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCatalog, setShowCatalog] = useState(false)
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkPrepping, setBulkPrepping] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [showBulkRejectConfirm, setShowBulkRejectConfirm] = useState(false)
  const [movements, setMovements] = useState([])
  const [availability, setAvailability] = useState({})
  const [packingItems, setPackingItems] = useState([])
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [shippingForm, setShippingForm] = useState({
    corriere: event.spedizione_corriere || '',
    tracking: event.spedizione_tracking || '',
    colli: event.spedizione_colli || '',
    data: event.spedizione_data || '',
    note: event.spedizione_note || '',
  })
  const updateEvent = useEventsStore(s => s.updateEvent)

  const fetchEventMovements = useMaterialsStore(s => s.fetchEventMovements)
  const fetchPackingList = usePackingListStore(s => s.fetchPackingList)
  const fetchBatchAvailability = useMaterialsStore(s => s.fetchBatchAvailability)

  const addToMaterialList = useMaterialsStore(s => s.addToMaterialList)
  const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)
  const updateMaterialListRow = useMaterialsStore(s => s.updateMaterialListRow)
  const removeMaterialListRow = useMaterialsStore(s => s.removeMaterialListRow)
  const confirmMaterialRow = useMaterialsStore(s => s.confirmMaterialRow)
  const rejectMaterialRow = useMaterialsStore(s => s.rejectMaterialRow)
  const restoreGadgetStock = useMaterialsStore(s => s.restoreGadgetStock)

  const instantiateMaterialTemplate = useActivitiesStore(s => s.instantiateMaterialTemplate)

  const user = useAuthStore(s => s.user)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)
  const [applyingTemplate, setApplyingTemplate] = useState(false)

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
    const avail = await fetchBatchAvailability(productIds)
    setAvailability(avail)
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
        if (removedRow) await restoreGadgetStock(removedRow)
        const { error } = await removeMaterialListRow(item.dbRowId)
        if (error) errors++
        else changes++
      } else if (item.dbRowId && existingRow) {
        const qtyChanged = item.quantity !== (existingRow.quantita || 1)
        const noteChanged = (item.note || '') !== (existingRow.note_commerciale || '')
        if (qtyChanged || noteChanged) {
          if (existingRow.stato === 'approvato' && existingRow.quantita_approvata && existingRow.product?.tipo === 'gadget') {
            await restoreGadgetStock(existingRow)
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
        const { data, error } = await addToMaterialList(event.id, productId, user.id)
        if (error) { errors++; continue }
        if (item.quantity > 1 && data) {
          await updateMaterialListRow(data.id, { quantita: item.quantity })
        }
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
      await restoreGadgetStock(row)
      updates.stato = 'richiesto'
      updates.quantita_approvata = null
    }
    const { error } = await updateMaterialListRow(id, updates)
    if (error) addToast(error, 'error')
    else loadData()
  }

  const handleRemove = async (id) => {
    const row = rows.find(r => r.id === id)
    if (row) await restoreGadgetStock(row)
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

  // ── Bulk helpers ──────────────────────────────────────────────
  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(ids) {
    setSelectedIds(prev => {
      if (ids.every(id => prev.has(id))) return new Set()
      return new Set(ids)
    })
  }

  async function handleBulkApprove() {
    setBulkActionLoading(true)
    const ids = [...selectedIds]
    const results = await Promise.all(
      ids.map(id => {
        const row = rows.find(r => r.id === id)
        return confirmMaterialRow(id, row?.quantita || 1)
      })
    )
    const errors = results.filter(r => r.error).length
    setBulkActionLoading(false)
    setSelectedIds(new Set())
    if (errors > 0) {
      addToast(`${ids.length - errors} approvati, ${errors} errori`, 'warning')
    } else {
      addToast(`${ids.length} ${ids.length === 1 ? 'approvato' : 'approvati'}`, 'success')
    }
    loadData()
  }

  async function handleBulkReject() {
    setShowBulkRejectConfirm(false)
    setBulkActionLoading(true)
    const ids = [...selectedIds]
    const results = await Promise.all(ids.map(id => rejectMaterialRow(id, null)))
    const errors = results.filter(r => r.error).length
    setBulkActionLoading(false)
    setSelectedIds(new Set())
    if (errors > 0) {
      addToast(`${ids.length - errors} rifiutati, ${errors} errori`, 'warning')
    } else {
      addToast(`${ids.length} ${ids.length === 1 ? 'rifiutato' : 'rifiutati'}`, 'success')
    }
    loadData()
  }

  if (loading) return <LoadingSkeleton lines={5} />

  const pendingCount = rows.filter(r => r.stato === 'richiesto').length
  const confirmedCount = rows.filter(r => r.stato === 'approvato').length
  const inPrepCount = rows.filter(r => r.stato === 'in_preparazione').length
  const allPrepared = rows.length > 0 && pendingCount === 0 && confirmedCount === 0

  // Packing list derived data
  const packingColliNumbers = [...new Set(packingItems.map(i => i.collo_numero).filter(n => n != null))]
  const packingTotalItems = packingItems.length
  const packingPackedCount = packingItems.filter(i => i.imballato).length
  const allPacked = packingTotalItems > 0 && packingPackedCount === packingTotalItems
  const readyToShip = allPrepared && allPacked && packingColliNumbers.length > 0

  // Group rows by status for workflow
  const groups = [
    { key: 'richiesto', label: 'Da confermare', icon: FEEDBACK_ICONS.warning, color: 'text-yellow-600', rows: rows.filter(r => r.stato === 'richiesto') },
    { key: 'approvato', label: 'Da preparare', icon: MATERIALE_ICONS.package, color: 'text-blue-600', rows: rows.filter(r => r.stato === 'approvato') },
    { key: 'in_preparazione', label: 'In preparazione', icon: ACTION_ICONS.forward, color: 'text-mikai-600', rows: rows.filter(r => r.stato === 'in_preparazione') },
    { key: 'rifiutato', label: 'Rifiutati', icon: ACTION_ICONS.reject, color: 'text-red-500', rows: rows.filter(r => r.stato === 'rifiutato') },
  ].filter(g => g.rows.length > 0)

  return (
    <div className="space-y-6">
      {/* Context header — shipping + deadlines */}
      <div className={SUMMARY_BAR_STYLE + ' space-y-1'}>
        {event.indirizzo_spedizione && (
          <div className="flex items-center gap-2 text-sm text-mikai-700">
            <Icon icon={MATERIALE_ICONS.truck} size={16} className="flex-shrink-0" />
            <span className="font-medium">Spedizione:</span>
            <span>{event.indirizzo_spedizione}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mikai-600">
          <span className="flex items-center gap-1">
            <Icon icon={NAV_ICONS.eventi} size={14} />
            Evento: {formatDateRange(event.data_inizio, event.data_fine)}
          </span>
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
          {event.data_consegna_prevista && (
            <span className="flex items-center gap-1">
              <Icon icon={ACTION_ICONS.check} size={14} />
              Consegna: {formatDate(event.data_consegna_prevista)}
            </span>
          )}
        </div>
      </div>

      {/* Progress + actions */}
      {rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ProgressIndicator label="Confermati" current={confirmedCount + inPrepCount} total={rows.length} color="green" />
          <ProgressIndicator label="In preparazione" current={inPrepCount} total={confirmedCount + inPrepCount || 1} color="mikai" />
          <ProgressIndicator label="Da confermare" current={rows.length - pendingCount} total={rows.length} color={pendingCount > 0 ? 'yellow' : 'green'} />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon icon={MATERIALE_ICONS.package} size={20} className="text-gray-400" />
          Lista materiale
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {onShowPackingList && rows.length > 0 && (
            <Button variant="secondary" size="sm" onClick={onShowPackingList}>
              <Icon icon={NAV_ICONS.checklist} size={16} className="mr-1" />
              Packing list
            </Button>
          )}
          {canEdit && rows.length === 0 && (
            <Button variant="secondary" size="sm" onClick={handleApplyTemplate} loading={applyingTemplate}>
              Applica template
            </Button>
          )}
          {canEdit && (
            <Button onClick={() => setShowCatalog(!showCatalog)}>
              <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
              {showCatalog ? 'Chiudi catalogo' : 'Aggiungi'}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex gap-3 flex-wrap">
        {canApprove && pendingCount > 1 && (
          <Button
            variant="secondary"
            size="sm"
            loading={bulkConfirming}
            onClick={async () => {
              setBulkConfirming(true)
              const pending = rows.filter(r => r.stato === 'richiesto')
              for (const r of pending) await confirmMaterialRow(r.id, r.quantita || 1)
              addToast(`${pending.length} materiali confermati!`, 'success')
              await loadData()
              setBulkConfirming(false)
            }}
            className="bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
          >
            <Icon icon={ACTION_ICONS.check} size={16} className="mr-1" />
            Conferma tutto ({pendingCount})
          </Button>
        )}
        {canApprove && confirmedCount > 1 && (
          <Button
            variant="secondary"
            size="sm"
            loading={bulkPrepping}
            onClick={async () => {
              setBulkPrepping(true)
              const confirmed = rows.filter(r => r.stato === 'approvato')
              for (const r of confirmed) await updateMaterialListRow(r.id, { stato: 'in_preparazione' })
              addToast(`${confirmed.length} materiali in preparazione!`, 'success')
              await loadData()
              setBulkPrepping(false)
            }}
            className="bg-mikai-50 border-mikai-200 text-mikai-700 hover:bg-mikai-100"
          >
            <Icon icon={ACTION_ICONS.forward} size={16} className="mr-1" />
            Avvia preparazione ({confirmedCount})
          </Button>
        )}
      </div>

      {/* Catalog browser */}
      {showCatalog && (
        <CatalogBrowser
          existingRows={rows}
          onSave={handleSaveCart}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Material list — grouped by status */}
      {rows.length === 0 && !showCatalog ? (
        <EmptyState
          title="Nessun materiale nella lista"
          description={canEdit ? 'Aggiungi il materiale necessario per questo evento.' : undefined}
        />
      ) : rows.length > 0 ? (
        <>
          {/* Select-all — only for approvers and when pending rows exist */}
          {canApprove && pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer min-h-[48px] px-1 select-none">
                <input
                  type="checkbox"
                  checked={
                    rows.filter(r => r.stato === 'richiesto').every(r => selectedIds.has(r.id)) &&
                    rows.some(r => r.stato === 'richiesto')
                  }
                  onChange={() => toggleSelectAll(rows.filter(r => r.stato === 'richiesto').map(r => r.id))}
                  className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 cursor-pointer"
                  aria-label="Seleziona tutte le righe da confermare"
                />
                <span className="text-sm text-gray-600 font-medium">Seleziona da confermare</span>
              </label>
            </div>
          )}

          <div className="space-y-4">
            {groups.map(group => {
              const isApprovableGroup = group.key === 'richiesto' && canApprove
              return (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon icon={group.icon} size={16} className={group.color} />
                    <span className={`text-sm font-semibold ${group.color}`}>{group.label} ({group.rows.length})</span>
                  </div>
                  <div className="space-y-3">
                    {group.rows.map((row) => (
                      <div key={row.id} className="flex items-start gap-2">
                        {/* Checkbox — only for pending rows when user can approve */}
                        <div className="flex items-center justify-center min-h-[48px] min-w-[48px] shrink-0 pt-0.5">
                          {isApprovableGroup ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(row.id)}
                              onChange={() => toggleSelect(row.id)}
                              className="w-5 h-5 rounded border-gray-300 text-mikai-500 focus:ring-mikai-400 cursor-pointer"
                              aria-label={`Seleziona: ${row.product?.nome || 'materiale'}`}
                            />
                          ) : (
                            <span className="w-5 h-5" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <MaterialListRow
                            row={row}
                            availability={availability[row.product_id]}
                            canEdit={canEdit}
                            canApprove={canApprove}
                            onUpdate={handleUpdate}
                            onRemove={handleRemove}
                            onConfirm={handleConfirm}
                            onReject={(id, name) => setRejectTarget({ id, productName: name })}
                            onStartPreparation={handleStartPreparation}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : null}

      <RejectMaterialDialog
        open={!!rejectTarget}
        productName={rejectTarget?.productName}
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />

      {/* Bulk reject confirm dialog */}
      <ConfirmDialog
        open={showBulkRejectConfirm}
        title="Rifiuta materiali selezionati"
        message={`Vuoi rifiutare ${selectedIds.size} ${selectedIds.size === 1 ? 'materiale selezionato' : 'materiali selezionati'}?`}
        confirmLabel="Rifiuta"
        onConfirm={handleBulkReject}
        onCancel={() => setShowBulkRejectConfirm(false)}
        danger
      />

      {/* Bulk action bar */}
      {canApprove && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onDeselectAll={() => setSelectedIds(new Set())}
          actions={[
            {
              label: 'Approva',
              icon: ACTION_ICONS.approve,
              variant: 'success',
              loading: bulkActionLoading,
              onClick: handleBulkApprove,
            },
            {
              label: 'Rifiuta',
              icon: ACTION_ICONS.reject,
              variant: 'danger',
              loading: bulkActionLoading,
              onClick: () => setShowBulkRejectConfirm(true),
            },
          ]}
        />
      )}

      {/* Shipping section — event level, driven by packing list data */}
      {rows.length > 0 && (
        <section className="pt-6 border-t border-gray-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Icon icon={MATERIALE_ICONS.truck} size={20} className="text-gray-400" />
              Spedizione
            </h3>
            {canApprove && !event.spedizione_data && !showShippingForm && readyToShip && (
              <Button size="sm" onClick={() => {
                setShippingForm(f => ({ ...f, colli: packingColliNumbers.length }))
                setShowShippingForm(true)
              }}>
                <Icon icon={MATERIALE_ICONS.truck} size={16} className="mr-1" />
                Registra spedizione
              </Button>
            )}
          </div>

          {/* Packing status summary */}
          {!event.spedizione_data && packingTotalItems > 0 && (
            <div className={SUMMARY_BAR_STYLE + ' flex flex-wrap gap-x-4 gap-y-1 text-sm'}>
              <span className="text-mikai-700 font-medium">
                {packingColliNumbers.length > 0 ? `${packingColliNumbers.length} colli` : 'Nessun collo creato'}
              </span>
              <span className="text-mikai-600">{packingPackedCount}/{packingTotalItems} imballati</span>
              {!allPacked && <span className="text-yellow-600 font-medium">Completa l'imballaggio per spedire</span>}
              {allPacked && packingColliNumbers.length === 0 && <span className="text-yellow-600 font-medium">Assegna le voci ai colli</span>}
              {readyToShip && <span className="text-green-600 font-medium">Pronto per la spedizione</span>}
            </div>
          )}
          {!event.spedizione_data && packingTotalItems === 0 && (
            <p className="text-sm text-gray-400">Apri la packing list per preparare i colli</p>
          )}

          {/* Already shipped — display */}
          {event.spedizione_data && !showShippingForm && (
            <div className={CARD_STYLE + ' space-y-2'}>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {event.spedizione_corriere && (
                  <div><span className="text-gray-500">Corriere:</span> <span className="font-medium">{event.spedizione_corriere}</span></div>
                )}
                {event.spedizione_tracking && (
                  <div><span className="text-gray-500">Tracking:</span> <span className="font-medium font-mono">{event.spedizione_tracking}</span></div>
                )}
                {event.spedizione_colli != null && (
                  <div><span className="text-gray-500">Colli:</span> <span className="font-medium">{event.spedizione_colli}</span></div>
                )}
                <div><span className="text-gray-500">Data:</span> <span className="font-medium">{formatDate(event.spedizione_data)}</span></div>
              </div>
              {event.spedizione_note && <p className="text-sm text-gray-600">{event.spedizione_note}</p>}
              {canApprove && (
                <Button variant="ghost" size="sm" onClick={() => setShowShippingForm(true)}>Modifica</Button>
              )}
            </div>
          )}

          {/* Shipping form */}
          {showShippingForm && (
            <div className={FORM_CONTAINER_STYLE + ' space-y-3'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Corriere</label>
                  <input
                    value={shippingForm.corriere}
                    onChange={e => setShippingForm(f => ({ ...f, corriere: e.target.value }))}
                    placeholder="Es. BRT, DHL, GLS..."
                    className={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero tracking</label>
                  <input
                    value={shippingForm.tracking}
                    onChange={e => setShippingForm(f => ({ ...f, tracking: e.target.value }))}
                    placeholder="Codice spedizione"
                    className={INPUT_STYLE}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numero colli</label>
                  <input
                    type="number"
                    min={1}
                    value={shippingForm.colli}
                    onChange={e => setShippingForm(f => ({ ...f, colli: e.target.value }))}
                    className={INPUT_STYLE}
                  />
                  {packingColliNumbers.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">Dalla packing list: {packingColliNumbers.length} colli</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data spedizione</label>
                  <input
                    type="date"
                    value={shippingForm.data}
                    onChange={e => setShippingForm(f => ({ ...f, data: e.target.value }))}
                    className={INPUT_STYLE}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note spedizione</label>
                <input
                  value={shippingForm.note}
                  onChange={e => setShippingForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Es. Fermo deposito, chiamare prima..."
                  className={INPUT_STYLE}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={async () => {
                  const { error } = await updateEvent(event.id, {
                    spedizione_corriere: shippingForm.corriere || null,
                    spedizione_tracking: shippingForm.tracking || null,
                    spedizione_colli: shippingForm.colli ? parseInt(shippingForm.colli) : packingColliNumbers.length || null,
                    spedizione_data: shippingForm.data || null,
                    spedizione_note: shippingForm.note || null,
                  })
                  if (error) addToast(error, 'error')
                  else {
                    addToast('Spedizione registrata', 'success', 6000)
                    setShowShippingForm(false)
                    if (onUpdate) onUpdate()
                  }
                }}>
                  <Icon icon={MATERIALE_ICONS.truck} size={16} className="mr-1" />
                  {event.spedizione_data ? 'Aggiorna spedizione' : 'Registra spedizione'}
                </Button>
                <Button variant="secondary" onClick={() => setShowShippingForm(false)}>Annulla</Button>
              </div>
            </div>
          )}
        </section>
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
    </div>
  )
}
