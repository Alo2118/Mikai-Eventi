import { useEffect, useState } from 'react'
import { useCostsStore } from '../../hooks/useCosts'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { ACTION_ICONS, COSTI_ICONS } from '../../lib/icons'
import { STATO_PREVENTIVO, STATO_PREVENTIVO_COLORE, INPUT_STYLE, CARD_STYLE, CARD_HOVER_STYLE, FORM_CONTAINER_STYLE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'
import { formatCurrency } from '../../lib/format-utils'
import { ProgressIndicator } from '../ui/ProgressIndicator'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { ConsuntivoSection } from './ConsuntivoSection'

export function EventCostiTab({ event }) {
  const preventivi = useCostsStore(s => s.preventivi)
  const costs = useCostsStore(s => s.costs)
  const loading = useCostsStore(s => s.loading)
  const costsError = useCostsStore(s => s.error)
  const fetchEventPreventivi = useCostsStore(s => s.fetchEventPreventivi)
  const fetchEventCosts = useCostsStore(s => s.fetchEventCosts)
  const createPreventivo = useCostsStore(s => s.createPreventivo)
  const approvePreventivo = useCostsStore(s => s.approvePreventivo)
  const rejectPreventivo = useCostsStore(s => s.rejectPreventivo)
  const requestRevision = useCostsStore(s => s.requestRevision)

  const profile = useAuthStore(s => s.profile)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const canManage = hasPermission('gestione_costi')
  const canApprove = hasPermission('approva_preventivi')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ descrizione: '', importo: '', fornitore_nome: '' })
  const [actionDialog, setActionDialog] = useState(null) // { type, preventivo, nota }

  useEffect(() => {
    fetchEventPreventivi(event.id)
    fetchEventCosts(event.id)
  }, [event.id])

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleCreate = async () => {
    if (!form.descrizione) return
    const { error } = await createPreventivo({
      event_id: event.id,
      descrizione: form.descrizione,
      importo: form.importo ? parseFloat(form.importo) : null,
      fornitore_nome: form.fornitore_nome || null,
      created_by: profile.id,
    })
    if (error) { addToast('Non è stato possibile salvare il preventivo. Riprova.', 'error'); return }
    addToast('Preventivo aggiunto', 'success')
    setShowForm(false)
    setForm({ descrizione: '', importo: '', fornitore_nome: '' })
  }

  const handleAction = async () => {
    const { type, preventivo, nota } = actionDialog
    let result
    if (type === 'approve') result = await approvePreventivo(preventivo.id, profile.id, nota)
    else if (type === 'reject') result = await rejectPreventivo(preventivo.id, profile.id, nota)
    else if (type === 'revision') result = await requestRevision(preventivo.id, nota)
    if (result?.error) { addToast('Non è stato possibile aggiornare il preventivo. Riprova.', 'error'); return }
    addToast(type === 'approve' ? 'Approvato' : type === 'reject' ? 'Rifiutato' : 'In revisione', 'success')
    setActionDialog(null)
  }

  const approvedPreventivi = preventivi.filter(p => p.stato === 'approvato')

  // Budget summary — uses only preventivi data
  const budgetPrevisto = event.budget_previsto || 0
  const costiApprovati = approvedPreventivi.reduce((sum, p) => sum + (p.importo || 0), 0)
  const costiEffettivi = approvedPreventivi.reduce((sum, p) => sum + (p.importo_effettivo || 0), 0)
  const maxBudget = Math.max(budgetPrevisto, costiApprovati, costiEffettivi, 1)

  return (
    <div className="space-y-6">
      {preventivi.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProgressIndicator
            label="Preventivi approvati"
            current={preventivi.filter(p => p.stato === 'approvato').length}
            total={preventivi.length}
            color="green"
          />
          <ProgressIndicator
            label="Preventivi in attesa"
            current={preventivi.filter(p => p.stato !== 'in_attesa').length}
            total={preventivi.length}
            color="mikai"
          />
        </div>
      )}

      {/* Budget bar */}
      <div className={CARD_STYLE}>
        <h3 className="font-semibold text-lg">Budget</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Previsto</span>
            <span className="font-medium">{formatCurrency(budgetPrevisto)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-mikai-400 rounded-full" style={{ width: `${Math.min((budgetPrevisto / maxBudget) * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span>Approvato</span>
            <span className={`font-medium ${costiApprovati > budgetPrevisto ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(costiApprovati)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${costiApprovati > budgetPrevisto ? 'bg-red-400' : 'bg-green-400'}`} style={{ width: `${Math.min((costiApprovati / maxBudget) * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between text-sm">
            <span>Effettivo</span>
            <span className="font-medium">{formatCurrency(costiEffettivi)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((costiEffettivi / maxBudget) * 100, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Preventivi */}
      <div className={CARD_STYLE}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Preventivi</h3>
          {canManage && !showForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1">Aggiungi</span>
            </Button>
          )}
        </div>

        {showForm && (
          <div className={FORM_CONTAINER_STYLE + ' space-y-3 mb-4'}>
            <input className={INPUT_STYLE} value={form.descrizione} onChange={e => setField('descrizione', e.target.value)} placeholder="Descrizione (es. Catering pranzo 20 pax)" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="number" step="0.01" className={INPUT_STYLE} value={form.importo} onChange={e => setField('importo', e.target.value)} placeholder="Importo €" />
              <input className={INPUT_STYLE} value={form.fornitore_nome} onChange={e => setField('fornitore_nome', e.target.value)} placeholder="Fornitore" />
            </div>
            <div className="flex gap-3">
              <Button size="sm" onClick={handleCreate}>Aggiungi</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Annulla</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {preventivi.map(p => (
            <div key={p.id} className={CARD_HOVER_STYLE}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium truncate block">{p.descrizione}</span>
                  {p.fornitore_nome && <span className="text-gray-500 text-sm truncate block">— {p.fornitore_nome}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {p.importo != null && <span className="font-semibold">{formatCurrency(p.importo)}</span>}
                  <StatusBadge stato={p.stato} labels={STATO_PREVENTIVO} colors={STATO_PREVENTIVO_COLORE} />
                </div>
              </div>
              {p.nota_approvazione && <p className="text-sm text-gray-500 mt-1">{p.nota_approvazione}</p>}
              {p.approvatore && <p className="text-xs text-gray-400 mt-1">{p.approvatore.cognome} {p.approvatore.nome} — {p.data_approvazione ? formatDate(p.data_approvazione) : ''}</p>}

              {canApprove && p.stato === 'in_attesa' && (
                <div className="flex gap-3 mt-2">
                  <Button size="sm" onClick={() => setActionDialog({ type: 'approve', preventivo: p, nota: '' })}>Approva</Button>
                  <Button variant="danger" size="sm" onClick={() => setActionDialog({ type: 'reject', preventivo: p, nota: '' })}>Rifiuta</Button>
                  <Button variant="secondary" size="sm" onClick={() => setActionDialog({ type: 'revision', preventivo: p, nota: '' })}>Revisione</Button>
                </div>
              )}
            </div>
          ))}
          {loading && <LoadingSkeleton lines={3} />}
          {costsError && !loading && <p className="text-sm text-red-500 py-2" role="alert">Errore nel caricamento dei costi.</p>}
          {preventivi.length === 0 && !loading && !costsError && (
            <EmptyState
              title="Nessun preventivo"
              description="Aggiungi il primo preventivo per questo evento."
              action={canManage && !showForm ? (
                <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
                  <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                  Aggiungi preventivo
                </Button>
              ) : null}
            />
          )}
        </div>
      </div>

      {/* Consuntivo */}
      {approvedPreventivi.length > 0 && (
        <ConsuntivoSection preventivi={approvedPreventivi} canManage={canManage} />
      )}

      {/* Action dialog */}
      {actionDialog && (
        <ConfirmDialog
          open={!!actionDialog}
          title={actionDialog.type === 'approve' ? 'Approva preventivo' : actionDialog.type === 'reject' ? 'Rifiuta preventivo' : 'Richiedi revisione'}
          message={
            <div className="space-y-2">
              <p>{actionDialog.preventivo.descrizione} — {formatCurrency(actionDialog.preventivo.importo)}</p>
              <textarea
                className={INPUT_STYLE + ' min-h-[80px]'}
                value={actionDialog.nota}
                onChange={e => setActionDialog(d => ({ ...d, nota: e.target.value }))}
                placeholder={actionDialog.type === 'reject' ? 'Motivo del rifiuto...' : 'Note (opzionale)...'}
              />
            </div>
          }
          confirmLabel={actionDialog.type === 'approve' ? 'Approva' : actionDialog.type === 'reject' ? 'Rifiuta' : 'Richiedi revisione'}
          danger={actionDialog.type === 'reject'}
          onConfirm={handleAction}
          onCancel={() => setActionDialog(null)}
        />
      )}
    </div>
  )
}
