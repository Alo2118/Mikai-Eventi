import { useState, useEffect } from 'react'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { TEXTAREA_STYLE } from '../../lib/constants'
import { useToastStore } from '../ui/Toast'

export function EventApprovalBar({ event, onUpdate }) {
  const [showReject, setShowReject] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [canApproveThreshold, setCanApproveThreshold] = useState(false)
  const approveEvent = useEventsStore(s => s.approveEvent)
  const rejectEvent = useEventsStore(s => s.rejectEvent)
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
  const budgetBlocked = hasPermission('approva_eventi') && event.stato === 'proposto' && hasRole('area_manager') && !canApproveThreshold

  // Only show for proposto state (cancel is now in StatusFlow)
  if (!canApprove && !budgetBlocked) return null

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

  return (
    <>
      {budgetBlocked && (
        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-300 rounded-xl" role="status">
          <Icon icon={FEEDBACK_ICONS.info} size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            Il budget supera la soglia per il tuo ruolo. Richiede approvazione della Direzione.
          </p>
        </div>
      )}
      {canApprove && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-xl">
          <Icon icon={FEEDBACK_ICONS.warning} size={16} className="text-yellow-600 flex-shrink-0" />
          <span className="text-sm font-medium text-yellow-800 flex-1">Richiede approvazione</span>
          <Button size="sm" onClick={handleApprove} loading={loading}>
            <Icon icon={ACTION_ICONS.approve} size={14} className="mr-1" />Approva
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowReject(true)}>
            <Icon icon={ACTION_ICONS.reject} size={14} className="mr-1" />Rifiuta
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={showReject}
        title="Rifiuta evento"
        message={
          <div className="space-y-3">
            <p>Inserisci il motivo del rifiuto</p>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              className={TEXTAREA_STYLE} placeholder="Motivo..." required />
          </div>
        }
        confirmLabel="Rifiuta"
        onConfirm={handleReject}
        onCancel={() => { setShowReject(false); setMotivo('') }}
        danger
      />
    </>
  )
}
