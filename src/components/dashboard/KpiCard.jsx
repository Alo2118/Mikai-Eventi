export function KpiCard({ title, value, subtitle, valueColor, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {value !== undefined && value !== null && (
        <p className={`text-3xl font-bold ${valueColor || 'text-gray-900'}`}>
          {value}
        </p>
      )}
      {subtitle && (
        <p className="text-sm text-gray-500">{subtitle}</p>
      )}
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
