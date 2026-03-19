import { useState, useEffect } from 'react'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { useToastStore } from '../ui/Toast'

export function EventApprovalBar({ event, onUpdate }) {
  const [showReject, setShowReject] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [canApproveThreshold, setCanApproveThreshold] = useState(false)
  const approveEvent = useEventsStore(s => s.approveEvent)
  const rejectEvent = useEventsStore(s => s.rejectEvent)
  const cancelEvent = useEventsStore(s => s.cancelEvent)
  const canAreaManagerApprove = useEventsStore(s => s.canAreaManagerApprove)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const hasRole = useAuthStore(s => s.hasRole)
  const addToast = useToastStore(s => s.add)

  useEffect(() => {
    if (event.stato === 'proposto' && hasPermission('approva_eventi')) {
      if (hasRole('area_manager')) {
        canAreaManagerApprove(event).then(setCanApproveThreshold)
      } else {
        setCanApproveThreshold(true)
      }
    }
  }, [event.id, event.stato])

  const canApprove = hasPermission('approva_eventi') && event.stato === 'proposto' && canApproveThreshold
  const canCancel = hasPermission('approva_eventi') && !['concluso', 'cancellato'].includes(event.stato)

  if (!canApprove && !canCancel) return null

  const handleApprove = async () => {
    setLoading(true)
    const { error } = await approveEvent(event.id)
    setLoading(false)
    if (error) addToast(error, 'error')
    else { addToast('Evento approvato!', 'success'); onUpdate?.() }
  }

  const handleReject = async () => {
    if (!motivo.trim()) return
    setLoading(true)
    const { error } = await rejectEvent(event.id, motivo)
    setLoading(false)
    setShowReject(false)
    if (error) addToast(error, 'error')
    else { addToast('Evento rifiutato', 'success'); onUpdate?.() }
  }

  const handleCancel = async () => {
    if (!motivo.trim()) return
    setLoading(true)
    const { error } = await cancelEvent(event.id, motivo)
    setLoading(false)
    setShowReject(false)
    if (error) addToast(error, 'error')
    else { addToast('Evento annullato', 'success'); onUpdate?.() }
  }

  return (
    <>
      <div className="flex flex-col gap-3 p-5 bg-yellow-50 border-2 border-yellow-300 rounded-xl" role="alert">
        {/* Messaggio esplicito */}
        <div className="flex items-center gap-3">
          <Icon icon={FEEDBACK_ICONS.warning} size={24} className="text-yellow-600 flex-shrink-0" />
          <p className="text-base font-semibold text-yellow-800">
            {canApprove
              ? 'Questo evento richiede la tua approvazione'
              : 'Puoi annullare questo evento se necessario'}
          </p>
        </div>

        {/* Bottoni azione */}
        <div className="flex flex-wrap gap-3">
          {canApprove && (
            <>
              <Button onClick={handleApprove} loading={loading} size="lg">
                <Icon icon={ACTION_ICONS.approve} size={18} className="mr-2" />
                Approva evento
              </Button>
              <Button variant="danger" onClick={() => setShowReject(true)} size="lg">
                <Icon icon={ACTION_ICONS.reject} size={18} className="mr-2" />
                Rifiuta
              </Button>
            </>
          )}
          {canCancel && event.stato !== 'proposto' && (
            <Button variant="danger" onClick={() => setShowReject(true)} size="lg">
              Annulla evento
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showReject}
        title={event.stato === 'proposto' ? 'Rifiuta evento' : 'Annulla evento'}
        message={
          <div className="space-y-3">
            <p>{event.stato === 'proposto' ? 'Inserisci il motivo del rifiuto' : "Inserisci il motivo dell'annullamento"}</p>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[100px] focus:ring-2 focus:ring-mikai-400"
              placeholder="Motivo..."
              required
            />
          </div>
        }
        confirmLabel={event.stato === 'proposto' ? 'Rifiuta' : 'Annulla evento'}
        onConfirm={event.stato === 'proposto' ? handleReject : handleCancel}
        onCancel={() => { setShowReject(false); setMotivo('') }}
        danger
      />
    </>
  )
}
