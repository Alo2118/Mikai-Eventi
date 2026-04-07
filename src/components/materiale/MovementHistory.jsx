import { STATO_MOVIMENTO, MODALITA_MOVIMENTO, STATO_RIENTRO, POSIZIONE_MATERIALE } from '../../lib/constants'
import { formatDateTime, daysBetween } from '../../lib/date-utils'
import { EmptyState } from '../ui/EmptyState'
import { Icon } from '../ui/Icon'
import { MATERIALE_ICONS } from '../../lib/icons'

const TYPE_STYLES = {
  uscita: {
    dotBg: 'bg-red-100',
    iconColor: 'text-red-500',
    icon: MATERIALE_ICONS.uscita,
  },
  rientro: {
    dotBg: 'bg-green-100',
    iconColor: 'text-green-500',
    icon: MATERIALE_ICONS.rientro,
  },
  trasferimento: {
    dotBg: 'bg-blue-100',
    iconColor: 'text-blue-500',
    icon: MATERIALE_ICONS.trasferimento,
  },
}

function DurationBadge({ days }) {
  if (days == null) return null
  let colorClasses
  if (days < 7) {
    colorClasses = 'bg-green-50 text-green-700'
  } else if (days <= 30) {
    colorClasses = 'bg-yellow-50 text-yellow-700'
  } else {
    colorClasses = 'bg-red-50 text-red-700'
  }
  return (
    <div className="flex items-center ml-12 -mt-3 mb-3">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses}`}>
        Fuori {days} {days === 1 ? 'giorno' : 'giorni'}
      </span>
    </div>
  )
}

function computeDurations(movements) {
  // For each uscita, find the next rientro and compute duration
  const durations = {}
  const usciteStack = []
  // Movements are sorted most-recent first, so iterate in reverse (oldest first)
  for (let i = movements.length - 1; i >= 0; i--) {
    const m = movements[i]
    if (m.tipo === 'uscita') {
      usciteStack.push(i)
    } else if (m.tipo === 'rientro' && usciteStack.length > 0) {
      const uscitaIdx = usciteStack.pop()
      const uscita = movements[uscitaIdx]
      const days = daysBetween(m.data_movimento, uscita.data_movimento)
      // The duration badge goes between uscita and rientro in display order
      // In display (most-recent-first), rientro (index i) comes before uscita (index uscitaIdx)
      // We attach it to the rientro item (displayed first)
      durations[m.id] = Math.max(0, days)
    }
  }
  return durations
}

export function MovementHistory({ movements }) {
  if (!movements?.length) return <EmptyState title="Nessun movimento registrato" />

  const durations = computeDurations(movements)

  return (
    <div className="relative">
      {/* Vertical connector line */}
      {movements.length > 1 && (
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />
      )}

      {movements.map((m, i) => {
        const isFirst = i === 0
        const style = TYPE_STYLES[m.tipo] || TYPE_STYLES.trasferimento
        const durationDays = durations[m.id]

        return (
          <div key={m.id}>
            <div className="relative flex gap-3 pb-6">
              {/* Timeline dot */}
              <div
                className={`relative z-10 flex-shrink-0 flex items-center justify-center rounded-full ${style.dotBg} ${isFirst ? 'w-9 h-9' : 'w-8 h-8'}`}
              >
                <Icon icon={style.icon} size={isFirst ? 18 : 16} className={style.iconColor} />
              </div>

              {/* Content */}
              <div className={`flex-1 pt-0.5 min-w-0 ${isFirst ? 'border-l-2 border-mikai-400 pl-3 -ml-0.5' : ''}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-medium ${m.tipo === 'uscita' ? 'text-red-700' : m.tipo === 'rientro' ? 'text-green-700' : 'text-blue-700'}`}>
                      {STATO_MOVIMENTO[m.tipo]}
                    </span>
                    {isFirst && (
                      <span className="text-xs bg-mikai-50 text-mikai-700 px-1.5 py-0.5 rounded font-medium">
                        Ultimo
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400 whitespace-nowrap">{formatDateTime(m.data_movimento)}</span>
                </div>

                <p className="text-sm text-gray-600 mt-1">
                  {MODALITA_MOVIMENTO[m.modalita]}
                  {m.event?.titolo && ` \u2014 ${m.event.titolo}`}
                  {m.material?.nome && ` \u2014 ${m.material.nome}`}
                </p>

                {(m.da_posizione || m.a_posizione) && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {m.da_posizione && (POSIZIONE_MATERIALE[m.da_posizione] || m.da_posizione)}
                    {m.da_posizione && m.a_posizione && ' \u2192 '}
                    {m.a_posizione && (POSIZIONE_MATERIALE[m.a_posizione] || m.a_posizione)}
                  </p>
                )}

                {m.responsabile && (
                  <p className="text-sm text-gray-400 mt-1">Resp: {m.responsabile.nome} {m.responsabile.cognome}</p>
                )}
                {m.tracking_spedizione && (
                  <p className="text-sm text-gray-400">Tracking: {m.tracking_spedizione}</p>
                )}
                {m.stato_rientro && (
                  <p className={`text-sm font-medium mt-1 ${m.stato_rientro === 'integro' ? 'text-green-600' : m.stato_rientro === 'danneggiato' ? 'text-red-600' : 'text-yellow-600'}`}>
                    Rientro: {STATO_RIENTRO[m.stato_rientro]}
                  </p>
                )}
                {m.note_danni && <p className="text-sm text-red-500">{m.note_danni}</p>}
              </div>
            </div>

            {/* Duration badge between rientro and its matching uscita */}
            {durationDays != null && <DurationBadge days={durationDays} />}
          </div>
        )
      })}
    </div>
  )
}
