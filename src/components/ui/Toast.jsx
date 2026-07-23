import { create } from 'zustand'
import { Icon } from './Icon'
import { TOAST_ICONS, ACTION_ICONS } from '../../lib/icons'

const DEFAULT_DURATION = 4000
const ERROR_DURATION = 8000

export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = 'success', duration) => {
    const id = Date.now()
    const autoDuration = duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION)
    const timer = setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
      autoDuration
    )
    set((s) => ({ toasts: [...s.toasts, { id, message, type, timer }] }))
  },
  remove: (id) => {
    set((s) => {
      const toast = s.toasts.find(t => t.id === id)
      if (toast) clearTimeout(toast.timer)
      return { toasts: s.toasts.filter(t => t.id !== id) }
    })
  },
}))

const typeStyles = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
}

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts)
  const remove = useToastStore(s => s.remove)
  return (
    <div
      className="fixed bottom-20 right-4 z-50 space-y-2 md:bottom-4"
      aria-live="polite"
    >
      {toasts.map(t => {
        const ToastIcon = TOAST_ICONS[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-base font-medium shadow-lg ${typeStyles[t.type] ?? typeStyles.info}`}
          >
            {ToastIcon && <Icon icon={ToastIcon} size={20} aria-hidden="true" />}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="ml-1 p-1 rounded opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Chiudi notifica"
            >
              <Icon icon={ACTION_ICONS.close} size={16} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
