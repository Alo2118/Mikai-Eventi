import { useState } from 'react'
import { useEventsStore } from '../../hooks/useEvents'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'
import { SUMMARY_BAR_STYLE } from '../../lib/constants'

function GateBlockerBanner({ items }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-mikai-50 border border-mikai-200 rounded-xl px-3 py-1.5">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left min-h-[48px] md:min-h-[32px]">
        <Icon icon={FEEDBACK_ICONS.warning} size={14} className="text-yellow-500 shrink-0" />
        <span className="text-xs font-medium text-mikai-700 flex-1">
          {items.length === 1 ? 'Manca 1 attività obbligatoria' : `Mancano ${items.length} attività obbligatorie`}
        </span>
        <Icon icon={ACTION_ICONS.chevronDown} size={14} className={`text-mikai-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <ul className="text-xs text-mikai-600 space-y-px pb-1.5">
          {items.slice(0, 10).map(a => (
            <li key={a.id} className="pl-6 py-0.5">{a.descrizione}</li>
          ))}
          {items.length > 10 && (
            <li className="text-mikai-400 pl-6">...e altre {items.length - 10}</li>
          )}
        </ul>
      )}
    </div>
  )
}

// Maps current stato → next stato + button label + human-readable name
const NEXT_STATE = {
  confermato: { stato: 'in_preparazione', label: 'Avvia preparazione', nome: 'in preparazione' },
  in_preparazione: { stato: 'pronto', label: 'Segna come pronto', nome: 'pronto' },
  pronto: { stato: 'in_corso', label: 'Avvia evento', nome: 'in corso' },
  in_corso: { stato: 'concluso', label: 'Concludi evento', nome: 'concluso' },
}

export function ActivityGateBar({ event, activities, onUpdate, materialShipped }) {
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
  // Gates: in_preparazione → pronto requires all mandatory activities complete AND material shipped
  // materialShipped: true if no materials exist, or all are spedito, or spedizione_data is set
  const activitiesReady = mandatoryIncomplete.length === 0
  const shipmentReady = materialShipped !== false // undefined = no materials, true = shipped
  const canAdvance = event.stato !== 'in_preparazione' || (activitiesReady && shipmentReady)

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
      if (onUpdate) onUpdate()
    }
  }

  return (
    <div className="space-y-3">
      {/* Gate blocker banner — visible when mandatory activities are incomplete */}
      {mandatoryIncomplete.length > 0 && (
        <GateBlockerBanner items={mandatoryIncomplete} />
      )}

      {/* Advance state bar — compact inline */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="primary"
          size="sm"
          disabled={!canAdvance || loading}
          onClick={handleAdvanceClick}
        >
          {next.label}
        </Button>
        {!canAdvance && (
          <p className="text-xs text-gray-400">
            {!activitiesReady && !shipmentReady
              ? 'Completa le attività obbligatorie e registra la spedizione del materiale'
              : !activitiesReady
                ? 'Completa le attività obbligatorie prima di procedere'
                : 'Registra la spedizione del materiale prima di procedere'
            }
          </p>
        )}
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
