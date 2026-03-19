import { useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { MaterialCard } from '../../components/materiale/MaterialCard'
import { MaterialFilters } from '../../components/materiale/MaterialFilters'
import { PageHeader } from '../../components/ui/PageHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Breadcrumb } from '../../components/layout/Breadcrumb'

export function MaterialeList() {
  const materials = useMaterialsStore(s => s.materials)
  const loading = useMaterialsStore(s => s.loading)
  const fetchMaterials = useMaterialsStore(s => s.fetchMaterials)

  useEffect(() => { fetchMaterials() }, [])

  const inMagazzino = materials.filter(m => m.posizione_attuale === 'magazzino').length
  const fuori = materials.filter(m => m.posizione_attuale !== 'magazzino').length

  return (
    <div>
      <div className="px-6 md:px-8 pt-4">
        <Breadcrumb items={[{ label: 'Materiale & Gadget' }]} />
      </div>
      <PageHeader
        title="Materiale & Gadget"
        subtitle={`${inMagazzino} in magazzino · ${fuori} fuori sede`}
      />
      <MaterialFilters />
      <div className="px-6 md:px-8 py-4">
        {loading ? (
          <LoadingSkeleton lines={5} />
        ) : materials.length === 0 ? (
          <EmptyState title="Nessun materiale trovato" description="Prova a cambiare i filtri." />
        ) : (
          <div className="space-y-3">
            {materials.map((m) => (
              <MaterialCard key={m.id} material={m} linkTo={`/materiale/${m.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
