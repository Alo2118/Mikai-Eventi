import { useState, useEffect } from 'react'
import { usePackingListStore } from '../../hooks/usePackingList'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ProgressIndicator } from '../ui/ProgressIndicator'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { ACTION_ICONS, DOCUMENTO_ICONS, MATERIALE_ICONS } from '../../lib/icons'
import { PackingItem } from './PackingItem'
import { formatDateRange } from '../../lib/date-utils'
import { INPUT_STYLE, TEXTAREA_STYLE } from '../../lib/constants'

export function EventPackingList({ event, onBack }) {
  const items = usePackingListStore(s => s.items)
  const loading = usePackingListStore(s => s.loading)
  const fetchPackingList = usePackingListStore(s => s.fetchPackingList)
  const generatePackingList = usePackingListStore(s => s.generatePackingList)
  const togglePacked = usePackingListStore(s => s.togglePacked)
  const addManualItem = usePackingListStore(s => s.addManualItem)
  const removeItem = usePackingListStore(s => s.removeItem)
  const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)

  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const [generating, setGenerating] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newNote, setNewNote] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false)
  const [materialCount, setMaterialCount] = useState(0)

  useEffect(() => {
    if (event?.id) {
      fetchPackingList(event.id)
      fetchEventMaterialList(event.id).then(({ data }) => {
        const approved = (data || []).filter(m => m.stato === 'approvato' || m.stato === 'in_preparazione')
        setMaterialCount(approved.length)
      })
    }
  }, [event?.id])

  const linkedItems = items.filter(i => i.event_material_id)
  const manualItems = items.filter(i => !i.event_material_id)
  const packedCount = items.filter(i => i.imballato).length
  const outOfSync = materialCount !== linkedItems.length && linkedItems.length > 0

  async function handleGenerate() {
    setShowGenerateConfirm(false)
    setGenerating(true)
    const { added, error } = await generatePackingList(event.id)
    setGenerating(false)
    if (error) {
      addToast(`Errore: ${error}`, 'error')
    } else if (added === 0) {
      addToast('Nessun nuovo materiale da aggiungere', 'warning')
    } else {
      addToast(`${added} voci aggiunte alla lista`, 'success')
    }
    // Refresh material count
    const { data } = await fetchEventMaterialList(event.id)
    const approved = (data || []).filter(m => m.stato === 'approvato' || m.stato === 'in_preparazione')
    setMaterialCount(approved.length)
  }

  function handleGenerateClick() {
    if (items.length > 0) {
      setShowGenerateConfirm(true)
    } else {
      handleGenerate()
    }
  }

  async function handleToggle(item) {
    const { error } = await togglePacked(item.id, !item.imballato, user?.id)
    if (error) addToast(`Errore: ${error}`, 'error')
  }

  async function handleAddManual() {
    if (!newDesc.trim()) return
    const { error } = await addManualItem(event.id, newDesc.trim(), newQty, newNote.trim())
    if (error) {
      addToast(`Errore: ${error}`, 'error')
    } else {
      addToast('Voce aggiunta', 'success')
      setNewDesc('')
      setNewQty(1)
      setNewNote('')
      setShowAddForm(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await removeItem(deleteTarget.id)
    if (error) {
      addToast(error, 'error')
    } else {
      addToast('Voce rimossa', 'success')
    }
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSkeleton lines={6} />

  return (
    <div className="space-y-5">
      {/* Print-only header */}
      <div className="hidden print-header">
        <h1 className="text-xl font-bold">MIKAI — Lista Preparazione</h1>
        <p className="text-base">{event.titolo}</p>
        <p className="text-sm text-gray-600">
          {formatDateRange(event.data_inizio, event.data_fine)}
          {event.luogo ? ` — ${event.luogo}` : ''}
        </p>
        {event.indirizzo_spedizione && (
          <p className="text-sm text-gray-600">Spedizione: {event.indirizzo_spedizione}</p>
        )}
        <hr className="my-3" />
      </div>

      {/* Header with back + title */}
      <div className="flex items-center gap-3 no-print">
        {onBack && (
          <Button variant="ghost" onClick={onBack} size="sm" aria-label="Torna indietro">
            <Icon icon={ACTION_ICONS.back} size={18} />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">Lista Preparazione</h2>
          <p className="text-sm text-gray-500">
            {event.titolo} — {formatDateRange(event.data_inizio, event.data_fine)}
          </p>
          {event.indirizzo_spedizione && (
            <p className="text-sm text-gray-500">Spedizione: {event.indirizzo_spedizione}</p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3 no-print">
        <Button variant="secondary" onClick={handleGenerateClick} loading={generating}>
          <Icon icon={MATERIALE_ICONS.package} size={18} className="mr-2" />
          Genera da lista materiale
        </Button>
        <Button variant="secondary" onClick={() => setShowAddForm(true)}>
          <Icon icon={ACTION_ICONS.add} size={18} className="mr-2" />
          Aggiungi voce manuale
        </Button>
        <Button
          variant="secondary"
          onClick={() => window.print()}
          disabled={items.length === 0}
        >
          <Icon icon={DOCUMENTO_ICONS.print} size={18} className="mr-2" />
          Stampa lista
        </Button>
      </div>

      {/* Out of sync warning */}
      {outOfSync && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 no-print">
          La lista materiale potrebbe essere cambiata. Premi &quot;Genera da lista materiale&quot; per sincronizzare.
        </div>
      )}

      {/* Progress */}
      {items.length > 0 && (
        <ProgressIndicator
          label="Imballato"
          current={packedCount}
          total={items.length}
        />
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <EmptyState
          title="Nessuna voce nella lista"
          description="Conferma i materiali nella tab Materiale, poi premi 'Genera da lista materiale' per creare la checklist."
        />
      )}

      {/* Linked materials group */}
      {linkedItems.length > 0 && (
        <PackingGroup
          title="Materiale confermato"
          items={linkedItems}
          onToggle={handleToggle}
          onDelete={null}
        />
      )}

      {/* Manual items group */}
      {manualItems.length > 0 && (
        <PackingGroup
          title="Voci manuali"
          items={manualItems}
          onToggle={handleToggle}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Add manual item form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3 no-print">
          <h3 className="text-base font-semibold text-gray-900">Nuova voce manuale</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Es. Cavi di collegamento monitor"
              className={INPUT_STYLE}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
            <input
              type="number"
              min={1}
              value={newQty}
              onChange={e => setNewQty(parseInt(e.target.value) || 1)}
              className={INPUT_STYLE}
              style={{ maxWidth: 120 }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className={TEXTAREA_STYLE}
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAddManual} disabled={!newDesc.trim()}>Aggiungi</Button>
            <Button variant="secondary" onClick={() => setShowAddForm(false)}>Annulla</Button>
          </div>
        </div>
      )}

      {/* Generate confirm dialog */}
      <ConfirmDialog
        open={showGenerateConfirm}
        title="Aggiorna lista preparazione"
        message="Verranno aggiunte le nuove voci dalla lista materiale. Le voci esistenti non verranno modificate."
        confirmLabel="Aggiorna"
        onConfirm={handleGenerate}
        onCancel={() => setShowGenerateConfirm(false)}
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Rimuovi voce"
        message={`Rimuovere "${deleteTarget?.descrizione}" dalla lista?`}
        confirmLabel="Rimuovi"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        danger
      />
    </div>
  )
}

function PackingGroup({ title, items, onToggle, onDelete }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-2">
        {items.map(item => (
          <PackingItem
            key={item.id}
            item={item}
            onToggle={() => onToggle(item)}
            onDelete={onDelete ? () => onDelete(item) : null}
          />
        ))}
      </div>
    </div>
  )
}

