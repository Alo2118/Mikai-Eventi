import { useState, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { useToastStore } from '../ui/Toast'
import { useMaterialsStore } from '../../hooks/useMaterials'
import { useAuthStore } from '../../hooks/useAuth'
import { TIPO_MATERIALE, POSIZIONE_MATERIALE, POSIZIONE_MATERIALE_COLORE, CARD_HOVER_STYLE, FORM_CONTAINER_STYLE, TEXTAREA_STYLE, RIENTRO_STATO_STYLE } from '../../lib/constants'
import { MATERIALE_ICONS, TIPO_PRODOTTO_ICONS, STATO_RIENTRO_ICONS, ACTION_ICONS } from '../../lib/icons'
import { nowISO } from '../../lib/date-utils'
import { toDriveImageUrl } from '../../lib/format-utils'

const CONDITION_BUTTONS = [
  { val: 'integro', label: 'Integro', hoverClass: 'hover:border-green-300' },
  { val: 'parziale', label: 'Parziale', hoverClass: 'hover:border-yellow-300' },
  { val: 'danneggiato', label: 'Danneggiato', hoverClass: 'hover:border-red-300' },
]

export const MaterialCard = memo(function MaterialCard({ material, linkTo, showQuickAction }) {
  const [showRientro, setShowRientro] = useState(false)
  const [statoRientro, setStatoRientro] = useState('')
  const [noteDanno, setNoteDanno] = useState('')
  const [loading, setLoading] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [flashSuccess, setFlashSuccess] = useState(false)
  const cardRef = useRef(null)

  const createMovement = useMaterialsStore(s => s.createMovement)
  const fetchMagazzini = useMaterialsStore(s => s.fetchMagazzini)
  const user = useAuthStore(s => s.user)
  const addToast = useToastStore(s => s.add)

  const canReturn = material.posizione_attuale !== 'in_magazzino' && material.posizione_attuale !== 'manutenzione'

  const handleQuickRientro = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!statoRientro) return
    setLoading(true)

    // Get default magazzino
    const { data: magazzini } = await fetchMagazzini()
    const defaultMag = magazzini?.[0]?.id || null

    const movementData = {
      material_id: material.id,
      tipo: 'rientro',
      modalita: 'mano',
      da_posizione: material.posizione_attuale,
      a_posizione: 'in_magazzino',
      a_magazzino_id: defaultMag,
      data_movimento: nowISO(),
      responsabile_id: user.id,
      stato_rientro: statoRientro,
    }
    if (statoRientro === 'danneggiato' && noteDanno.trim()) {
      movementData.note_danni = noteDanno.trim()
    }

    const { error } = await createMovement(movementData)

    setLoading(false)
    if (error) {
      addToast(error, 'error')
    } else {
      // Flash green on success
      setFlashSuccess(true)
      addToast('Rientro registrato!', 'success')
      setShowRientro(false)
      setStatoRientro('')
      setNoteDanno('')
      setTimeout(() => setFlashSuccess(false), 800)
    }
  }

  const cardContent = (
    <>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {material.product?.foto_url && !imgError ? (
            <img
              src={toDriveImageUrl(material.product.foto_url)}
              alt=""
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Icon icon={TIPO_PRODOTTO_ICONS[material.product?.tipo] || TIPO_PRODOTTO_ICONS[material.tipo] || MATERIALE_ICONS.package} size={20} className="text-gray-400" />
          )}
        </div>
        <div className="flex items-start justify-between gap-3 flex-1 min-w-0">
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
            {material.posizione_attuale === 'presso_evento' && material.posizione_dettaglio && (
              <span className="text-xs text-gray-500 truncate max-w-[140px]">({material.posizione_dettaglio})</span>
            )}
          </div>
        </div>
      </div>
      {material.note && (
        <p className="mt-2 text-sm text-gray-400 truncate">{material.note}</p>
      )}

      {/* Always-visible return button for materials that can be returned */}
      {canReturn && !showRientro && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRientro(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors min-h-[48px]"
          >
            <Icon icon={MATERIALE_ICONS.rientro} size={16} />
            Registra rientro
          </button>
        </div>
      )}
    </>
  )

  return (
    <div ref={cardRef}>
      <div className={'block ' + CARD_HOVER_STYLE + (flashSuccess ? ' ring-2 ring-green-400 bg-green-50 transition-all duration-300' : ' transition-all duration-300')}>
        {linkTo ? (
          <Link to={linkTo} className="block">
            {cardContent}
          </Link>
        ) : (
          cardContent
        )}
      </div>

      {/* Mini-form rientro rapido */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${showRientro ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={FORM_CONTAINER_STYLE}>
          <form onSubmit={handleQuickRientro} className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Icon icon={MATERIALE_ICONS.rientro} size={18} className="text-gray-600" />
              <h4 className="font-semibold text-base text-gray-800">Rientro rapido</h4>
            </div>

            {/* Condition buttons */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Stato del materiale al rientro</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CONDITION_BUTTONS.map(({ val, label, hoverClass }) => {
                  const selected = statoRientro === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setStatoRientro(val)}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 text-sm font-semibold min-h-[48px] transition-all ${
                        selected
                          ? RIENTRO_STATO_STYLE[val]
                          : 'bg-white border-gray-200 text-gray-600 ' + hoverClass
                      }`}
                    >
                      {selected ? (
                        <Icon icon={ACTION_ICONS.check} size={16} />
                      ) : (
                        <Icon icon={STATO_RIENTRO_ICONS[val]} size={16} />
                      )}
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Damage note textarea — appears when Danneggiato is selected */}
            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${statoRientro === 'danneggiato' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Descrivi il danno
              </label>
              <textarea
                value={noteDanno}
                onChange={(e) => setNoteDanno(e.target.value)}
                placeholder="Es. custodia graffiata, componente mancante..."
                rows={2}
                className={TEXTAREA_STYLE}
              />
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowRientro(false); setStatoRientro(''); setNoteDanno('') }}
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
      </div>
    </div>
  )
})
