export function KitContentsList({ contents }) {
  if (!contents || contents.length === 0) return null

  return (
    <div className="mt-2 bg-gray-50 rounded-lg p-3">
      <p className="text-sm font-medium text-gray-500 mb-2">Contenuto kit ({contents.length} pezzi)</p>
      <div className="space-y-1">
        {contents.map((piece) => (
          <div key={piece.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{piece.piece_name}</span>
            <span className="text-gray-400">
              {piece.piece_code && `${piece.piece_code} · `}×{piece.quantity}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
