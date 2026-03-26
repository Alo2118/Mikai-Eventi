import { create } from 'zustand'
import { Icon } from './Icon'
import { TOAST_ICONS } from '../../lib/icons'

export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = 'success', duration) => {
    const id = Date.now()
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration || 4000)
  },
}))

const typeStyles = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
}

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2" aria-live="polite">
      {toasts.map(t => {
        const ToastIcon = TOAST_ICONS[t.type]
        return (
          <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-base font-medium shadow-lg ${typeStyles[t.type]}`}>
            {ToastIcon && <Icon icon={ToastIcon} size={20} />}
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
