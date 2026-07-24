import { useState } from 'react'
import { useCostsStore } from '../../hooks/useCosts'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { EmptyState } from '../ui/EmptyState'
import { ACTION_ICONS } from '../../lib/icons'
import { CARD_STYLE, CARD_HOVER_STYLE, FORM_CONTAINER_STYLE, INPUT_STYLE, SELECT_STYLE, COSTO_MANUALE_SOURCE } from '../../lib/constants'
import { formatCurrency } from '../../lib/format-utils'

const EMPTY_FORM = { descrizione: '', source_tipo: 'altro', importo: '', fornitore: '' }

/**
 * Voci di costo manuali (event_costs) fuori-preventivo: ospitalità extra, materiale,
 * catering, sponsorizzazioni... Entrano nella ripartizione del budget effettivo.
 * L'importo inserito è trattato come costo effettivo (importo_effettivo).
 */
export function CostiManuali({ eventId, costs, canManage }) {
  const createCost = useCostsStore(s => s.createCost)
  const editCost = useCostsStore(s => s.editCost)
  const removeCost = useCostsStore(s => s.removeCost)
  const addToast = useToastStore(s => s.add)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const resetForm = () => { setForm(EMPTY_FORM); setShowForm(false); setEditingId(null) }

  const startEdit = (c) => {
    setEditingId(c.id)
    setForm({
      descrizione: c.descrizione || '',
      source_tipo: c.source_tipo || 'altro',
      importo: c.importo_effettivo != null ? String(c.importo_effettivo) : (c.importo_previsto != null ? String(c.importo_previsto) : ''),
      fornitore: c.fornitore || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.descrizione.trim()) { addToast('Aggiungi una descrizione per la voce di costo.', 'error'); return }
    const payload = {
      source_tipo: form.source_tipo,
      descrizione: form.descrizione.trim(),
      importo_effettivo: form.importo !== '' ? parseFloat(form.importo) : null,
      fornitore: form.fornitore.trim() || null,
    }
    const { error } = editingId
      ? await editCost(editingId, payload)
      : await createCost({ ...payload, event_id: eventId })
    if (error) { addToast('Non è stato possibile salvare la voce di costo. Riprova.', 'error'); return }
    addToast(editingId ? 'Voce aggiornata' : 'Voce aggiunta', 'success')
    resetForm()
  }

  const handleDelete = async () => {
    const { error } = await removeCost(confirmDelete.id)
    if (error) { addToast('Non è stato possibile eliminare la voce. Riprova.', 'error'); return }
    addToast('Voce eliminata', 'success')
    setConfirmDelete(null)
  }

  const importoDi = (c) => c.importo_effettivo != null ? c.importo_effettivo : c.importo_previsto

  return (
    <div className={CARD_STYLE}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Altre voci di costo</h3>
        {canManage && !showForm && (
          <Button variant="secondary" size="sm" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }}>
            <Icon icon={ACTION_ICONS.add} size={16} />
            <span className="ml-1">Aggiungi</span>
          </Button>
        )}
      </div>

      {showForm && canManage && (
        <div className={FORM_CONTAINER_STYLE + ' space-y-3 mb-4'}>
          <input className={INPUT_STYLE} value={form.descrizione} onChange={e => setField('descrizione', e.target.value)} placeholder="Descrizione (es. Noleggio sala)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className={SELECT_STYLE} value={form.source_tipo} onChange={e => setField('source_tipo', e.target.value)} aria-label="Categoria">
              {Object.entries(COSTO_MANUALE_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="number" step="0.01" min="0" className={INPUT_STYLE} value={form.importo} onChange={e => setField('importo', e.target.value)} placeholder="Importo €" />
          </div>
          <input className={INPUT_STYLE} value={form.fornitore} onChange={e => setField('fornitore', e.target.value)} placeholder="Fornitore (opzionale)" />
          <div className="flex gap-3">
            <Button size="sm" onClick={handleSave}>{editingId ? 'Salva' : 'Aggiungi'}</Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>Annulla</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {costs.map(c => (
          <div key={c.id} className={CARD_HOVER_STYLE}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium truncate block">{c.descrizione || 'Voce di costo'}</span>
                <span className="text-gray-500 text-sm truncate block">
                  {COSTO_MANUALE_SOURCE[c.source_tipo] || 'Altro'}{c.fornitore ? ` — ${c.fornitore}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {importoDi(c) != null && <span className="font-semibold">{formatCurrency(importoDi(c))}</span>}
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(c)} className="text-gray-400 hover:text-mikai-500 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Modifica voce">
                      <Icon icon={ACTION_ICONS.edit} size={18} />
                    </button>
                    <button onClick={() => setConfirmDelete(c)} className="text-gray-400 hover:text-red-500 min-h-[48px] min-w-[48px] flex items-center justify-center" aria-label="Elimina voce">
                      <Icon icon={ACTION_ICONS.delete} size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {costs.length === 0 && !showForm && (
          <EmptyState
            title="Nessuna voce manuale"
            description="Aggiungi costi fuori preventivo: sale, materiale extra, catering, sponsorizzazioni."
            action={canManage ? (
              <Button variant="secondary" size="sm" onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true) }}>
                <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                Aggiungi voce
              </Button>
            ) : null}
          />
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          open={!!confirmDelete}
          title="Elimina voce di costo"
          message={`Vuoi eliminare "${confirmDelete.descrizione || 'questa voce'}"? L'operazione non è reversibile.`}
          confirmLabel="Elimina"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
