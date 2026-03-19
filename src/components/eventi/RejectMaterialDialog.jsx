import { useState } from 'react'
import { Button } from '../ui/Button'

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Rifiuta materiale</h3>
        <p className="text-base text-gray-600">
          Stai rifiutando <strong>{productName}</strong>. Indica il motivo per il commerciale.
        </p>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg min-h-[100px] focus:ring-2 focus:ring-mikai-400"
          placeholder="Es. Kit non disponibile, prova alternativa Y..."
          required
        />
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleCancel}>Annulla</Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!motivo.trim()}>
            Rifiuta
          </Button>
        </div>
        {!motivo.trim() && (
          <p className="text-sm text-gray-500">Il motivo è obbligatorio per informare il commerciale.</p>
        )}
      </div>
    </div>
  )
}
