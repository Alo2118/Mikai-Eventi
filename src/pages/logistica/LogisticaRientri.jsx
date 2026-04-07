import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMaterialAnalyticsStore } from '../../hooks/useMaterialAnalytics'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { MATERIALE_ICONS, FEEDBACK_ICONS } from '../../lib/icons'
import { formatDate, daysFromToday } from '../../lib/date-utils'

function RientroCard({ movement, onNavigate }) {
  const { materiale, evento, responsabile, data_rientro_prevista } = movement
  const giorni = daysFromToday(data_rientro_prevista)
  const urgente = giorni >= 7

  return (
    <button
      type="button"
      onClick={() => onNavigate(`/eventi/${evento?.id}`)}
      className={`w-full text-left rounded-xl border p-4 hover:shadow-md transition-all min-h-[48px] ${
        urgente ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon
            icon={urgente ? FEEDBACK_ICONS.warning : MATERIALE_ICONS.rientro}
            size={20}
            className={urgente ? 'text-red-500 mt-0.5 shrink-0' : 'text-yellow-500 mt-0.5 shrink-0'}
          />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-base truncate">
              {materiale?.nome || 'Materiale sconosciuto'}
            </p>
            {materiale?.codice_inventario && (
              <p className="text-sm text-gray-500">{materiale.codice_inventario}</p>
            )}
            <p className="text-sm text-gray-500 truncate mt-0.5">{evento?.titolo || '—'}</p>
            {responsabile && (
              <p className="text-sm text-gray-500 mt-0.5">
                Presso: {responsabile.nome} {responsabile.cognome}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-sm font-bold ${urgente ? 'text-red-600' : 'text-yellow-600'}`}>
            +{giorni} gg
          </span>
          <span className="text-sm text-red-600 font-medium">in ritardo</span>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Rientro previsto: {formatDate(data_rientro_prevista)}
      </p>
    </button>
  )
}

export function LogisticaRientri() {
  const overdueReturns = useMaterialAnalyticsStore(s => s.overdueReturns)
  const loading = useMaterialAnalyticsStore(s => s.overdueLoading)
  const fetchOverdueReturns = useMaterialAnalyticsStore(s => s.fetchOverdueReturns)
  const navigate = useNavigate()

  useEffect(() => { fetchOverdueReturns() }, [])

  if (loading) return <div className="px-4 md:px-8 py-4"><LoadingSkeleton lines={4} /></div>

  if (overdueReturns.length === 0) {
    return (
      <EmptyState
        title="Nessun rientro in ritardo"
        description="Tutti i materiali sono rientrati in magazzino nei tempi previsti."
      />
    )
  }

  return (
    <div className="px-4 md:px-8 py-4">
      <p className="text-sm text-gray-500 mb-4">
        {overdueReturns.length} materiale{overdueReturns.length !== 1 ? 'i' : ''} con rientro scaduto
      </p>
      <div className="space-y-3">
        {overdueReturns.map(m => (
          <RientroCard key={m.id} movement={m} onNavigate={navigate} />
        ))}
      </div>
    </div>
  )
}
