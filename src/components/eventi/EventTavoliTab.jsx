import { useEffect, useRef, useState } from 'react'
import { useTavoliStore } from '../../hooks/useTavoli'
import { useAuthStore } from '../../hooks/useAuth'
import { useToastStore } from '../ui/Toast'
import { Button } from '../ui/Button'
import { LoadingSkeleton } from '../ui/LoadingSkeleton'
import { EmptyState } from '../ui/EmptyState'
import { Icon } from '../ui/Icon'
import { ACTION_ICONS } from '../../lib/icons'
import { TavoloCard } from './TavoloCard'
import { ProgressIndicator } from '../ui/ProgressIndicator'

function ProductPicker({ products, onConfirm, onCancel }) {
  const [selected, setSelected] = useState(new Set())

  const toggleAll = () => {
    setSelected(selected.size === products.length ? new Set() : new Set(products.map(p => p.id)))
  }

  const toggle = (id) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">Seleziona prodotti da assegnare a tutti i tavoli</span>
        <button onClick={toggleAll} className="text-sm text-mikai-400 hover:underline min-h-[36px] px-2">
          {selected.size === products.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {products.map(p => (
          <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer min-h-[48px]">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="h-5 w-5 rounded accent-mikai-400"
            />
            <span className="text-sm">{p.nome} <span className="text-gray-400">{p.codice}</span></span>
          </label>
        ))}
        {products.length === 0 && (
          <p className="text-sm text-gray-400 col-span-2 py-2">Nessun prodotto disponibile</p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>Annulla</Button>
        <Button size="sm" disabled={selected.size === 0} onClick={() => onConfirm([...selected])}>
          Conferma assegnazione
        </Button>
      </div>
    </div>
  )
}

export function EventTavoliTab({ event, staff = [], participants = [] }) {
  const tavoli = useTavoliStore(s => s.tavoli)
  const loading = useTavoliStore(s => s.loading)
  const fetchEventTavoli = useTavoliStore(s => s.fetchEventTavoli)
  const createTavoli = useTavoliStore(s => s.createTavoli)
  const assignProductToAllTavoli = useTavoliStore(s => s.assignProductToAllTavoli)
  const distributeDiscenti = useTavoliStore(s => s.distributeDiscenti)

  const canEdit = useAuthStore(s => s.hasPermission)('gestione_staff_evento')
  const addToast = useToastStore(s => s.add)

  const [showCreaForm, setShowCreaForm] = useState(false)
  const [showKitPicker, setShowKitPicker] = useState(false)
  const [products, setProducts] = useState([])
  const countRef = useRef(4)

  useEffect(() => {
    fetchEventTavoli(event.id)
  }, [event.id])

  const fetchProducts = useTavoliStore(s => s.fetchProducts)

  useEffect(() => {
    fetchProducts().then(({ data }) => setProducts(data))
  }, [])

  const assignedDiscentiIds = new Set(
    tavoli.flatMap(t => (t.discenti || []).map(d => d.participant_id))
  )
  const discenti = participants.filter(p => p.tipo === 'discente')
  const unassignedCount = discenti.filter(p => !assignedDiscentiIds.has(p.id)).length

  const availableStaff = (tavoloId) => {
    const onThisTavolo = new Set(
      (tavoli.find(t => t.id === tavoloId)?.formatori || []).map(f => f.staff_id)
    )
    return staff.filter(s => !onThisTavolo.has(s.id))
  }

  const availableDiscenti = (tavoloId) => {
    const onThisTavolo = new Set(
      (tavoli.find(t => t.id === tavoloId)?.discenti || []).map(d => d.participant_id)
    )
    return discenti.filter(p => !assignedDiscentiIds.has(p.id) || onThisTavolo.has(p.id))
  }

  const handleCrea = async () => {
    const count = Number(countRef.current?.value ?? 4)
    const { error } = await createTavoli(event.id, count)
    if (error) { addToast(error, 'error'); return }
    addToast(`${count} tavol${count === 1 ? 'o creato' : 'i creati'}`, 'success')
    setShowCreaForm(false)
  }

  const handleAssegnaKit = async (productIds) => {
    const { error } = await assignProductToAllTavoli(event.id, productIds)
    if (error) { addToast(error, 'error'); return }
    addToast('Kit assegnato a tutti i tavoli', 'success')
    setShowKitPicker(false)
  }

  const handleDistribuisci = async () => {
    const { data, error } = await distributeDiscenti(event.id)
    if (error) { addToast(error, 'error'); return }
    const count = data?.length ?? 0
    addToast(`${count} discent${count === 1 ? 'e assegnato' : 'i assegnati'}`, 'success')
  }

  if (loading) return <LoadingSkeleton lines={4} />

  return (
    <div className="space-y-4">
      {tavoli.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProgressIndicator
            label="Tavoli"
            current={tavoli.length}
            total={tavoli.length}
            color="mikai"
          />
          <ProgressIndicator
            label="Tavoli con materiale"
            current={tavoli.filter(t => (t.materiale || []).length > 0).length}
            total={tavoli.length}
            color="blue"
          />
        </div>
      )}

      {/* Header actions */}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setShowCreaForm(v => !v); setShowKitPicker(false) }}>
            <Icon icon={ACTION_ICONS.add} size={16} />
            <span className="ml-1">Crea tavoli</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => { setShowKitPicker(v => !v); setShowCreaForm(false) }}>
            <Icon icon={ACTION_ICONS.check} size={16} />
            <span className="ml-1">Assegna kit a tutti</span>
          </Button>
        </div>
      )}

      {/* Crea tavoli inline form */}
      {showCreaForm && canEdit && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <label htmlFor="count-tavoli" className="text-sm font-medium whitespace-nowrap">Numero tavoli</label>
          <input
            id="count-tavoli"
            type="number"
            min="1"
            max="10"
            defaultValue="4"
            ref={countRef}
            className="w-20 px-3 py-2 text-base border border-gray-300 rounded-lg min-h-[48px] focus:ring-2 focus:ring-mikai-400 focus:border-mikai-400 outline-none"
          />
          <Button size="sm" onClick={handleCrea}>Crea</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowCreaForm(false)}>Annulla</Button>
        </div>
      )}

      {/* Kit picker */}
      {showKitPicker && canEdit && (
        <ProductPicker
          products={products}
          onConfirm={handleAssegnaKit}
          onCancel={() => setShowKitPicker(false)}
        />
      )}

      {/* Tavoli grid */}
      {tavoli.length === 0 ? (
        <EmptyState
          title="Nessun tavolo configurato"
          description="Crea i tavoli per organizzare formatori, materiale e discenti"
          action={canEdit ? (
            <Button variant="secondary" size="sm" onClick={() => setShowCreaForm(true)}>
              <Icon icon={ACTION_ICONS.add} size={16} />
              <span className="ml-1">Crea tavoli</span>
            </Button>
          ) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tavoli.map(tavolo => (
            <TavoloCard
              key={tavolo.id}
              tavolo={tavolo}
              eventId={event.id}
              canEdit={canEdit}
              availableProducts={products}
            />
          ))}
        </div>
      )}
    </div>
  )
}
