export function DatePicker({ label, value, onChange, required, min, max }) {
  return (
    <div>
      {label && (
        <label className="block text-base font-medium text-gray-700 mb-1">
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
        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 min-h-[48px]"
      />
    </div>
  )
}
