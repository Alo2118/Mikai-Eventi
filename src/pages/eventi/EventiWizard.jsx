import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
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
  // Per-field touched state for on-blur validation (steps 0 and 2)
  const [touched, setTouched] = useState({})
  // Draft save indicator: 'idle' | 'saving' | 'saved'
  const [saveStatus, setSaveStatus] = useState('idle')
  const saveTimerRef = useRef(null)
  // Exit warning state
  const [showExitDialog, setShowExitDialog] = useState(false)
  // Track if form was successfully submitted (to skip exit warning)
  const submittedRef = useRef(false)

  const navigate = useNavigate()
  const createEvent = useEventsStore(s => s.createEvent)
  const user = useAuthStore(s => s.user)
  const profile = useAuthStore(s => s.profile)
  const users = useAdminStore(s => s.users)
  const addToast = useToastStore(s => s.add)

  const isAgentPromotore = promotore?._type === 'contact'

  // Detect if the form has any changes from the initial empty state
  const hasChanges = useMemo(() => {
    if (promotore) return true
    return Object.keys(EMPTY_DATA).some(key => data[key] !== EMPTY_DATA[key])
  }, [data, promotore])

  // Browser beforeunload warning
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    if (hasChanges && !submittedRef.current) {
      window.addEventListener('beforeunload', handler)
    }
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // Auto-calcolo manager dal promotore selezionato (solo per utenti interni)
  const manager = useMemo(() => {
    if (isAgentPromotore) return null
    if (!promotore?.responsabile_id || !users?.length) return null
    return users.find(u => u.id === promotore.responsabile_id) || null
  }, [promotore, users, isAgentPromotore])

  const promotoreNome = promotore ? `${promotore.cognome} ${promotore.nome}` : null
  const managerNome = manager ? `${manager.cognome} ${manager.nome}` : null

  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }, [])

  // Helper: is a field showing its error? (touched individually or step advance attempted)
  const showFieldError = useCallback((field, stepNum) => {
    return touched[field] || attemptedStep[stepNum]
  }, [touched, attemptedStep])

  // Auto-save draft with debounce + visual indicator
  useEffect(() => {
    if (showDraftBanner) return
    const timer = setTimeout(() => {
      setSaveStatus('saving')
      saveDraft(step, data, promotore)
      // Brief saving state, then show saved
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus('saved')
        saveTimerRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      }, 300)
    }, 1500)
    return () => clearTimeout(timer)
  }, [step, data, promotore, showDraftBanner])

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

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
      // Mark all fields in current step as touched
      if (step === 0) {
        setTouched(t => ({ ...t, tipo_evento: true, promotore: true }))
      } else if (step === 2) {
        setTouched(t => ({ ...t, modalita: true }))
      }
      return
    }
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const payload = {
      ...data,
      budget_previsto: data.budget_previsto === '' ? null : data.budget_previsto,
      note: data.note || null,
      data_fine: data.data_fine || data.data_inizio,
      created_by: user.id,
      stato: 'proposto',
    }
    if (isAgentPromotore) {
      payload.promotore_contact_id = promotore.id
      payload.promotore_id = null
      payload.manager_user_id = null
    } else {
      payload.promotore_id = promotore.id
      payload.promotore_contact_id = null
      payload.manager_user_id = promotore.responsabile_id || null
    }
    const { data: created, error } = await createEvent(payload)
    setLoading(false)
    if (error) {
      addToast(error, 'error')
    } else {
      submittedRef.current = true
      clearDraft()
      addToast('Evento proposto!', 'success')
      navigate(`/eventi/${created.id}`)
    }
  }

  // Cancel / exit with unsaved changes check
  const handleCancel = () => {
    if (hasChanges) {
      setShowExitDialog(true)
    } else {
      clearDraft()
      navigate('/eventi')
    }
  }

  const confirmExit = () => {
    setShowExitDialog(false)
    clearDraft()
    navigate('/eventi')
  }

  const stepLabels = ['Tipo', 'Dove e quando', 'Modalità', 'Riepilogo']

  // Step 0 field errors (on-blur)
  const step0Errors = {
    tipo_evento: showFieldError('tipo_evento', 0) && !data.tipo_evento
      ? 'Seleziona un tipo di evento per continuare' : null,
    promotore: showFieldError('promotore', 0) && !promotore
      ? 'Seleziona chi propone l\'evento' : null,
  }

  // Step 2 field error (on-blur)
  const step2Error = showFieldError('modalita', 2) && !data.modalita
    ? 'Scegli una modalità per continuare' : null

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Nuova proposta evento</h1>
          <DraftSaveIndicator status={saveStatus} />
        </div>
      </div>

      <div className="px-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <WizardStepIndicator current={step} />
          </div>
          <div className="md:hidden">
            <DraftSaveIndicator status={saveStatus} />
          </div>
        </div>
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
                onChange={(v) => { setData({ ...data, tipo_evento: v }); handleBlur('tipo_evento') }}
              />
              {step0Errors.tipo_evento && (
                <p className="text-sm text-red-600 mt-2" role="alert">{step0Errors.tipo_evento}</p>
              )}
            </div>
            <div>
              <PromoterePicker
                value={promotore?.id}
                onChange={(u) => { setPromotore(u); handleBlur('promotore') }}
                onBlur={() => handleBlur('promotore')}
                currentUserId={user?.id}
                error={step0Errors.promotore}
              />
              <p className="text-sm text-gray-500 mt-1.5">
                Il referente verr\u00e0 assegnato automaticamente in base alla zona del promotore
              </p>
            </div>
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
              onChange={(v) => { setData({ ...data, modalita: v }); handleBlur('modalita') }}
            />
            {step2Error && (
              <p className="text-sm text-red-600 mt-2" role="alert">{step2Error}</p>
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

      <ConfirmDialog
        open={showExitDialog}
        title="Uscire dalla proposta?"
        message="Hai modifiche non salvate. La bozza rimarr\u00e0 salvata nel browser, ma potresti perdere le ultime modifiche."
        confirmLabel="Esci"
        cancelLabel="Resta"
        onConfirm={confirmExit}
        onCancel={() => setShowExitDialog(false)}
        danger
      />
    </div>
  )
}

/** Draft auto-save status indicator */
function DraftSaveIndicator({ status }) {
  if (status === 'idle') return null

  return (
    <div className="flex items-center gap-1.5 text-sm shrink-0" role="status">
      {status === 'saving' && (
        <>
          <Icon icon={FEEDBACK_ICONS.loading} size={14} className="text-gray-400 animate-spin" />
          <span className="text-gray-400">Salvataggio...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Icon icon={FEEDBACK_ICONS.success} size={14} className="text-green-500" />
          <span className="text-green-600">Bozza salvata</span>
        </>
      )}
    </div>
  )
}
