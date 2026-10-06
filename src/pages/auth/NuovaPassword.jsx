import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../hooks/useAuth'
import { arrivedFromRecoveryLink } from '../../lib/supabase'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { useToastStore } from '../../components/ui/Toast'
import { PASSWORD_ICONS } from '../../lib/icons'
import { INPUT_STYLE } from '../../lib/constants'

const MIN_LENGTH = 8

// Codici errore Supabase Auth → messaggio comprensibile
const SAVE_ERRORS = {
  same_password: 'La nuova password deve essere diversa da quella che usavi prima.',
  weak_password: 'Password troppo semplice: usa lettere e numeri.',
}

// Atterraggio del link "recupera password" inviato da Supabase: il client ha già
// aperto la sessione dall'hash dell'URL, qui l'utente sceglie la nuova password.
export function NuovaPassword() {
  const session = useAuthStore(s => s.session)
  const authLoading = useAuthStore(s => s.loading)
  const setNewPassword = useAuthStore(s => s.setNewPassword)
  const addToast = useToastStore(s => s.add)
  const navigate = useNavigate()

  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (authLoading) {
    return <AuthLayout><p role="status" className="text-center text-gray-500">Caricamento…</p></AuthLayout>
  }
  // Già dentro senza link di recupero: per cambiarla si usa "Cambia password"
  if (session && !arrivedFromRecoveryLink) return <Navigate to="/" replace />
  if (!session) {
    return (
      <AuthLayout subtitle="Link non valido">
        <p className="text-base text-gray-700 mb-5" role="alert">
          Il link per cambiare la password è scaduto o è già stato usato. Richiedine uno nuovo.
        </p>
        <Link
          to="/password-dimenticata"
          className="flex items-center justify-center min-h-[48px] w-full rounded-lg bg-mikai-400 text-white text-base font-medium hover:bg-mikai-500"
        >
          Richiedi un nuovo link
        </Link>
      </AuthLayout>
    )
  }

  const tooShort = newPw.length > 0 && newPw.length < MIN_LENGTH
  const mismatch = confirmPw.length > 0 && newPw !== confirmPw
  const canSubmit = newPw.length >= MIN_LENGTH && newPw === confirmPw && !saving

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { error: err, code } = await setNewPassword(newPw)
    setSaving(false)
    if (err) {
      setError(SAVE_ERRORS[code] || 'Non siamo riusciti a salvare la nuova password. Riprova.')
      return
    }
    addToast('Password aggiornata! Sei dentro.', 'success')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout subtitle="Scegli una nuova password">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-base text-gray-600">
          Account: <strong>{session.user?.email}</strong>
        </p>
        <div>
          <label htmlFor="new-pw" className="block text-base font-medium text-gray-700 mb-1">
            Nuova password *
          </label>
          <div className="relative">
            <input
              id="new-pw"
              type={showPw ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className={INPUT_STYLE + ' pr-14'}
              aria-describedby="new-pw-hint"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
            >
              <Icon icon={showPw ? PASSWORD_ICONS.eyeOff : PASSWORD_ICONS.eye} size={20} />
            </button>
          </div>
          <p id="new-pw-hint" className={`text-sm mt-1 ${tooShort ? 'text-red-600' : 'text-gray-500'}`}>
            Almeno {MIN_LENGTH} caratteri
          </p>
        </div>

        <div>
          <label htmlFor="confirm-pw" className="block text-base font-medium text-gray-700 mb-1">
            Ripeti la nuova password *
          </label>
          <input
            id="confirm-pw"
            type={showPw ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            className={INPUT_STYLE}
          />
          {mismatch && <p className="text-sm text-red-600 mt-1" role="alert">Le due password non coincidono</p>}
        </div>

        {error && <p className="text-red-600 text-base" role="alert">{error}</p>}

        <Button type="submit" loading={saving} disabled={!canSubmit} className="w-full" size="lg">
          Salva e accedi
        </Button>
        {!canSubmit && !saving && (
          <p className="text-sm text-gray-500 text-center">
            Scrivi la stessa password (almeno {MIN_LENGTH} caratteri) in entrambi i campi
          </p>
        )}
      </form>
    </AuthLayout>
  )
}

