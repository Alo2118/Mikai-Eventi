import { useState } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { BulkActionBar } from '../ui/BulkActionBar'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ACTION_ICONS } from '../../lib/icons'
import { useToastStore } from '../ui/Toast'

export function useMaterialBulkActions({
  rows, canApprove, pendingCount, confirmedCount,
  confirmMaterialRow, updateMaterialListRow, rejectMaterialRow,
  loadData,
}) {
  const addToast = useToastStore(s => s.add)
  const [bulkConfirming, setBulkConfirming] = useState(false)
  const [bulkPrepping, setBulkPrepping] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [showBulkRejectConfirm, setShowBulkRejectConfirm] = useState(false)
  const [bulkRejectMotivo, setBulkRejectMotivo] = useState('')

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
    const results = await Promise.all(ids.map(id => rejectMaterialRow(id, bulkRejectMotivo || 'Rifiutato in blocco')))
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

  return {
    selectedIds, toggleSelect, toggleSelectAll,
    showRejectSelected: () => setShowBulkRejectConfirm(true),
    renderConfirmAllButton: () => (
      canApprove && pendingCount > 0 ? (
        <Button
          size="sm"
          loading={bulkConfirming}
          onClick={async () => {
            setBulkConfirming(true)
            const pending = rows.filter(r => r.stato === 'richiesto')
            const results = await Promise.all(pending.map(r => confirmMaterialRow(r.id, r.quantita || 1)))
            const errors = results.filter(r => r.error).length
            if (errors > 0) {
              addToast(`${pending.length - errors} confermati, ${errors} errori`, 'warning')
            } else {
              addToast(`${pending.length} materiali confermati!`, 'success')
            }
            await loadData()
            setBulkConfirming(false)
          }}
        >
          <Icon icon={ACTION_ICONS.check} size={16} className="mr-1" />
          Conferma tutto ({pendingCount})
        </Button>
      ) : null
    ),
    renderPrepAllButton: () => (
      canApprove && confirmedCount > 1 ? (
        <Button
          variant="secondary"
          size="sm"
          loading={bulkPrepping}
          onClick={async () => {
            setBulkPrepping(true)
            const confirmed = rows.filter(r => r.stato === 'approvato')
            await Promise.all(confirmed.map(r => updateMaterialListRow(r.id, { stato: 'in_preparazione' })))
            addToast(`${confirmed.length} materiali in preparazione!`, 'success')
            await loadData()
            setBulkPrepping(false)
          }}
          className="bg-mikai-50 border-mikai-200 text-mikai-700 hover:bg-mikai-100"
        >
          <Icon icon={ACTION_ICONS.forward} size={16} className="mr-1" />
          Avvia preparazione ({confirmedCount})
        </Button>
      ) : null
    ),
    renderBulkBar: () => canApprove ? (
      <>
        <ConfirmDialog
          open={showBulkRejectConfirm}
          title="Rifiuta materiali selezionati"
          message={`Vuoi rifiutare ${selectedIds.size} ${selectedIds.size === 1 ? 'materiale selezionato' : 'materiali selezionati'}?`}
          confirmLabel="Rifiuta"
          onConfirm={handleBulkReject}
          onCancel={() => setShowBulkRejectConfirm(false)}
          danger
        />
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
      </>
    ) : null,
  }
}
