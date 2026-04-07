import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { Breadcrumb } from '../../components/layout/Breadcrumb'
import { MobileHeader } from '../../components/layout/MobileHeader'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { MaterialMovementForm } from '../../components/materiale/MaterialMovementForm'
import { MovementHistory } from '../../components/materiale/MovementHistory'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE, CARD_STYLE } from '../../lib/constants'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { toDriveImageUrl } from '../../lib/format-utils'
import { daysFromToday } from '../../lib/date-utils'
import { MATERIALE_ICONS, POSIZIONE_ICONS } from '../../lib/icons'

function LastMovementBadge({ movements }) {
  if (!movements?.length) return null
  const last = movements[0]
  if (!last.data_movimento) return null

  const days = daysFromToday(last.data_movimento)
  let colorClasses, label
  if (days === 0) {
    colorClasses = 'bg-green-50 text-green-700 border-green-200'
    label = 'oggi'
  } else if (days < 7) {
    colorClasses = 'bg-green-50 text-green-700 border-green-200'
    label = `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`
  } else if (days <= 30) {
    colorClasses = 'bg-yellow-50 text-yellow-700 border-yellow-200'
    label = `${days} giorni fa`
  } else {
    colorClasses = 'bg-red-50 text-red-700 border-red-200'
    label = `${days} giorni fa`
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium ${colorClasses}`}>
      <Icon icon={MATERIALE_ICONS.rientro} size={14} />
      <span>Ultimo movimento: {label}</span>
    </div>
  )
}

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

  const pos = material.posizione_attuale
  const inMagazzino = pos === 'in_magazzino'
  const inManutenzione = pos === 'manutenzione'

  return (
    <div>
      <div className="px-4 md:px-6 pt-4">
        <Breadcrumb items={[
          { label: 'Materiale & Gadget', to: '/materiale' },
          { label: material.nome },
        ]} />
      </div>
      <MobileHeader title={material.nome} subtitle={material.codice_inventario} />

      <div className="hidden md:block px-6 pt-5">
        <h1 className="text-2xl font-bold text-gray-900">{material.nome}</h1>
        <p className="mt-1 text-base text-gray-500">{material.codice_inventario}</p>
      </div>

      <div className="px-4 md:px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: info + actions + movement form */}
          <div className="md:col-span-2 space-y-6">
            {/* Material info card */}
            <div className={CARD_STYLE + ' space-y-0'}>
              <h3 className="font-semibold text-lg mb-3">Informazioni materiale</h3>
              <dl className="divide-y divide-gray-100">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-base text-gray-500">Tipo</dt>
                  <dd className="text-base font-medium">{TIPO_MATERIALE[material.tipo]}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-base text-gray-500">Codice inventario</dt>
                  <dd className="text-base font-mono text-gray-700">{material.codice_inventario || '—'}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-base text-gray-500">Posizione</dt>
                  <dd><StatusBadge stato={material.posizione_attuale} labels={POSIZIONE_MATERIALE} colors={POSIZIONE_MATERIALE_COLORE} /></dd>
                </div>
                {material.posizione_dettaglio && (
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-base text-gray-500">Dettaglio posizione</dt>
                    <dd className="text-base">{material.posizione_dettaglio}</dd>
                  </div>
                )}
                {material.note && (
                  <div className="py-2.5">
                    <dt className="text-base text-gray-500 mb-0.5">Note</dt>
                    <dd className="text-base">{material.note}</dd>
                  </div>
                )}
              </dl>
              <div className="pt-3">
                <LastMovementBadge movements={movements} />
              </div>
            </div>

            {/* Product info card with image */}
            {material.product && (
              <div className={CARD_STYLE + ' space-y-3'}>
                <h3 className="font-semibold text-lg">Prodotto</h3>
                {material.product.foto_url && (
                  <div className="flex justify-center py-2">
                    <img
                      src={toDriveImageUrl(material.product.foto_url)}
                      alt={material.product.nome}
                      className="max-h-48 object-contain rounded-lg"
                    />
                  </div>
                )}
                <dl className="divide-y divide-gray-100">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-base text-gray-500">Azienda</dt>
                    <dd className="text-base font-medium">{material.product.brand?.nome}</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-base text-gray-500">Prodotto</dt>
                    <dd className="text-base font-medium">{material.product.nome}</dd>
                  </div>
                  {material.product.codice && (
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-base text-gray-500">Codice</dt>
                      <dd className="text-base font-mono text-gray-700">{material.product.codice}</dd>
                    </div>
                  )}
                  {material.product.descrizione && (
                    <div className="py-2.5">
                      <dt className="text-base text-gray-500 mb-0.5">Descrizione</dt>
                      <dd className="text-base">{material.product.descrizione}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Contextual action buttons */}
            <div className="flex flex-wrap gap-3">
              {inMagazzino && (
                <Button onClick={() => setShowMovement('uscita')}>
                  <Icon icon={MATERIALE_ICONS.uscita} size={18} className="mr-1.5" />
                  Registra uscita
                </Button>
              )}
              {!inMagazzino && !inManutenzione && (
                <>
                  <Button onClick={() => setShowMovement('rientro')}>
                    <Icon icon={MATERIALE_ICONS.rientro} size={18} className="mr-1.5" />
                    Registra rientro
                  </Button>
                  <Button variant="secondary" onClick={() => setShowMovement('trasferimento')}>
                    <Icon icon={MATERIALE_ICONS.trasferimento} size={18} className="mr-1.5" />
                    Trasferisci
                  </Button>
                </>
              )}
              {inManutenzione && (
                <Button onClick={() => setShowMovement('rientro')}>
                  <Icon icon={POSIZIONE_ICONS.in_magazzino} size={18} className="mr-1.5" />
                  Rimetti in magazzino
                </Button>
              )}
            </div>

            {showMovement && (
              <MaterialMovementForm
                materialId={material.id}
                material={material}
                tipo={showMovement === 'trasferimento' ? 'uscita' : showMovement}
                onDone={() => { setShowMovement(null); loadData() }}
              />
            )}

            {/* Movement history on mobile only */}
            <div className="md:hidden">
              <h3 className="font-semibold text-lg mb-4">Storico movimenti</h3>
              <MovementHistory movements={movements} />
            </div>
          </div>

          {/* Right column: Movement history (desktop, sticky) */}
          <div className="hidden md:block md:col-span-1">
            <div className="md:sticky md:top-4">
              <h3 className="font-semibold text-lg mb-4">Storico movimenti</h3>
              <MovementHistory movements={movements} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
