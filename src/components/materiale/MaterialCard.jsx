import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { useToastStore } from '../ui/Toast'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE, CARD_HOVER_STYLE, FORM_CONTAINER_STYLE } from '../../lib/constants'
import { MATERIALE_ICONS } from '../../lib/icons'
import { nowISO } from '../../lib/date-utils'

const STATO_RIENTRO_CLASSES = {
  integro: 'border-green-400 bg-green-50 text-green-800',
  parziale: 'border-yellow-400 bg-yellow-50 text-yellow-800',
  danneggiato: 'border-red-400 bg-red-50 text-red-800',
}

export function MaterialCard({ material, linkTo, showQuickAction }) {
  const [showRientro, setShowRientro] = useState(false)
  const [statoRientro, setStatoRientro] = useState('')
  const [loading, setLoading] = useState(false)

  const createMovement = useMaterialsStore(s => s.createMovement)
  const fetchMagazzini = useMaterialsStore(s => s.fetchMagazzini)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const isFuori = material.posizione_attuale !== 'in_magazzino'

  const handleQuickRientro = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!statoRientro) return
    setLoading(true)

    // Get default magazzino
    const { data: magazzini } = await fetchMagazzini()
    const defaultMag = magazzini?.[0]?.id || null

    const { error } = await createMovement({
      material_id: material.id,
      tipo: 'rientro',
      modalita: 'mano',
      da_posizione: material.posizione_attuale,
      a_posizione: 'in_magazzino',
      a_magazzino_id: defaultMag,
      data_movimento: nowISO(),
      responsabile_id: user.id,
      stato_rientro: statoRientro,
    })

    setLoading(false)
    if (error) {
      addToast(error, 'error')
    } else {
      addToast('Rientro registrato!', 'success')
      setShowRientro(false)
      setStatoRientro('')
    }
  }

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">{material.nome}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {material.codice_inventario && `${material.codice_inventario} \u00B7 `}
            {TIPO_MATERIALE[material.tipo]}
          </p>
          {material.product && (
            <p className="text-sm text-gray-500 mt-0.5 truncate">
              {material.product.brand?.nome && `${material.product.brand.nome} \u00B7 `}
              {material.product.nome}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge
            stato={material.posizione_attuale}
            labels={POSIZIONE_MATERIALE}
            colors={POSIZIONE_MATERIALE_COLORE}
          />
          {material.posizione_attuale === 'in_magazzino' && material.magazzino?.nome && (
            <span className="text-xs text-gray-500">({material.magazzino.nome})</span>
          )}
          {material.posizione_attuale === 'magazzino_agente' && material.agente && (
            <span className="text-xs text-gray-500">({material.agente.cognome} {material.agente.nome})</span>
          )}
        </div>
      </div>
      {material.note && (
        <p className="mt-2 text-sm text-gray-400 truncate">{material.note}</p>
      )}
    </>
  )

  return (
    <div>
      <div className={'block ' + CARD_HOVER_STYLE}>
        {linkTo ? (
          <Link to={linkTo} className="block">
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}

        {/* Quick action: rientro rapido per materiali fuori sede */}
        {showQuickAction && isFuori && !showRientro && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRientro(true) }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors min-h-[48px]"
            >
              <Icon icon={MATERIALE_ICONS.rientro} size={16} />
              Rientro rapido
            </button>
          </div>
        )}
      </div>

      {/* Mini-form rientro rapido */}
      {showRientro && (
        <div className={FORM_CONTAINER_STYLE + ' mt-2'} onClick={(e) => e.stopPropagation()}>
          <form onSubmit={handleQuickRientro} className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Stato del materiale al rientro</p>
            <div className="flex flex-wrap gap-3">
              {[['integro', 'Integro'], ['parziale', 'Parziale'], ['danneggiato', 'Danneggiato']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStatoRientro(val)}
                  className={`px-5 py-3 rounded-xl border-2 text-sm font-medium min-h-[48px] transition-all ${
                    statoRientro === val
                      ? STATO_RIENTRO_CLASSES[val]
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowRientro(false); setStatoRientro('') }}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={loading}
                disabled={!statoRientro}
              >
                Registra rientro
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
