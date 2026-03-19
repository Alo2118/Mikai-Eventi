import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { MaterialMovementForm } from '../../components/materiale/MaterialMovementForm'
import { MovementHistory } from '../../components/materiale/MovementHistory'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE } from '../../lib/constants'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { POSIZIONE_MATERIALE_COLORE } from '../../lib/constants'

export function MaterialeDetail() {
  const { id } = useParams()
  const fetchMaterial = useMaterialsStore(s => s.fetchMaterial)
  const fetchMovements = useMaterialsStore(s => s.fetchMovements)
  const [material, setMaterial] = useState(null)
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMovement, setShowMovement] = useState(null)

  const loadData = async () => {
    setLoading(true)
    const [matRes, movRes] = await Promise.all([
      fetchMaterial(id),
      fetchMovements(id),
    ])
    setMaterial(matRes.data)
    setMovements(movRes.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  if (loading) return <LoadingSkeleton lines={8} />
  if (!material) return <EmptyState title="Materiale non trovato" />

  return (
    <div>
      <div className="px-4 md:px-8 pt-4">
        <Breadcrumb items={[
          { label: 'Materiale & Gadget', to: '/materiale' },
          { label: material.nome },
        ]} />
      </div>
      <MobileHeader title={material.nome} subtitle={material.codice_inventario} />

      <div className="hidden md:block px-8 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">{material.nome}</h1>
        <p className="mt-1 text-base text-gray-500">{material.codice_inventario}</p>
      </div>

      <div className="px-4 md:px-8 py-5 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-500">Tipo</span>
            <span className="text-base font-medium">{TIPO_MATERIALE[material.tipo]}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base text-gray-500">Posizione</span>
            <StatusBadge stato={material.posizione_attuale} labels={POSIZIONE_MATERIALE} colors={POSIZIONE_MATERIALE_COLORE} />
          </div>
          {material.posizione_dettaglio && (
            <div className="flex items-center justify-between">
              <span className="text-base text-gray-500">Dettaglio</span>
              <span className="text-base">{material.posizione_dettaglio}</span>
            </div>
          )}
          {material.note && (
            <div>
              <span className="text-base text-gray-500">Note</span>
              <p className="text-base mt-0.5">{material.note}</p>
            </div>
          )}
        </div>

        {material.product && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-base font-semibold text-gray-700">Prodotto</h3>
            <div className="flex items-center justify-between">
              <span className="text-base text-gray-500">Azienda</span>
              <span className="text-base font-medium">{material.product.brand?.nome}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base text-gray-500">Prodotto</span>
              <span className="text-base font-medium">{material.product.nome}</span>
            </div>
            {material.product.descrizione && (
              <div className="flex items-center justify-between">
                <span className="text-base text-gray-500">Descrizione</span>
                <span className="text-base">{material.product.descrizione}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setShowMovement('uscita')}>Registra uscita</Button>
          <Button variant="secondary" onClick={() => setShowMovement('rientro')}>Registra rientro</Button>
        </div>

        {showMovement && (
          <MaterialMovementForm
            materialId={material.id}
            tipo={showMovement}
            onDone={() => { setShowMovement(null); loadData() }}
          />
        )}

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Storico movimenti</h2>
          <MovementHistory movements={movements} />
        </div>
      </div>
    </div>
  )
}
