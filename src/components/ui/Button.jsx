import { forwardRef } from 'react'

const variants = {
  primary: 'bg-mikai-400 text-white hover:bg-mikai-500 focus:ring-mikai-400',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-mikai-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
}

export const Button = forwardRef(function Button({ children, variant = 'primary', size = 'md', disabled, loading, className = '', ...props }, ref) {
  const sizeClasses = size === 'lg' ? 'px-6 py-3 text-lg' : size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-base'

  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center font-medium rounded-lg min-h-[48px] min-w-[48px] focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizeClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
})
