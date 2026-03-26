import { cloneElement, isValidElement, Children } from 'react'

const ERROR_RING = 'ring-2 ring-red-300 border-red-400'

export function FormField({ label, required, error, hint, children, className = '' }) {
  // When error is set, inject error ring classes into the first child element
  const enhancedChildren = error && isValidElement(Children.only(children))
    ? cloneElement(children, {
        className: `${children.props.className || ''} ${ERROR_RING}`.trim(),
        'aria-invalid': 'true',
        'aria-describedby': error ? `error-${label}` : undefined,
      })
    : children

  return (
    <div className={className}>
      {label && (
        <label className={`block text-sm font-medium mb-1 ${error ? 'text-red-600' : 'text-gray-700'}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {enhancedChildren}
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert" id={`error-${label}`}>{error}</p>
      )}
      {!error && hint && (
        <p className="text-sm text-gray-500 mt-1">{hint}</p>
      )}
    </div>
  )
}
