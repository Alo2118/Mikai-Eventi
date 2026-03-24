import { useEffect, useRef } from 'react'
import FocusTrap from 'focus-trap-react'
import { Icon } from './Icon'
import { ACTION_ICONS } from '../../lib/icons'

const SIZE_CLASSES = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  full: 'max-w-6xl',
}

let _modalCounter = 0

export function Modal({
  open,
  onClose,
  size = 'md',
  title,
  subtitle,
  footer,
  children,
}) {
  const titleId = useRef(`modal-title-${++_modalCounter}`).current

  // Scroll lock
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
      aria-hidden="true"
    >
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          className={`
            relative flex flex-col bg-white rounded-t-2xl sm:rounded-xl shadow-xl
            w-full mx-4 sm:mx-0
            ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md}
            max-h-[90dvh]
          `}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                {title && (
                  <h2
                    id={titleId}
                    className="text-base font-semibold text-gray-900 leading-snug"
                  >
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Chiudi"
                className="
                  shrink-0 flex items-center justify-center
                  min-h-[48px] min-w-[48px] -mr-2 -mt-1
                  text-gray-400 hover:text-gray-600
                  rounded-lg focus:outline-none focus:ring-2 focus:ring-mikai-400 focus:ring-offset-1
                  transition-colors
                "
              >
                <Icon icon={ACTION_ICONS.close} size={20} />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 px-5 py-4 border-t border-gray-100">
              {footer}
            </div>
          )}
        </div>
      </FocusTrap>
    </div>
  )
}
