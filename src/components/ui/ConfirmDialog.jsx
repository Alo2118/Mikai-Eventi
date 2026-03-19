export function ConfirmDialog({ open, title, message, confirmLabel = 'Conferma', cancelLabel = 'Annulla', onConfirm, onCancel, danger = false }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <div className="mt-3 text-base text-gray-600">{message}</div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[48px] text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2.5 min-h-[48px] text-base font-medium text-white rounded-lg ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-mikai-400 hover:bg-mikai-500'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
