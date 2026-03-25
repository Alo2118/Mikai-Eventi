import { Link } from 'react-router-dom'
import { formatDateRange } from '../../lib/date-utils'

export function ProssimePrenotazioni({ bookings }) {
  if (!bookings?.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-500 mb-2">Prossime prenotazioni</p>
        <p className="text-gray-400 text-sm">Nessuna prenotazione in programma</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-500 mb-4">Prossime prenotazioni</p>
      <div className="space-y-3">
        {bookings.map((b, i) => {
          const matName = b.product?.nome || b.material?.nome || 'Materiale'
          const matCode = b.product?.codice || b.material?.codice_inventario || ''
          const dateRange = formatDateRange(b.data_inizio_utilizzo, b.data_fine_utilizzo)

          return (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className="shrink-0 text-xs text-gray-400 w-28 pt-0.5">
                {dateRange || '\u2014'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {matName}
                  {matCode && <span className="text-gray-400 ml-1">({matCode})</span>}
                </p>
                {b.evento?.titolo && (
                  <Link
                    to={`/eventi/${b.evento.id}`}
                    className="text-mikai-400 hover:underline text-xs"
                  >
                    {b.evento.titolo}
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
