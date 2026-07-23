import { useState } from 'react'
import { Button } from '../ui/Button'
import { TEXTAREA_STYLE } from '../../lib/constants'

export function RejectMaterialDialog({ open, productName, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState('')

  if (!open) return null

  const handleConfirm = () => {
    if (!motivo.trim()) return
    onConfirm(motivo.trim())
    setMotivo('')
  }

  const handleCancel = () => {
    setMotivo('')
    onCancel()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="reject-dialog-title"
      aria-describedby="reject-dialog-desc"
    >
      <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
        <h3 id="reject-dialog-title" className="text-lg font-semibold text-gray-900">Rifiuta materiale</h3>
        <p id="reject-dialog-desc" className="text-base text-gray-600">
          Stai rifiutando <strong>{productName}</strong>. Indica il motivo per il commerciale.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className={TEXTAREA_STYLE}
          placeholder="Es. Kit non disponibile, prova alternativa Y... (obbligatorio)"
          aria-label="Motivo del rifiuto"
          required
        />
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end sm:items-center">
          {!motivo.trim() && (
            <span className="text-sm text-gray-500 sm:mr-auto">Scrivi il motivo per poter rifiutare</span>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={handleCancel}>Annulla</Button>
            <Button variant="danger" onClick={handleConfirm} disabled={!motivo.trim()} title={!motivo.trim() ? 'Scrivi il motivo del rifiuto' : ''}>
              Rifiuta
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
