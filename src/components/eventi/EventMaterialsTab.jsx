import { useState, useEffect } from 'react'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useGadgetsStore } from '../../hooks/useGadgets'
import { useAuthStore } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToastStore } from '../ui/Toast'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { MaterialCatalogPicker } from '../materiale/MaterialCatalogPicker'
import { MaterialMovementForm } from '../materiale/MaterialMovementForm'
import { GadgetRequestForm } from '../materiale/GadgetRequestForm'
import { GadgetCard } from '../materiale/GadgetCard'
import { MovementHistory } from '../materiale/MovementHistory'
import { STATO_MATERIALE_RICHIESTA, POSIZIONE_MATERIALE } from '../../lib/constants'
import { formatDateRange } from '../../lib/date-utils'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS, MATERIALE_ICONS } from '../../lib/icons'

export function EventMaterialsTab({ event }) {
  const [eventMaterials, setEventMaterials] = useState([])
  const [eventGadgets, setEventGadgets] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [showGadgetForm, setShowGadgetForm] = useState(false)
  const [selectedForShipment, setSelectedForShipment] = useState([])
  const [rejectId, setRejectId] = useState(null)

  const fetchEventMaterials = useMaterialsStore(s => s.fetchEventMaterials)
  const fetchEventMovements = useMaterialsStore(s => s.fetchEventMovements)
  const approveMaterial = useMaterialsStore(s => s.approveMaterial)
  const rejectMaterial = useMaterialsStore(s => s.rejectMaterial)
  const fetchEventGadgets = useGadgetsStore(s => s.fetchEventGadgets)
  const hasPermission = useAuthStore(s => s.hasPermission)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)
  const canApprove = hasPermission('approva_materiale')

  const loadData = async () => {
    setLoading(true)
    const [mats, movs, gads] = await Promise.all([
      fetchEventMaterials(event.id),
      fetchEventMovements(event.id),
      fetchEventGadgets(event.id),
    ])
    setEventMaterials(mats.data)
    setMovements(movs.data)
    setEventGadgets(gads.data)
    setSelectedForShipment([])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [event.id])

  const handleApprove = async (id) => {
    const { error } = await approveMaterial(id, user.id)
    if (error) addToast(error, 'error')
    else { addToast('Approvato!', 'success'); loadData() }
  }

  const handleReject = async (id) => {
    const targetId = id || rejectId
    if (!targetId) return
    const { error } = await rejectMaterial(targetId)
    setRejectId(null)
    if (error) addToast(error, 'error')
    else { addToast('Rifiutato', 'success'); loadData() }
  }

  const handleApproveAll = async () => {
    const pending = eventMaterials.filter(em => em.stato === 'richiesto')
    for (const em of pending) {
      await approveMaterial(em.id, user.id)
    }
    addToast(`${pending.length} materiali approvati!`, 'success')
    loadData()
  }

  const toggleShipmentSelection = (materialId) => {
    setSelectedForShipment(prev =>
      prev.includes(materialId) ? prev.filter(id => id !== materialId) : [...prev, materialId]
    )
  }

  if (loading) return <LoadingSkeleton lines={5} />

  const pendingCount = eventMaterials.filter(em => em.stato === 'richiesto').length
  const approvedMaterials = eventMaterials.filter(em => em.stato === 'approvato')

  return (
    <div className="space-y-8">
      {/* Material requests */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Materiale demo</h2>
          <div className="flex gap-2">
            {approvedMaterials.length > 0 && selectedForShipment.length === 0 && (
              <Button variant="ghost" size="sm"
                onClick={() => setSelectedForShipment(approvedMaterials.map(em => em.material_id))}>
                Seleziona per uscita
              </Button>
            )}
            {!showRequestForm && (
              <Button onClick={() => setShowRequestForm(true)}>
                <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
                Richiedi
              </Button>
            )}
          </div>
        </div>

        {/* Approva tutto */}
        {canApprove && pendingCount > 1 && (
          <button
            onClick={handleApproveAll}
            className="w-full mb-4 py-3 px-4 bg-green-50 border border-green-200 rounded-xl text-base font-medium text-green-800 hover:bg-green-100 transition-colors min-h-[48px]"
          >
            <Icon icon={ACTION_ICONS.check} size={18} className="inline mr-1" /> Approva tutto ({pendingCount} richieste)
          </button>
        )}

        {showRequestForm && (
          <MaterialCatalogPicker eventId={event.id} event={event} onDone={() => { setShowRequestForm(false); loadData() }} />
        )}

        {eventMaterials.length === 0 ? (
          <EmptyState title="Nessun materiale richiesto" description="Richiedi il materiale demo necessario per questo evento." />
        ) : (
          <div className="space-y-2">
            {eventMaterials.map((em) => {
              const isApproved = em.stato === 'approvato'
              const isSelected = selectedForShipment.includes(em.material_id)
              const showCheckbox = isApproved && selectedForShipment.length > 0

              return (
                <div key={em.id}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    isSelected ? 'border-mikai-400 bg-mikai-50/30 ring-1 ring-mikai-300' :
                    isApproved ? 'border-green-200 bg-green-50/30' :
                    em.stato === 'rifiutato' ? 'border-red-200 bg-red-50/30 opacity-60' :
                    'border-yellow-200 bg-white'
                  }`}
                  onClick={showCheckbox ? () => toggleShipmentSelection(em.material_id) : undefined}
                  role={showCheckbox ? 'button' : undefined}
                  style={showCheckbox ? { cursor: 'pointer' } : undefined}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Checkbox for shipment selection */}
                    {showCheckbox && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleShipmentSelection(em.material_id)}
                        onClick={e => e.stopPropagation()}
                        className="w-5 h-5 rounded border-gray-300 text-mikai-400 focus:ring-mikai-400 flex-shrink-0"
                      />
                    )}

                    {/* Status bar (only when not in selection mode) */}
                    {!showCheckbox && (
                      <div className={`w-2 h-12 rounded-full flex-shrink-0 ${
                        isApproved ? 'bg-green-400' :
                        em.stato === 'rifiutato' ? 'bg-red-400' :
                        'bg-yellow-400'
                      }`} />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-900 truncate">
                        {em.material?.nome}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateRange(em.data_inizio_utilizzo, em.data_fine_utilizzo)}
                        {em.material?.posizione_attuale && ` \u00B7 ${POSIZIONE_MATERIALE[em.material.posizione_attuale]}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {em.stato === 'richiesto' && canApprove && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(em.id) }}
                            className="w-12 h-12 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-xl transition-colors"
                            aria-label="Approva" title="Approva"
                          ><Icon icon={ACTION_ICONS.approve} size={20} /></button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setRejectId(em.id) }}
                            className="w-12 h-12 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                            aria-label="Rifiuta" title="Rifiuta"
                          ><Icon icon={ACTION_ICONS.reject} size={20} /></button>
                        </>
                      )}
                      {em.stato === 'richiesto' && !canApprove && (
                        <span className="text-sm font-medium text-yellow-700 px-3 py-1 bg-yellow-100 rounded-full">In attesa</span>
                      )}
                      {isApproved && !showCheckbox && (
                        <span className="text-sm font-medium text-green-700 px-3 py-1 bg-green-100 rounded-full">
                          {STATO_MATERIALE_RICHIESTA[em.stato]}
                        </span>
                      )}
                      {em.stato === 'rifiutato' && (
                        <span className="text-sm font-medium text-red-700 px-3 py-1 bg-red-100 rounded-full">
                          {STATO_MATERIALE_RICHIESTA[em.stato]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Shipment form — appears when materials are selected */}
        {selectedForShipment.length > 0 && (
          <div className="mt-4 bg-gray-50 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Icon icon={MATERIALE_ICONS.uscita} size={20} /> Uscita per {selectedForShipment.length} {selectedForShipment.length === 1 ? 'materiale' : 'materiali'}
              </h3>
              <button onClick={() => setSelectedForShipment([])}
                className="text-sm text-gray-500 hover:text-gray-700 min-h-[48px] px-2">Annulla</button>
            </div>
            <MaterialMovementForm
              materialId={selectedForShipment[0]}
              eventId={event.id}
              tipo="uscita"
              allMaterialIds={selectedForShipment}
              onDone={() => { setSelectedForShipment([]); loadData() }}
            />
          </div>
        )}
      </section>

      {/* Gadgets */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Gadget</h2>
          {!showGadgetForm && (
            <Button variant="secondary" onClick={() => setShowGadgetForm(true)}>
              <Icon icon={ACTION_ICONS.add} size={16} className="mr-1" />
              Richiedi
            </Button>
          )}
        </div>

        {showGadgetForm && (
          <GadgetRequestForm eventId={event.id} onDone={() => { setShowGadgetForm(false); loadData() }} />
        )}

        {eventGadgets.length === 0 ? (
          <EmptyState title="Nessun gadget richiesto" />
        ) : (
          <div className="space-y-2">
            {eventGadgets.map((eg) => (
              <GadgetCard key={eg.id} gadget={eg.gadget} eventGadget={eg} />
            ))}
          </div>
        )}
      </section>

      {/* Movements */}
      {movements.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Movimenti</h2>
          <MovementHistory movements={movements} />
        </section>
      )}

      <ConfirmDialog
        open={!!rejectId}
        title="Rifiuta materiale"
        message="Sei sicuro di voler rifiutare questa richiesta di materiale?"
        confirmLabel="Rifiuta"
        onConfirm={() => handleReject()}
        onCancel={() => setRejectId(null)}
        danger
      />
    </div>
  )
}
