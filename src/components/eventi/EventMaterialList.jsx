import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { CatalogBrowser } from '../materiale/CatalogBrowser'
import { MaterialListRow } from './MaterialListRow'
import { RejectMaterialDialog } from './RejectMaterialDialog'

export function EventMaterialList({ event }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCatalog, setShowCatalog] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)

  const addToMaterialList = useMaterialsStore(s => s.addToMaterialList)
  const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)
  const updateMaterialListRow = useMaterialsStore(s => s.updateMaterialListRow)
  const removeMaterialListRow = useMaterialsStore(s => s.removeMaterialListRow)
  const confirmMaterialRow = useMaterialsStore(s => s.confirmMaterialRow)
  const rejectMaterialRow = useMaterialsStore(s => s.rejectMaterialRow)

  const user = useAuthStore(s => s.user)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const canEdit = hasPermission('richiedi_materiale')
  const canApprove = hasPermission('approva_materiale')

  const loadData = async () => {
    setLoading(true)
    const { data } = await fetchEventMaterialList(event.id)
    setRows(data)
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
        const { error } = await removeMaterialListRow(item.dbRowId)
        if (error) errors++
        else changes++
      } else if (item.dbRowId && existingRow) {
        if (item.quantity !== (existingRow.quantita || 1)) {
          // Quantity changed on existing row — update and reset to pending
          const updates = { quantita: item.quantity }
          if (existingRow.stato === 'approvato') updates.stato = 'richiesto'
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
    if (changes > 0) addToast('Lista aggiornata!', 'success')
    setShowCatalog(false)
    loadData()
  }

  // Inline row update — if confirmed row quantity changes, reset to pending
  const handleUpdate = async (id, updates) => {
    const row = rows.find(r => r.id === id)
    if (row?.stato === 'approvato' && updates.quantita) {
      updates.stato = 'richiesto'
    }
    const { error } = await updateMaterialListRow(id, updates)
    if (error) addToast(error, 'error')
    else loadData()
  }

  const handleRemove = async (id) => {
    const { error } = await removeMaterialListRow(id)
    if (error) addToast(error, 'error')
    else { addToast('Rimosso dalla lista', 'success'); loadData() }
  }

  const handleConfirm = async (id) => {
    const { error } = await confirmMaterialRow(id)
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

  if (loading) return <LoadingSkeleton lines={5} />

  const pendingCount = rows.filter(r => r.stato === 'richiesto').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Lista materiale</h2>
        {canEdit && (
          <Button onClick={() => setShowCatalog(!showCatalog)}>
            <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
            {showCatalog ? 'Chiudi catalogo' : 'Aggiungi materiale'}
          </Button>
        )}
      </div>

      {/* Bulk confirm */}
      {canApprove && pendingCount > 1 && (
        <button
          onClick={async () => {
            const pending = rows.filter(r => r.stato === 'richiesto')
            for (const r of pending) await confirmMaterialRow(r.id)
            addToast(`${pending.length} materiali confermati!`, 'success')
            loadData()
          }}
          className="w-full py-3 px-4 bg-green-50 border border-green-200 rounded-xl text-base font-medium text-green-800 hover:bg-green-100 transition-colors min-h-[48px]"
        >
          <Icon icon={ACTION_ICONS.check} size={18} className="inline mr-1" />
          Conferma tutto ({pendingCount} in attesa)
        </button>
      )}

      {/* Catalog browser */}
      {showCatalog && (
        <CatalogBrowser
          existingRows={rows}
          onSave={handleSaveCart}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Material list */}
      {rows.length === 0 && !showCatalog ? (
        <EmptyState
          title="Nessun materiale nella lista"
          description={canEdit ? 'Aggiungi il materiale necessario per questo evento.' : undefined}
        />
      ) : rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <MaterialListRow
              key={row.id}
              row={row}
              canEdit={canEdit}
              canApprove={canApprove}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onConfirm={handleConfirm}
              onReject={(id, name) => setRejectTarget({ id, productName: name })}
              onStartPreparation={handleStartPreparation}
            />
          ))}
        </div>
      ) : null}

      <RejectMaterialDialog
        open={!!rejectTarget}
        productName={rejectTarget?.productName}
        onConfirm={handleReject}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  )
}
