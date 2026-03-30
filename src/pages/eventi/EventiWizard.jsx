import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventsStore } from '../../hooks/useEvents'
import { useAuthStore } from '../../hooks/useAuth'
import { useAdminStore } from '../../hooks/useAdmin'
import { WizardStepIndicator } from '../../components/eventi/WizardStepIndicator'
import { WizardStepTipo } from '../../components/eventi/WizardStepTipo'
import { WizardStepDove } from '../../components/eventi/WizardStepDove'
import { WizardStepModalita } from '../../components/eventi/WizardStepModalita'
import { WizardStepRiepilogo } from '../../components/eventi/WizardStepRiepilogo'
import { PromoterePicker } from '../../components/eventi/PromoterePicker'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { useToastStore } from '../../components/ui/Toast'

export function EventiWizard() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    tipo_evento: '',
    titolo: '',
    data_inizio: '',
    data_fine: '',
    luogo: '',
    sede_dettaglio: '',
    modalita: '',
    budget_previsto: '',
    note: '',
  })
  const [promotore, setPromotore] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const createEvent = useEventsStore(s => s.createEvent)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const users = useAdminStore(s => s.users)
  const addToast = useToastStore(s => s.add)

  // Auto-calcolo manager dal promotore selezionato
  const manager = useMemo(() => {
    if (!promotore?.responsabile_id || !users?.length) return null
    return users.find(u => u.id === promotore.responsabile_id) || null
  }, [promotore, users])

  const promotoreNome = promotore ? `${promotore.cognome} ${promotore.nome}` : null
  const managerNome = manager ? `${manager.cognome} ${manager.nome}` : null

  const canNext = () => {
    if (step === 0) return !!data.tipo_evento && !!promotore
    if (step === 1) return !!data.titolo && !!data.data_inizio && !!data.luogo
    if (step === 2) return !!data.modalita
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    const { data: created, error } = await createEvent({
      ...data,
      budget_previsto: data.budget_previsto === '' ? null : data.budget_previsto,
      note: data.note || null,
      data_fine: data.data_fine || data.data_inizio,
      promotore_id: promotore.id,
      created_by: user.id,
      manager_user_id: promotore.responsabile_id || null,
      stato: 'proposto',
    })
    setLoading(false)
    if (error) {
      addToast(error, 'error')
    } else {
      addToast('Evento proposto!', 'success')
      navigate(`/eventi/${created.id}`)
    }
  }

  const stepLabels = ['Tipo', 'Dove e quando', 'Modalità', 'Riepilogo']

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Eventi', to: '/eventi' },
          { label: 'Nuova proposta' },
        ]} />
      </div>
      <MobileHeader title="Nuova proposta" subtitle={`Passo ${step + 1} di 4 — ${stepLabels[step]}`} />

      <div className="hidden md:block px-8 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">Nuova proposta evento</h1>
      </div>

      <div className="px-4 md:px-8">
        <WizardStepIndicator current={step} />
      </div>

      <div className="px-4 md:px-8 py-4 max-w-2xl">
        {step === 0 && (
          <div className="space-y-6">
            <WizardStepTipo
              value={data.tipo_evento}
              onChange={(v) => setData({ ...data, tipo_evento: v })}
            />
            <PromoterePicker
              value={promotore?.id}
              onChange={setPromotore}
              currentUserId={user?.id}
            />
            {manager && (
              <p className="text-sm text-gray-500">
                Referente: <span className="font-medium text-gray-700">{managerNome}</span>
              </p>
            )}
          </div>
        )}
        {step === 1 && (
          <WizardStepDove
            data={data}
            onChange={(d) => setData({ ...data, ...d })}
          />
        )}
        {step === 2 && (
          <WizardStepModalita
            value={data.modalita}
            onChange={(v) => setData({ ...data, modalita: v })}
          />
        )}
        {step === 3 && (
          <WizardStepRiepilogo
            data={data}
            onChange={(d) => setData({ ...data, ...d })}
            promotoreNome={promotoreNome}
            managerNome={managerNome}
          />
        )}
      </div>

      <div className="px-4 md:px-8 py-4 flex justify-between max-w-2xl">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)} size="lg">
            <Icon icon={ACTION_ICONS.back} size={18} className="mr-1" />
            Indietro
          </Button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} size="lg">
            Avanti
            <Icon icon={ACTION_ICONS.forward} size={18} className="ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={loading} disabled={!canNext()} size="lg">
            Invia proposta
          </Button>
        )}
      </div>

      {!canNext() && step < 3 && (
        <p className="px-4 md:px-8 text-sm text-gray-400 -mt-2">
          {step === 0 && !data.tipo_evento && 'Seleziona un tipo di evento per continuare'}
          {step === 0 && data.tipo_evento && !promotore && 'Seleziona chi propone l\'evento'}
          {step === 1 && 'Compila titolo, data e luogo per continuare'}
          {step === 2 && 'Scegli una modalità per continuare'}
        </p>
      )}
    </div>
  )
}
