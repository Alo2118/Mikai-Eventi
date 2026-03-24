export function ProgressIndicator({ label, current, total, color, onClick }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  const autoColor = pct === 100 ? 'green' : pct > 50 ? 'yellow' : 'red'
  const barColor = color || autoColor

  const colorClass = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    mikai: 'bg-mikai-400',
    gray: 'bg-gray-400',
  }[barColor] || 'bg-gray-400'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`w-full ${onClick ? 'cursor-pointer hover:opacity-80 min-h-[48px]' : ''} flex flex-col justify-center gap-1`}
      {...(onClick ? { 'aria-label': `${label}: ${current} di ${total}` } : {})}
    >
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}: {current}/{total}</span>
        <span className="text-gray-400">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Wrapper>
  )
}
