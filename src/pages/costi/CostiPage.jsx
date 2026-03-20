import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCostsStore } from '../../hooks/useCosts'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { STATO_PREVENTIVO, STATO_PREVENTIVO_COLORE } from '../../lib/constants'
import { formatDate } from '../../lib/date-utils'

export function CostiPage() {
  const navigate = useNavigate()
  const fetchPendingPreventivi = useCostsStore(s => s.fetchPendingPreventivi)
  const [preventivi, setPreventivi] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingPreventivi().then(({ data }) => {
      setPreventivi(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: 'Costi' }]} />
      <PageHeader title="Preventivi in attesa" subtitle={`${preventivi.length} preventivi da approvare`} />

      {loading ? <LoadingSkeleton lines={5} /> : preventivi.length === 0 ? (
        <EmptyState title="Nessun preventivo in attesa" description="Tutti i preventivi sono stati gestiti" />
      ) : (
        <div className="space-y-2">
          {preventivi.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/eventi/${p.evento?.id}`)}
              className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-base">{p.descrizione}</p>
                  <p className="text-sm text-gray-500">{p.evento?.titolo} — {p.evento?.data_inizio ? formatDate(p.evento.data_inizio) : ''}</p>
                  {p.fornitore_nome && <p className="text-sm text-gray-400">{p.fornitore_nome}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {p.importo != null && <span className="font-semibold">{p.importo.toLocaleString('it-IT')} €</span>}
                  <StatusBadge stato={p.stato} labels={STATO_PREVENTIVO} colors={STATO_PREVENTIVO_COLORE} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
