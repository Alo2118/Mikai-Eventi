import { useState } from 'react'
import { useEventsStore } from '../../hooks/useEvents'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { FEEDBACK_ICONS } from '../../lib/icons'

// Maps current stato → next stato + button label
const NEXT_STATE = {
  confermato: { stato: 'in_preparazione', label: 'Avvia preparazione' },
  in_preparazione: { stato: 'pronto', label: 'Segna come pronto' },
  pronto: { stato: 'in_corso', label: 'Avvia evento' },
  in_corso: { stato: 'concluso', label: 'Concludi evento' },
}

export function ActivityGateBar({ event, activities }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unreturnedMaterials, setUnreturnedMaterials] = useState([])
  const advanceEventState = useEventsStore(s => s.advanceEventState)
  const checkGateConcluded = useEventsStore(s => s.checkGateConcluded)
  const addToast = useToastStore(s => s.add)

  const next = NEXT_STATE[event.stato]
  if (!next) return null

  const mandatoryIncomplete = activities.filter(
    a => a.obbligatoria && a.stato !== 'completata' && a.stato !== 'disattivata'
  )
  // Gates: in_preparazione requires all mandatory activities complete
  // in_corso → concluso is checked on click (async gate)
  const canAdvance = event.stato !== 'in_preparazione' || mandatoryIncomplete.length === 0

  async function handleAdvanceClick() {
    // For in_corso → concluso: check unreturned materials first
    if (event.stato === 'in_corso') {
      const { canAdvance: matOk, unreturned } = await checkGateConcluded(event.id)
      if (!matOk) {
        setUnreturnedMaterials(unreturned)
        addToast(`${unreturned.length} materiali non ancora rientrati — conferma per procedere`, 'warning')
      }
    }
    setShowConfirm(true)
  }

  async function handleConfirm() {
    setLoading(true)
    const { error } = await advanceEventState(event.id, next.stato)
    setLoading(false)
    setShowConfirm(false)
    setUnreturnedMaterials([])
    if (error) {
      addToast('Impossibile aggiornare lo stato. Riprova.', 'error')
    } else {
      addToast(`Stato aggiornato: ${next.label}`, 'success')
    }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Prossimo stato</p>
          {!canAdvance && (
            <p className="mt-1 text-sm text-gray-500">
              {mandatoryIncomplete.length} {mandatoryIncomplete.length === 1 ? 'attività obbligatoria' : 'attività obbligatorie'} da completare prima di procedere
            </p>
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          disabled={!canAdvance || loading}
          onClick={handleAdvanceClick}
        >
          {next.label}
        </Button>
      </div>

      {!canAdvance && mandatoryIncomplete.length > 0 && (
        <div className="space-y-1">
          {mandatoryIncomplete.slice(0, 5).map(a => (
            <div key={a.id} className="flex items-center gap-2 text-sm text-red-600">
              <Icon icon={FEEDBACK_ICONS.warning} size={14} className="shrink-0" />
              <span>{a.descrizione}</span>
            </div>
          ))}
          {mandatoryIncomplete.length > 5 && (
            <p className="text-sm text-gray-500 pl-5">
              + altri {mandatoryIncomplete.length - 5}
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title={next.label}
        message={unreturnedMaterials.length > 0
          ? `Attenzione: ${unreturnedMaterials.length} materiali non sono ancora rientrati. Vuoi concludere comunque?`
          : 'Confermi di voler avanzare lo stato dell\'evento?'}
        confirmLabel="Conferma"
        danger={unreturnedMaterials.length > 0}
        onConfirm={handleConfirm}
        onCancel={() => { setShowConfirm(false); setUnreturnedMaterials([]) }}
      />
    </div>
  )
}
