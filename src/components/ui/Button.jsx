import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

const variants = {
  primary: 'bg-mikai-400 text-white hover:bg-mikai-500 focus:ring-mikai-400',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-mikai-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
}

// `to`: opzionale, renderizza <Link> invece di <button> (navigazione anziché azione).
// Ignorato se disabled/loading (non ha senso navigare verso un'azione disabilitata) —
// in quel caso si ricade sul <button disabled>. Tutti i chiamanti esistenti non passano
// `to`, quindi il default resta invariato (retro-compatibile).
export const Button = forwardRef(function Button({ children, variant = 'primary', size = 'md', disabled, loading, className = '', to, ...props }, ref) {
  const sizeClasses = size === 'lg' ? 'px-6 py-3 text-lg' : size === 'sm' ? 'px-3 py-1.5 text-base' : size === 'icon' ? 'p-0' : 'px-4 py-2.5 text-base'

  const classes = `inline-flex items-center justify-center font-medium rounded-lg min-h-[48px] min-w-[48px] focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizeClasses} ${className}`

  const spinner = loading && (
    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )

  if (to && !disabled && !loading) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {spinner}
        {children}
      </Link>
    )
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {spinner}
      {children}
    </button>
  )
})
