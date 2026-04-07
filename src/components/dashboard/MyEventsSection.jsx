import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { STATO_EVENTO, STATO_EVENTO_COLORE, CARD_STYLE } from '../../lib/constants'
import { formatDateRange, todayISO, daysFromToday } from '../../lib/date-utils'

// Color classes for stato mini-cards
const STATO_BADGE_CLASSES = {
  proposto:       'bg-yellow-50 border-yellow-200 text-yellow-700',
  confermato:     'bg-blue-50 border-blue-200 text-blue-700',
  in_preparazione:'bg-mikai-50 border-mikai-200 text-mikai-700',
  pronto:         'bg-green-50 border-green-200 text-green-700',
  in_corso:       'bg-emerald-50 border-emerald-200 text-emerald-700',
  concluso:       'bg-gray-50 border-gray-200 text-gray-600',
  cancellato:     'bg-red-50 border-red-200 text-red-700',
  rifiutato:      'bg-red-50 border-red-200 text-red-700',
}

export function MyEventsSection({ events }) {
  const today = todayISO()
  const prossimi = events.filter(e => e.data_inizio >= today && e.stato !== 'proposto').slice(0, 5)
  const inAttesa = events.filter(e => e.stato === 'proposto')

  // Stato summary counts (active states only)
  const activeStati = ['proposto', 'confermato', 'in_preparazione', 'pronto', 'in_corso']
  const statiCounts = activeStati
    .map(stato => ({ stato, count: events.filter(e => e.stato === stato).length }))
    .filter(({ count }) => count > 0)

  const totalActive = events.filter(e => !['concluso', 'cancellato', 'rifiutato'].includes(e.stato)).length

  return (
    <div className={CARD_STYLE}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">I miei eventi</h3>
        {totalActive > 0 && (
          <Link
            to="/eventi"
            className="text-sm text-mikai-400 hover:underline min-h-[48px] flex items-center"
          >
            Vedi tutti ({totalActive})
          </Link>
        )}
      </div>

      {statiCounts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {statiCounts.map(({ stato, count }) => (
            <Link
              key={stato}
              to={`/eventi?stato=${stato}`}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium min-h-[48px] transition-opacity hover:opacity-80 ${STATO_BADGE_CLASSES[stato] || 'bg-gray-50 border-gray-200 text-gray-700'}`}
            >
              <span className="truncate">{STATO_EVENTO[stato]}</span>
              <span className="text-lg font-bold ml-2 shrink-0">{count}</span>
            </Link>
          ))}
        </div>
      )}

      {prossimi.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-500 mb-2">Prossimi</p>
          <div className="space-y-3">
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
          <div className="space-y-3">
            {inAttesa.map(e => {
              const days = daysFromToday(e.created_at)
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

      {prossimi.length === 0 && inAttesa.length === 0 && statiCounts.length === 0 && (
        <EmptyState title="Nessun evento attivo" description="Non hai eventi in corso o in arrivo" />
      )}
    </div>
  )
}
