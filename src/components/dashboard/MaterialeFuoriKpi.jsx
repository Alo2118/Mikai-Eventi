import { KpiCard } from './KpiCard'

export function MaterialeFuoriKpi({ count, items }) {
  return (
    <KpiCard
      title="Materiale fuori magazzino"
      value={count}
      valueColor={count > 0 ? 'text-yellow-600' : 'text-green-600'}
      subtitle={count === 0 ? 'Tutto in magazzino' : 'Top 5 per giorni fuori'}
    >
      {items?.length > 0 && (
        <ul className="space-y-3 mt-1">
          {items.map(item => (
            <li
              key={item.id}
              className="flex justify-between text-sm"
            >
              <span className="truncate text-gray-700">
                {item.nome}
                {item.codice_inventario && (
                  <span className="text-gray-400 ml-1">({item.codice_inventario})</span>
                )}
              </span>
              <span className={`shrink-0 ml-2 font-medium ${
                item.giorniFuori != null && item.giorniFuori > 14
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}>
                {item.giorniFuori != null ? `${item.giorniFuori}gg` : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </KpiCard>
  )
}
