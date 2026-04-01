import { useRef, useEffect } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

export function ConfirmDialog({ open, title, message, confirmLabel = 'Conferma', cancelLabel = 'Annulla', onConfirm, onCancel, danger = false }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus()
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      title={title}
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-base text-gray-600">{message}</div>
    </Modal>
  )
}
