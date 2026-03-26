import { useState } from 'react'
import { useEventsStore } from '../../hooks/useEvents'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { FEEDBACK_ICONS } from '../../lib/icons'
import { SUMMARY_BAR_STYLE } from '../../lib/constants'

// Maps current stato → next stato + button label + human-readable name
const NEXT_STATE = {
  confermato: { stato: 'in_preparazione', label: 'Avvia preparazione', nome: 'in preparazione' },
  in_preparazione: { stato: 'pronto', label: 'Segna come pronto', nome: 'pronto' },
  pronto: { stato: 'in_corso', label: 'Avvia evento', nome: 'in corso' },
  in_corso: { stato: 'concluso', label: 'Concludi evento', nome: 'concluso' },
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
    <div className="space-y-3">
      {/* Gate blocker banner — visible when mandatory activities are incomplete */}
      {mandatoryIncomplete.length > 0 && (
        <div className={SUMMARY_BAR_STYLE + ' flex flex-col gap-2'}>
          <p className="text-sm font-medium text-mikai-700">
            Per passare a &ldquo;{next.nome}&rdquo; {mandatoryIncomplete.length === 1
              ? 'manca 1 attività obbligatoria'
              : `mancano ${mandatoryIncomplete.length} attività obbligatorie`}:
          </p>
          <ul className="text-sm text-mikai-600 space-y-1">
            {mandatoryIncomplete.slice(0, 5).map(a => (
              <li key={a.id} className="flex items-center gap-2">
                <Icon icon={FEEDBACK_ICONS.warning} size={14} className="text-yellow-500 flex-shrink-0" />
                {a.descrizione}
              </li>
            ))}
            {mandatoryIncomplete.length > 5 && (
              <li className="text-mikai-400">...e altre {mandatoryIncomplete.length - 5}</li>
            )}
          </ul>
        </div>
      )}

      {/* Advance state bar */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Prossimo stato</p>
            {!canAdvance && (
              <p className="mt-1 text-sm text-gray-500">
                Completa le attività obbligatorie prima di procedere
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
      </div>

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
