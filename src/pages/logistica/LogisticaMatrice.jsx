import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { CARD_HOVER_STYLE } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

const COLONNE = [
  { key: 'approvato', label: 'Da preparare' },
  { key: 'in_preparazione', label: 'Preparato' },
]

function countByStato(items, stato) {
  return items.filter(i => i.stato === stato).length
}

function cellColor(count, total) {
  if (total === 0) return 'bg-gray-50 text-gray-400'
  if (count === total) return 'bg-green-100 text-green-800 font-semibold'
  if (count > 0) return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-50 text-gray-400'
}

function groupByEvent(timeline) {
  const map = {}
  for (const item of timeline) {
    const id = item.evento?.id
    if (!id) continue
    if (!map[id]) map[id] = { evento: item.evento, items: [] }
    map[id].items.push(item)
  }
  return Object.values(map).sort((a, b) => {
    const da = a.evento?.data_inizio || ''
    const db = b.evento?.data_inizio || ''
    return da.localeCompare(db)
  })
}

export function LogisticaMatrice() {
  const timeline = useMaterialsStore(s => s.logisticsTimeline)
  const loading = useMaterialsStore(s => s.timelineLoading)
  const fetchLogisticsTimeline = useMaterialsStore(s => s.fetchLogisticsTimeline)
  const navigate = useNavigate()

  useEffect(() => { fetchLogisticsTimeline() }, [])

  if (loading) return <div className="px-4 md:px-8 py-4"><LoadingSkeleton lines={5} /></div>

  if (timeline.length === 0) {
    return (
      <EmptyState
        title="Nessun dato disponibile"
        description="Nessun materiale approvato o in preparazione."
      />
    )
  }

  const eventGroups = groupByEvent(timeline)

  return (
    <div className="px-4 md:px-8 py-4">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 pr-4 font-semibold text-gray-700">Evento</th>
              {COLONNE.map(col => (
                <th key={col.key} className="text-center py-3 px-3 font-semibold text-gray-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              <th className="text-center py-3 px-3 font-semibold text-gray-700">Totale</th>
            </tr>
          </thead>
          <tbody>
            {eventGroups.map(({ evento, items }) => {
              const total = items.length
              return (
                <tr
                  key={evento.id}
                  onClick={() => navigate(`/eventi/${evento.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/eventi/${evento.id}`) }}
                  tabIndex={0}
                  role="button"
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900 truncate max-w-[250px]">{evento.titolo}</p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {formatDateRange(evento.data_inizio, evento.data_fine)}
                    </p>
                  </td>
                  {COLONNE.map(col => {
                    const count = countByStato(items, col.key)
                    return (
                      <td key={col.key} className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-sm ${cellColor(count, total)}`}>
                          {count}
                        </span>
                      </td>
                    )
                  })}
                  <td className="py-3 px-3 text-center">
                    <span className="text-sm font-medium text-gray-600">{total}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {eventGroups.map(({ evento, items }) => {
          const total = items.length
          return (
            <div
              key={evento.id}
              onClick={() => navigate(`/eventi/${evento.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/eventi/${evento.id}`) }}
              className={CARD_HOVER_STYLE + ' cursor-pointer'}
            >
              <p className="font-medium text-gray-900">{evento.titolo}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {formatDateRange(evento.data_inizio, evento.data_fine)}
              </p>
              <div className="flex items-center gap-3 mt-3">
                {COLONNE.map(col => {
                  const count = countByStato(items, col.key)
                  return (
                    <div key={col.key} className="text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-sm ${cellColor(count, total)}`}>
                        {count}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{col.label}</p>
                    </div>
                  )
                })}
                <div className="text-center ml-auto">
                  <span className="text-sm font-medium text-gray-600">{total}</span>
                  <p className="text-xs text-gray-400 mt-1">Totale</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Verde = tutti pronti · Giallo = parziale · Grigio = nessuno
      </p>
    </div>
  )
}
