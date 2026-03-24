export function DatePicker({ label, value, onChange, required, min, max, error }) {
  const borderClass = error
    ? 'border-red-400 ring-2 ring-red-300 focus:ring-red-400 focus:border-red-400'
    : 'border-gray-300 focus:ring-mikai-400 focus:border-mikai-400'

  return (
    <div>
      {label && (
        <label className={`block text-base font-medium mb-1 ${error ? 'text-red-600' : 'text-gray-700'}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        min={min}
        max={max}
        className={`w-full px-4 py-3 text-base border rounded-lg min-h-[48px] ${borderClass}`}
        aria-invalid={!!error}
      />
      {error && <p className="text-sm text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  )
}
