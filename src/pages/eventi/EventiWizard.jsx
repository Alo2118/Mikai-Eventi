import { useState, useMemo, useEffect } from 'react'
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
import { ACTION_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { useToastStore } from '../../components/ui/Toast'

const DRAFT_KEY = 'mikai_wizard_draft'

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveDraft(step, data, promotore) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data, promotore }))
  } catch {
    // localStorage not available — silently ignore
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

const EMPTY_DATA = {
  tipo_evento: '',
  titolo: '',
  data_inizio: '',
  data_fine: '',
  luogo: '',
  sede_dettaglio: '',
  modalita: '',
  budget_previsto: '',
  note: '',
}

export function EventiWizard() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(EMPTY_DATA)
  const [promotore, setPromotore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showDraftBanner, setShowDraftBanner] = useState(() => !!loadDraft())
  // Tracks whether user has attempted to advance on each step (to show inline errors on first attempt)
  const [attemptedStep, setAttemptedStep] = useState({})
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

  // Auto-save draft with debounce to avoid saving on every keystroke
  useEffect(() => {
    if (showDraftBanner) return
    const timer = setTimeout(() => {
      saveDraft(step, data, promotore)
    }, 1500)
    return () => clearTimeout(timer)
  }, [step, data, promotore, showDraftBanner])

  const handleRestoreDraft = () => {
    const draft = loadDraft()
    if (!draft) return
    setData(draft.data ?? EMPTY_DATA)
    setPromotore(draft.promotore ?? null)
    setStep(draft.step ?? 0)
    setShowDraftBanner(false)
  }

  const handleDiscardDraft = () => {
    clearDraft()
    setShowDraftBanner(false)
  }

  const canNext = () => {
    if (step === 0) return !!data.tipo_evento && !!promotore
    if (step === 1) return !!data.titolo && !!data.data_inizio && !!data.luogo
    if (step === 2) return !!data.modalita
    return true
  }

  const handleNext = () => {
    if (!canNext()) {
      setAttemptedStep(s => ({ ...s, [step]: true }))
      return
    }
    setStep(step + 1)
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
      clearDraft()
      addToast('Evento proposto!', 'success')
      navigate(`/eventi/${created.id}`)
    }
  }

  const handleCancel = () => {
    clearDraft()
    navigate('/eventi')
  }

  const stepLabels = ['Tipo', 'Dove e quando', 'Modalità', 'Riepilogo']

  return (
    <div>
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumb items={[
          { label: 'Eventi', to: '/eventi' },
          { label: 'Nuova proposta' },
        ]} />
      </div>
      <MobileHeader title="Nuova proposta" subtitle={`Passo ${step + 1} di 4 — ${stepLabels[step]}`} />

      <div className="hidden md:block px-6 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">Nuova proposta evento</h1>
      </div>

      <div className="px-4 md:px-6">
        <WizardStepIndicator current={step} />
      </div>

      {showDraftBanner && (
        <div className="mx-4 md:mx-8 mb-2 max-w-2xl bg-mikai-50 border border-mikai-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon icon={FEEDBACK_ICONS.info} size={18} className="text-mikai-500 shrink-0" />
            <span className="text-sm text-gray-700">Hai una bozza salvata. Vuoi ripristinarla?</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={handleDiscardDraft}>Scarta</Button>
            <Button size="sm" onClick={handleRestoreDraft}>Ripristina</Button>
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 py-4 max-w-2xl">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <WizardStepTipo
                value={data.tipo_evento}
                onChange={(v) => setData({ ...data, tipo_evento: v })}
              />
              {attemptedStep[0] && !data.tipo_evento && (
                <p className="text-sm text-red-600 mt-2" role="alert">Seleziona un tipo di evento per continuare</p>
              )}
            </div>
            <PromoterePicker
              value={promotore?.id}
              onChange={(u) => { setPromotore(u) }}
              onBlur={() => setAttemptedStep(s => ({ ...s, [0]: true }))}
              currentUserId={user?.id}
              error={attemptedStep[0] && !promotore ? 'Seleziona chi propone l\'evento' : null}
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
            showErrors={!!attemptedStep[1]}
          />
        )}
        {step === 2 && (
          <div>
            <WizardStepModalita
              value={data.modalita}
              onChange={(v) => setData({ ...data, modalita: v })}
            />
            {attemptedStep[2] && !data.modalita && (
              <p className="text-sm text-red-600 mt-2" role="alert">Scegli una modalità per continuare</p>
            )}
          </div>
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

      <div className="px-4 md:px-6 py-4 flex justify-between max-w-2xl">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)} size="lg">
            <Icon icon={ACTION_ICONS.back} size={18} className="mr-1" />
            Indietro
          </Button>
        ) : (
          <Button variant="ghost" onClick={handleCancel} size="lg">
            Annulla
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={handleNext} size="lg">
            Avanti
            <Icon icon={ACTION_ICONS.forward} size={18} className="ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={loading} disabled={!canNext()} size="lg">
            Invia proposta
          </Button>
        )}
      </div>

    </div>
  )
}
