import { useEffect, useState, useMemo } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../../components/ui/Toast'
import { PageHeader } from '../../components/ui/PageHeader'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { AgenteKitCard } from '../../components/materiale/AgenteKitCard'
import { MagazzinoAlerts } from '../../components/materiale/MagazzinoAlerts'
import { ACTION_ICONS } from '../../lib/icons'

const FILTERS = [
  { id: 'tutti', label: 'Tutti', test: () => true },
  { id: '30', label: '> 30 giorni', test: (a) => (a.giorni_max || 0) >= 30 },
  { id: '60', label: '> 60 giorni', test: (a) => (a.giorni_max || 0) >= 60 },
  { id: 'no_evento', label: 'Senza evento collegato', test: (a) => a.materials.some(m => !m.evento_collegato) },
]

export function MaterialeAgenti() {
  const fetchMaterialsByAgent = useMaterialsStore(s => s.fetchMaterialsByAgent)
  const solicitaRientroAgente = useMaterialsStore(s => s.solicitaRientroAgente)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const addToast = useToastStore(s => s.add)

  const [loading, setLoading] = useState(true)
  const [agenti, setAgenti] = useState([])
  const [filterId, setFilterId] = useState('tutti')
  const [solicitingId, setSolicitingId] = useState(null)

  const canManage = hasPermission('gestione_magazzino')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const { data } = await fetchMaterialsByAgent()
      if (!mounted) return
      setAgenti(data || [])
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    const f = FILTERS.find(x => x.id === filterId) || FILTERS[0]
    return agenti.filter(f.test)
  }, [agenti, filterId])

  const handleSollecita = async (agente, kitCount, giorniMax) => {
    setSolicitingId(agente.id)
    const { error } = await solicitaRientroAgente(agente.id, kitCount, giorniMax)
    setSolicitingId(null)
    if (error) addToast(error, 'warning')
    else addToast(`Sollecito inviato a ${agente.cognome} ${agente.nome}`, 'success')
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Kit presso agenti" />
        <div className="px-4 md:px-6">
          <EmptyState
            title="Pagina riservata al magazzino"
            description="Questa vista è destinata a chi gestisce il magazzino. Se ti serve l'accesso, scrivi all'ufficio o all'amministratore."
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <MobileHeader title="Kit presso agenti" subtitle={`${agenti.length} agenti con materiale fuori`} />
      <div className="hidden md:block px-4 md:px-6 pt-4">
        <Breadcrumb items={[{ label: 'Materiale & Gadget', href: '/materiale' }, { label: 'Kit presso agenti' }]} />
      </div>
      <PageHeader
        title="Kit presso agenti"
        subtitle={`${agenti.length} agenti hanno materiale fuori dal magazzino`}
        actions={<MagazzinoAlerts />}
      />

      {/* Filter chips */}
      <div className="px-4 md:px-6 mb-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => {
            const count = agenti.filter(f.test).length
            const isActive = filterId === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFilterId(f.id)}
                className={`px-3 py-2 rounded-full text-sm font-medium min-h-[48px] md:min-h-0 transition-colors border ${
                  isActive
                    ? 'bg-mikai-100 text-mikai-700 border-mikai-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingSkeleton lines={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={agenti.length === 0 ? 'Nessun agente con kit fuori' : 'Nessun agente per questo filtro'}
            description={agenti.length === 0
              ? 'Quando consegnerai materiale a un agente sul campo, lo vedrai elencato qui con da quanti giorni è fuori.'
              : 'Cambia filtro per vedere altri agenti.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(a => (
              <AgenteKitCard
                key={a.agente?.id || Math.random()}
                {...a}
                onSollecita={handleSollecita}
                soliciting={solicitingId === a.agente?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
