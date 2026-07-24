import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { AgentMaterialLossModal } from './AgentMaterialLossModal'
import { CARD_ITEM_STYLE } from '../../lib/constants'
import { MATERIALE_ICONS, MAGAZZINO_ICONS, ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { daysFromToday } from '../../lib/date-utils'

export function daysSinceUpdate(updatedAt) {
  if (!updatedAt) return 0
  return Math.max(0, daysFromToday(updatedAt))
}

function getDaysColor(days) {
  if (days > 30) return 'text-red-600'
  if (days >= 7) return 'text-yellow-600'
  return 'text-green-600'
}

function getDaysBg(days) {
  if (days > 30) return 'bg-red-50'
  if (days >= 7) return 'bg-yellow-50'
  return 'bg-green-50'
}

export function AgentMaterialCard({ material }) {
  const requestReturn = useMaterialsStore(s => s.requestReturnFromAgent)
  const ackPossession = useMaterialsStore(s => s.ackAgentPossession)
  const reportLoss = useMaterialsStore(s => s.reportAgentMaterialLoss)
  const addToast = useToastStore(s => s.add)
  const [busy, setBusy] = useState(null)
  const [confirmReturn, setConfirmReturn] = useState(false)
  const [lossOpen, setLossOpen] = useState(false)

  const productName = material.product?.nome || material.nome || 'Materiale'
  const brandName = material.product?.brand?.nome
  const days = daysSinceUpdate(material.updated_at)

  const rientroSegnalato = !!material.rientro_richiesto_at
  const persoSegnalato = !!material.segnalato_perso_at
  const locked = rientroSegnalato || persoSegnalato

  const handleReturn = async () => {
    setConfirmReturn(false)
    setBusy('rientro')
    const { error } = await requestReturn(material.id)
    setBusy(null)
    if (error) addToast('Non siamo riusciti a inviare la segnalazione. Riprova.', 'error')
    else addToast('Grazie! Il magazzino sa che stai riportando il materiale.', 'success')
  }

  const handleAck = async () => {
    setBusy('ack')
    const { error } = await ackPossession(material.id)
    setBusy(null)
    if (error) addToast('Non siamo riusciti a salvare. Riprova.', 'error')
    else addToast('Segnato: il materiale è ancora da te.', 'success')
  }

  const handleLoss = async (note, fotoUrl) => {
    const { error } = await reportLoss(material.id, note, fotoUrl)
    if (error) throw new Error('Non siamo riusciti a inviare la segnalazione. Riprova.')
    setLossOpen(false)
    addToast('Segnalazione inviata al magazzino.', 'success')
  }

  return (
    <div className={CARD_ITEM_STYLE + ' space-y-3'}>
      <div className="flex items-center gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getDaysBg(days)}`}>
          <Icon icon={MATERIALE_ICONS.package} size={18} className={getDaysColor(days)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">{productName}</p>
          {brandName && <p className="text-sm text-gray-500 truncate">{brandName}</p>}
        </div>
        <span className={`shrink-0 text-sm font-medium ${getDaysColor(days)}`}>
          {days === 0 ? 'Oggi' : `${days}gg`}
        </span>
      </div>

      {locked ? (
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${persoSegnalato ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <Icon
            icon={persoSegnalato ? FEEDBACK_ICONS.warning : MAGAZZINO_ICONS.rientro}
            size={18}
            className={persoSegnalato ? 'text-red-600 shrink-0' : 'text-green-600 shrink-0'}
          />
          <div className="min-w-0">
            <p className={`text-sm font-medium ${persoSegnalato ? 'text-red-700' : 'text-green-700'}`}>
              {persoSegnalato
                ? 'Segnalato al magazzino come consumato o perso'
                : 'Hai segnalato il rientro. Il magazzino ti aspetta.'}
            </p>
            <p className={`text-sm mt-0.5 ${persoSegnalato ? 'text-red-600' : 'text-green-600'}`}>
              Hai segnalato per errore? Avvisa il magazzino.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button variant="primary" onClick={() => setConfirmReturn(true)} loading={busy === 'rientro'} disabled={busy != null}>
            <Icon icon={MAGAZZINO_ICONS.rientro} size={18} className="mr-2" />
            L'ho riportato
          </Button>
          <Button variant="secondary" onClick={handleAck} loading={busy === 'ack'} disabled={busy != null}>
            <Icon icon={ACTION_ICONS.check} size={18} className="mr-2" />
            Ancora da me
          </Button>
          <Button variant="secondary" onClick={() => setLossOpen(true)} disabled={busy != null}>
            <Icon icon={FEEDBACK_ICONS.warning} size={18} className="mr-2" />
            Consumato / Perso
          </Button>
        </div>
      )}

      <Link to={`/materiale/${material.id}`} className="block text-center text-sm text-mikai-600 font-medium hover:text-mikai-700 py-2">
        Vedi dettaglio
      </Link>

      <ConfirmDialog
        open={confirmReturn}
        title="Confermi il rientro?"
        message="Avvisiamo il magazzino che stai riportando questo materiale. Portalo in sede quando puoi. La segnalazione non è annullabile dall'app: se sbagli, avvisa il magazzino."
        confirmLabel="Sì, lo riporto"
        cancelLabel="Annulla"
        onConfirm={handleReturn}
        onCancel={() => setConfirmReturn(false)}
      />

      <AgentMaterialLossModal
        open={lossOpen}
        materialId={material.id}
        materialName={productName}
        onConfirm={handleLoss}
        onCancel={() => setLossOpen(false)}
      />
    </div>
  )
}
