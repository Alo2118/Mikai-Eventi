import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { STATO_EVENTO, STATO_EVENTO_COLORE } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'

function daysAgo(dateStr) {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function MyEventsSection({ events }) {
  const today = new Date().toISOString().split('T')[0]
  const prossimi = events.filter(e => e.data_inizio >= today && e.stato !== 'proposto').slice(0, 5)
  const inAttesa = events.filter(e => e.stato === 'proposto')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-lg mb-3">I miei eventi</h3>

      {prossimi.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-500 mb-2">Prossimi</p>
          <div className="space-y-2">
            {prossimi.map(e => (
              <Link
                key={e.id}
                to={`/eventi/${e.id}`}
                className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-base truncate">{e.titolo}</p>
                    <p className="text-sm text-gray-500">{formatDateRange(e.data_inizio, e.data_fine)}</p>
                  </div>
                  <StatusBadge stato={e.stato} labels={STATO_EVENTO} colors={STATO_EVENTO_COLORE} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {inAttesa.length > 0 && (
        <div>
          <p className="text-sm font-medium text-yellow-600 mb-2">In attesa di approvazione</p>
          <div className="space-y-2">
            {inAttesa.map(e => {
              const days = daysAgo(e.created_at)
              return (
                <Link
                  key={e.id}
                  to={`/eventi/${e.id}`}
                  className="block p-3 rounded-lg border border-yellow-100 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                >
                  <p className="font-medium text-base truncate">{e.titolo}</p>
                  <p className="text-sm text-yellow-700">
                    In attesa da {days} {days === 1 ? 'giorno' : 'giorni'}
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {prossimi.length === 0 && inAttesa.length === 0 && (
        <EmptyState title="Nessun evento attivo" description="Non hai eventi in corso o in arrivo" />
      )}
    </div>
  )
}
