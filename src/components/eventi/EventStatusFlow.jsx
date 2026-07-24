import { useState } from 'react'
import { STATO_EVENTO_ICONS, ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { TEXTAREA_STYLE } from '../../lib/constants'
import { todayISO, isOnOrBefore } from '../../lib/date-utils'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'

const steps = ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso', 'concluso']
const SHORT_LABELS = {
  proposto: 'Proposto',
  confermato: 'Approvato',
  in_preparazione: 'Preparazione',
  pronto: 'Pronto',
  in_corso: 'In corso',
  concluso: 'Concluso',
}

const ADVANCE_MAP = {
  confermato: 'in_preparazione',
  in_preparazione: 'pronto',
  pronto: 'in_corso',
  in_corso: 'concluso',
}

// Which states can go back (and to which)
const REVERT_MAP = {
  in_preparazione: 'confermato',
  pronto: 'in_preparazione',
  in_corso: 'pronto',
}

export function EventStatusFlow({ event, onUpdate, canAdvance, blockerText, hasContent, noActivities }) {
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'advance'|'revert'|'cancel', target }
  const [loading, setLoading] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [unreturnedMaterials, setUnreturnedMaterials] = useState([])
  const [gateErrore, setGateErrore] = useState(null)
  const advanceEventState = useEventsStore(s => s.advanceEventState)
  const cancelEvent = useEventsStore(s => s.cancelEvent)
  const checkGateConcluded = useEventsStore(s => s.checkGateConcluded)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const stato = event?.stato || 'proposto'
  const currentIndex = steps.indexOf(stato)
  const nextStato = ADVANCE_MAP[stato]
  const prevStato = REVERT_MAP[stato]
  const nextIndex = nextStato ? steps.indexOf(nextStato) : -1
  const prevIndex = prevStato ? steps.indexOf(prevStato) : -1
  const isAdvanceable = canAdvance && nextStato && onUpdate
  const canRevert = prevStato && onUpdate && hasPermission('approva_eventi')
  const canCancel = hasPermission('approva_eventi') && !['concluso', 'cancellato', 'proposto'].includes(stato)

  if (stato === 'cancellato') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
        <Icon icon={STATO_EVENTO_ICONS.cancellato} size={16} className="text-red-600" />
        <span className="text-sm font-medium text-red-800">Evento annullato</span>
      </div>
    )
  }
  if (stato === 'rifiutato') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
        <Icon icon={STATO_EVENTO_ICONS.rifiutato} size={16} className="text-red-600" />
        <span className="text-sm font-medium text-red-800">Evento rifiutato</span>
      </div>
    )
  }

  async function handleClick(type, target) {
    if (type === 'advance' && stato === 'in_corso') {
      const { canAdvance: matOk, unreturned, errore } = await checkGateConcluded(event.id)
      if (errore) {
        // Query fail-closed (checkGateConcluded): non sappiamo quanti materiali manchino,
        // non mostrare un conteggio fuorviante — resta soft-gate, ma con messaggio onesto.
        setUnreturnedMaterials([])
        setGateErrore(errore)
        addToast(errore, 'error')
      } else {
        setGateErrore(null)
        if (!matOk) {
          setUnreturnedMaterials(unreturned)
          addToast(`${unreturned.length} materiali non ancora rientrati`, 'warning')
        }
      }
    }
    setConfirmAction({ type, target })
  }

  async function handleConfirm() {
    setLoading(true)
    if (confirmAction.type === 'cancel') {
      if (!cancelMotivo.trim()) { setLoading(false); return }
      const { error } = await cancelEvent(event.id, cancelMotivo)
      setLoading(false)
      if (error) addToast(error, 'error')
      else { addToast('Evento annullato', 'success'); onUpdate?.() }
    } else {
      const { error } = await advanceEventState(event.id, confirmAction.target)
      setLoading(false)
      if (error) addToast('Impossibile aggiornare lo stato. Riprova.', 'error')
      else { addToast(`Evento passato a: ${SHORT_LABELS[confirmAction.target]}`, 'success'); onUpdate?.() }
    }
    setConfirmAction(null)
    setUnreturnedMaterials([])
    setGateErrore(null)
    setCancelMotivo('')
  }

  function getConfirmTitle() {
    if (!confirmAction) return ''
    if (confirmAction.type === 'cancel') return 'Annulla evento'
    if (confirmAction.type === 'revert') return `Torna a ${SHORT_LABELS[confirmAction.target]}`
    return `Passa a ${SHORT_LABELS[confirmAction.target]}`
  }

  function getConfirmMessage() {
    if (!confirmAction) return ''
    if (confirmAction.type === 'cancel') {
      return (
        <div className="space-y-3">
          <p>Inserisci il motivo dell'annullamento</p>
          <textarea value={cancelMotivo} onChange={e => setCancelMotivo(e.target.value)}
            className={TEXTAREA_STYLE} placeholder="Motivo..." required />
        </div>
      )
    }
    if (confirmAction.type === 'revert') {
      return `Vuoi riportare l'evento a "${SHORT_LABELS[confirmAction.target]}"? Le attività e i dati non verranno persi.`
    }
    if (gateErrore) {
      return `${gateErrore} Vuoi concludere comunque?`
    }
    if (unreturnedMaterials.length > 0) {
      return `${unreturnedMaterials.length} materiali non ancora rientrati. Vuoi concludere comunque?`
    }
    if (stato === 'in_preparazione' && hasContent === false) {
      return 'Questo evento non ha attività, materiale o persone. Vuoi procedere senza preparazione?'
    }
    // Zero attività (nessun modello per il tipo evento): non lasciar passare in
    // silenzio, chiedi conferma esplicita che non c'è una checklist da completare.
    if (stato === 'in_preparazione' && noActivities) {
      return 'Questo evento non ha attività di preparazione da completare. Vuoi procedere comunque?'
    }
    return `Confermi di voler passare l'evento a "${SHORT_LABELS[confirmAction.target]}"?`
  }

  // Nudge consapevole delle date: non forza la transizione (la direzione vuole
  // conferma manuale), ma suggerisce il passo quando le date lo indicano. Il click
  // riusa handleClick('advance') → stessa conferma e stesso gate rientri di uno step.
  const oggi = todayISO()
  let nudge = null
  if (isAdvanceable) {
    if (stato === 'pronto' && event?.data_inizio && isOnOrBefore(event.data_inizio, oggi)) {
      nudge = { text: "L'evento è iniziato: passa a In corso", target: 'in_corso', tone: 'mikai' }
    } else if (stato === 'in_corso' && event?.data_fine && !isOnOrBefore(oggi, event.data_fine)) {
      nudge = { text: "L'evento è concluso: chiudilo per liberare il materiale", target: 'concluso', tone: 'amber' }
    }
  }
  const nudgeTone = nudge?.tone === 'amber'
    ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
    : 'bg-mikai-50 border-mikai-200 text-mikai-700 hover:bg-mikai-100'
  const nudgeIconColor = nudge?.tone === 'amber' ? 'text-amber-500' : 'text-mikai-500'

  return (
    <>
      {nudge && (
        <button
          type="button"
          onClick={() => handleClick('advance', nudge.target)}
          className={`w-full flex items-center gap-3 min-h-[48px] px-4 py-3 rounded-xl border mb-2 text-left transition-colors ${nudgeTone}`}
          aria-label={nudge.text}
        >
          <Icon icon={FEEDBACK_ICONS.info} size={20} className={`shrink-0 ${nudgeIconColor}`} />
          <span className="flex-1 text-base font-medium">{nudge.text}</span>
          <Icon name="forward" size={18} className="shrink-0 opacity-60" />
        </button>
      )}
      <div className="space-y-1">
        <div className="flex items-center gap-0.5 py-1 overflow-x-auto">
          {steps.map((step, i) => {
            const isDone = i < currentIndex
            const isCurrent = i === currentIndex
            const isNext = i === nextIndex
            const isPrev = i === prevIndex
            const StepIcon = STATO_EVENTO_ICONS[step]

            const clickableAdvance = isNext && isAdvanceable
            const clickableRevert = isPrev && canRevert

            let onClick = null
            let title = SHORT_LABELS[step]
            let cursorClass = 'cursor-default'

            if (clickableAdvance) {
              onClick = () => handleClick('advance', nextStato)
              title = `Passa a ${SHORT_LABELS[step]}`
              cursorClass = 'cursor-pointer'
            } else if (clickableRevert) {
              onClick = () => handleClick('revert', prevStato)
              title = `Torna a ${SHORT_LABELS[step]}`
              cursorClass = 'cursor-pointer'
            } else if (isCurrent && canCancel) {
              onClick = () => handleClick('cancel')
              title = 'Annulla evento'
              cursorClass = 'cursor-pointer'
            } else if (isNext && !canAdvance) {
              title = blockerText || SHORT_LABELS[step]
            }

            return (
              <div key={step} className="flex items-center">
                {i > 0 && (
                  <div className={`w-4 md:w-6 h-0.5 shrink-0 ${isDone ? 'bg-mikai-400' : 'bg-gray-200'}`} />
                )}
                <button
                  type="button"
                  disabled={!onClick}
                  onClick={onClick || undefined}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full shrink-0 transition-all ${cursorClass} ${
                    isCurrent
                      ? `bg-mikai-100 ring-1 ring-mikai-400 ${canCancel ? 'hover:ring-red-300 hover:bg-red-50' : ''}`
                      : isDone
                        ? `bg-mikai-50 ${clickableRevert ? 'hover:bg-yellow-50 hover:ring-1 hover:ring-yellow-300' : ''}`
                        : clickableAdvance
                          ? 'hover:bg-green-50 hover:ring-1 hover:ring-green-300'
                          : ''
                  }`}
                  title={title}
                  aria-label={onClick ? title : SHORT_LABELS[step]}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isDone
                      ? `bg-mikai-400 text-white ${clickableRevert ? 'group-hover:bg-yellow-400' : ''}`
                      : isCurrent
                        ? 'bg-mikai-500 text-white'
                        : clickableAdvance
                          ? 'bg-green-100 text-green-600 ring-1 ring-green-300'
                          : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isDone ? (
                      clickableRevert ? <Icon name="back" size={12} /> : <Icon name="check" size={13} />
                    ) : clickableAdvance ? (
                      <Icon name="forward" size={13} />
                    ) : isCurrent && canCancel ? (
                      <Icon icon={StepIcon} size={13} />
                    ) : (
                      <Icon icon={StepIcon} size={13} />
                    )}
                  </div>
                  <span className={`text-xs whitespace-nowrap ${
                    isCurrent ? 'font-semibold text-mikai-700' :
                    isDone ? `text-gray-600 hidden md:inline ${clickableRevert ? 'group-hover:text-yellow-700' : ''}` :
                    clickableAdvance ? 'font-medium text-green-700 hidden md:inline' :
                    'text-gray-400 hidden md:inline'
                  }`}>
                    {SHORT_LABELS[step]}
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        {nextStato && !canAdvance && blockerText && (
          <p className="text-xs text-gray-400 pl-1">{blockerText}</p>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={getConfirmTitle()}
        message={getConfirmMessage()}
        confirmLabel={confirmAction?.type === 'cancel' ? 'Annulla evento' : 'Conferma'}
        danger={confirmAction?.type === 'cancel' || confirmAction?.type === 'revert' || unreturnedMaterials.length > 0 || !!gateErrore || (stato === 'in_preparazione' && (hasContent === false || noActivities))}
        onConfirm={handleConfirm}
        onCancel={() => { setConfirmAction(null); setUnreturnedMaterials([]); setGateErrore(null); setCancelMotivo('') }}
      />
    </>
  )
}
