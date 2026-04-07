import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TEXTAREA_STYLE } from '../../lib/constants'

export function DocApprovalDialog({ dialog, onChange, onAction, onClose }) {
  if (!dialog) return null

  const title = dialog.type === 'approve' ? 'Approva documento'
    : dialog.type === 'reject' ? 'Rifiuta documento'
    : 'Richiedi revisione'

  const confirmLabel = dialog.type === 'approve' ? 'Approva'
    : dialog.type === 'reject' ? 'Rifiuta'
    : 'Richiedi revisione'

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button
            variant={dialog.type === 'reject' ? 'danger' : 'primary'}
            onClick={onAction}
            disabled={dialog.type !== 'approve' && !dialog.nota?.trim()}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-base text-gray-700">
          {dialog.type === 'approve'
            ? `Confermi l'approvazione di "${dialog.doc.nome}"?`
            : `Documento: "${dialog.doc.nome}"`}
        </p>
        {dialog.type !== 'approve' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nota <span className="text-red-500">*</span>
            </label>
            <textarea
              value={dialog.nota}
              onChange={e => onChange({ ...dialog, nota: e.target.value })}
              placeholder="Motivo del rifiuto o indicazioni per la revisione..."
              className={TEXTAREA_STYLE}
              rows={3}
              autoFocus
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
