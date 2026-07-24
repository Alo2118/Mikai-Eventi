import { useEffect, useState } from 'react'
import { useNotificationsStore } from '../../hooks/useNotifications'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { CARD_ITEM_STYLE } from '../../lib/constants'
import { NOTIFICA_ICONS } from '../../lib/icons'
import {
  isPushSupported,
  pushConfigured,
  getPushPermission,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../lib/push-notifications'

// Attivazione notifiche push (secondo canale, oltre a in-app ed email).
// INERTE se le chiavi VAPID non sono configurate o il browser non supporta il
// push: in quel caso il componente non renderizza nulla.
export function PushActivationCard() {
  const savePushSubscription = useNotificationsStore(s => s.savePushSubscription)
  const deletePushSubscription = useNotificationsStore(s => s.deletePushSubscription)
  const addToast = useToastStore(s => s.add)

  const supported = isPushSupported() && pushConfigured()
  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState('default')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!supported) return
    setPermission(getPushPermission())
    getExistingSubscription().then(sub => setSubscribed(Boolean(sub)))
  }, [supported])

  // Feature inerte: nessuna chiave VAPID o browser non compatibile → nascondi.
  if (!supported) return null

  const handleActivate = async () => {
    setBusy(true)
    const { data, error } = await subscribeToPush()
    if (error) {
      setPermission(getPushPermission())
      setBusy(false)
      addToast(error, 'error')
      return
    }
    const { error: saveError } = await savePushSubscription(data)
    setBusy(false)
    if (saveError) {
      addToast('Non siamo riusciti a salvare le notifiche push. Riprova.', 'error')
      return
    }
    setSubscribed(true)
    setPermission('granted')
    addToast('Notifiche push attivate su questo dispositivo', 'success')
  }

  const handleDeactivate = async () => {
    setBusy(true)
    const { endpoint, error } = await unsubscribeFromPush()
    if (error) {
      setBusy(false)
      addToast(error, 'error')
      return
    }
    await deletePushSubscription(endpoint)
    setBusy(false)
    setSubscribed(false)
    addToast('Notifiche push disattivate su questo dispositivo', 'success')
  }

  const denied = permission === 'denied'
  const icon = subscribed ? NOTIFICA_ICONS.bell_ring : NOTIFICA_ICONS.bell_off

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Notifiche push sul dispositivo</h4>

      <div className={CARD_ITEM_STYLE + ' flex flex-col gap-3'}>
        <div className="flex items-start gap-3">
          <Icon icon={icon} size={22} className="text-mikai-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-base text-gray-900">
              {subscribed
                ? 'Le notifiche push sono attive su questo dispositivo.'
                : 'Ricevi un avviso anche quando l’app è chiusa.'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {subscribed
                ? 'Ti avvisiamo per approvazioni, materiale spedito e solleciti di rientro.'
                : 'Attiva le notifiche per non perdere approvazioni e aggiornamenti importanti, anche fuori sede.'}
            </p>
          </div>
        </div>

        {denied && !subscribed && (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2" role="alert">
            Le notifiche sono bloccate. Sbloccale dalle impostazioni del browser per questo sito, poi riprova.
          </p>
        )}

        <div className="flex justify-end">
          {subscribed ? (
            <Button variant="ghost" onClick={handleDeactivate} loading={busy}>
              Disattiva su questo dispositivo
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleActivate}
              loading={busy}
              disabled={denied}
              title={denied ? 'Sblocca prima le notifiche dalle impostazioni del browser' : undefined}
            >
              Attiva notifiche push
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
