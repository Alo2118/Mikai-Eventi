import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Icon } from './Icon'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from './Toast'
import { PASSWORD_ICONS } from '../../lib/icons'
import { INPUT_STYLE } from '../../lib/constants'

export function ChangePasswordModal({ open, onClose }) {
  const changePassword = useAuthStore(s => s.changePassword)
  const addToast = useToastStore(s => s.add)

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const tooShort = newPw.length > 0 && newPw.length < 8
  const mismatch = confirmPw.length > 0 && newPw !== confirmPw
  const canSubmit = currentPw && newPw.length >= 8 && newPw === confirmPw && !saving

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { error: err } = await changePassword(currentPw, newPw)
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    addToast('Password aggiornata!', 'success')
    handleClose()
  }

  const handleClose = () => {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setShowCurrent(false)
    setShowNew(false)
    setError(null)
    onClose()
  }

  const toggleButton = (visible, setVisible) => (
    <button
      type="button"
      onClick={() => setVisible(!visible)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[48px] min-w-[48px] flex items-center justify-center"
      aria-label={visible ? 'Nascondi password' : 'Mostra password'}
    >
      <Icon icon={visible ? PASSWORD_ICONS.eyeOff : PASSWORD_ICONS.eye} size={20} />
    </button>
  )

  return (
    <Modal open={open} onClose={handleClose} title="Cambia password" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password attuale <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              className={INPUT_STYLE + ' pr-12'}
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
            {toggleButton(showCurrent, setShowCurrent)}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nuova password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              className={INPUT_STYLE + ' pr-12' + (tooShort ? ' border-red-300 focus:ring-red-400' : '')}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
            {toggleButton(showNew, setShowNew)}
          </div>
          {tooShort && (
            <p className="text-sm text-red-500 mt-1" role="alert">Minimo 8 caratteri</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Conferma nuova password <span className="text-red-500">*</span>
          </label>
          <input
            type={showNew ? 'text' : 'password'}
            className={INPUT_STYLE + (mismatch ? ' border-red-300 focus:ring-red-400' : '')}
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="text-sm text-red-500 mt-1" role="alert">Le password non corrispondono</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" role="alert">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={!canSubmit} loading={saving}>
            Salva password
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Annulla
          </Button>
        </div>
      </form>
    </Modal>
  )
}
