export function ChipFilter({ options, value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`min-h-[48px] px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
            value === opt.id
              ? 'bg-mikai-400 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
