export function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="animate-pulse space-y-4 p-4" role="status" aria-label="Caricamento...">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${80 - i * 15}%` }} />
      ))}
      <span className="sr-only">Caricamento...</span>
    </div>
  )
}
