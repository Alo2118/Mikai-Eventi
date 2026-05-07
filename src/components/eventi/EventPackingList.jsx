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
import { ACTION_ICONS, DOCUMENTO_ICONS, MATERIALE_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { Modal } from '../ui/Modal'
import { PackingItem } from './PackingItem'
import { formatDateRange } from '../../lib/date-utils'
import { INPUT_STYLE, TEXTAREA_STYLE, FORM_CONTAINER_STYLE, SUMMARY_BAR_STYLE, SELECT_STYLE, CARD_STYLE } from '../../lib/constants'

export function EventPackingList({ event, onBack }) {
  const items = usePackingListStore(s => s.items)
  const loading = usePackingListStore(s => s.loading)
  const fetchPackingList = usePackingListStore(s => s.fetchPackingList)
  const generatePackingList = usePackingListStore(s => s.generatePackingList)
  const addManualItem = usePackingListStore(s => s.addManualItem)
  const removeItem = usePackingListStore(s => s.removeItem)
  const fetchEventMaterialList = useMaterialsStore(s => s.fetchEventMaterialList)
  const assignToCollo = usePackingListStore(s => s.assignToCollo)
  const bulkAssignToCollo = usePackingListStore(s => s.bulkAssignToCollo)
  const splitToCollo = usePackingListStore(s => s.splitToCollo)

  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const [generating, setGenerating] = useState(false)
  const [printCollo, setPrintCollo] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignCollo, setAssignCollo] = useState(1)
  const [assignQtyMap, setAssignQtyMap] = useState({})
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
  const outOfSync = materialCount !== linkedItems.length && linkedItems.length > 0
  const colloNumbers = [...new Set(items.map(i => i.collo_numero).filter(n => n != null))].sort((a, b) => a - b)
  const unassigned = items.filter(i => i.collo_numero == null)
  const assignedCount = items.length - unassigned.length
  const maxCollo = colloNumbers.length > 0 ? Math.max(...colloNumbers) : 0
  const allAssigned = items.length > 0 && unassigned.length === 0
  const hasColli = colloNumbers.length > 0 && unassigned.length === 0

  async function handleGenerate() {
    setShowGenerateConfirm(false)
    setGenerating(true)
    const { added, error } = await generatePackingList(event.id)
    setGenerating(false)
    if (error) addToast(`Errore: ${error}`, 'error')
    else if (added === 0) addToast('Nessun nuovo materiale da aggiungere', 'warning')
    else addToast(`${added} voci aggiunte alla lista`, 'success')
    const { data } = await fetchEventMaterialList(event.id)
    setMaterialCount((data || []).filter(m => m.stato === 'approvato' || m.stato === 'in_preparazione').length)
  }

  function handleGenerateClick() {
    if (items.length > 0) setShowGenerateConfirm(true)
    else handleGenerate()
  }

  async function handleAddManual() {
    if (!newDesc.trim()) return
    const { error } = await addManualItem(event.id, newDesc.trim(), newQty, newNote.trim())
    if (error) { addToast(`Errore: ${error}`, 'error'); return }
    addToast('Voce aggiunta', 'success')
    setNewDesc(''); setNewQty(1); setNewNote(''); setShowAddForm(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await removeItem(deleteTarget.id)
    if (error) addToast(error, 'error')
    else addToast('Voce rimossa', 'success')
    setDeleteTarget(null)
  }

  function openAssignModal() {
    const selectedItems = items.filter(i => selected.has(i.id))
    const qtyMap = {}
    selectedItems.forEach(i => { qtyMap[i.id] = i.quantita })
    setAssignQtyMap(qtyMap)
    setAssignCollo(maxCollo + 1)
    setShowAssignModal(true)
  }

  if (loading) return <LoadingSkeleton lines={6} />

  return (
    <div className="space-y-6">
      {/* Print-only header */}
      <div className="hidden print-header">
        <h1 className="text-xl font-bold">MIKAI — Lista Preparazione{printCollo ? ` — Collo ${printCollo}` : ''}</h1>
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

      {/* Header */}
      <div className="flex items-center gap-3 no-print">
        {onBack && (
          <Button variant="ghost" onClick={onBack} size="sm" aria-label="Torna indietro">
            <Icon icon={ACTION_ICONS.back} size={18} />
          </Button>
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-lg">Lista preparazione</h3>
          <p className="text-sm text-gray-500">
            {event.titolo} — {formatDateRange(event.data_inizio, event.data_fine)}
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="no-print"
            onClick={() => { setPrintCollo(null); setTimeout(() => window.print(), 100) }}
          >
            <Icon icon={DOCUMENTO_ICONS.print} size={16} className="mr-1" />
            Stampa
          </Button>
        )}
      </div>

      {/* Progress summary */}
      {items.length > 0 && (
        <div className={SUMMARY_BAR_STYLE + ' no-print space-y-2'}>
          <ProgressIndicator label="Assegnato a un collo" current={assignedCount} total={items.length} color={allAssigned ? 'green' : 'mikai'} />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className={`font-medium ${hasColli ? 'text-emerald-700' : colloNumbers.length > 0 ? 'text-yellow-700' : 'text-gray-500'}`}>
              {colloNumbers.length} {colloNumbers.length === 1 ? 'collo creato' : 'colli creati'}
              {unassigned.length > 0 && ` · ${unassigned.length} da assegnare`}
            </span>
            {allAssigned && hasColli && (
              <span className="font-medium text-emerald-600 flex items-center gap-1">
                <Icon icon={ACTION_ICONS.check} size={14} />
                Pronto per la spedizione
              </span>
            )}
          </div>
        </div>
      )}

      {/* Out of sync warning */}
      {outOfSync && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 no-print" role="alert">
          <Icon icon={FEEDBACK_ICONS.warning} size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">La lista materiale è cambiata</p>
            <p className="text-yellow-700 mt-0.5">Premi "Aggiorna da materiale" per sincronizzare le nuove voci.</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <EmptyState
          title="Nessuna voce nella lista"
          description="Genera la lista dai materiali confermati per iniziare a preparare i colli."
        />
      )}

      {/* Action buttons — contextual */}
      <div className="flex flex-wrap gap-3 no-print">
        <Button
          variant={items.length === 0 ? 'primary' : 'secondary'}
          onClick={handleGenerateClick}
          loading={generating}
        >
          <Icon icon={MATERIALE_ICONS.package} size={16} className="mr-1" />
          {items.length === 0 ? 'Genera da materiale' : 'Aggiorna da materiale'}
        </Button>
        {items.length > 0 && (
          <Button variant="secondary" onClick={() => setShowAddForm(true)}>
            <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
            Aggiungi voce
          </Button>
        )}
      </div>

      {/* Selection bar — sticky, action-first ("seleziona, poi tocca un collo") */}
      {selected.size > 0 && (
        <div className={SUMMARY_BAR_STYLE + ' flex items-center gap-2 flex-wrap no-print sticky top-0 z-10'}>
          <span className="text-sm font-semibold text-mikai-700 mr-1">
            {selected.size} {selected.size === 1 ? 'voce' : 'voci'} selezionate
          </span>
          <span className="text-sm text-mikai-600">→ metti in:</span>

          {colloNumbers.map(num => (
            <button
              key={`put-${num}`}
              type="button"
              onClick={async () => {
                const ids = items.filter(i => selected.has(i.id)).map(i => i.id)
                const { error } = await bulkAssignToCollo(ids, num)
                if (error) { addToast(error, 'error'); return }
                addToast(`${ids.length} ${ids.length === 1 ? 'voce' : 'voci'} → Collo ${num}`, 'success')
                setSelected(new Set())
                await fetchPackingList(event.id)
              }}
              className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg bg-white border-2 border-mikai-300 text-mikai-700 font-semibold text-sm hover:bg-mikai-50 hover:border-mikai-500 transition-colors"
              aria-label={`Metti nel collo ${num}`}
            >
              Collo {num}
            </button>
          ))}

          <button
            type="button"
            onClick={async () => {
              const nextCollo = maxCollo + 1
              const ids = items.filter(i => selected.has(i.id)).map(i => i.id)
              const { error } = await bulkAssignToCollo(ids, nextCollo)
              if (error) { addToast(error, 'error'); return }
              addToast(`Collo ${nextCollo} creato con ${ids.length} ${ids.length === 1 ? 'voce' : 'voci'}`, 'success')
              setSelected(new Set())
              await fetchPackingList(event.id)
            }}
            className="inline-flex items-center gap-1 min-h-[44px] px-3 rounded-lg bg-mikai-500 text-white font-semibold text-sm hover:bg-mikai-600 transition-colors"
            aria-label={`Crea nuovo collo ${maxCollo + 1}`}
          >
            <Icon icon={ACTION_ICONS.add} size={16} />
            Nuovo collo {maxCollo + 1}
          </button>

          <Button size="sm" variant="ghost" onClick={openAssignModal}>
            Quantità parziali…
          </Button>

          {colloNumbers.length > 0 && items.filter(i => selected.has(i.id) && i.collo_numero != null).length > 0 && (
            <Button size="sm" variant="ghost" onClick={async () => {
              const ids = items.filter(i => selected.has(i.id)).map(i => i.id)
              const { error } = await bulkAssignToCollo(ids, null)
              if (error) { addToast(error, 'error'); return }
              addToast(`${ids.length} ${ids.length === 1 ? 'voce rimossa' : 'voci rimosse'} dai colli`, 'success')
              setSelected(new Set())
              await fetchPackingList(event.id)
            }}>
              Togli dal collo
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="ml-auto">
            Annulla
          </Button>
        </div>
      )}

      {/* Hint when nothing is selected yet */}
      {items.length > 0 && selected.size === 0 && (
        <div className="text-sm text-gray-500 px-1 no-print flex items-center gap-2">
          <Icon icon={FEEDBACK_ICONS.info} size={14} className="text-mikai-400" />
          <span>
            {unassigned.length > 0
              ? 'Tocca le voci per selezionarle, poi scegli in quale collo metterle.'
              : 'Tocca una voce per spostarla in un altro collo o rimetterla tra quelle da assegnare. Usa "Sposta tutto…" sull\'header del collo per agire sull\'intero collo.'}
          </span>
        </div>
      )}

      {/* Items grouped by collo */}
      {items.length > 0 && (
        <div className="space-y-4">
          {/* Unassigned section — shown first, highlighted */}
          {unassigned.length > 0 && (
            <PackingGroup
              title="Voci da assegnare a un collo"
              count={unassigned.length}
              items={unassigned}
              onDelete={i => !i.event_material_id ? setDeleteTarget(i) : null}
              selected={selected}
              onSelect={id => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })}
              highlight
              headerExtra={(
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" onClick={async () => {
                    const nextCollo = maxCollo + 1
                    const ids = unassigned.map(i => i.id)
                    const { error } = await bulkAssignToCollo(ids, nextCollo)
                    if (error) { addToast(error, 'error'); return }
                    addToast(`Collo ${nextCollo} creato con ${ids.length} ${ids.length === 1 ? 'voce' : 'voci'}`, 'success')
                    await fetchPackingList(event.id)
                  }}>
                    <Icon icon={ACTION_ICONS.add} size={14} className="mr-1" />
                    {colloNumbers.length === 0 ? 'Tutto in 1 collo' : 'Nuovo collo con tutto'}
                  </Button>
                  {colloNumbers.length > 0 && (
                    <select
                      className={SELECT_STYLE + ' max-w-[200px] text-sm'}
                      value=""
                      onChange={async (e) => {
                        const num = parseInt(e.target.value)
                        if (!num) return
                        const ids = unassigned.map(i => i.id)
                        const { error } = await bulkAssignToCollo(ids, num)
                        if (error) { addToast(error, 'error'); return }
                        addToast(`${ids.length} ${ids.length === 1 ? 'voce spostata' : 'voci spostate'} nel collo ${num}`, 'success')
                        await fetchPackingList(event.id)
                      }}
                      aria-label="Sposta tutto in collo esistente"
                    >
                      <option value="">Sposta tutto in…</option>
                      {colloNumbers.map(num => (
                        <option key={`move-all-${num}`} value={num}>Collo {num}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            />
          )}

          {colloNumbers.map(num => {
            const colloItems = items.filter(i => i.collo_numero === num)
            const otherColli = colloNumbers.filter(n => n !== num)
            return (
              <PackingGroup
                key={`collo-${num}`}
                title={`Collo ${num}`}
                count={colloItems.length}
                items={colloItems}
                onDelete={i => !i.event_material_id ? setDeleteTarget(i) : null}
                selected={selected}
                onSelect={id => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })}
                onPrintCollo={() => { setPrintCollo(num); setTimeout(() => { window.print(); setPrintCollo(null) }, 100) }}
                headerExtra={(
                  <select
                    className={SELECT_STYLE + ' text-xs py-1 px-2 min-h-0 h-8 max-w-[200px]'}
                    value=""
                    onChange={async (e) => {
                      const target = e.target.value
                      if (!target) return
                      const ids = colloItems.map(i => i.id)
                      if (target === 'unassign') {
                        const { error } = await bulkAssignToCollo(ids, null)
                        if (error) { addToast(error, 'error'); return }
                        addToast(`Collo ${num} svuotato — voci da riassegnare`, 'success')
                        await fetchPackingList(event.id)
                        return
                      }
                      const targetNum = parseInt(target)
                      const { error } = await bulkAssignToCollo(ids, targetNum)
                      if (error) { addToast(error, 'error'); return }
                      addToast(`Collo ${num} → Collo ${targetNum}`, 'success')
                      await fetchPackingList(event.id)
                    }}
                    aria-label={`Sposta intero collo ${num}`}
                  >
                    <option value="">Sposta tutto…</option>
                    <option value="unassign">↶ Annulla (torna a "da assegnare")</option>
                    {otherColli.map(n => (
                      <option key={`merge-${n}`} value={n}>→ Collo {n}</option>
                    ))}
                  </select>
                )}
              />
            )
          })}

        </div>
      )}

      {/* Add manual item form */}
      {showAddForm && (
        <div className={FORM_CONTAINER_STYLE + ' border border-gray-200 space-y-3 no-print'}>
          <h3 className="text-base font-semibold text-gray-900">Aggiungi voce manuale</h3>
          <div>
            <label htmlFor="packing-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione <span className="text-red-500">*</span>
            </label>
            <input
              id="packing-desc"
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Es. Cavi di collegamento monitor"
              className={INPUT_STYLE}
            />
          </div>
          <div>
            <label htmlFor="packing-qty" className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
            <input
              id="packing-qty"
              type="number"
              min={1}
              value={newQty}
              onChange={e => setNewQty(parseInt(e.target.value) || 1)}
              className={INPUT_STYLE + ' max-w-[120px]'}
            />
          </div>
          <div>
            <label htmlFor="packing-note" className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
            <textarea
              id="packing-note"
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

      {/* Assign to collo modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assegna a collo">
        <div className="space-y-4">
          <div>
            <label htmlFor="assign-collo" className="block text-sm font-medium text-gray-700 mb-1">Numero collo</label>
            <input
              id="assign-collo"
              type="number"
              min={1}
              value={assignCollo}
              onChange={e => setAssignCollo(Math.max(1, parseInt(e.target.value) || 1))}
              className={INPUT_STYLE + ' max-w-[120px]'}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Quantità per voce:</p>
            {items.filter(i => selected.has(i.id)).map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm text-gray-900 truncate flex-1">{item.descrizione}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={item.quantita}
                    value={assignQtyMap[item.id] || item.quantita}
                    onChange={e => setAssignQtyMap(prev => ({ ...prev, [item.id]: Math.max(1, Math.min(item.quantita, parseInt(e.target.value) || 1)) }))}
                    className="w-16 min-h-[48px] text-center text-sm font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-mikai-400 outline-none"
                    aria-label={`Quantità per ${item.descrizione}`}
                  />
                  <span className="text-xs text-gray-400">/ {item.quantita}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={async () => {
              const selectedItems = items.filter(i => selected.has(i.id))
              for (const item of selectedItems) {
                const qty = assignQtyMap[item.id] || item.quantita
                if (qty < item.quantita) await splitToCollo(item.id, assignCollo, qty)
                else await assignToCollo(item.id, assignCollo)
              }
              addToast(`${selectedItems.length} voci assegnate al collo ${assignCollo}`, 'success')
              setSelected(new Set())
              setShowAssignModal(false)
              fetchPackingList(event.id)
            }}>
              Assegna al collo {assignCollo}
            </Button>
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Annulla</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showGenerateConfirm}
        title="Aggiorna lista preparazione"
        message="Verranno aggiunte le nuove voci dalla lista materiale. Le voci esistenti non verranno modificate."
        confirmLabel="Aggiorna"
        onConfirm={handleGenerate}
        onCancel={() => setShowGenerateConfirm(false)}
      />

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

function PackingGroup({ title, count, items, onDelete, selected, onSelect, onPrintCollo, highlight, headerExtra }) {
  const isCollo = !highlight
  return (
    <div className={`border rounded-xl overflow-hidden ${
      highlight ? 'border-yellow-300 bg-yellow-50/30' :
      'border-emerald-200'
    }`}>
      <div className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 ${
        highlight ? 'bg-yellow-50' : 'bg-emerald-50'
      }`}>
        <div className="flex items-center gap-2">
          {isCollo && <Icon icon={ACTION_ICONS.check} size={14} className="text-emerald-600" />}
          {highlight && <Icon icon={FEEDBACK_ICONS.warning} size={14} className="text-yellow-600" />}
          <span className="font-semibold text-sm text-gray-700">{title}</span>
          <span className="text-sm text-gray-400">
            {count} {count === 1 ? 'voce' : 'voci'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap no-print">
          {headerExtra}
          {onPrintCollo && (
            <button
              onClick={onPrintCollo}
              className="text-sm text-mikai-500 hover:text-mikai-700 flex items-center gap-1 min-h-[48px] px-2 rounded-lg hover:bg-mikai-50 transition-colors"
              aria-label={`Stampa ${title}`}
            >
              <Icon icon={DOCUMENTO_ICONS.print} size={14} />
              Stampa
            </button>
          )}
        </div>
      </div>
      <div className="p-3 space-y-2">
        {items.map(item => {
          const isSelected = selected?.has(item.id) || false
          return (
            <div
              key={item.id}
              className={`packing-item rounded-lg transition-all ${
                isSelected ? 'ring-2 ring-mikai-400 ring-offset-1' : ''
              }`}
              onClick={(e) => {
                if (!onSelect) return
                if (e.target.closest('button')) return
                onSelect(item.id)
              }}
              role={onSelect ? 'button' : undefined}
              aria-pressed={onSelect ? isSelected : undefined}
              aria-label={onSelect ? `${isSelected ? 'Deseleziona' : 'Seleziona'} ${item.descrizione} per assegnare a un collo` : undefined}
            >
              <PackingItem
                item={item}
                onDelete={onDelete ? () => onDelete(item) : null}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
