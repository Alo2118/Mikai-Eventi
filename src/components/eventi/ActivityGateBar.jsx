import { useState } from 'react'
import { useEventsStore } from '../../hooks/useEvents'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { FEEDBACK_ICONS, ACTION_ICONS } from '../../lib/icons'

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

const NEXT_STATE = {
  confermato: { stato: 'in_preparazione', label: 'Avvia preparazione', nome: 'in preparazione' },
  in_preparazione: { stato: 'pronto', label: 'Segna come pronto', nome: 'pronto' },
  pronto: { stato: 'in_corso', label: 'Avvia evento', nome: 'in corso' },
  in_corso: { stato: 'concluso', label: 'Concludi evento', nome: 'concluso' },
}

export function ActivityGateBar({ event, activities, onUpdate, materialShipped, hasMaterials, hasLogistics }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unreturnedMaterials, setUnreturnedMaterials] = useState([])
  const advanceEventState = useEventsStore(s => s.advanceEventState)
  const checkGateConcluded = useEventsStore(s => s.checkGateConcluded)
  const addToast = useToastStore(s => s.add)

  const next = NEXT_STATE[event.stato]
  if (!next) return null

  const mandatoryIncomplete = activities.filter(
    a => a.obbligatoria && !a.post_evento && a.stato !== 'completata' && a.stato !== 'disattivata'
  )

  // Gate for in_preparazione → pronto
  const activitiesReady = mandatoryIncomplete.length === 0
  const shipmentReady = !hasMaterials || materialShipped
  const hasContent = activities.length > 0 || hasMaterials || hasLogistics
  const canAdvance = event.stato !== 'in_preparazione' || (activitiesReady && shipmentReady)

  // Post-evento activities incomplete (warning for in_corso → concluso)
  const postEventoIncomplete = activities.filter(
    a => a.obbligatoria && a.post_evento && a.stato !== 'completata' && a.stato !== 'disattivata'
  )

  // Determine confirm dialog message
  function getConfirmMessage() {
    if (unreturnedMaterials.length > 0) {
      return `Attenzione: ${unreturnedMaterials.length} materiali non sono ancora rientrati. Vuoi concludere comunque?`
    }
    if (event.stato === 'in_corso' && postEventoIncomplete.length > 0) {
      return `Attenzione: ${postEventoIncomplete.length} attività post-evento non sono ancora completate. Vuoi concludere comunque?`
    }
    if (event.stato === 'in_preparazione' && !hasContent) {
      return 'Questo evento non ha attività, materiale o persone assegnate. Vuoi procedere alla fase successiva senza nessuna preparazione?'
    }
    if (event.stato === 'in_preparazione' && !shipmentReady) {
      return 'Il materiale non è stato ancora spedito. Vuoi procedere comunque?'
    }
    return `Confermi di voler passare l'evento a "${next.nome}"?`
  }

  async function handleAdvanceClick() {
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
      addToast(`Evento passato a: ${next.nome}`, 'success')
      if (onUpdate) onUpdate()
    }
  }

  // Explanation text for disabled state
  const blockerText = !activitiesReady && !shipmentReady
    ? 'Completa le attività obbligatorie e registra la spedizione'
    : !activitiesReady
      ? 'Completa le attività obbligatorie prima di procedere'
      : !shipmentReady
        ? 'Registra la spedizione del materiale prima di procedere'
        : null

  return (
    <div className="space-y-3">
      {mandatoryIncomplete.length > 0 && (
        <GateBlockerBanner items={mandatoryIncomplete} />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="primary"
          size="sm"
          disabled={!canAdvance || loading}
          onClick={handleAdvanceClick}
        >
          {next.label}
        </Button>
        {!canAdvance && blockerText && (
          <p className="text-xs text-gray-400">{blockerText}</p>
        )}
      </div>

      <ConfirmDialog
        open={showConfirm}
        title={next.label}
        message={getConfirmMessage()}
        confirmLabel="Conferma"
        danger={unreturnedMaterials.length > 0 || postEventoIncomplete.length > 0 || (event.stato === 'in_preparazione' && !hasContent)}
        onConfirm={handleConfirm}
        onCancel={() => { setShowConfirm(false); setUnreturnedMaterials([]) }}
      />
    </div>
  )
}
