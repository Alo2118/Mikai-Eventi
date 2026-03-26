import { POSIZIONE_MATERIALE, CARD_STYLE } from '../../lib/constants'

export function MaterialeFuoriList({ data }) {
  if (!data?.length) {
    return (
      <div className={CARD_STYLE}>
        <p className="text-sm font-medium text-gray-500 mb-2">Materiale fuori magazzino</p>
        <p className="text-gray-400 text-sm">Tutto il materiale è in magazzino</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-sm font-medium text-gray-500">Materiale fuori magazzino</p>
        <span className="inline-flex items-center justify-center bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full w-6 h-6">
          {data.length}
        </span>
      </div>
      <div className="space-y-3">
        {data.map(item => {
          const isOverdue = item.giorniFuori != null && item.giorniFuori > 14
          return (
            <div
              key={item.id}
              className={`rounded-lg border p-3 ${
                isOverdue
                  ? 'border-l-4 border-l-red-400 border-gray-200'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.nome}</p>
                  {item.codice_inventario && (
                    <p className="text-xs text-gray-400">{item.codice_inventario}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                    {POSIZIONE_MATERIALE[item.posizione_attuale] || item.posizione_attuale}
                  </span>
                </div>
              </div>
              {item.giorniFuori != null && (
                <p className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  {isOverdue
                    ? `In ritardo di ${item.giorniFuori} giorni`
                    : `Fuori da ${item.giorniFuori} giorni`}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
